/**
 * AI Suggestions State Hook
 *
 * Reducer-based state management for the AI suggestions modal.
 * Handles fetching, real-time updates, and suggestion actions.
 *
 * @module AISuggestions/useAISuggestionsState
 */

import { useReducer, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getAuthToken } from '../../../lib/auth';

/**
 * @typedef {'pending' | 'accepted' | 'ignored' | 'combined'} SuggestionDecision
 *
 * @typedef {Object} AISuggestion
 * @property {string} _id - Suggestion ID
 * @property {string} Content - The AI-generated suggestion text
 * @property {string|null} ['Previous Content'] - Existing content for comparison
 * @property {string} ['Field suggested house manual'] - Target field name
 * @property {boolean} ['being processed?'] - Processing flag
 * @property {SuggestionDecision} decision - Current decision state
 * @property {boolean} ['from call?'] - Source from phone call
 * @property {boolean} ['from audio?'] - Source from audio recording
 * @property {boolean} ['from PDF?'] - Source from PDF
 * @property {boolean} ['from google doc?'] - Source from Google Doc
 * @property {boolean} ['from listing?'] - Source from listing
 * @property {boolean} ['from free text form?'] - Source from text input
 */

/**
 * @typedef {Object} AISuggestionsState
 * @property {boolean} isOpen - Modal visibility
 * @property {boolean} isLoading - Loading state
 * @property {string|null} error - Error message
 * @property {boolean} showTranscript - Transcript popup visibility
 * @property {Object|null} houseManual - Current house manual data
 * @property {AISuggestion[]} suggestions - Array of suggestions
 * @property {boolean} combineModalActive - Combine modal visibility
 * @property {string} editedContent - Content being edited in combine modal
 * @property {string|null} activeSuggestionId - ID of suggestion being combined
 */

const initialState = {
  isOpen: false,
  isLoading: false,
  error: null,
  showTranscript: false,
  houseManual: null,
  suggestions: [],
  combineModalActive: false,
  editedContent: '',
  activeSuggestionId: null,
};

/**
 * State reducer for AI suggestions
 * @param {AISuggestionsState} state
 * @param {Object} action
 * @returns {AISuggestionsState}
 */
function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, isOpen: true };

    case 'CLOSE_MODAL':
      return { ...initialState };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_DATA':
      return {
        ...state,
        houseManual: action.payload.houseManual,
        suggestions: action.payload.suggestions,
        isLoading: false,
        error: null,
      };

    case 'REMOVE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.filter(s => s._id !== action.payload),
      };

    case 'UPDATE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.map(s =>
          s._id === action.payload._id ? action.payload : s
        ),
      };

    case 'ADD_SUGGESTIONS':
      return {
        ...state,
        suggestions: [
          ...state.suggestions,
          ...action.payload.filter(
            newSug => !state.suggestions.some(s => s._id === newSug._id)
          ),
        ],
      };

    case 'TOGGLE_TRANSCRIPT':
      return { ...state, showTranscript: !state.showTranscript };

    case 'OPEN_COMBINE_MODAL':
      return {
        ...state,
        combineModalActive: true,
        editedContent: action.payload.content,
        activeSuggestionId: action.payload.suggestionId,
      };

    case 'CLOSE_COMBINE_MODAL':
      return {
        ...state,
        combineModalActive: false,
        editedContent: '',
        activeSuggestionId: null,
      };

    case 'SET_EDITED_CONTENT':
      return { ...state, editedContent: action.payload };

    default:
      return state;
  }
}

/**
 * API configuration
 */
const API_BASE = import.meta.env.VITE_SUPABASE_URL || '';
const EDGE_FUNCTION_URL = `${API_BASE}/functions/v1/house-manual`;

/**
 * Make API call to house-manual Edge Function
 * @param {string} action - The action to perform
 * @param {Object} payload - The payload data
 * @returns {Promise<Object>} The response data
 */
async function callHouseManualAPI(action, payload) {
  const token = await getAuthToken();

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'API call failed');
  }

  return result.data;
}

/**
 * Custom hook for AI suggestions state management
 *
 * @param {string} houseManualId - The house manual ID to load suggestions for
 * @returns {Object} State, dispatch, actions, and computed values
 */
