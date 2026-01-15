# Implementation Plan: AI Tools Suite Integration for House Manual Flow

## Overview
Convert and integrate 5 AI-powered input methods from an external React/TypeScript/Zustand repository into Split Lease's React 18 + Vite + JavaScript environment as shared island components. These components will power the house manual creation flow, enabling hosts to populate house manual content using various AI-assisted methods.

## Success Criteria
- [ ] All 5 AI input components converted from TypeScript to JavaScript (JSX)
- [ ] State management converted from Zustand to React hooks/context
- [ ] Components follow Split Lease's hollow component pattern
- [ ] 6 Supabase Edge Functions created and deployed for AI operations
- [ ] Components integrate with existing Split Lease authentication
- [ ] AI credits deduction system functional
- [ ] All components follow Split Lease styling patterns
- [ ] House manual page created and integrated with route registry

---

## Context & References

### Source Components (External ai-tools Repository)
| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `WifiPhotoExtractor.tsx` | Extract WiFi credentials from photos | Image upload, OCR via Vision API |
| `FreeformTextInput.tsx` | Natural language input | AI parsing to structured format |
| `PdfDocUploader.tsx` | Import from PDFs/Google Docs | Document parsing, text extraction |
| `PhoneCallInterface.tsx` | AI-powered phone calls | Twilio integration, real-time transcription |
| `AudioRecorder.tsx` | Voice recording/upload | Whisper API transcription |

### Target Files (Split Lease - To Be Created)
| File | Location | Purpose |
|------|----------|---------|
| `AIToolsProvider.jsx` | `app/src/islands/shared/AITools/` | Context provider for AI tools state |
| `useAIToolsState.js` | `app/src/islands/shared/AITools/` | Custom hook replacing Zustand store |
| `WifiPhotoExtractor.jsx` | `app/src/islands/shared/AITools/` | WiFi OCR component |
| `FreeformTextInput.jsx` | `app/src/islands/shared/AITools/` | Freeform text AI parsing |
| `PdfDocUploader.jsx` | `app/src/islands/shared/AITools/` | PDF/Google Doc import |
| `PhoneCallInterface.jsx` | `app/src/islands/shared/AITools/` | AI phone call component |
| `AudioRecorder.jsx` | `app/src/islands/shared/AITools/` | Voice recording component |
| `HouseManualPage.jsx` | `app/src/islands/pages/HouseManualPage/` | Main house manual page |
| `useHouseManualPageLogic.js` | `app/src/islands/pages/HouseManualPage/` | Hollow component logic hook |
| `house-manual.jsx` | `app/src/` | Entry point JSX |
| `house-manual.html` | `app/public/` | HTML template |

### Edge Functions (To Be Created)
| Function | Location | Purpose |
|----------|----------|---------|
| `house-manual/index.ts` | `supabase/functions/house-manual/` | Main router for house manual AI operations |
| `house-manual/handlers/parseText.ts` | `supabase/functions/house-manual/handlers/` | Parse freeform text to structured format |
| `house-manual/handlers/transcribeAudio.ts` | `supabase/functions/house-manual/handlers/` | Whisper transcription |
| `house-manual/handlers/extractWifi.ts` | `supabase/functions/house-manual/handlers/` | OCR for WiFi credentials |
| `house-manual/handlers/initiateCall.ts` | `supabase/functions/house-manual/handlers/` | Twilio AI call |
| `house-manual/handlers/parseDocument.ts` | `supabase/functions/house-manual/handlers/` | PDF text extraction |
| `house-manual/handlers/parseGoogleDoc.ts` | `supabase/functions/house-manual/handlers/` | Google Doc URL parsing |

### Existing Files to Reference
| File | Purpose |
|------|---------|
| `app/src/routes.config.js` | Route registry - add house-manual route |
| `app/src/lib/supabase.js` | Supabase client for API calls |
| `app/src/lib/auth.js` | Authentication utilities |
| `app/src/islands/shared/AIImportAssistantModal/AIImportAssistantModal.jsx` | Reference for AI UI patterns |
| `app/src/islands/shared/NotificationSettingsIsland/useNotificationSettings.js` | Reference for hook patterns |
| `supabase/functions/ai-gateway/index.ts` | Reference for Edge Function patterns |
| `supabase/functions/_shared/cors.ts` | CORS headers |
| `supabase/functions/_shared/errors.ts` | Error handling utilities |
| `supabase/functions/_shared/openai.ts` | OpenAI client wrapper |

