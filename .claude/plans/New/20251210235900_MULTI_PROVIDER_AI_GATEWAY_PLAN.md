# Multi-Provider AI Gateway Implementation Plan

**Created**: 2025-12-10
**Status**: Planning
**Scope**: Major architectural enhancement to `ai-gateway` Edge Function
**Estimated Phases**: 5

---

## Executive Summary

This plan outlines the transformation of the current OpenAI-only `ai-gateway` Edge Function into a unified multi-provider AI gateway supporting **OpenAI**, **Anthropic Claude**, and **Google Gemini**. The architecture introduces:

1. **Provider Abstraction Layer** - Standardized interface for all AI providers
2. **Database Model Registry** - Dynamic model configuration via Supabase table
3. **Capability-Based Routing** - Intelligent model selection based on requirements
4. **Extended Actions** - Vision, image generation, embeddings beyond text completion
5. **Backward Compatibility** - Existing prompts continue working unchanged

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Architecture](#2-target-architecture)
3. [Database Schema Design](#3-database-schema-design)
4. [Provider Abstraction Layer](#4-provider-abstraction-layer)
5. [Standardized Message Format](#5-standardized-message-format)
6. [Provider Implementations](#6-provider-implementations)
7. [Capability System](#7-capability-system)
8. [Updated File Structure](#8-updated-file-structure)
9. [API Contract](#9-api-contract)
10. [Implementation Phases](#10-implementation-phases)
11. [Migration Strategy](#11-migration-strategy)
12. [Testing Strategy](#12-testing-strategy)
13. [Cost & Performance Considerations](#13-cost--performance-considerations)

---

## 1. Current State Analysis

### Current Architecture

```
ai-gateway/
├── index.ts                    # Router (OpenAI only)
├── handlers/
│   ├── complete.ts             # Non-streaming (OpenAI)
│   └── stream.ts               # Streaming (OpenAI)
├── prompts/
│   ├── _registry.ts            # Prompt store
│   ├── _template.ts            # Variable interpolation
│   └── *.ts                    # Prompt definitions
└── (depends on _shared/openai.ts)
```

### Current Limitations

| Limitation | Impact |
|------------|--------|
| Single provider (OpenAI) | No cost optimization, no redundancy |
| Hardcoded model selection | Can't leverage best model per task |
| No vision support | Missing multimodal capabilities |
| No image generation | Cannot generate images |
| No database model config | Code changes required for model updates |

### Current Request Format

```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": { ... },
    "options": { "model": "gpt-4o-mini", "temperature": 0.7 }
  }
}
```

---

## 2. Target Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI GATEWAY EDGE FUNCTION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         REQUEST ROUTER                                │   │
│  │  - CORS handling                                                      │   │
│  │  - Authentication (per-prompt/action)                                 │   │
│  │  - Action validation                                                  │   │
│  │  - Model/Provider selection                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│          ┌───────────────────────────┼───────────────────────────┐          │
│          ▼                           ▼                           ▼          │
│  ┌───────────────┐         ┌───────────────┐         ┌───────────────┐     │
│  │   HANDLERS    │         │   HANDLERS    │         │   HANDLERS    │     │
│  │  - complete   │         │   - vision    │         │ - image_gen   │     │
│  │  - stream     │         │   - embed     │         │ - audio (fut) │     │
│  └───────┬───────┘         └───────┬───────┘         └───────┬───────┘     │
│          │                         │                         │              │
│          └─────────────────────────┼─────────────────────────┘              │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    PROVIDER ABSTRACTION LAYER                         │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    AIProvider Interface                          │ │   │
│  │  │  + complete(messages, options): Promise<CompletionResult>        │ │   │
│  │  │  + stream(messages, options): Promise<ReadableStream>            │ │   │
│  │  │  + parseImage(image, prompt, options): Promise<VisionResult>     │ │   │
│  │  │  + generateImage(prompt, options): Promise<ImageResult>          │ │   │
│  │  │  + embed(text, options): Promise<EmbeddingResult>                │ │   │
│  │  │  + getCapabilities(): Capability[]                               │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                    │                                  │   │
│  │          ┌─────────────────────────┼─────────────────────────┐       │   │
│  │          ▼                         ▼                         ▼       │   │
│  │  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐    │   │
│  │  │   OpenAI    │         │  Anthropic  │         │   Google    │    │   │
│  │  │  Provider   │         │  Provider   │         │  Provider   │    │   │
│  │  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘    │   │
│  │         │                       │                       │            │   │
│  └─────────┼───────────────────────┼───────────────────────┼────────────┘   │
│            ▼                       ▼                       ▼                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MODEL REGISTRY (Supabase)                        │   │
│  │  - ai_provider table                                                  │   │
│  │  - ai_model table                                                     │   │
│  │  - ai_capability table                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                    │                       │                       │
                    ▼                       ▼                       ▼
           ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
           │  OpenAI API │         │Anthropic API│         │ Gemini API  │
           └─────────────┘         └─────────────┘         └─────────────┘
```

---

## 3. Database Schema Design

### 3.1 Provider Table (`ai_provider`)

```sql
CREATE TABLE ai_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  key TEXT UNIQUE NOT NULL,              -- 'openai', 'anthropic', 'google'
  name TEXT NOT NULL,                    -- 'OpenAI', 'Anthropic', 'Google'

  -- Configuration
  api_base_url TEXT NOT NULL,            -- Base URL for API calls
  auth_header_name TEXT DEFAULT 'Authorization',
  auth_header_prefix TEXT DEFAULT 'Bearer',
  secret_env_key TEXT NOT NULL,          -- e.g., 'OPENAI_API_KEY'

  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,            -- Fallback ordering (higher = preferred)

  -- Metadata
  config JSONB DEFAULT '{}',             -- Provider-specific config
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data
INSERT INTO ai_provider (key, name, api_base_url, secret_env_key, priority) VALUES
('openai', 'OpenAI', 'https://api.openai.com/v1', 'OPENAI_API_KEY', 10),
('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', 'ANTHROPIC_API_KEY', 20),
('google', 'Google', 'https://generativelanguage.googleapis.com/v1beta', 'GOOGLE_AI_API_KEY', 5);
```

### 3.2 Model Table (`ai_model`)

```sql
CREATE TABLE ai_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  provider_id UUID NOT NULL REFERENCES ai_provider(id),
  model_id TEXT NOT NULL,                -- API model identifier
  key TEXT UNIQUE NOT NULL,              -- Our internal key: 'openai/gpt-4o'
  display_name TEXT NOT NULL,            -- 'GPT-4o'
  description TEXT,

  -- Capabilities (denormalized for query performance)
  capabilities TEXT[] DEFAULT '{}',      -- ['completion', 'streaming', 'vision', 'image_gen']

  -- Limits
  context_window INTEGER,                -- Max input tokens
  max_output_tokens INTEGER,             -- Max output tokens

  -- Pricing (per 1M tokens, for cost estimation)
  input_price_per_million DECIMAL(10,4),
  output_price_per_million DECIMAL(10,4),

  -- Defaults
  default_temperature DECIMAL(3,2) DEFAULT 0.7,
  default_max_tokens INTEGER DEFAULT 1024,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,      -- Default model for capability

  -- Metadata
  config JSONB DEFAULT '{}',             -- Model-specific config
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(provider_id, model_id)
);

-- Create indexes
CREATE INDEX idx_ai_model_provider ON ai_model(provider_id);
CREATE INDEX idx_ai_model_capabilities ON ai_model USING GIN(capabilities);
CREATE INDEX idx_ai_model_active ON ai_model(is_active) WHERE is_active = true;
```

### 3.3 Capability Reference Table (`ai_capability`)

```sql
CREATE TABLE ai_capability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key TEXT UNIQUE NOT NULL,              -- 'completion', 'streaming', 'vision'
  name TEXT NOT NULL,                    -- 'Text Completion'
  description TEXT,

  -- Grouping
  category TEXT,                         -- 'text', 'vision', 'audio', 'generation'

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed capabilities
INSERT INTO ai_capability (key, name, category, description) VALUES
('completion', 'Text Completion', 'text', 'Generate text responses from prompts'),
('streaming', 'Streaming', 'text', 'Stream text responses in real-time'),
('vision', 'Vision/Image Understanding', 'vision', 'Analyze and understand images'),
('image_generation', 'Image Generation', 'generation', 'Generate images from text prompts'),
('embedding', 'Text Embedding', 'text', 'Generate vector embeddings for text'),
('function_calling', 'Function Calling', 'text', 'Call functions/tools based on context'),
('json_mode', 'JSON Mode', 'text', 'Guaranteed JSON output format'),
('audio_input', 'Audio Input', 'audio', 'Process audio input'),
('audio_output', 'Audio Output', 'audio', 'Generate audio output');
```

### 3.4 Seed Model Data

```sql
-- OpenAI Models
INSERT INTO ai_model (provider_id, model_id, key, display_name, capabilities, context_window, max_output_tokens, input_price_per_million, output_price_per_million, is_default) VALUES
((SELECT id FROM ai_provider WHERE key = 'openai'), 'gpt-4o', 'openai/gpt-4o', 'GPT-4o', ARRAY['completion', 'streaming', 'vision', 'function_calling', 'json_mode'], 128000, 16384, 2.50, 10.00, false),
((SELECT id FROM ai_provider WHERE key = 'openai'), 'gpt-4o-mini', 'openai/gpt-4o-mini', 'GPT-4o Mini', ARRAY['completion', 'streaming', 'vision', 'function_calling', 'json_mode'], 128000, 16384, 0.15, 0.60, true),
((SELECT id FROM ai_provider WHERE key = 'openai'), 'gpt-4-turbo', 'openai/gpt-4-turbo', 'GPT-4 Turbo', ARRAY['completion', 'streaming', 'vision', 'function_calling', 'json_mode'], 128000, 4096, 10.00, 30.00, false),
((SELECT id FROM ai_provider WHERE key = 'openai'), 'dall-e-3', 'openai/dall-e-3', 'DALL-E 3', ARRAY['image_generation'], NULL, NULL, NULL, NULL, false),
((SELECT id FROM ai_provider WHERE key = 'openai'), 'text-embedding-3-small', 'openai/text-embedding-3-small', 'Embedding Small', ARRAY['embedding'], 8191, NULL, 0.02, NULL, false);

-- Anthropic Models
INSERT INTO ai_model (provider_id, model_id, key, display_name, capabilities, context_window, max_output_tokens, input_price_per_million, output_price_per_million, is_default) VALUES
((SELECT id FROM ai_provider WHERE key = 'anthropic'), 'claude-sonnet-4-20250514', 'anthropic/claude-sonnet-4', 'Claude Sonnet 4', ARRAY['completion', 'streaming', 'vision', 'function_calling'], 200000, 8192, 3.00, 15.00, false),
((SELECT id FROM ai_provider WHERE key = 'anthropic'), 'claude-3-5-sonnet-20241022', 'anthropic/claude-3-5-sonnet', 'Claude 3.5 Sonnet', ARRAY['completion', 'streaming', 'vision', 'function_calling'], 200000, 8192, 3.00, 15.00, true),
((SELECT id FROM ai_provider WHERE key = 'anthropic'), 'claude-3-5-haiku-20241022', 'anthropic/claude-3-5-haiku', 'Claude 3.5 Haiku', ARRAY['completion', 'streaming', 'vision'], 200000, 8192, 0.80, 4.00, false),
((SELECT id FROM ai_provider WHERE key = 'anthropic'), 'claude-opus-4-20250514', 'anthropic/claude-opus-4', 'Claude Opus 4', ARRAY['completion', 'streaming', 'vision', 'function_calling'], 200000, 32000, 15.00, 75.00, false);

-- Google Models
INSERT INTO ai_model (provider_id, model_id, key, display_name, capabilities, context_window, max_output_tokens, input_price_per_million, output_price_per_million, is_default) VALUES
((SELECT id FROM ai_provider WHERE key = 'google'), 'gemini-1.5-pro', 'google/gemini-1.5-pro', 'Gemini 1.5 Pro', ARRAY['completion', 'streaming', 'vision', 'function_calling', 'json_mode'], 1000000, 8192, 1.25, 5.00, true),
((SELECT id FROM ai_provider WHERE key = 'google'), 'gemini-1.5-flash', 'google/gemini-1.5-flash', 'Gemini 1.5 Flash', ARRAY['completion', 'streaming', 'vision', 'function_calling'], 1000000, 8192, 0.075, 0.30, false),
((SELECT id FROM ai_provider WHERE key = 'google'), 'gemini-2.0-flash-exp', 'google/gemini-2.0-flash', 'Gemini 2.0 Flash', ARRAY['completion', 'streaming', 'vision', 'function_calling', 'json_mode'], 1000000, 8192, 0.10, 0.40, false),
((SELECT id FROM ai_provider WHERE key = 'google'), 'imagen-3.0-generate-001', 'google/imagen-3', 'Imagen 3', ARRAY['image_generation'], NULL, NULL, NULL, NULL, false);
```

### 3.5 Views for Easy Access

```sql
-- View: Active models with provider info
CREATE OR REPLACE VIEW v_ai_models AS
SELECT
  m.id,
  m.key,
  m.model_id,
  m.display_name,
  m.description,
  m.capabilities,
  m.context_window,
  m.max_output_tokens,
  m.input_price_per_million,
  m.output_price_per_million,
  m.default_temperature,
  m.default_max_tokens,
  m.is_default,
  m.config AS model_config,
  p.key AS provider_key,
  p.name AS provider_name,
  p.api_base_url,
  p.secret_env_key,
  p.config AS provider_config
FROM ai_model m
JOIN ai_provider p ON m.provider_id = p.id
WHERE m.is_active = true AND p.is_active = true
ORDER BY p.priority DESC, m.is_default DESC;

-- View: Default model per capability
CREATE OR REPLACE VIEW v_ai_default_models AS
SELECT DISTINCT ON (capability)
  unnest(m.capabilities) AS capability,
  m.key AS model_key,
  m.display_name,
  p.key AS provider_key
FROM ai_model m
JOIN ai_provider p ON m.provider_id = p.id
WHERE m.is_active = true AND p.is_active = true
ORDER BY capability, m.is_default DESC, p.priority DESC;
```

---

## 4. Provider Abstraction Layer

### 4.1 Core Interfaces

```typescript
// types/provider.ts

/**
 * Capability identifiers matching ai_capability table
 */
export type Capability =
  | 'completion'
  | 'streaming'
  | 'vision'
  | 'image_generation'
  | 'embedding'
  | 'function_calling'
  | 'json_mode'
  | 'audio_input'
  | 'audio_output';

/**
 * Provider configuration from database
 */
export interface ProviderConfig {
  key: string;
  name: string;
  apiBaseUrl: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  secretEnvKey: string;
  config: Record<string, unknown>;
}

/**
 * Model configuration from database
 */
export interface ModelConfig {
  id: string;
  key: string;                    // 'openai/gpt-4o'
  modelId: string;                // 'gpt-4o' (API identifier)
  displayName: string;
  capabilities: Capability[];
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  defaultTemperature: number;
  defaultMaxTokens: number;
  config: Record<string, unknown>;
  provider: ProviderConfig;
}

/**
 * Completion options (unified across providers)
 */
export interface CompletionOptions {
  model?: string;                 // Override model
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

/**
 * Completion result (unified)
 */
export interface CompletionResult {
  content: string;
  model: string;
  provider: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Vision options
 */
export interface VisionOptions extends CompletionOptions {
  detail?: 'low' | 'high' | 'auto';
}

/**
 * Vision result
 */
export interface VisionResult extends CompletionResult {
  // Same as completion, content contains analysis
}

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;                     // Number of images
  responseFormat?: 'url' | 'b64_json';
}

/**
 * Image generation result
 */
export interface ImageGenerationResult {
  images: Array<{
    url?: string;
    b64Json?: string;
    revisedPrompt?: string;
  }>;
  model: string;
  provider: string;
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

/**
 * Embedding result
 */
export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}
```

### 4.2 Provider Interface

```typescript
// providers/_interface.ts

import {
  Capability,
  ModelConfig,
  CompletionOptions,
  CompletionResult,
  VisionOptions,
  VisionResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
} from '../types/provider.ts';
import { UnifiedMessage } from '../types/messages.ts';

/**
 * Abstract base class for AI providers
 * All providers must implement this interface
 */
export abstract class AIProvider {
  protected model: ModelConfig;
  protected apiKey: string;

  constructor(model: ModelConfig) {
    this.model = model;
    this.apiKey = this.getApiKey();
  }

  /**
   * Get API key from environment
   */
  protected getApiKey(): string {
    const key = Deno.env.get(this.model.provider.secretEnvKey);
    if (!key) {
      throw new Error(
        `Missing API key: ${this.model.provider.secretEnvKey} not configured`
      );
    }
    return key;
  }

  /**
   * Get provider name
   */
  get providerKey(): string {
    return this.model.provider.key;
  }

  /**
   * Get model key
   */
  get modelKey(): string {
    return this.model.key;
  }

  /**
   * Check if model supports a capability
   */
  supportsCapability(capability: Capability): boolean {
    return this.model.capabilities.includes(capability);
  }

  /**
   * Non-streaming text completion
   */
  abstract complete(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  /**
   * Streaming text completion
   */
  abstract stream(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<ReadableStream<Uint8Array>>;

  /**
   * Vision/image understanding
   * Throws if not supported
   */
  async parseImage(
    _imageUrl: string,
    _prompt: string,
    _options?: VisionOptions
  ): Promise<VisionResult> {
    throw new Error(`Vision not supported by ${this.model.key}`);
  }

  /**
   * Image generation
   * Throws if not supported
   */
  async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(`Image generation not supported by ${this.model.key}`);
  }

  /**
   * Text embedding
   * Throws if not supported
   */
  async embed(
    _texts: string[],
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    throw new Error(`Embedding not supported by ${this.model.key}`);
  }
}
```

### 4.3 Provider Factory

```typescript
// providers/_factory.ts

import { ModelConfig } from '../types/provider.ts';
import { AIProvider } from './_interface.ts';
import { OpenAIProvider } from './openai.ts';
import { AnthropicProvider } from './anthropic.ts';
import { GoogleProvider } from './google.ts';

/**
 * Factory to create provider instances
 */
export function createProvider(model: ModelConfig): AIProvider {
  switch (model.provider.key) {
    case 'openai':
      return new OpenAIProvider(model);
    case 'anthropic':
      return new AnthropicProvider(model);
    case 'google':
      return new GoogleProvider(model);
    default:
      throw new Error(`Unknown provider: ${model.provider.key}`);
  }
}
```

---

## 5. Standardized Message Format

### 5.1 Unified Message Types

```typescript
// types/messages.ts

/**
 * Text content part
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content part (URL)
 */
export interface ImageUrlContent {
  type: 'image_url';
  imageUrl: string;
  detail?: 'low' | 'high' | 'auto';
}

/**
 * Image content part (Base64)
 */
export interface ImageBase64Content {
  type: 'image_base64';
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  detail?: 'low' | 'high' | 'auto';
}

/**
 * Content can be string or array of parts
 */
export type MessageContent = string | (TextContent | ImageUrlContent | ImageBase64Content)[];

/**
 * Unified message format
 * - 'system': System instructions (handled specially per provider)
 * - 'user': User input
 * - 'assistant': AI response
 */
export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}
```

### 5.2 Message Adapters

Each provider needs to transform unified messages to their specific format:

```typescript
// providers/_adapters.ts

import { UnifiedMessage } from '../types/messages.ts';

/**
 * Adapt messages for OpenAI format
 * OpenAI supports system role directly in messages
 */
export function toOpenAIMessages(messages: UnifiedMessage[]): unknown[] {
  return messages.map(msg => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }

    // Multimodal content
    return {
      role: msg.role,
      content: msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'image_url') {
          return {
            type: 'image_url',
            image_url: { url: part.imageUrl, detail: part.detail || 'auto' }
          };
        }
        if (part.type === 'image_base64') {
          return {
            type: 'image_url',
            image_url: {
              url: `data:${part.mimeType};base64,${part.base64}`,
              detail: part.detail || 'auto'
            }
          };
        }
      })
    };
  });
}

/**
 * Adapt messages for Anthropic format
 * Anthropic uses separate 'system' parameter, only user/assistant in messages
 */
export function toAnthropicMessages(messages: UnifiedMessage[]): {
  system: string | undefined;
  messages: unknown[];
} {
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const system = systemMessages.length > 0
    ? systemMessages.map(m => typeof m.content === 'string' ? m.content : '').join('\n\n')
    : undefined;

  const anthropicMessages = chatMessages.map(msg => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }

    // Multimodal content
    return {
      role: msg.role,
      content: msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'image_url') {
          return {
            type: 'image',
            source: { type: 'url', url: part.imageUrl }
          };
        }
        if (part.type === 'image_base64') {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: part.mimeType,
              data: part.base64
            }
          };
        }
      })
    };
  });

  return { system, messages: anthropicMessages };
}

