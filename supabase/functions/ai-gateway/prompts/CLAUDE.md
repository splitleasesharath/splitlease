# AI Gateway Prompts

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/ai-gateway/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Prompt templates and registry for AI completions
[RUNTIME]: Deno Edge Runtime
[PATTERN]: Centralized prompt management with variable substitution

---

## ### FILE_INVENTORY ###

### _registry.ts
[INTENT]: Prompt registry and routing system mapping prompt IDs to template configurations
[EXPORTS]: getPrompt, registerPrompt, promptRegistry
[PATTERN]: Singleton registry for all available prompts

### _template.ts
[INTENT]: Prompt template system providing structured prompt generation with variable substitution
[EXPORTS]: createPrompt, PromptTemplate
[PATTERN]: Template literals with {{variable}} substitution

---

## ### REGISTRY_PATTERN ###

```typescript
// Register a prompt
registerPrompt('market-research', {
  system: 'You are a real estate market analyst...',
  template: 'Analyze the {{neighborhood}} market for {{propertyType}}...'
});

// Retrieve and fill prompt
const prompt = getPrompt('market-research', {
  neighborhood: 'Brooklyn Heights',
  propertyType: 'studio apartment'
});
```

---

## ### AVAILABLE_PROMPTS ###

[PROMPT_IDS]: market-research, listing-description, guest-welcome
[REGISTRATION]: Add new prompts by calling registerPrompt in _registry.ts

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { getPrompt } from './prompts/_registry'
[CONSUMED_BY]: handlers/complete.ts, handlers/stream.ts

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 4