### Related Documentation
- `app/CLAUDE.md` - Frontend architecture patterns
- `supabase/CLAUDE.md` - Edge Functions patterns
- `.claude/CLAUDE.md` - Project conventions and rules

### Existing Patterns to Follow
1. **Hollow Component Pattern**: Page components delegate ALL logic to `useXxxPageLogic` hooks
2. **Four-Layer Logic**: calculators -> rules -> processors -> workflows
3. **Action-Based Edge Functions**: All functions use `{ action, payload }` request pattern
4. **No Fallback Principle**: Fail fast, surface real errors
5. **Day Indexing**: JavaScript 0-6 (though not relevant for this feature)

---

## Implementation Steps

### Step 1: Create Route and Entry Point
**Files:**
- `app/src/routes.config.js`
- `app/public/house-manual.html`
- `app/src/house-manual.jsx`

**Purpose:** Register the house manual route in the route registry and create entry point

**Details:**
1. Add new route to `routes.config.js`:
   ```javascript
   {
     path: '/house-manual',
     file: 'house-manual.html',
     aliases: ['/house-manual.html'],
     protected: true,
     cloudflareInternal: true,
     internalName: 'house-manual-view',
     hasDynamicSegment: false
   }
   ```
2. Create `house-manual.html` following existing template pattern
3. Create `house-manual.jsx` entry point mounting `HouseManualPage`

**Validation:** Run `bun run generate-routes` and verify no errors

---

### Step 2: Create AI Tools Context Provider and State Hook
**Files:**
- `app/src/islands/shared/AITools/AIToolsProvider.jsx`
- `app/src/islands/shared/AITools/useAIToolsState.js`
- `app/src/islands/shared/AITools/index.js`

**Purpose:** Replace Zustand store with React Context + hooks for AI tools state management

**Details:**

**useAIToolsState.js** - Core state management hook:
```javascript
import { useState, useCallback } from 'react';

// Input method types
const INPUT_METHODS = {
  FREEFORM_TEXT: 'freeform_text',
  WIFI_PHOTO: 'wifi_photo',
  PDF_DOC: 'pdf_doc',
  PHONE_CALL: 'phone_call',
  AUDIO_RECORD: 'audio_record',
};

export function useAIToolsState(initialData = {}) {
  // Active input method
  const [activeMethod, setActiveMethod] = useState(null);

  // Loading/processing states per method
  const [processingStates, setProcessingStates] = useState({});

  // Extracted data from each method
  const [extractedData, setExtractedData] = useState(initialData);

  // Error states per method
  const [errors, setErrors] = useState({});

  // AI credits remaining
  const [aiCredits, setAiCredits] = useState(null);

  // ... handler functions

  return {
    activeMethod,
    setActiveMethod,
    processingStates,
    extractedData,
    errors,
    aiCredits,
    // ... exposed handlers
    INPUT_METHODS,
  };
}
```

**AIToolsProvider.jsx** - Context provider:
```javascript
import { createContext, useContext } from 'react';
import { useAIToolsState } from './useAIToolsState';

const AIToolsContext = createContext(null);

export function AIToolsProvider({ children, initialData }) {
  const state = useAIToolsState(initialData);
  return (
    <AIToolsContext.Provider value={state}>
      {children}
    </AIToolsContext.Provider>
  );
}

export function useAITools() {
  const context = useContext(AIToolsContext);
  if (!context) {
    throw new Error('useAITools must be used within AIToolsProvider');
  }
  return context;
}
```

**Validation:** Import in test page and verify context provides state correctly

---

### Step 3: Create Base Edge Function Structure
**Files:**
- `supabase/functions/house-manual/index.ts`
- `supabase/functions/house-manual/deno.json`

**Purpose:** Create the main Edge Function router for house manual AI operations

**Details:**