/**
 * Adapt messages for Google Gemini format
 * Gemini uses 'user' and 'model' roles, system as first user message
 */
export function toGeminiMessages(messages: UnifiedMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: unknown[];
} {
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const systemInstruction = systemMessages.length > 0
    ? {
        parts: systemMessages.map(m => ({
          text: typeof m.content === 'string' ? m.content : ''
        }))
      }
    : undefined;

  const contents = chatMessages.map(msg => {
    const role = msg.role === 'assistant' ? 'model' : 'user';

    if (typeof msg.content === 'string') {
      return { role, parts: [{ text: msg.content }] };
    }

    // Multimodal content
    const parts = msg.content.map(part => {
      if (part.type === 'text') {
        return { text: part.text };
      }
      if (part.type === 'image_url') {
        return {
          fileData: {
            mimeType: 'image/jpeg', // Gemini requires mime type
            fileUri: part.imageUrl
          }
        };
      }
      if (part.type === 'image_base64') {
        return {
          inlineData: {
            mimeType: part.mimeType,
            data: part.base64
          }
        };
      }
    });

    return { role, parts };
  });

  return { systemInstruction, contents };
}
```

---

## 6. Provider Implementations

### 6.1 OpenAI Provider

```typescript
// providers/openai.ts

import { AIProvider } from './_interface.ts';
import {
  CompletionOptions,
  CompletionResult,
  VisionOptions,
  VisionResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
} from '../types/provider.ts';
import { UnifiedMessage } from '../types/messages.ts';
import { toOpenAIMessages } from './_adapters.ts';
import { OpenAIError } from '../../_shared/errors.ts';

