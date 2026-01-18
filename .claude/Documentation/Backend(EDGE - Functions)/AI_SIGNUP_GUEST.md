# ai-signup-guest Edge Function

**ENDPOINT**: `POST /functions/v1/ai-signup-guest`
**AUTH_REQUIRED**: No (public signup endpoint)
**SOURCE**: `supabase/functions/ai-signup-guest/`

---

## Purpose

AI-powered guest signup flow with personalized market research. Provides an enhanced signup experience that uses AI to parse user preferences and generate relevant recommendations.

---

## Flow

1. **User Input**: Guest provides freeform text describing their needs
2. **AI Parsing**: OpenAI parses preferences (days, location, budget)
3. **Market Research**: System finds matching listings
4. **Response**: Returns parsed preferences + matching listings

---

## Request Format

```json
{
  "email": "guest@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "preferences_text": "I work in Manhattan Mon-Thu and need a place to stay. Budget around $200/night. Prefer Upper West Side or Midtown.",
  "user_type": "guest"
}
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "parsed_preferences": {
      "days_selected": [1, 2, 3, 4],
      "neighborhoods": ["Upper West Side", "Midtown"],
      "budget_min": 150,
      "budget_max": 250
    },
    "matching_listings": [
      {
        "_id": "listing-uuid",
        "name": "Cozy Studio in UWS",
        "nightly_rate": 180,
        "days_available": [1, 2, 3, 4, 5]
      }
    ],
    "recommendations": "Based on your preferences..."
  }
}
```

---

## AI Prompt

The function uses OpenAI to parse freeform text into structured data:

- **Days**: Extract which days of the week
- **Locations**: Identify neighborhood preferences
- **Budget**: Parse price range
- **Amenities**: Identify any mentioned requirements

---

## Dependencies

- OpenAI API (`_shared/openai.ts`)
- Supabase client
- `_shared/cors.ts`
- `_shared/errors.ts`

---

## Related Functions

- `ai-parse-profile` - Profile parsing during signup
- `bubble-proxy` (parse_profile action) - Alternative parsing endpoint

---

**LAST_UPDATED**: 2025-12-11