**index.ts** - Main router following existing patterns:
```typescript
/**
 * House Manual Edge Function
 * Split Lease - AI-Powered House Manual Creation
 *
 * Routes AI requests to appropriate handlers for house manual content extraction
 *
 * Actions:
 * - parse_text: Parse freeform text to structured format
 * - transcribe_audio: Transcribe audio via Whisper
 * - extract_wifi: Extract WiFi credentials from image via OCR
 * - initiate_call: Start AI phone call
 * - parse_document: Parse PDF files
 * - parse_google_doc: Parse Google Doc URLs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ValidationError, AuthenticationError } from "../_shared/errors.ts";

const ALLOWED_ACTIONS = [
  "parse_text",
  "transcribe_audio",
  "extract_wifi",
  "initiate_call",
  "parse_document",
  "parse_google_doc",
] as const;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ... authentication and routing logic
});
```

**deno.json** - Import map:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

**Validation:** Deploy with `supabase functions deploy house-manual` and test health endpoint

---

### Step 4: Create Freeform Text Input Component and Handler
**Files:**
- `app/src/islands/shared/AITools/FreeformTextInput.jsx`
- `supabase/functions/house-manual/handlers/parseText.ts`
- `supabase/functions/ai-gateway/prompts/parse-house-manual-text.ts`

**Purpose:** Enable hosts to input house manual content in natural language, parsed by AI

**Details:**

**FreeformTextInput.jsx** - Component structure:
```javascript
import { useState, useCallback } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

export default function FreeformTextInput({ onDataExtracted }) {
  const { setProcessingState, setError, setExtractedData } = useAITools();
  const [text, setText] = useState('');

  const handleSubmit = useCallback(async () => {
    setProcessingState('freeform_text', true);

    try {
      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_text',
          payload: { text }
        }
      });

      if (error) throw error;

      setExtractedData('freeform_text', data.data);
      onDataExtracted?.(data.data);
    } catch (err) {
      setError('freeform_text', err.message);
    } finally {
      setProcessingState('freeform_text', false);
    }
  }, [text]);

  return (
    <div className="ai-tools-freeform">
      {/* Textarea, submit button, loading state */}
    </div>
  );
}
```

**parseText.ts** - Handler:
```typescript
export async function handleParseText(
  supabaseClient: SupabaseClient,
  payload: { text: string }
): Promise<Response> {
  // Call ai-gateway with parse-house-manual-text prompt
  // Return structured data
}
```

**parse-house-manual-text.ts** - AI prompt:
```typescript
import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "parse-house-manual-text",
  name: "Parse House Manual Text",
  description: "Extract structured house manual data from freeform text",
  systemPrompt: `You are an expert at extracting house manual information.
Extract the following fields if present:
- wifi_name: WiFi network name
- wifi_password: WiFi password
- check_in_instructions: Check-in process
- check_out_instructions: Check-out process
- parking_info: Parking details
- emergency_contacts: Emergency contact information
- house_rules: List of house rules
- appliance_instructions: How to use appliances
- local_recommendations: Nearby restaurants, attractions
Return as JSON.`,
  userPromptTemplate: "Extract house manual information from:\n\n{{text}}",
  defaults: {
    model: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2000,
  },
  responseFormat: "json",
});
```

**Validation:** Test with sample text input, verify structured data extraction

---

### Step 5: Create WiFi Photo Extractor Component and Handler
**Files:**
- `app/src/islands/shared/AITools/WifiPhotoExtractor.jsx`
- `supabase/functions/house-manual/handlers/extractWifi.ts`

**Purpose:** Extract WiFi credentials from photos of router labels or WiFi cards

**Details:**

**WifiPhotoExtractor.jsx** - Component structure:
```javascript
import { useState, useCallback, useRef } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

export default function WifiPhotoExtractor({ onDataExtracted }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const { setProcessingState, setError, setExtractedData } = useAITools();

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64 for API
    setProcessingState('wifi_photo', true);

    try {
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'extract_wifi',
          payload: { image: base64, mimeType: file.type }
        }
      });

      if (error) throw error;

      setExtractedData('wifi_photo', data.data);
      onDataExtracted?.(data.data);
    } catch (err) {
      setError('wifi_photo', err.message);
    } finally {
      setProcessingState('wifi_photo', false);
    }
  }, []);

  return (
    <div className="ai-tools-wifi-extractor">
      {/* File input, preview, extracted data display */}
    </div>
  );
}
```

