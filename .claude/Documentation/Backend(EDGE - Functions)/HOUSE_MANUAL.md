# House Manual Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/house-manual/index.ts`
**ENDPOINT**: `POST /functions/v1/house-manual`

---

## Overview

AI-powered house manual creation suite. Provides multiple input methods for hosts to create comprehensive house manuals: text parsing, audio transcription, document processing, and AI-assisted phone calls.

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `parse_text` | Parse freeform text into structured manual | Public* |
| `transcribe_audio` | Transcribe audio file to text then parse | Public* |
| `extract_wifi` | Extract WiFi credentials from text/image | Public* |
| `parse_document` | Parse uploaded document (PDF, DOCX) | Public* |
| `parse_google_doc` | Parse Google Doc via sharing link | Public* |
| `initiate_call` | Initiate AI-assisted phone call to collect info | Public* |

> **Note**: "Public*" indicates actions are temporarily public during Supabase auth migration.

---

## AI Models Used

| Task | Model | Purpose |
|------|-------|---------|
| Text Parsing | GPT-4o | Structure extraction from freeform text |
| Audio Transcription | Whisper | Convert audio to text |
| WiFi Extraction | GPT-4o-mini | Extract network credentials |
| Document OCR | GPT-4o | Parse uploaded documents |
| Phone Calls | Retell AI | Voice-based information collection |

---

## Request/Response Format

### Parse Text

```json
// Request
{
  "action": "parse_text",
  "payload": {
    "listing_id": "uuid",
    "text": "The WiFi password is HomeNetwork123. Checkout is at 11am. The trash goes out on Tuesdays..."
  }
}

// Response
{
  "success": true,
  "data": {
    "manual_id": "uuid",
    "sections": {
      "wifi": {
        "network_name": "HomeNetwork",
        "password": "HomeNetwork123"
      },
      "checkout": {
        "time": "11:00 AM",
        "instructions": "..."
      },
      "trash": {
        "schedule": "Tuesdays",
        "instructions": "..."
      }
    }
  }
}
```

### Transcribe Audio

```json
// Request
{
  "action": "transcribe_audio",
  "payload": {
    "listing_id": "uuid",
    "audio_url": "https://storage.../audio.mp3",
    "audio_format": "mp3"
  }
}

// Response
{
  "success": true,
  "data": {
    "transcription": "The WiFi password is...",
    "manual_sections": {...}
  }
}
```

### Extract WiFi

```json
// Request
{
  "action": "extract_wifi",
  "payload": {
    "text": "Network: HomeWiFi, Pass: secret123"
  }
}

// Response
{
  "success": true,
  "data": {
    "network_name": "HomeWiFi",
    "password": "secret123",
    "security_type": "WPA2"
  }
}
```

### Parse Google Doc

```json
// Request
{
  "action": "parse_google_doc",
  "payload": {
    "listing_id": "uuid",
    "google_doc_url": "https://docs.google.com/document/d/..."
  }
}

// Response
{
  "success": true,
  "data": {
    "manual_id": "uuid",
    "source": "google_doc",
    "sections": {...}
  }
}
```

### Initiate AI Call

```json
// Request
{
  "action": "initiate_call",
  "payload": {
    "listing_id": "uuid",
    "host_phone": "+1234567890",
    "topics_to_cover": ["wifi", "parking", "checkout"]
  }
}

// Response
{
  "success": true,
  "data": {
    "call_id": "uuid",
    "status": "initiated",
    "estimated_duration": "5-10 minutes"
  }
}
```

---

## Manual Sections

The AI extracts and structures the following sections:

| Section | Fields |
|---------|--------|
| `wifi` | network_name, password, security_type |
| `parking` | location, instructions, restrictions |
| `checkout` | time, instructions, checklist |
| `checkin` | time, instructions, key_location |
| `trash` | schedule, location, sorting_rules |
| `appliances` | name, instructions, location |
| `emergency` | contacts, procedures |
| `house_rules` | rules, restrictions |
| `local_tips` | restaurants, attractions, transport |

---

## FP Architecture

```typescript
const ALLOWED_ACTIONS = [
  "parse_text", "transcribe_audio", "extract_wifi",
  "parse_document", "parse_google_doc", "initiate_call"
] as const;

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  parse_text: handleParseText,
  transcribe_audio: handleTranscribeAudio,
  extract_wifi: handleExtractWifi,
  parse_document: handleParseDocument,
  parse_google_doc: handleParseGoogleDoc,
  initiate_call: handleInitiateCall,
};
```

---

## Integration Points

| Service | Purpose |
|---------|---------|
| OpenAI (GPT-4o) | Text understanding and structuring |
| OpenAI (Whisper) | Audio transcription |
| Retell AI | Voice call automation |
| Google Docs API | Document fetching |

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `house_manual` | Structured manual data |
| `listing` | Listing association |
| `house_manual_audio` | Audio transcription records |

---

## Related Files

- Handler: `house-manual/handlers/parseText.ts`
- Handler: `house-manual/handlers/transcribeAudio.ts`
- Handler: `house-manual/handlers/extractWifi.ts`
- Handler: `house-manual/handlers/parseDocument.ts`
- Handler: `house-manual/handlers/parseGoogleDoc.ts`
- Handler: `house-manual/handlers/initiateCall.ts`

---

**LAST_UPDATED**: 2026-01-20
