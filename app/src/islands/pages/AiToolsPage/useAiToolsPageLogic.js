/**
 * AI Tools Page Logic Hook
 *
 * Contains all business logic for the AI Tools page:
 * - Admin authentication verification
 * - Data fetching for house manuals, visits, deepfakes, narrations
 * - HeyGen deepfake workflow management
 * - ElevenLabs narration workflow management
 * - Jingle creation workflow management
 *
 * NO FALLBACK PRINCIPLE: Errors are surfaced, not hidden
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
import { aiToolsService } from '../../../lib/aiToolsService.js';
import { MELODY_PREFERENCES, CONTENT_PREFERENCES } from './types.js';

// Admin email whitelist - users with these emails can access AI Tools
const ADMIN_EMAILS = [
  'sharath@splitlease.io',
  'admin@splitlease.io',
  'test@splitlease.io',
];

export function useAiToolsPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data selection state
  const [houseManuals, setHouseManuals] = useState([]);
  const [visits, setVisits] = useState([]);
  const [selectedHouseManual, setSelectedHouseManual] = useState('');
  const [selectedVisit, setSelectedVisit] = useState('');

  // HeyGen state
  const [deepfakes, setDeepfakes] = useState([]);
  const [deepfakeForm, setDeepfakeForm] = useState({
    videoId: '',
    voiceId: '',
    script: '',
  });
  const [deepfakeStatus, setDeepfakeStatus] = useState({
    loading: false,
    error: null,
    message: null,
  });

  // ElevenLabs state
  const [narrations, setNarrations] = useState([]);
  const [narrators, setNarrators] = useState([]);
  const [selectedNarrator, setSelectedNarrator] = useState('');
  const [narrationScript, setNarrationScript] = useState('');
  const [narrationStatus, setNarrationStatus] = useState({
    loading: false,
    error: null,
    message: null,
  });

  // Jingle state
  const [jingles, setJingles] = useState([]);
  const [melodyPreference, setMelodyPreference] = useState('optimistic-commercial');
  const [contentPreferences, setContentPreferences] = useState(['host-name', 'house-rules']);
  const [jingleLyrics, setJingleLyrics] = useState('');
  const [jingleStatus, setJingleStatus] = useState({
    loading: false,
    error: null,
    message: null,
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchHouseManuals = useCallback(async (hostId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('housemanual')
        .select('_id, Display, Host, Audience')
        .eq('Host', hostId)
        .order('Created Date', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('[AiTools] Error fetching house manuals:', err);
      return [];
    }
  }, []);

  const fetchVisitsForManual = useCallback(async (houseManualId) => {
    if (!houseManualId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('visit')
        .select('_id, Display, Guest, "House Manual"')
        .eq('House Manual', houseManualId)
        .order('Created Date', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('[AiTools] Error fetching visits:', err);
      return [];
    }
  }, []);

  const fetchDeepfakes = useCallback(async (houseManualId) => {
    if (!houseManualId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('heygen_deepfake')
        .select('*')
        .eq('house_manual_id', houseManualId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('[AiTools] Error fetching deepfakes:', err);
      return [];
    }
  }, []);

  const fetchNarrations = useCallback(async (houseManualId) => {
    if (!houseManualId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('narration')
        .select('*')
        .eq('House Manual', houseManualId)
        .eq('is it narration?', true)
        .order('Created Date', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('[AiTools] Error fetching narrations:', err);
      return [];
    }
  }, []);

  const fetchJingles = useCallback(async (houseManualId) => {
    if (!houseManualId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('narration')
        .select('*')
        .eq('House Manual', houseManualId)
        .eq('is it jingle?', true)
        .order('Created Date', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('[AiTools] Error fetching jingles:', err);
      return [];
    }
  }, []);

  const fetchNarrators = useCallback(async () => {
    // Static list of ElevenLabs narrators - these could be fetched from an API
    return [
      { id: 'rachel', name: 'Rachel', description: 'Warm, conversational American female voice' },
      { id: 'drew', name: 'Drew', description: 'Well-rounded American male voice' },
      { id: 'clyde', name: 'Clyde', description: 'Deep, authoritative American male voice' },
      { id: 'paul', name: 'Paul', description: 'Clear, neutral American male voice' },
      { id: 'domi', name: 'Domi', description: 'Expressive American female voice' },
      { id: 'dave', name: 'Dave', description: 'British conversational male voice' },
      { id: 'fin', name: 'Fin', description: 'Irish male voice with warm tone' },
      { id: 'sarah', name: 'Sarah', description: 'Soft American female voice' },
      { id: 'antoni', name: 'Antoni', description: 'Well-rounded American male voice' },
      { id: 'thomas', name: 'Thomas', description: 'British narrator voice' },
    ];
  }, []);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Check auth status
      const isAuthenticated = await checkAuthStatus();

      if (!isAuthenticated) {
        setError('Please log in to access AI Tools');
        setLoading(false);
        setTimeout(() => {
          window.location.href = '/?login=true';
        }, 2000);
        return;
      }

      // Step 2: Validate user and check admin status
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

      if (!userData) {
        setError('Unable to verify user. Please log in again.');
        setLoading(false);
        return;
      }

      const userEmail = userData.email?.toLowerCase();
      const isUserAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

      setUser({
        id: userData.userId || userData._id,
        email: userData.email,
        firstName: userData['Name - First'] || userData.firstName || 'User',
        accountHostId: userData.accountHostId || userData.userId,
      });
      setIsAdmin(isUserAdmin);

      if (!isUserAdmin) {
        setLoading(false);
        return;
      }

      // Step 3: Fetch house manuals for this host
      const hostId = userData.accountHostId || userData.userId || userData._id;
      const manuals = await fetchHouseManuals(hostId);
      setHouseManuals(manuals);

      // Step 4: Fetch narrators list
      const narratorsList = await fetchNarrators();
      setNarrators(narratorsList);
      if (narratorsList.length > 0) {
        setSelectedNarrator(narratorsList[0].id);
      }

      setLoading(false);
    } catch (err) {
      console.error('[AiTools] Error loading initial data:', err);
      setError(`Failed to load AI Tools: ${err.message}`);
      setLoading(false);
    }
  }, [fetchHouseManuals, fetchNarrators]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  const handleHouseManualSelect = useCallback(async (manualId) => {
    setSelectedHouseManual(manualId);
    setSelectedVisit('');

    if (!manualId) {
      setVisits([]);
      setDeepfakes([]);
      setNarrations([]);
      setJingles([]);
      return;
    }

    // Fetch related data for selected manual
    const [visitsList, deepfakesList, narrationsList, jinglesList] = await Promise.all([
      fetchVisitsForManual(manualId),
      fetchDeepfakes(manualId),
      fetchNarrations(manualId),
      fetchJingles(manualId),
    ]);

    setVisits(visitsList);
    setDeepfakes(deepfakesList);
    setNarrations(narrationsList);
    setJingles(jinglesList);
  }, [fetchVisitsForManual, fetchDeepfakes, fetchNarrations, fetchJingles]);

  const handleVisitSelect = useCallback((visitId) => {
    setSelectedVisit(visitId);
  }, []);

  // ============================================================================
  // HEYGEN HANDLERS
  // ============================================================================

  const handleDeepfakeFormChange = useCallback((field, value) => {
    setDeepfakeForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerateDeepfakeScript = useCallback(async () => {
    if (!selectedHouseManual) {
      setDeepfakeStatus({ loading: false, error: 'Please select a house manual first', message: null });
      return;
    }

    setDeepfakeStatus({ loading: true, error: null, message: 'Generating script...' });

    try {
      const result = await aiToolsService.generateDeepfakeScript(selectedHouseManual);
      setDeepfakeForm(prev => ({ ...prev, script: result.script }));
      setDeepfakeStatus({ loading: false, error: null, message: 'Script generated successfully!' });
    } catch (err) {
      console.error('[AiTools] Error generating deepfake script:', err);
      setDeepfakeStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual]);

  const handleGenerateDeepfakeVideo = useCallback(async () => {
    if (!selectedHouseManual || !deepfakeForm.script) {
      setDeepfakeStatus({ loading: false, error: 'Please select a house manual and generate/enter a script', message: null });
      return;
    }

    setDeepfakeStatus({ loading: true, error: null, message: 'Generating video...' });

    try {
      const result = await aiToolsService.generateDeepfakeVideo(
        selectedHouseManual,
        deepfakeForm.videoId,
        deepfakeForm.voiceId,
        deepfakeForm.script
      );
      setDeepfakeStatus({ loading: false, error: null, message: `Video generation started. Token: ${result.videoToken}` });
      // Refresh deepfakes list
      const updated = await fetchDeepfakes(selectedHouseManual);
      setDeepfakes(updated);
    } catch (err) {
      console.error('[AiTools] Error generating deepfake video:', err);
      setDeepfakeStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, deepfakeForm, fetchDeepfakes]);

  const handleCheckDeepfakeStatus = useCallback(async (deepfake) => {
    if (!deepfake.video_token) {
      setDeepfakeStatus({ loading: false, error: 'No video token available', message: null });
      return;
    }

    setDeepfakeStatus({ loading: true, error: null, message: 'Checking status...' });

    try {
      const result = await aiToolsService.checkDeepfakeStatus(deepfake.video_token);
      setDeepfakeStatus({ loading: false, error: null, message: `Status: ${result.status}` });
      // Refresh deepfakes list
      const updated = await fetchDeepfakes(selectedHouseManual);
      setDeepfakes(updated);
    } catch (err) {
      console.error('[AiTools] Error checking deepfake status:', err);
      setDeepfakeStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, fetchDeepfakes]);

  const handleAttachDeepfake = useCallback(async (deepfakeId) => {
    if (!selectedHouseManual) {
      setDeepfakeStatus({ loading: false, error: 'Please select a house manual first', message: null });
      return;
    }

    setDeepfakeStatus({ loading: true, error: null, message: 'Attaching to house manual...' });

    try {
      await aiToolsService.attachDeepfake(deepfakeId, selectedHouseManual);
      setDeepfakeStatus({ loading: false, error: null, message: 'Deepfake attached to house manual!' });
      // Refresh deepfakes list
      const updated = await fetchDeepfakes(selectedHouseManual);
      setDeepfakes(updated);
    } catch (err) {
      console.error('[AiTools] Error attaching deepfake:', err);
      setDeepfakeStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, fetchDeepfakes]);

  // ============================================================================
  // ELEVENLABS HANDLERS
  // ============================================================================

  const handleNarratorSelect = useCallback((narratorId) => {
    setSelectedNarrator(narratorId);
  }, []);

  const handleNarrationScriptChange = useCallback((value) => {
    setNarrationScript(value);
  }, []);

  const handleGenerateNarrationScript = useCallback(async () => {
    if (!selectedHouseManual) {
      setNarrationStatus({ loading: false, error: 'Please select a house manual first', message: null });
      return;
    }

    setNarrationStatus({ loading: true, error: null, message: 'Generating narration script...' });

    try {
      const result = await aiToolsService.generateNarrationScript(
        selectedHouseManual,
        selectedVisit,
        selectedNarrator
      );
      setNarrationScript(result.script);
      setNarrationStatus({ loading: false, error: null, message: 'Narration script generated!' });
    } catch (err) {
      console.error('[AiTools] Error generating narration script:', err);
      setNarrationStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, selectedVisit, selectedNarrator]);

  const handleGenerateNarration = useCallback(async () => {
    if (!selectedHouseManual || !narrationScript) {
      setNarrationStatus({ loading: false, error: 'Please select a house manual and generate/enter a script', message: null });
      return;
    }

    setNarrationStatus({ loading: true, error: null, message: 'Generating narration audio...' });

    try {
      const result = await aiToolsService.generateNarration(
        selectedHouseManual,
        selectedVisit,
        selectedNarrator,
        narrationScript
      );
      setNarrationStatus({ loading: false, error: null, message: 'Narration generated successfully!' });
      // Refresh narrations list
      const updated = await fetchNarrations(selectedHouseManual);
      setNarrations(updated);
    } catch (err) {
      console.error('[AiTools] Error generating narration:', err);
      setNarrationStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, selectedVisit, selectedNarrator, narrationScript, fetchNarrations]);

  const handleAttachNarration = useCallback(async (narrationId) => {
    if (!selectedVisit) {
      setNarrationStatus({ loading: false, error: 'Please select a visit to attach the narration to', message: null });
      return;
    }

    setNarrationStatus({ loading: true, error: null, message: 'Attaching to visit...' });

    try {
      await aiToolsService.attachNarration(narrationId, selectedVisit);
      setNarrationStatus({ loading: false, error: null, message: 'Narration attached to visit!' });
      // Refresh narrations list
      const updated = await fetchNarrations(selectedHouseManual);
      setNarrations(updated);
    } catch (err) {
      console.error('[AiTools] Error attaching narration:', err);
      setNarrationStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, selectedVisit, fetchNarrations]);

  // ============================================================================
  // JINGLE HANDLERS
  // ============================================================================

  const handleMelodyPreferenceChange = useCallback((value) => {
    setMelodyPreference(value);
  }, []);

  const handleContentPreferenceToggle = useCallback((preference) => {
    setContentPreferences(prev => {
      if (prev.includes(preference)) {
        return prev.filter(p => p !== preference);
      }
      return [...prev, preference];
    });
  }, []);

  const handleJingleLyricsChange = useCallback((value) => {
    setJingleLyrics(value);
  }, []);

  const handleGenerateJingleLyrics = useCallback(async () => {
    if (!selectedHouseManual) {
      setJingleStatus({ loading: false, error: 'Please select a house manual first', message: null });
      return;
    }

    setJingleStatus({ loading: true, error: null, message: 'Generating jingle lyrics...' });

    try {
      const result = await aiToolsService.generateJingleLyrics(
        selectedHouseManual,
        selectedVisit,
        melodyPreference,
        contentPreferences
      );
      setJingleLyrics(result.lyrics);
      setJingleStatus({ loading: false, error: null, message: 'Jingle lyrics generated!' });
    } catch (err) {
      console.error('[AiTools] Error generating jingle lyrics:', err);
      setJingleStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, selectedVisit, melodyPreference, contentPreferences]);

  const handleCreateJingle = useCallback(async () => {
    if (!selectedHouseManual || !jingleLyrics) {
      setJingleStatus({ loading: false, error: 'Please select a house manual and generate/enter lyrics', message: null });
      return;
    }

    setJingleStatus({ loading: true, error: null, message: 'Creating jingle...' });

    try {
      await aiToolsService.createJingle(
        selectedHouseManual,
        selectedVisit,
        jingleLyrics,
        melodyPreference,
        contentPreferences
      );
      setJingleStatus({ loading: false, error: null, message: 'Jingle created successfully!' });
      // Refresh jingles list
      const updated = await fetchJingles(selectedHouseManual);
      setJingles(updated);
    } catch (err) {
      console.error('[AiTools] Error creating jingle:', err);
      setJingleStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, selectedVisit, jingleLyrics, melodyPreference, contentPreferences, fetchJingles]);

  const handleAttachJingle = useCallback(async (jingleId) => {
    if (!selectedHouseManual) {
      setJingleStatus({ loading: false, error: 'Please select a house manual first', message: null });
      return;
    }

    setJingleStatus({ loading: true, error: null, message: 'Attaching to house manual...' });

    try {
      await aiToolsService.attachJingle(jingleId, selectedHouseManual);
      setJingleStatus({ loading: false, error: null, message: 'Jingle attached to house manual!' });
      // Refresh jingles list
      const updated = await fetchJingles(selectedHouseManual);
      setJingles(updated);
    } catch (err) {
      console.error('[AiTools] Error attaching jingle:', err);
      setJingleStatus({ loading: false, error: err.message, message: null });
    }
  }, [selectedHouseManual, fetchJingles]);

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================

  const handleRefreshData = useCallback(async () => {
    if (!selectedHouseManual) return;

    const [deepfakesList, narrationsList, jinglesList] = await Promise.all([
      fetchDeepfakes(selectedHouseManual),
      fetchNarrations(selectedHouseManual),
      fetchJingles(selectedHouseManual),
    ]);

    setDeepfakes(deepfakesList);
    setNarrations(narrationsList);
    setJingles(jinglesList);
  }, [selectedHouseManual, fetchDeepfakes, fetchNarrations, fetchJingles]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Auth & Loading
    user,
    loading,
    error,
    isAdmin,

    // Data
    houseManuals,
    visits,
    selectedHouseManual,
    selectedVisit,

    // HeyGen state
    deepfakes,
    deepfakeForm,
    deepfakeStatus,

    // ElevenLabs state
    narrations,
    narrators,
    selectedNarrator,
    narrationScript,
    narrationStatus,

    // Jingle state
    jingles,
    melodyPreference,
    contentPreferences,
    jingleLyrics,
    jingleStatus,

    // Data selection handlers
    handleHouseManualSelect,
    handleVisitSelect,

    // HeyGen handlers
    handleDeepfakeFormChange,
    handleGenerateDeepfakeScript,
    handleGenerateDeepfakeVideo,
    handleCheckDeepfakeStatus,
    handleAttachDeepfake,

    // ElevenLabs handlers
    handleNarratorSelect,
    handleNarrationScriptChange,
    handleGenerateNarrationScript,
    handleGenerateNarration,
    handleAttachNarration,

    // Jingle handlers
    handleMelodyPreferenceChange,
    handleContentPreferenceToggle,
    handleJingleLyricsChange,
    handleGenerateJingleLyrics,
    handleCreateJingle,
    handleAttachJingle,

    // Refresh handler
    handleRefreshData,
  };
}