**extractWifi.ts** - Handler using OpenAI Vision:
```typescript
export async function handleExtractWifi(
  payload: { image: string; mimeType: string }
): Promise<Response> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  // Call GPT-4 Vision API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract WiFi credentials from this image. Return JSON with wifi_name and wifi_password fields."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${payload.mimeType};base64,${payload.image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })
  });

  // Parse and return structured data
}
```

**Validation:** Test with sample WiFi label photos, verify credential extraction

---

### Step 6: Create Audio Recorder Component and Handler
**Files:**
- `app/src/islands/shared/AITools/AudioRecorder.jsx`
- `supabase/functions/house-manual/handlers/transcribeAudio.ts`

**Purpose:** Record or upload audio for transcription via Whisper API

**Details:**

**AudioRecorder.jsx** - Component structure:
```javascript
import { useState, useCallback, useRef } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

export default function AudioRecorder({ onDataExtracted }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const { setProcessingState, setError, setExtractedData } = useAITools();

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const transcribe = useCallback(async () => {
    if (!audioBlob) return;

    setProcessingState('audio_record', true);

    try {
      const base64 = await blobToBase64(audioBlob);

      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'transcribe_audio',
          payload: { audio: base64 }
        }
      });

      if (error) throw error;

      // After transcription, parse the text
      const parsedData = await parseTranscription(data.data.text);
      setExtractedData('audio_record', parsedData);
      onDataExtracted?.(parsedData);
    } catch (err) {
      setError('audio_record', err.message);
    } finally {
      setProcessingState('audio_record', false);
    }
  }, [audioBlob]);

  return (
    <div className="ai-tools-audio-recorder">
      {/* Record button, waveform visualization, transcription display */}
    </div>
  );
}
```

**transcribeAudio.ts** - Handler using Whisper:
```typescript
export async function handleTranscribeAudio(
  payload: { audio: string }
): Promise<Response> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  // Decode base64 to binary
  const audioData = Uint8Array.from(atob(payload.audio), c => c.charCodeAt(0));

  // Create form data for Whisper API
  const formData = new FormData();
  formData.append('file', new Blob([audioData], { type: 'audio/webm' }), 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData
  });

  const result = await response.json();

  return new Response(JSON.stringify({
    success: true,
    data: { text: result.text }
  }), { headers: corsHeaders });
}
```

**Validation:** Test recording and file upload, verify transcription accuracy

---

### Step 7: Create PDF/Document Uploader Component and Handler
**Files:**
- `app/src/islands/shared/AITools/PdfDocUploader.jsx`
- `supabase/functions/house-manual/handlers/parseDocument.ts`
- `supabase/functions/house-manual/handlers/parseGoogleDoc.ts`

**Purpose:** Import house manual content from PDF files or Google Docs

**Details:**

**PdfDocUploader.jsx** - Component structure:
```javascript
import { useState, useCallback, useRef } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

export default function PdfDocUploader({ onDataExtracted }) {
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'url'
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const fileInputRef = useRef(null);
  const { setProcessingState, setError, setExtractedData } = useAITools();

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingState('pdf_doc', true);

    try {
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_document',
          payload: { document: base64, fileName: file.name, mimeType: file.type }
        }
      });

      if (error) throw error;

      setExtractedData('pdf_doc', data.data);
      onDataExtracted?.(data.data);
    } catch (err) {
      setError('pdf_doc', err.message);
    } finally {
      setProcessingState('pdf_doc', false);
    }
  }, []);

  const handleGoogleDocImport = useCallback(async () => {
    if (!googleDocUrl) return;

    setProcessingState('pdf_doc', true);

    try {
      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_google_doc',
          payload: { url: googleDocUrl }
        }
      });

      if (error) throw error;

      setExtractedData('pdf_doc', data.data);
      onDataExtracted?.(data.data);
    } catch (err) {
      setError('pdf_doc', err.message);
    } finally {
      setProcessingState('pdf_doc', false);
    }
  }, [googleDocUrl]);

  return (
    <div className="ai-tools-pdf-uploader">
      {/* Tab toggle, file upload, Google Doc URL input */}
    </div>
  );
}
```