export class OpenAIProvider extends AIProvider {

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async complete(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const url = `${this.model.provider.apiBaseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.model.modelId,
      messages: toOpenAIMessages(messages),
      temperature: options?.temperature ?? this.model.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.model.defaultMaxTokens,
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpenAIError(`OpenAI API error: ${response.status}`, response.status, error);
    }

    const result = await response.json();

    return {
      content: result.choices[0].message.content,
      model: result.model,
      provider: 'openai',
      finishReason: result.choices[0].finish_reason,
      usage: {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      },
    };
  }

  async stream(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.model.provider.apiBaseUrl}/chat/completions`;

    const body = {
      model: this.model.modelId,
      messages: toOpenAIMessages(messages),
      temperature: options?.temperature ?? this.model.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.model.defaultMaxTokens,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpenAIError(`OpenAI API error: ${response.status}`, response.status, error);
    }

    return response.body!;
  }

  async parseImage(
    imageUrl: string,
    prompt: string,
    options?: VisionOptions
  ): Promise<VisionResult> {
    if (!this.supportsCapability('vision')) {
      throw new Error(`Model ${this.model.key} does not support vision`);
    }

    const messages: UnifiedMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', imageUrl, detail: options?.detail || 'auto' },
        ],
      },
    ];

    return this.complete(messages, options) as Promise<VisionResult>;
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const url = `${this.model.provider.apiBaseUrl}/images/generations`;

    const body = {
      model: options?.model || 'dall-e-3',
      prompt,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      style: options?.style || 'vivid',
      n: options?.n || 1,
      response_format: options?.responseFormat || 'url',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpenAIError(`OpenAI API error: ${response.status}`, response.status, error);
    }

    const result = await response.json();

    return {
      images: result.data.map((img: any) => ({
        url: img.url,
        b64Json: img.b64_json,
        revisedPrompt: img.revised_prompt,
      })),
      model: body.model,
      provider: 'openai',
    };
  }

  async embed(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const url = `${this.model.provider.apiBaseUrl}/embeddings`;

    const body = {
      model: options?.model || 'text-embedding-3-small',
      input: texts,
      dimensions: options?.dimensions,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new OpenAIError(`OpenAI API error: ${response.status}`, response.status, error);
    }

    const result = await response.json();

    return {
      embeddings: result.data.map((d: any) => d.embedding),
      model: result.model,
      provider: 'openai',
      usage: {
        promptTokens: result.usage.prompt_tokens,
        totalTokens: result.usage.total_tokens,
      },
    };
  }
}
```

### 6.2 Anthropic Provider

```typescript
// providers/anthropic.ts

