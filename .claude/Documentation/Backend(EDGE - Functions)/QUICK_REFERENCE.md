# Edge Functions Quick Reference

**GENERATED**: 2025-12-11

---

## Endpoints Summary

| Function | Endpoint | Common Actions |
|----------|----------|----------------|
| `auth-user` | `/functions/v1/auth-user` | login, signup, request_password_reset |
| `bubble-proxy` | `/functions/v1/bubble-proxy` | send_message, upload_photos, toggle_favorite |
| `ai-gateway` | `/functions/v1/ai-gateway` | complete, stream |
| `proposal` | `/functions/v1/proposal` | create, update, get |
| `listing` | `/functions/v1/listing` | create, get, submit |
| `bubble_sync` | `/functions/v1/bubble_sync` | process_queue_data_api, get_status |

---

## Common Request Pattern

```bash
curl -X POST "https://[project].supabase.co/functions/v1/[function]" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [access_token]" \
  -d '{"action": "[action]", "payload": {...}}'
```

---

## Authentication Actions

```json
// Login
{"action": "login", "payload": {"email": "...", "password": "..."}}

// Signup
{"action": "signup", "payload": {"email": "...", "password": "...", "full_name": "...", "user_type": "guest"}}

// Password Reset Request
{"action": "request_password_reset", "payload": {"email": "...", "redirect_url": "..."}}

// Update Password
{"action": "update_password", "payload": {"access_token": "...", "new_password": "..."}}
```

---

## Proposal Actions

```json
// Create Proposal
{"action": "create", "payload": {
  "listing_id": "...",
  "guest_id": "...",
  "guest_email": "...",
  "days_selected": [1, 2, 3, 4, 5],
  "move_in_date": "2025-02-01"
}}

// Get Proposal
{"action": "get", "payload": {"proposal_id": "..."}}

// Update Proposal (auth required)
{"action": "update", "payload": {"proposal_id": "...", "days_selected": [1, 2, 3, 4]}}
```

---

## Listing Actions

```json
// Create Listing
{"action": "create", "payload": {"user_email": "..."}}

// Get Listing
{"action": "get", "payload": {"listing_id": "..."}}

// Submit Listing (auth required)
{"action": "submit", "payload": {
  "listing_id": "...",
  "user_email": "...",
  "name": "...",
  "description": "...",
  "bedrooms": 2,
  "bathrooms": 1
}}
```

---

## AI Gateway Actions

```json
// Non-streaming Completion
{"action": "complete", "payload": {
  "prompt_key": "listing-description",
  "variables": {"neighborhood": "...", "amenities": "..."}
}}

// Streaming Completion (returns SSE)
{"action": "stream", "payload": {
  "prompt_key": "listing-description",
  "variables": {"neighborhood": "...", "amenities": "..."}
}}
```

**Public Prompts** (no auth): `listing-description`, `listing-title`, `echo-test`

---

## Bubble Proxy Actions

```json
// Send Message (no auth)
{"action": "send_message", "payload": {
  "listing_id": "...",
  "message": "...",
  "guest_name": "...",
  "guest_email": "..."
}}

// Upload Photos (no auth)
{"action": "upload_photos", "payload": {
  "listing_id": "...",
  "photos": ["base64-data"]
}}

// Toggle Favorite (no auth)
{"action": "toggle_favorite", "payload": {
  "user_id": "...",
  "listing_id": "..."
}}

// Submit Referral (auth required)
{"action": "submit_referral", "payload": {
  "referrer_email": "...",
  "referee_email": "...",
  "referee_name": "..."
}}
```

---

## Bubble Sync Actions

```json
// Process Queue (recommended)
{"action": "process_queue_data_api", "payload": {"batch_size": 50}}

// Get Status
{"action": "get_status", "payload": {}}

// Retry Failed
{"action": "retry_failed", "payload": {}}

// Cleanup Old Items
{"action": "cleanup", "payload": {"retention_days": 7}}

// Sync Single (debugging)
{"action": "sync_single", "payload": {"table": "proposal", "record_id": "..."}}
```

---

## Response Formats

### Success
```json
{"success": true, "data": {...}}
```

### Error
```json
{"success": false, "error": "Error message"}
```

---

## Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Validation error (missing/invalid fields) |
| 401 | Authentication required or invalid |
| 403 | Forbidden (ownership check failed) |
| 404 | Resource not found |
| 405 | Method not allowed (use POST) |
| 500 | Internal server error |

---

## Day Indexing Quick Reference

| Day | JavaScript | Bubble |
|-----|------------|--------|
| Sunday | 0 | 1 |
| Monday | 1 | 2 |
| Tuesday | 2 | 3 |
| Wednesday | 3 | 4 |
| Thursday | 4 | 5 |
| Friday | 5 | 6 |
| Saturday | 6 | 7 |

**Conversion**:
- Bubble → JS: `bubbleDays.map(d => d - 1)`
- JS → Bubble: `jsDays.map(d => d + 1)`

---

## Local Development

```bash
# Start local Supabase
supabase start

# Serve functions
supabase functions serve

# Serve specific function
supabase functions serve auth-user

# View logs
supabase functions logs auth-user
```

---

## Deployment

```bash
# Deploy single function
supabase functions deploy auth-user

# Deploy all functions
supabase functions deploy
```

**Remember**: Edge functions require manual deployment after code changes!

---

**LAST_UPDATED**: 2025-12-11