**parseDocument.ts** - PDF text extraction:
```typescript
export async function handleParseDocument(
  payload: { document: string; fileName: string; mimeType: string }
): Promise<Response> {
  // Use pdf-parse or similar for text extraction
  // Then parse with AI gateway for structured data
}
```

**parseGoogleDoc.ts** - Google Doc fetching:
```typescript
export async function handleParseGoogleDoc(
  payload: { url: string }
): Promise<Response> {
  // Extract doc ID from URL
  // Use Google Docs API to fetch content
  // Parse with AI gateway for structured data
}
```

**Validation:** Test with sample PDFs and Google Doc URLs

---

### Step 8: Create Phone Call Interface Component and Handler
**Files:**
- `app/src/islands/shared/AITools/PhoneCallInterface.jsx`
- `supabase/functions/house-manual/handlers/initiateCall.ts`

**Purpose:** Enable AI-powered phone calls to extract house manual information

**Details:**

**PhoneCallInterface.jsx** - Component structure:
```javascript
import { useState, useCallback, useEffect } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

export default function PhoneCallInterface({ onDataExtracted }) {
  const [callStatus, setCallStatus] = useState('idle'); // idle, ringing, in_progress, completed
  const [callId, setCallId] = useState(null);
  const [transcription, setTranscription] = useState('');
  const { setProcessingState, setError, setExtractedData } = useAITools();

  const initiateCall = useCallback(async () => {
    setProcessingState('phone_call', true);
    setCallStatus('ringing');

    try {
      const { data, error } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'initiate_call',
          payload: {
            purpose: 'house_manual_collection',
            // Twilio will call the user and AI will guide conversation
          }
        }
      });

      if (error) throw error;

      setCallId(data.data.callId);
      setCallStatus('in_progress');

      // Poll for call completion or use webhook
      pollCallStatus(data.data.callId);
    } catch (err) {
      setError('phone_call', err.message);
      setCallStatus('idle');
    }
  }, []);

  const pollCallStatus = useCallback(async (id) => {
    // Poll for call completion and transcription
    // When complete, parse transcription for structured data
  }, []);

  return (
    <div className="ai-tools-phone-call">
      {/* Call status, initiate button, transcription display */}
    </div>
  );
}
```

**initiateCall.ts** - Twilio integration:
```typescript
export async function handleInitiateCall(
  payload: { purpose: string }
): Promise<Response> {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  // Create Twilio call with AI-guided TwiML
  // Store call ID for status tracking
  // Return call ID for frontend polling
}
```

**Validation:** Test call initiation (may require Twilio sandbox for development)

---

### Step 9: Create House Manual Page Component
**Files:**
- `app/src/islands/pages/HouseManualPage/HouseManualPage.jsx`
- `app/src/islands/pages/HouseManualPage/useHouseManualPageLogic.js`
- `app/src/islands/pages/HouseManualPage/index.js`
- `app/src/styles/components/house-manual.css`

**Purpose:** Main house manual page integrating all AI tools

**Details:**

