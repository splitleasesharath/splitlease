# QR Generator Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/qr-generator/index.ts`
**ENDPOINT**: `POST /functions/v1/qr-generator`

---

## Overview

Generates branded QR codes with the Split Lease logo. Returns PNG binary directly (not JSON).

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `generate` | Create QR code image | No |
| `health` | Health check | No |

---

## Request Format

### Generate QR Code

```json
{
  "action": "generate",
  "payload": {
    "url": "https://splitlease.com/listing/abc123",
    "size": 300,              // Optional, default 300px
    "logo": true              // Optional, include Split Lease logo
  }
}
```

---

## Response Format

**Unlike other Edge Functions**, this returns binary PNG data, not JSON:

```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Disposition: attachment; filename="splitlease-qr-2026-01-20T12-30-00.png"
Content-Length: 12345

[PNG binary data]
```

### Health Check Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-20T12:30:00.000Z",
    "actions": ["generate", "health"]
  }
}
```

---

## Binary Response Helper

```typescript
/**
 * Format binary (PNG) response
 */
const formatBinaryResponse = (
  buffer: Uint8Array,
  filename: string
): Response =>
  new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
```

---

## Filename Generation

```typescript
/**
 * Generate timestamped filename for download
 */
const generateFilename = (): string => {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  return `splitlease-qr-${timestamp}.png`;
};

// Example: splitlease-qr-2026-01-20T12-30-00.png
```

---

## QR Code Customization

| Option | Default | Description |
|--------|---------|-------------|
| `size` | 300 | Output image size in pixels |
| `logo` | true | Include Split Lease logo in center |
| `errorCorrection` | H | High error correction for logo overlay |
| `margin` | 2 | Quiet zone around QR code |

---

## Use Cases

- **Listing sharing**: Generate QR for listing URLs
- **Marketing materials**: Branded QR codes for print
- **Property signage**: QR codes for property details
- **Business cards**: Quick link to host profiles

---

## FP Architecture

```typescript
const ALLOWED_ACTIONS = ["generate", "health"] as const;

// Route to handler (switch instead of handler map due to binary response)
switch (action as Action) {
  case 'health': {
    return formatSuccessResponse(handleHealth());
  }
  case 'generate': {
    const pngBuffer = await handleGenerate(payload);
    return formatBinaryResponse(pngBuffer, generateFilename());
  }
}
```

---

## Error Handling

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

---

## Related Files

- Handler: `qr-generator/handlers/generate.ts`

---

**LAST_UPDATED**: 2026-01-20