export function useAISuggestionsState(houseManualId) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch suggestions when modal opens
  useEffect(() => {
    if (!houseManualId || !state.isOpen) return;

    const fetchData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const data = await callHouseManualAPI('get_suggestions', { houseManualId });
        dispatch({ type: 'SET_DATA', payload: data });
      } catch (err) {
        console.error('[useAISuggestionsState] Fetch error:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    };

    fetchData();
  }, [houseManualId, state.isOpen]);

  // Real-time subscription for suggestion updates
  useEffect(() => {
    if (!houseManualId || !state.isOpen) return;

    const channel = supabase
      .channel(`suggestions:${houseManualId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zat_aisuggestions',
          filter: `House Manual=eq.${houseManualId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            dispatch({ type: 'ADD_SUGGESTIONS', payload: [payload.new] });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.decision === 'ignored') {
              dispatch({ type: 'REMOVE_SUGGESTION', payload: payload.new._id });
            } else {
              dispatch({ type: 'UPDATE_SUGGESTION', payload: payload.new });
            }
          } else if (payload.eventType === 'DELETE') {
            dispatch({ type: 'REMOVE_SUGGESTION', payload: payload.old._id });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [houseManualId, state.isOpen]);

  // Action handlers
  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL' });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const toggleTranscript = useCallback(() => {
    dispatch({ type: 'TOGGLE_TRANSCRIPT' });
  }, []);

  const acceptSuggestion = useCallback(async (suggestionId) => {
    try {
      await callHouseManualAPI('accept_suggestion', { suggestionId });
      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });
    } catch (err) {
      console.error('[useAISuggestionsState] Accept error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const ignoreSuggestion = useCallback(async (suggestionId) => {
    try {
      await callHouseManualAPI('ignore_suggestion', { suggestionId });
      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });
    } catch (err) {
      console.error('[useAISuggestionsState] Ignore error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const openCombineModal = useCallback((suggestionId, content) => {
    dispatch({
      type: 'OPEN_COMBINE_MODAL',
      payload: { suggestionId, content },
    });
  }, []);

  const closeCombineModal = useCallback(() => {
    dispatch({ type: 'CLOSE_COMBINE_MODAL' });
  }, []);

  const setEditedContent = useCallback((content) => {
    dispatch({ type: 'SET_EDITED_CONTENT', payload: content });
  }, []);

  const confirmCombine = useCallback(async () => {
    if (!state.activeSuggestionId || !state.editedContent.trim()) return;

    try {
      await callHouseManualAPI('combine_suggestion', {
        suggestionId: state.activeSuggestionId,
        combinedContent: state.editedContent,
      });
      dispatch({ type: 'REMOVE_SUGGESTION', payload: state.activeSuggestionId });
      dispatch({ type: 'CLOSE_COMBINE_MODAL' });
    } catch (err) {
      console.error('[useAISuggestionsState] Combine error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [state.activeSuggestionId, state.editedContent]);

  const acceptAll = useCallback(async () => {
    if (!houseManualId) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await callHouseManualAPI('accept_all_suggestions', { houseManualId });
      // Clear all suggestions
      dispatch({ type: 'SET_DATA', payload: { houseManual: state.houseManual, suggestions: [] } });
    } catch (err) {
      console.error('[useAISuggestionsState] Accept all error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [houseManualId, state.houseManual]);

  const reusePrevious = useCallback(async (sourceHouseManualId) => {
    if (!houseManualId || !sourceHouseManualId) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await callHouseManualAPI('reuse_previous', {
        targetHouseManualId: houseManualId,
        sourceHouseManualId,
      });
      // Refetch suggestions
      const data = await callHouseManualAPI('get_suggestions', { houseManualId });
      dispatch({ type: 'SET_DATA', payload: data });
    } catch (err) {
      console.error('[useAISuggestionsState] Reuse previous error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, [houseManualId]);

  // Computed values
  const pendingCount = state.suggestions.filter(s => s.decision === 'pending').length;
  const isEmpty = state.suggestions.length === 0;
  const hasTranscript = !!(state.houseManual?.transcript);
  const progressStage = state.houseManual?.progress_stage || 'idle';

  return {
    state,
    dispatch,
    actions: {
      openModal,
      closeModal,
      toggleTranscript,
      acceptSuggestion,
      ignoreSuggestion,
      openCombineModal,
      closeCombineModal,
      setEditedContent,
      confirmCombine,
      acceptAll,
      reusePrevious,
    },
    computed: {
      pendingCount,
      isEmpty,
      hasTranscript,
      progressStage,
      isProcessing: state.isLoading,
    },
  };
}

export default useAISuggestionsState;