**useHouseManualPageLogic.js** - Page logic hook:
```javascript
import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, getUserId, getUserType } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

export function useHouseManualPageLogic() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userType, setUserType] = useState(null);

  // House manual data
  const [manualData, setManualData] = useState({
    wifi_name: '',
    wifi_password: '',
    check_in_instructions: '',
    check_out_instructions: '',
    parking_info: '',
    emergency_contacts: [],
    house_rules: [],
    appliance_instructions: '',
    local_recommendations: [],
  });

  // Active AI tool
  const [activeToolTab, setActiveToolTab] = useState('freeform');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = await checkAuthStatus();
      setIsAuthenticated(isLoggedIn);

      if (isLoggedIn) {
        setUserId(getUserId());
        setUserType(getUserType());
      } else {
        window.location.href = '/?showLogin=true';
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Handle data extraction from AI tools
  const handleDataExtracted = useCallback((extractedFields) => {
    setManualData(prev => ({
      ...prev,
      ...extractedFields
    }));
  }, []);

  // Save house manual
  const saveManual = useCallback(async () => {
    setIsSaving(true);

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('house_manual')
        .upsert({
          user_id: userId,
          ...manualData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Show success toast
      if (window.showToast) {
        window.showToast('House manual saved successfully', 'success');
      }
    } catch (err) {
      setError(err.message);
      if (window.showToast) {
        window.showToast('Failed to save house manual', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [userId, manualData]);

  return {
    isAuthenticated,
    userId,
    userType,
    manualData,
    setManualData,
    activeToolTab,
    setActiveToolTab,
    isLoading,
    isSaving,
    error,
    handleDataExtracted,
    saveManual,
  };
}
```

**HouseManualPage.jsx** - Hollow page component:
```javascript
import { AIToolsProvider } from '../shared/AITools/AIToolsProvider';
import { useHouseManualPageLogic } from './useHouseManualPageLogic';
import FreeformTextInput from '../shared/AITools/FreeformTextInput';
import WifiPhotoExtractor from '../shared/AITools/WifiPhotoExtractor';
import AudioRecorder from '../shared/AITools/AudioRecorder';
import PdfDocUploader from '../shared/AITools/PdfDocUploader';
import PhoneCallInterface from '../shared/AITools/PhoneCallInterface';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import '../../styles/components/house-manual.css';

export default function HouseManualPage() {
  const {
    isAuthenticated,
    manualData,
    setManualData,
    activeToolTab,
    setActiveToolTab,
    isLoading,
    isSaving,
    handleDataExtracted,
    saveManual,
  } = useHouseManualPageLogic();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled in hook
  }

  return (
    <>
      <Header />
      <main className="house-manual-page">
        <h1>House Manual</h1>
        <p>Use AI tools to quickly build your house manual</p>

        <AIToolsProvider initialData={manualData}>
          {/* Tool selection tabs */}
          <div className="ai-tools-tabs">
            <button
              className={activeToolTab === 'freeform' ? 'active' : ''}
              onClick={() => setActiveToolTab('freeform')}
            >
              Type or Paste
            </button>
            <button
              className={activeToolTab === 'wifi' ? 'active' : ''}
              onClick={() => setActiveToolTab('wifi')}
            >
              WiFi Photo
            </button>
            <button
              className={activeToolTab === 'audio' ? 'active' : ''}
              onClick={() => setActiveToolTab('audio')}
            >
              Voice Record
            </button>
            <button
              className={activeToolTab === 'pdf' ? 'active' : ''}
              onClick={() => setActiveToolTab('pdf')}
            >
              PDF/Doc Import
            </button>
            <button
              className={activeToolTab === 'call' ? 'active' : ''}
              onClick={() => setActiveToolTab('call')}
            >
              AI Phone Call
            </button>
          </div>

          {/* Active tool */}
          <div className="ai-tools-content">
            {activeToolTab === 'freeform' && (
              <FreeformTextInput onDataExtracted={handleDataExtracted} />
            )}
            {activeToolTab === 'wifi' && (
              <WifiPhotoExtractor onDataExtracted={handleDataExtracted} />
            )}
            {activeToolTab === 'audio' && (
              <AudioRecorder onDataExtracted={handleDataExtracted} />
            )}
            {activeToolTab === 'pdf' && (
              <PdfDocUploader onDataExtracted={handleDataExtracted} />
            )}
            {activeToolTab === 'call' && (
              <PhoneCallInterface onDataExtracted={handleDataExtracted} />
            )}
          </div>

          {/* Manual data preview/editor */}
          <HouseManualEditor
            data={manualData}
            onChange={setManualData}
          />

          {/* Save button */}
          <button
            className="btn-primary"
            onClick={saveManual}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save House Manual'}
          </button>
        </AIToolsProvider>
      </main>
      <Footer />
    </>
  );
}
```

**Validation:** Load page, verify all tabs work, test data flow between tools and editor