import { AIProvider } from './_interface.ts';
import {
  CompletionOptions,
  CompletionResult,
  VisionOptions,
  VisionResult,
} from '../types/provider.ts';
import { UnifiedMessage } from '../types/messages.ts';
import { toAnthropicMessages } from './_adapters.ts';

export class AnthropicProvider extends AIProvider {

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async complete(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const url = `${this.model.provider.apiBaseUrl}/messages`;

    const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model.modelId,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? this.model.defaultMaxTokens,
      temperature: options?.temperature ?? this.model.defaultTemperature,
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    return {
      content: result.content[0].text,
      model: result.model,
      provider: 'anthropic',
      finishReason: result.stop_reason,
      usage: {
        promptTokens: result.usage.input_tokens,
        completionTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens,
      },
    };
  }

  async stream(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.model.provider.apiBaseUrl}/messages`;

    const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model.modelId,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? this.model.defaultMaxTokens,
      temperature: options?.temperature ?? this.model.defaultTemperature,
      stream: true,
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    return response.body!;
  }

  async parseImage(
    imageUrl: string,
    prompt: string,
    options?: VisionOptions
  ): Promise<VisionResult> {
    if (!this.supportsCapability('vision')) {
      throw new Error(`Model ${this.model.key} does not support vision`);
    }

    const messages: UnifiedMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image_url', imageUrl },
          { type: 'text', text: prompt },
        ],
      },
    ];

    return this.complete(messages, options) as Promise<VisionResult>;
  }
}
```

### 6.3 Google Provider

```typescript
// providers/google.ts

import { AIProvider } from './_interface.ts';
import {
  CompletionOptions,
  CompletionResult,
  VisionOptions,
  VisionResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
} from '../types/provider.ts';
import { UnifiedMessage } from '../types/messages.ts';
import { toGeminiMessages } from './_adapters.ts';

export class GoogleProvider extends AIProvider {

  private getUrl(endpoint: string): string {
    return `${this.model.provider.apiBaseUrl}/models/${this.model.modelId}:${endpoint}?key=${this.apiKey}`;
  }

  async complete(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const url = this.getUrl('generateContent');

    const { systemInstruction, contents } = toGeminiMessages(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.model.defaultTemperature,
        maxOutputTokens: options?.maxTokens ?? this.model.defaultMaxTokens,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    if (options?.responseFormat === 'json') {
      (body.generationConfig as any).responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    return {
      content: result.candidates[0].content.parts[0].text,
      model: this.model.modelId,
      provider: 'google',
      finishReason: result.candidates[0].finishReason?.toLowerCase() || null,
      usage: {
        promptTokens: result.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async stream(
    messages: UnifiedMessage[],
    options?: CompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const url = this.getUrl('streamGenerateContent') + '&alt=sse';

    const { systemInstruction, contents } = toGeminiMessages(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? this.model.defaultTemperature,
        maxOutputTokens: options?.maxTokens ?? this.model.defaultMaxTokens,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    return response.body!;
  }

  async parseImage(
    imageUrl: string,
    prompt: string,
    options?: VisionOptions
  ): Promise<VisionResult> {
    if (!this.supportsCapability('vision')) {
      throw new Error(`Model ${this.model.key} does not support vision`);
    }

    const messages: UnifiedMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', imageUrl },
        ],
      },
    ];

    return this.complete(messages, options) as Promise<VisionResult>;
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    // Use Imagen model for image generation
    const url = `${this.model.provider.apiBaseUrl}/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`;

    const body = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: options?.n || 1,
        aspectRatio: options?.size === '1792x1024' ? '16:9' : '1:1',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    return {
      images: result.predictions.map((pred: any) => ({
        b64Json: pred.bytesBase64Encoded,
      })),
      model: 'imagen-3.0-generate-001',
      provider: 'google',
    };
  }

  async embed(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const url = `${this.model.provider.apiBaseUrl}/models/text-embedding-004:embedContent?key=${this.apiKey}`;

    // Gemini embedding is one at a time, need to batch
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: options?.dimensions,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      embeddings.push(result.embedding.values);
    }

    return {
      embeddings,
      model: 'text-embedding-004',
      provider: 'google',
      usage: {
        promptTokens: 0, // Gemini doesn't return token counts for embeddings
        totalTokens: 0,
      },
    };
  }
}
```

---

## 7. Capability System

### 7.1 Model Registry Service

```typescript
// models/registry.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ModelConfig, ProviderConfig, Capability } from '../types/provider.ts';

// In-memory cache for models
let modelCache: Map<string, ModelConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all active models from database
 */
export async function loadModels(
  supabase: SupabaseClient
): Promise<Map<string, ModelConfig>> {
  // Return cached if fresh
  if (modelCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return modelCache;
  }

  const { data, error } = await supabase
    .from('v_ai_models')
    .select('*');

  if (error) {
    throw new Error(`Failed to load AI models: ${error.message}`);
  }

  modelCache = new Map();

  for (const row of data) {
    const model: ModelConfig = {
      id: row.id,
      key: row.key,
      modelId: row.model_id,
      displayName: row.display_name,
      capabilities: row.capabilities as Capability[],
      contextWindow: row.context_window,
      maxOutputTokens: row.max_output_tokens,
      inputPricePerMillion: row.input_price_per_million,
      outputPricePerMillion: row.output_price_per_million,
      defaultTemperature: row.default_temperature,
      defaultMaxTokens: row.default_max_tokens,
      config: row.model_config || {},
      provider: {
        key: row.provider_key,
        name: row.provider_name,
        apiBaseUrl: row.api_base_url,
        authHeaderName: 'Authorization',
        authHeaderPrefix: 'Bearer',
        secretEnvKey: row.secret_env_key,
        config: row.provider_config || {},
      },
    };

    modelCache.set(model.key, model);
  }

  cacheTimestamp = Date.now();
  console.log(`[Registry] Loaded ${modelCache.size} models`);

  return modelCache;
}

/**
 * Get a specific model by key
 */
export async function getModel(
  supabase: SupabaseClient,
  modelKey: string
): Promise<ModelConfig> {
  const models = await loadModels(supabase);
  const model = models.get(modelKey);

  if (!model) {
    const available = Array.from(models.keys()).join(', ');
    throw new Error(`Unknown model: "${modelKey}". Available: ${available}`);
  }

  return model;
}

/**
 * Get default model for a capability
 */
export async function getDefaultModelForCapability(
  supabase: SupabaseClient,
  capability: Capability
): Promise<ModelConfig> {
  const models = await loadModels(supabase);

  // Find models with this capability, prefer is_default, then by provider priority
  const candidates = Array.from(models.values())
    .filter(m => m.capabilities.includes(capability));

  if (candidates.length === 0) {
    throw new Error(`No models available for capability: ${capability}`);
  }

  // Sort: is_default first, then by provider priority (would need to add this)
  return candidates[0];
}

/**
 * List all models with a specific capability
 */
export async function listModelsForCapability(
  supabase: SupabaseClient,
  capability: Capability
): Promise<ModelConfig[]> {
  const models = await loadModels(supabase);

  return Array.from(models.values())
    .filter(m => m.capabilities.includes(capability));
}

/**
 * Clear model cache (for testing/refresh)
 */
export function clearModelCache(): void {
  modelCache = null;
  cacheTimestamp = 0;
}
```

### 7.2 Model Selector

```typescript
// models/selector.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ModelConfig, Capability } from '../types/provider.ts';
import { getModel, getDefaultModelForCapability } from './registry.ts';

export interface ModelSelection {
  model?: string;          // Explicit model key (e.g., 'openai/gpt-4o')
  provider?: string;       // Preferred provider (e.g., 'anthropic')
  capability?: Capability; // Required capability
}

/**
 * Select the best model based on criteria
 */
export async function selectModel(
  supabase: SupabaseClient,
  selection: ModelSelection
): Promise<ModelConfig> {
  // 1. Explicit model specified
  if (selection.model) {
    const model = await getModel(supabase, selection.model);

    // Verify capability if specified
    if (selection.capability && !model.capabilities.includes(selection.capability)) {
      throw new Error(
        `Model ${selection.model} does not support capability: ${selection.capability}`
      );
    }

    return model;
  }

  // 2. Capability-based selection
  if (selection.capability) {
    return getDefaultModelForCapability(supabase, selection.capability);
  }

  // 3. Default to completion capability
  return getDefaultModelForCapability(supabase, 'completion');
}
```

---

## 8. Updated File Structure

```
supabase/functions/ai-gateway/
├── index.ts                        # Main router (updated)
├── deno.json                       # Import map
│
├── handlers/
│   ├── complete.ts                 # Text completion (updated)
│   ├── stream.ts                   # Streaming (updated)
│   ├── vision.ts                   # NEW: Image understanding
│   ├── imageGeneration.ts          # NEW: Image generation
│   └── embed.ts                    # NEW: Text embeddings
│
├── providers/
│   ├── _interface.ts               # NEW: Provider base class
│   ├── _factory.ts                 # NEW: Provider factory
│   ├── _adapters.ts                # NEW: Message format adapters
│   ├── openai.ts                   # NEW: OpenAI implementation
│   ├── anthropic.ts                # NEW: Anthropic implementation
│   └── google.ts                   # NEW: Google implementation
│
├── models/
│   ├── registry.ts                 # NEW: Model registry (DB)
│   └── selector.ts                 # NEW: Model selection logic
│
├── types/
│   ├── provider.ts                 # NEW: Provider types
│   ├── messages.ts                 # NEW: Unified message types
│   └── responses.ts                # NEW: Response types
│
└── prompts/                        # UNCHANGED (backward compatible)
    ├── _registry.ts
    ├── _template.ts
    ├── listing-description.ts
    ├── listing-title.ts
    └── proposal-summary.ts
```

---

## 9. API Contract

### 9.1 Updated Request Format

```typescript
interface AIGatewayRequest {
  action: 'complete' | 'stream' | 'vision' | 'generate_image' | 'embed';

  payload: {
    // Option 1: Use predefined prompt (existing behavior)
    prompt_key?: string;
    variables?: Record<string, unknown>;

    // Option 2: Direct messages (new capability)
    messages?: UnifiedMessage[];

    // Model selection (all optional)
    model?: string;               // Explicit: 'anthropic/claude-3-5-sonnet'
    provider?: string;            // Preferred: 'anthropic'
    capability?: Capability;      // Required: 'vision'

    // Generation options
    options?: {
      temperature?: number;
      max_tokens?: number;
      response_format?: 'text' | 'json';
      // Vision specific
      detail?: 'low' | 'high' | 'auto';
      // Image generation specific
      size?: string;
      quality?: string;
      style?: string;
      n?: number;
    };

    // Vision action
    image_url?: string;
    image_base64?: string;
    image_mime_type?: string;

    // Embed action
    texts?: string[];
  };
}
```

### 9.2 Response Format

```typescript
interface AIGatewayResponse {
  success: boolean;

  data?: {
    // Common fields
    model: string;
    provider: string;

    // Completion/Stream/Vision
    content?: string;
    finish_reason?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };

    // Image generation
    images?: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;

    // Embeddings
    embeddings?: number[][];
  };

  error?: string;
}
```

### 9.3 Usage Examples

#### Example 1: Using Predefined Prompt (Backward Compatible)

```json
{
  "action": "complete",
  "payload": {
    "prompt_key": "listing-description",
    "variables": {
      "listingName": "Cozy Studio",
      "neighborhood": "Williamsburg"
    }
  }
}
```

#### Example 2: Direct Messages with Specific Model

```json
{
  "action": "complete",
  "payload": {
    "model": "anthropic/claude-3-5-sonnet",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "What is Split Lease?" }
    ],
    "options": {
      "temperature": 0.7,
      "max_tokens": 500
    }
  }
}
```

#### Example 3: Vision Analysis

```json
{
  "action": "vision",
  "payload": {
    "model": "openai/gpt-4o",
    "image_url": "https://example.com/room.jpg",
    "messages": [
      { "role": "user", "content": "Describe this room and estimate its size." }
    ],
    "options": {
      "detail": "high"
    }
  }
}
```

#### Example 4: Image Generation

```json
{
  "action": "generate_image",
  "payload": {
    "provider": "openai",
    "messages": [
      { "role": "user", "content": "A cozy studio apartment in Brooklyn with exposed brick walls" }
    ],
    "options": {
      "size": "1024x1024",
      "quality": "hd",
      "n": 1
    }
  }
}
```

#### Example 5: Stream with Provider Preference

```json
{
  "action": "stream",
  "payload": {
    "provider": "google",
    "prompt_key": "listing-description",
    "variables": {
      "listingName": "Modern Loft"
    }
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Create abstraction layer without breaking existing functionality

**Tasks**:
1. Create database tables (`ai_provider`, `ai_model`, `ai_capability`)
2. Seed initial model data
3. Create type definitions (`types/`)
4. Implement provider interface (`providers/_interface.ts`)
5. Implement model registry (`models/registry.ts`)
6. Refactor OpenAI provider to new interface
7. Update `index.ts` to use new architecture
8. Ensure all existing tests pass

**Deliverables**:
- Database migration file
- New type definitions
- OpenAI provider (refactored)
- Model registry service
- Updated router

### Phase 2: Anthropic Integration (Week 2)

**Goal**: Add Claude support

**Tasks**:
1. Implement Anthropic provider (`providers/anthropic.ts`)
2. Implement message adapter for Anthropic format
3. Add `ANTHROPIC_API_KEY` secret
4. Test completion and streaming
5. Test vision capabilities
6. Update documentation

**Deliverables**:
- Anthropic provider implementation
- Integration tests
- Updated secrets documentation

### Phase 3: Google Gemini Integration (Week 2-3)

**Goal**: Add Gemini support

**Tasks**:
1. Implement Google provider (`providers/google.ts`)
2. Implement message adapter for Gemini format
3. Add `GOOGLE_AI_API_KEY` secret
4. Test completion and streaming
5. Test vision capabilities
6. Test image generation (Imagen)
7. Update documentation

**Deliverables**:
- Google provider implementation
- Integration tests
- Updated secrets documentation

### Phase 4: Extended Capabilities (Week 3)

**Goal**: Add vision, image generation, and embedding handlers

**Tasks**:
1. Create vision handler (`handlers/vision.ts`)
2. Create image generation handler (`handlers/imageGeneration.ts`)
3. Create embedding handler (`handlers/embed.ts`)
4. Update router to support new actions
5. Add capability-based model selection
6. Comprehensive testing

**Deliverables**:
- Three new handlers
- Updated router
- Capability selection logic
- Integration tests

### Phase 5: Polish & Documentation (Week 4)

**Goal**: Production readiness

**Tasks**:
1. Error handling improvements
2. Rate limiting and retry logic
3. Cost tracking/logging
4. Performance optimization
5. Comprehensive documentation
6. Admin UI for model management (optional)

**Deliverables**:
- Production-ready code
- Complete documentation
- Monitoring/logging setup

---

## 11. Migration Strategy

### 11.1 Backward Compatibility

The migration maintains **100% backward compatibility**:

1. **Existing prompts work unchanged** - `prompt_key` + `variables` pattern preserved
2. **Default model selection** - If no model specified, uses default for capability
3. **Response format preserved** - Same `success`/`data`/`error` structure

### 11.2 Migration Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION TIMELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 1: Foundation                                              │
│  ├─ Day 1-2: Database schema + seed data                        │
│  ├─ Day 3-4: Type definitions + provider interface              │
│  └─ Day 5: Refactor OpenAI, update router                       │
│                                                                  │
│  Week 2: Multi-Provider                                          │
│  ├─ Day 1-2: Anthropic provider                                 │
│  ├─ Day 3-4: Google provider                                    │
│  └─ Day 5: Integration testing                                  │
│                                                                  │
│  Week 3: Extended Capabilities                                   │
│  ├─ Day 1-2: Vision handler                                     │
│  ├─ Day 3: Image generation handler                             │
│  └─ Day 4-5: Embedding handler + testing                        │
│                                                                  │
│  Week 4: Production                                              │
│  ├─ Day 1-2: Error handling, retry logic                        │
│  ├─ Day 3: Performance optimization                             │
│  └─ Day 4-5: Documentation, deployment                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Rollback Plan

If issues arise:

1. **Database**: Keep old `_shared/openai.ts` as fallback
2. **Router**: Feature flag to switch between old/new implementation
3. **Monitoring**: Alert on error rate increase

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// Test each provider independently
describe('OpenAIProvider', () => {
  it('should complete text successfully', async () => { ... });
  it('should stream text successfully', async () => { ... });
  it('should handle vision requests', async () => { ... });
  it('should generate images', async () => { ... });
  it('should create embeddings', async () => { ... });
  it('should throw on unsupported capability', async () => { ... });
});

// Test message adapters
describe('Message Adapters', () => {
  it('should convert to OpenAI format', () => { ... });
  it('should convert to Anthropic format', () => { ... });
  it('should convert to Gemini format', () => { ... });
  it('should handle multimodal content', () => { ... });
});

// Test model registry
describe('Model Registry', () => {
  it('should load models from database', async () => { ... });
  it('should cache models', async () => { ... });
  it('should find default model for capability', async () => { ... });
});
```

### 12.2 Integration Tests

```typescript
// Test full request flow
describe('AI Gateway Integration', () => {
  it('should complete with OpenAI', async () => { ... });
  it('should complete with Anthropic', async () => { ... });
  it('should complete with Google', async () => { ... });
  it('should stream with all providers', async () => { ... });
  it('should handle prompt_key backward compatibility', async () => { ... });
  it('should select model based on capability', async () => { ... });
});
```

### 12.3 Load Testing

- Test concurrent requests across providers
- Verify rate limiting behavior
- Measure latency per provider

---

## 13. Cost & Performance Considerations

### 13.1 Cost Comparison (per 1M tokens)

| Provider | Model | Input | Output | Best For |
|----------|-------|-------|--------|----------|
| Google | Gemini 1.5 Flash | $0.075 | $0.30 | Budget, long context |
| Google | Gemini 1.5 Pro | $1.25 | $5.00 | Cost-effective quality |
| OpenAI | GPT-4o Mini | $0.15 | $0.60 | Fast, cheap |
| OpenAI | GPT-4o | $2.50 | $10.00 | General purpose |
| Anthropic | Claude 3.5 Haiku | $0.80 | $4.00 | Fast, cheap |
| Anthropic | Claude 3.5 Sonnet | $3.00 | $15.00 | Coding, quality |

### 13.2 Routing Recommendations

```typescript
const COST_OPTIMIZED_ROUTING = {
  simple_tasks: 'google/gemini-1.5-flash',       // Cheapest
  general_purpose: 'openai/gpt-4o-mini',         // Good balance
  complex_reasoning: 'anthropic/claude-3-5-sonnet', // Best quality
  long_context: 'google/gemini-1.5-pro',         // 1M context
  coding: 'anthropic/claude-sonnet-4',           // Best for code
  vision: 'openai/gpt-4o',                       // Best vision
  image_generation: 'openai/dall-e-3',           // Quality
  budget_images: 'google/imagen-3',              // Cheaper
};
```

### 13.3 Performance Optimization

1. **Model caching**: 5-minute TTL for model registry
2. **Connection pooling**: Reuse HTTP connections per provider
3. **Parallel requests**: Support batch operations where possible
4. **Streaming preference**: Default to streaming for long responses

---

## Appendix A: Required Secrets

| Secret | Provider | Required |
|--------|----------|----------|
| `OPENAI_API_KEY` | OpenAI | Yes (existing) |
| `ANTHROPIC_API_KEY` | Anthropic | Yes (new) |
| `GOOGLE_AI_API_KEY` | Google | Yes (new) |

---

## Appendix B: Key Files Reference

| File | Purpose | New/Modified |
|------|---------|--------------|
| `index.ts` | Main router | Modified |
| `handlers/complete.ts` | Text completion | Modified |
| `handlers/stream.ts` | Streaming | Modified |
| `handlers/vision.ts` | Vision | New |
| `handlers/imageGeneration.ts` | Image gen | New |
| `handlers/embed.ts` | Embeddings | New |
| `providers/_interface.ts` | Provider base | New |
| `providers/_factory.ts` | Factory | New |
| `providers/_adapters.ts` | Message adapters | New |
| `providers/openai.ts` | OpenAI impl | New |
| `providers/anthropic.ts` | Anthropic impl | New |
| `providers/google.ts` | Google impl | New |
| `models/registry.ts` | Model DB access | New |
| `models/selector.ts` | Model selection | New |
| `types/*.ts` | Type definitions | New |

---

**Document Version**: 1.0
**Created**: 2025-12-10
**Author**: Claude Code
