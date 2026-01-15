/**
 * AudioRecorder Component
 *
 * Record or upload audio for transcription into house manual content.
 * Uses MediaRecorder API for recording and Whisper API for transcription.
 *
 * Features:
 * - In-browser audio recording
 * - Recording timer
 * - Audio playback
 * - File upload option
 * - Transcription with house manual parsing
 *
 * @module AITools/AudioRecorder
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

// Icons
const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="ai-tools-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Allowed audio types for upload
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
];
const MAX_AUDIO_SIZE_MB = 25;

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert blob to base64
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * AudioRecorder - Record or upload audio for house manual transcription
 */
export default function AudioRecorder({ onDataExtracted }) {
  const {
    setProcessingState,
    setError,
    updateExtractedData,
    processingStates,
    errors,
    successStates,
    INPUT_METHODS,
  } = useAITools();

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [inputMode, setInputMode] = useState('record'); // 'record' or 'upload'

  const isProcessing = processingStates[INPUT_METHODS.AUDIO_RECORD];
  const error = errors[INPUT_METHODS.AUDIO_RECORD];
  const isSuccess = successStates[INPUT_METHODS.AUDIO_RECORD];

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimized for speech
        },
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[AudioRecorder] Error accessing microphone:', err);
      setError(
        INPUT_METHODS.AUDIO_RECORD,
        'Could not access microphone. Please allow microphone permissions.'
      );
    }
  }, [setError, INPUT_METHODS]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_AUDIO_TYPES.some((type) => file.type.startsWith(type.split('/')[0]))) {
      setError(INPUT_METHODS.AUDIO_RECORD, 'Please upload an audio file (MP3, WAV, M4A, etc.)');
      return;
    }

    // Validate size
    if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      setError(INPUT_METHODS.AUDIO_RECORD, `Audio file must be smaller than ${MAX_AUDIO_SIZE_MB}MB`);
      return;
    }

    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscription('');
  }, [setError, INPUT_METHODS]);

  /**
   * Toggle playback
   */
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  /**
   * Handle audio ended
   */
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Clear recording
   */
  const handleClear = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setTranscription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [audioUrl]);

  /**
   * Transcribe audio
   */
  const handleTranscribe = useCallback(async () => {
    if (!audioBlob) return;

    setProcessingState(INPUT_METHODS.AUDIO_RECORD, true);

    try {
      const base64 = await blobToBase64(audioBlob);

      // Determine format from blob type
      let format = 'webm';
      if (audioBlob.type) {
        const match = audioBlob.type.match(/audio\/(\w+)/);
        if (match) format = match[1];
      }

      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'transcribe_audio',
          payload: {
            audio: base64,
            format,
            parseAfterTranscribe: true,
          },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to transcribe audio');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to transcribe audio');
      }

      const { text, parsed } = data.data;
      setTranscription(text);

      // Update with parsed data if available
      if (parsed && Object.keys(parsed).length > 0) {
        updateExtractedData(INPUT_METHODS.AUDIO_RECORD, parsed);
        onDataExtracted?.(parsed);

        if (window.showToast) {
          window.showToast('Audio transcribed and parsed!', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast('Audio transcribed! Review the text below.', 'success');
        }
      }
    } catch (err) {
      console.error('[AudioRecorder] Error:', err);
      setError(INPUT_METHODS.AUDIO_RECORD, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.AUDIO_RECORD, false);
    }
  }, [audioBlob, setProcessingState, setError, updateExtractedData, onDataExtracted, INPUT_METHODS]);

  return (
    <div className="ai-tools-audio">
      <div className="ai-tools-audio__header">
        <h3 className="ai-tools-audio__title">
          <MicIcon />
          Voice Recording
        </h3>
        <p className="ai-tools-audio__description">
          Record yourself describing your house manual, or upload an existing audio file.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="ai-tools-audio__mode-toggle">
        <button
          type="button"
          className={`ai-tools-audio__mode-btn ${inputMode === 'record' ? 'ai-tools-audio__mode-btn--active' : ''}`}
          onClick={() => setInputMode('record')}
        >
          <MicIcon />
          Record
        </button>
        <button
          type="button"
          className={`ai-tools-audio__mode-btn ${inputMode === 'upload' ? 'ai-tools-audio__mode-btn--active' : ''}`}
          onClick={() => setInputMode('upload')}
        >
          <UploadIcon />
          Upload
        </button>
      </div>

      {/* Recording interface */}
      {inputMode === 'record' && !audioBlob && (
        <div className="ai-tools-audio__recorder">
          <button
            type="button"
            className={`ai-tools-audio__record-btn ${isRecording ? 'ai-tools-audio__record-btn--recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </button>

          {isRecording && (
            <div className="ai-tools-audio__recording-indicator">
              <span className="ai-tools-audio__recording-dot" />
              Recording... {formatTime(recordingTime)}
            </div>
          )}

          {!isRecording && (
            <p className="ai-tools-audio__record-hint">
              Click to start recording
            </p>
          )}
        </div>
      )}

      {/* Upload interface */}
      {inputMode === 'upload' && !audioBlob && (
        <div className="ai-tools-audio__uploader">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="ai-tools-audio__upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            Select Audio File
          </button>
          <p className="ai-tools-audio__upload-hint">
            MP3, WAV, M4A, OGG, FLAC up to {MAX_AUDIO_SIZE_MB}MB
          </p>
        </div>
      )}

      {/* Audio player */}
      {audioBlob && audioUrl && (
        <div className="ai-tools-audio__player">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
          />

          <div className="ai-tools-audio__player-controls">
            <button
              type="button"
              className="ai-tools-audio__play-btn"
              onClick={togglePlayback}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <span className="ai-tools-audio__duration">
              {inputMode === 'record' ? formatTime(recordingTime) : 'Uploaded audio'}
            </span>

            <button
              type="button"
              className="ai-tools-audio__clear-btn"
              onClick={handleClear}
              aria-label="Clear recording"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {/* Transcription result */}
      {transcription && (
        <div className="ai-tools-audio__transcription">
          <h4>Transcription:</h4>
          <p>{transcription}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="ai-tools-audio__error">
          {error}
        </div>
      )}

      {/* Transcribe button */}
      {audioBlob && !transcription && (
        <button
          type="button"
          className="ai-tools-audio__submit"
          onClick={handleTranscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <SpinnerIcon />
              Transcribing...
            </>
          ) : (
            <>
              <MicIcon />
              Transcribe Audio
            </>
          )}
        </button>
      )}

      <p className="ai-tools-audio__hint">
        Tip: Speak clearly about WiFi details, check-in instructions, house rules, and other important information.
      </p>
    </div>
  );
}