---

### Step 10: Create AI Credits System Integration
**Files:**
- `app/src/islands/shared/AITools/useAICredits.js`
- Database migration for `ai_credits` table (if not exists)

**Purpose:** Track and deduct AI credits for each operation

**Details:**

**useAICredits.js** - Credits management hook:
```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const CREDIT_COSTS = {
  parse_text: 1,
  transcribe_audio: 2,
  extract_wifi: 1,
  initiate_call: 5,
  parse_document: 2,
  parse_google_doc: 1,
};

export function useAICredits(userId) {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch credits on mount
  useEffect(() => {
    if (!userId) return;

    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from('ai_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (data) {
        setCredits(data.balance);
      }
      setLoading(false);
    };

    fetchCredits();
  }, [userId]);

  // Deduct credits
  const deductCredits = useCallback(async (actionType) => {
    const cost = CREDIT_COSTS[actionType] || 1;

    if (credits < cost) {
      throw new Error('Insufficient AI credits');
    }

    const { data, error } = await supabase
      .from('ai_credits')
      .update({
        balance: credits - cost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('balance')
      .single();

    if (error) throw error;

    setCredits(data.balance);
    return data.balance;
  }, [userId, credits]);

  // Check if operation is affordable
  const canAfford = useCallback((actionType) => {
    const cost = CREDIT_COSTS[actionType] || 1;
    return credits >= cost;
  }, [credits]);

  return {
    credits,
    loading,
    deductCredits,
    canAfford,
    CREDIT_COSTS,
  };
}
```

**Validation:** Test credit deduction flows, verify balance updates

---

### Step 11: Add Styles and Polish
**Files:**
- `app/src/styles/components/house-manual.css`
- `app/src/styles/components/ai-tools.css`

**Purpose:** Create consistent styling following Split Lease patterns

**Details:**

**ai-tools.css** - AI tools component styles:
```css
/* Match existing Split Lease design system */
.ai-tools-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}

.ai-tools-tabs button {
  padding: 0.75rem 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.ai-tools-tabs button:hover {
  background: var(--color-bg-hover);
}

.ai-tools-tabs button.active {
  background: var(--color-primary);
  color: white;
}

/* Loading spinner */
.ai-tools-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* File dropzone */
.ai-tools-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-tools-dropzone:hover,
.ai-tools-dropzone.dragover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

/* Audio recorder */
.ai-tools-audio-recorder .record-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-danger);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-tools-audio-recorder .record-button.recording {
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

**Validation:** Visual review across all components, responsive testing

---

### Step 12: Update Route Registry and Generate Routes
**Files:**
- `app/src/routes.config.js`

**Purpose:** Finalize route configuration and generate Cloudflare files

**Details:**
1. Ensure route is properly configured (from Step 1)
2. Run `bun run generate-routes`
3. Verify `_redirects` and `_routes.json` are updated

**Validation:** Local dev server serves house-manual route correctly

---

## Edge Cases & Error Handling

### Authentication Errors
- Redirect to login if not authenticated
- Show error toast if session expires during operation

### API Errors
- Display specific error messages from Edge Functions
- Provide retry buttons for transient failures
- No fallback data - show clear error states

### File Upload Errors
- Validate file size limits (e.g., 10MB max)
- Validate file types (image/*, application/pdf)
- Handle upload progress for large files

### Audio Recording Errors
- Request microphone permissions explicitly
- Handle permission denied gracefully
- Show error if browser doesn't support MediaRecorder

### AI Credit Errors
- Check credits before operations
- Show "insufficient credits" modal with purchase option
- Queue operations if credits are being processed

### Network Errors
- Detect offline state
- Queue operations for retry when online
- Show clear offline indicator

---

## Testing Considerations

### Unit Tests
- Test `useAIToolsState` hook state transitions
- Test `useHouseManualPageLogic` data handling
- Test credit deduction logic

### Integration Tests
- Test each AI tool end-to-end
- Test data flow from extraction to manual editor
- Test save/load cycle

### E2E Tests
- Complete house manual creation flow
- Multi-tool usage in single session
- Credit deduction verification

### Key Scenarios to Verify
1. New user creates house manual from scratch
2. User imports existing PDF
3. User records voice notes
4. WiFi photo extraction accuracy
5. Data merging from multiple tools
6. Save and reload consistency

---

## Rollback Strategy

### Frontend Rollback
1. Remove route from `routes.config.js`
2. Run `bun run generate-routes`
3. Delete component files from `app/src/islands/`
4. Deploy via `/deploy`

### Backend Rollback
1. Delete Edge Function deployment: `supabase functions delete house-manual`
2. Remove database table if created
3. Remove AI gateway prompts

---

## Dependencies & Blockers

### Prerequisites
- [ ] Supabase Edge Functions access
- [ ] OpenAI API key with Vision and Whisper access
- [ ] Twilio account (for phone call feature)
- [ ] Google Cloud credentials (for Google Docs API)

### External Services
- OpenAI GPT-4o (text parsing, OCR)
- OpenAI Whisper (audio transcription)
- Twilio (phone calls - optional, can defer)
- Google Docs API (document import - optional)

### Potential Blockers
- Twilio integration requires phone number verification
- Google Docs API requires OAuth flow
- Large file uploads may require chunking

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenAI API rate limits | Medium | Medium | Implement retry with exponential backoff |
| Audio quality issues | Medium | Low | Provide quality tips, allow re-recording |
| OCR accuracy for WiFi | Medium | Low | Manual edit fallback in form |
| Twilio complexity | High | Medium | Defer phone call feature to Phase 2 |
| Google Docs OAuth | Medium | Low | Support PDF upload as alternative |
| Large PDF processing | Medium | Medium | Implement file size limits, async processing |

---

## Implementation Phases

### Phase 1: Core Components (Priority)
1. Route and entry point (Step 1)
2. State management (Step 2)
3. Edge Function structure (Step 3)
4. Freeform text input (Step 4)
5. House manual page (Step 9)

### Phase 2: Additional Input Methods
6. WiFi photo extractor (Step 5)
7. Audio recorder (Step 6)
8. PDF uploader (Step 7)

### Phase 3: Advanced Features (Can Defer)
9. Phone call interface (Step 8)
10. AI credits system (Step 10)
11. Polish and styling (Step 11)

---

## File References Summary

### New Files to Create
```
app/
  public/
    house-manual.html
  src/
    house-manual.jsx
    islands/
      pages/
        HouseManualPage/
          HouseManualPage.jsx
          useHouseManualPageLogic.js
          index.js
      shared/
        AITools/
          AIToolsProvider.jsx
          useAIToolsState.js
          useAICredits.js
          FreeformTextInput.jsx
          WifiPhotoExtractor.jsx
          AudioRecorder.jsx
          PdfDocUploader.jsx
          PhoneCallInterface.jsx
          index.js
    styles/
      components/
        house-manual.css
        ai-tools.css

supabase/
  functions/
    house-manual/
      index.ts
      deno.json
      handlers/
        parseText.ts
        transcribeAudio.ts
        extractWifi.ts
        initiateCall.ts
        parseDocument.ts
        parseGoogleDoc.ts
    ai-gateway/
      prompts/
        parse-house-manual-text.ts
```

### Existing Files to Modify
```
app/src/routes.config.js      - Add house-manual route
```

### Reference Files (Read Only)
```
app/src/lib/supabase.js                                    - Supabase client
app/src/lib/auth.js                                        - Authentication
app/src/islands/shared/AIImportAssistantModal/             - UI patterns
app/src/islands/shared/NotificationSettingsIsland/         - Hook patterns
supabase/functions/ai-gateway/index.ts                     - Edge Function patterns
supabase/functions/ai-gateway/handlers/complete.ts         - Handler patterns
supabase/functions/ai-gateway/prompts/_registry.ts         - Prompt registration
supabase/functions/_shared/cors.ts                         - CORS headers
supabase/functions/_shared/errors.ts                       - Error utilities
supabase/functions/_shared/openai.ts                       - OpenAI client
```

---

**Plan Version:** 1.0
**Created:** 2026-01-15
**Author:** Claude Code (Implementation Planning)
