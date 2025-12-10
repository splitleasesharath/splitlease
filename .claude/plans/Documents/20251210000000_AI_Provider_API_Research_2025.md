# AI Provider API Research 2025
**Anthropic Claude | Google Gemini | OpenAI**

**Date**: December 10, 2025
**Purpose**: Comprehensive analysis of latest API capabilities, formats, and best practices for multi-provider abstraction

---

## Executive Summary

This document provides a detailed comparison of the three major AI provider APIs as of 2025:
- **Anthropic Claude API** - Leading in coding, agents, and extended context
- **Google Gemini API** - Strong multimodal capabilities with built-in image generation
- **OpenAI API** - Mature ecosystem with real-time and audio capabilities

All three providers now support:
- Streaming responses via Server-Sent Events (SSE)
- Vision/multimodal capabilities
- Token-based pricing models
- Tiered rate limiting systems

---

## 1. Anthropic Claude API

### Overview
- **Primary Endpoint**: `https://api.anthropic.com/v1/messages`
- **Latest Models**:
  - Claude Opus 4.5 (`claude-opus-4-5-20251101`) - Best for coding, agents, computer use
  - Claude Sonnet 4.5 - Near-instant responses with thinking capabilities
  - Claude Sonnet 3.7 - Extended thinking with step-by-step reasoning
- **Context Window**: Up to 200,000 tokens

### Request/Response Format

#### Basic Request Structure
```json
POST /v1/messages
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 1024,
  "system": "You are a seasoned data scientist...",
  "messages": [
    {"role": "user", "content": "Hello, Claude"},
    {"role": "assistant", "content": "Hello! How can I help?"},
    {"role": "user", "content": "What is machine learning?"}
  ]
}
```

#### Key Features
- **Roles**: `user` and `assistant` only (system prompts separate)
- **System Prompts**: Specified via dedicated `system` parameter
- **Prefilling**: Can prefill assistant responses by ending with assistant message
- **Stateless**: Must include full conversation history in each request

#### Response Structure
```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Machine learning is..."
    }
  ],
  "model": "claude-sonnet-4-5",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 150,
    "output_tokens": 200
  }
}
```

### Authentication
```http
x-api-key: your-api-key
anthropic-version: 2023-06-01
```

**Note**: No free API tier. All usage is token-based billing.

### Streaming
Enable with `stream: true`. Uses Server-Sent Events (SSE).

```python
from anthropic import Anthropic

client = Anthropic()
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Vision Capabilities
- **Image Formats**: PNG, JPEG, GIF, WebP
- **Image Limits**: Up to 20 images per request
- **Max Size**: 3.75 MB per image
- **Max Dimensions**: 8,000px × 8,000px
- **PDF Support**: Up to 5 documents, 4.5 MB each
- **URL Support**: Direct image/PDF URLs (no base64 encoding needed)

#### Vision Request Example
```json
{
  "model": "claude-sonnet-4-5",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": {
          "type": "url",
          "url": "https://example.com/image.jpg"
        }
      },
      {
        "type": "text",
        "text": "What's in this image?"
      }
    ]
  }]
}
```

### Rate Limits

#### Measurement Metrics
- **RPM**: Requests per minute
- **TPM**: Tokens per minute (input + output)
- **Daily Quota**: Total tokens per 24 hours

#### Tier Structure
Automatically assigned based on payment history:
- **Tier 1**: ~5 RPM, 20K TPM, 300K daily
- Higher tiers scale with usage and payment history

#### 2025 Rate Limit Updates
- **Pro Plan**: 40-80 hours/week of Sonnet 4
- **Max Plan ($100/mo)**: 140-280 hours/week Sonnet 4, 15-35 hours Opus 4
- **Max Plan ($200/mo)**: 240-480 hours/week Sonnet 4, 24-40 hours Opus 4
- Weekly limits reset every 7 days
- Affects <5% of subscribers

#### Rate Limit Headers
```http
anthropic-ratelimit-tokens-remaining: 15000
anthropic-ratelimit-tokens-limit: 20000
anthropic-ratelimit-tokens-reset: 2025-12-10T12:00:00Z
```

### Pricing (Per Million Tokens)
- **Claude Sonnet 4**: $3 input / $15 output
- **Claude Haiku**: Lower cost for high-volume workloads
- **Claude Opus**: Premium pricing for advanced reasoning

**Cost Comparison**: Much cheaper than GPT-4 Turbo ($10 input / $30 output)

### Special Features
- **Constitutional AI**: Built-in safety mechanisms
- **Tool Use**: Native function calling capabilities
- **Citations**: Source attribution for information
- **OpenAI Compatibility**: Endpoint available for easy migration

### Best Practices
1. **Model Selection**: Use Haiku for lightweight tasks, Sonnet for balanced, Opus for complex reasoning
2. **Prompt Optimization**: Trim unnecessary context to reduce costs
3. **Batching**: Combine related queries
4. **Caching**: Reuse outputs where possible
5. **Monitoring**: Track token usage via usage API
6. **Rate Limit Handling**: Implement exponential backoff for 429 errors

---

## 2. Google Gemini API

### Overview
- **Primary Endpoints**:
  - `generateContent` - Standard REST (full response)
  - `streamGenerateContent` - SSE streaming
  - `BidiGenerateContent` - WebSocket for real-time bidirectional
- **Latest Models**:
  - Gemini 3 Pro - Latest reasoning model with thinking_level parameter
  - Gemini 3 Pro Image - Native image generation with reasoning
  - Gemini 2.5 Image Preview - Latest image generation
  - Imagen 4 (Ultra, Standard, Fast) - Generally available
- **Context Window**: Up to 1 million tokens (available even in free tier)

### Request/Response Format

#### Basic Request Structure
```json
POST /v1/models/gemini-3-pro:generateContent
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Hello, how are you?"}
      ]
    },
    {
      "role": "model",
      "parts": [
        {"text": "I'm doing well, thank you!"}
      ]
    },
    {
      "role": "user",
      "parts": [
        {"text": "What is machine learning?"}
      ]
    }
  ]
}
```

#### Key Features
- **Roles**: `user` and `model` (not "assistant")
- **Parts Array**: Each message contains array of parts (text, images, etc.)
- **Multimodal by Default**: Built for handling multiple data types
- **Thinking Level**: Gemini 3+ supports `thinking_level` parameter for reasoning depth

#### Response Structure
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {"text": "Machine learning is..."}
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 150,
    "candidatesTokenCount": 200,
    "totalTokenCount": 350
  }
}
```

### Authentication
```http
x-goog-api-key: your-api-key
```

Or via query parameter: `?key=your-api-key`

### Streaming
```python
import google.generativeai as genai

genai.configure(api_key='your-api-key')
model = genai.GenerativeModel('gemini-3-pro')

response = model.generate_content('Hello', stream=True)
for chunk in response:
    print(chunk.text, end='')
```

### Vision Capabilities
- **Built-in Multimodal**: Text and images natively supported
- **Input Methods**:
  - Inline data (base64) - for files <20MB
  - File API - for larger files or reuse across requests
- **Media Resolution Parameter**: Controls tokens allocated per image/frame
  - Higher resolution = better detail recognition but more tokens

#### Vision Request Example
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "base64-encoded-data"
        }
      },
      {
        "fileData": {
          "mimeType": "image/jpeg",
          "fileUri": "gs://bucket/image.jpg"
        }
      },
      {
        "text": "Describe these images"
      }
    ]
  }]
}
```

### Image Generation
Gemini 3 Pro Image features:
- **Text-to-Image**: Generate from prompts
- **Google Search Grounding**: Real-time data retrieval (weather, stocks)
- **Conversational Editing**: Multi-turn refinement
- **Thought Signatures**: Preserve visual context between turns

#### Generation Request Example
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      {"text": "Generate a sunset over mountains"}
    ]
  }],
  "tools": [
    {"google_search": {}}  // Enable grounding
  ]
}
```

### Rate Limits

#### Free Tier
- **RPM**: 5 requests per minute
- **RPD**: 25 requests per day
- **Context**: Full 1M token window available
- **Resets**: Daily quota resets at midnight Pacific

#### Recent Changes (December 7, 2025)
Adjusted quotas for Free Tier and Paid Tier 1 may cause unexpected 429 errors.

#### Paid Tiers
Three options:
1. **Free Usage**: Experimentation and light use
2. **Fixed Price**: Generous daily quotas, predictable costs
3. **Pay-As-You-Go**: Flexible for professional use, full control

### Pricing (Per Million Tokens)
- **Gemini 1.5 Pro**: $1.25 input / $5.00 output
- **Typical Costs**:
  - 1,000-word prompt: ~$0.00031
  - 1,000-word response: ~$0.00125

### Structured Output
- **JSON Schema Support**: All active Gemini models
- **Libraries**: Pydantic (Python), Zod (JavaScript/TypeScript)
- **Response MIME Type**: `application/json`
- **Type Safety**: Guaranteed format compliance

```python
from google.generativeai import GenerativeModel

model = GenerativeModel(
    'gemini-3-pro',
    generation_config={
        'response_mime_type': 'application/json',
        'response_schema': {
            'type': 'object',
            'properties': {
                'name': {'type': 'string'},
                'age': {'type': 'number'}
            }
        }
    }
)
```

### Special Features
- **Gemini 3 Thinking Level**: Control reasoning depth
- **Live API**: Real-time WebSocket conversations
- **Batch API**: Separate rate limits for batch requests
- **Gemini Code Assist**: Agent mode with PR reviews (33/day consumer, 100+/day enterprise)

### Best Practices
1. **Use File API**: For images >20MB or repeated use
2. **Media Resolution**: Balance detail vs. cost
3. **Batch Requests**: Leverage separate rate limits
4. **Structured Output**: Use JSON Schema for predictable responses
5. **Grounding**: Enable Google Search for factual accuracy

---

## 3. OpenAI API

### Overview
- **Primary Endpoints**:
  - `/v1/chat/completions` - Standard completions
  - `/v1/chat/completions` (streaming) - SSE streaming
  - Realtime API - WebSocket for audio I/O
  - Responses API - New stateful API combining chat + assistants
- **Latest Models**:
  - GPT-5 / GPT-5 Mini - Latest reasoning models
  - o-series - Advanced reasoning
  - GPT-4.1, GPT-4.5, GPT-4o - Vision and multimodal
  - gpt-4o-audio-preview - Audio modality
  - gpt-oss-120b / gpt-oss-20b - First open-weight models since GPT-2
- **Key Updates**: 40% pricing drop on multimodal, 3x rate limit increases (2025)

### Request/Response Format

#### Basic Request Structure
```json
POST /v1/chat/completions
{
  "model": "gpt-5",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"},
    {"role": "assistant", "content": "Hi there!"},
    {"role": "user", "content": "What is machine learning?"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### Key Features
- **Roles**: `system`, `user`, `assistant`, `developer` (newer)
- **System Role**: First-class role for instructions (unlike Claude)
- **Developer Role**: New role for application-level instructions
- **Stateless**: Must include conversation history

#### Response Structure
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1734000000,
  "model": "gpt-5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Machine learning is..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

### Authentication
```http
Authorization: Bearer your-api-key
```

### Streaming
Set `stream: true` in request. Returns Server-Sent Events.

```python
from openai import OpenAI

client = OpenAI()
stream = client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Vision Capabilities
- **Models**: o-series, GPT-5, GPT-4.1, GPT-4.5, GPT-4o
- **Multimodal**: Text and images in single model
- **No Conversion**: Native image support (no base64 required as of DevDay 2025)

#### Vision Request Example
```json
{
  "model": "gpt-4o",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "What's in this image?"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://example.com/image.jpg"
        }
      }
    ]
  }]
}
```

### Image Generation
- **GPT-4o Built-in**: As of March 2025, no separate DALL·E needed
- **Native Integration**: Text, vision, and generation in one model

### Audio Capabilities
- **Model**: `gpt-4o-audio-preview`
- **Input**: Text or audio
- **Output**: Text, audio, or both
- **Use Cases**: Voice interactions, audio analysis

#### Audio Request Example
```json
{
  "model": "gpt-4o-audio-preview",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "audio",
        "audio": {
          "data": "base64-audio-data",
          "format": "wav"
        }
      }
    ]
  }]
}
```

### Realtime API
- **Protocol**: WebSocket
- **Features**: Bidirectional audio streaming
- **Updates**: Unlimited simultaneous sessions (as of Feb 2025)
- **New Capabilities**: MCP server support, image input, SIP phone calling

### Rate Limits

#### Tier Structure
Automatic assignment based on payment history:
- **Tier 1**: $5 spent
- **Tier 2**: $50 spent
- **Tier 3**: $100 spent
- **Tier 4**: $250 spent
- **Tier 5**: $1,000 spent

#### GPT-5 Rate Limit Increases (September 2025)
- **GPT-5**:
  - Tier 1: 30K → 500K TPM (1.5M batch)
  - Tier 2: 450K → 1M TPM (3M batch)
  - Tier 3: 800K → 2M TPM
  - Tier 4: 2M → 4M TPM
- **GPT-5 Mini**: Tier 1: 200K → 500K TPM (5M batch)

#### Error Handling
429 "Too Many Requests" returned when limits exceeded. Includes headers with retry timing.

### Pricing

#### Token-Based
- ~1 token = 4 English characters or ¾ word
- Billed separately for input/output tokens

#### Scale Tier (Enterprise)
- **Uncapped Scale**: Automatically add purchased quotas to rate limits
- **99.9% SLA**: High reliability
- **Pricing Example** (GPT-4.1):
  - Input unit: $110/day → 30K input tokens/min
  - Output unit: $36/day → 2.5K output tokens/min
  - Minimum 30-day commitment per unit

#### Cost Optimization
- **Batch API**: 50% discount on inputs/outputs, 24-hour async processing
- **Volume Discounts**: Available for enterprise
- **Custom Rate Limits**: Negotiable for large customers

### Special Features
- **Responses API**: Stateful API combining chat + assistants
- **GPT-5 Models**: Latest reasoning capabilities
- **Open-Weight Models**: gpt-oss-120b and gpt-oss-20b available
- **MCP Support**: Realtime API integration
- **SIP Calling**: Phone integration for Realtime API

### Best Practices
1. **Right-Size Models**: Use Mini for simple tasks, main models for complex
2. **Batch Processing**: 50% savings for non-urgent tasks
3. **Token Optimization**: Monitor token usage, trim prompts
4. **Tier Management**: Track spending to unlock higher tiers
5. **Scale Tier**: Consider for guaranteed capacity and SLA
6. **Multimodal Native**: Leverage built-in capabilities vs. external tools

---

## 4. Multi-Provider Abstraction Best Practices

### Why Abstract?
- **Vendor Lock-in Avoidance**: Switch providers based on needs
- **Intelligent Routing**: Route by cost, performance, or availability
- **Redundancy**: Failover between providers
- **Cost Optimization**: Use cheapest model for task
- **A/B Testing**: Compare provider performance

### Key Architectural Approaches

#### 1. Vercel AI SDK
**Features**:
- Provider abstraction with consistent interface
- React Hooks for state management
- Streaming support
- Intelligent model switching based on load/cost

**Use Case**: React applications needing seamless provider switching

#### 2. KrakenD AI Gateway
**Features**:
- LLM routing and load balancing
- Multi-provider aggregation
- Policy-based routing
- High availability architecture

**Use Case**: Enterprise deployments requiring advanced routing

#### 3. Trait-Based Design (AIChat Pattern)
**Architecture**:
```typescript
interface LLMClient {
  chat(messages: Message[]): Promise<Response>
  stream(messages: Message[]): AsyncIterator<Chunk>
  embed(text: string): Promise<Embedding>
  rerank(query: string, docs: string[]): Promise<Ranking>
}
```

**Benefits**:
- Type-safe provider implementations
- Uniform interface across 20+ providers
- Easy testing and mocking

#### 4. Provider Registry Pattern
```typescript
const providers = {
  'anthropic': new AnthropicClient(),
  'google': new GeminiClient(),
  'openai': new OpenAIClient()
}

function getProvider(name: string): LLMClient {
  return providers[name]
}
```

### Critical Design Considerations

#### 1. Normalize Message Formats
Map provider-specific roles to unified interface:

```typescript
interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | MultimodalContent[]
}

// Map to provider formats
function toClaudeFormat(msg: UnifiedMessage) {
  // Claude: system separate, user/assistant only
  return {
    role: msg.role === 'system' ? undefined : msg.role,
    content: msg.content
  }
}

function toGeminiFormat(msg: UnifiedMessage) {
  // Gemini: "model" instead of "assistant"
  return {
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: Array.isArray(msg.content)
      ? msg.content
      : [{ text: msg.content }]
  }
}

function toOpenAIFormat(msg: UnifiedMessage) {
  // OpenAI: supports all roles including developer
  return {
    role: msg.role,
    content: msg.content
  }
}
```

#### 2. Handle Streaming Consistently
Abstract SSE implementations:

```typescript
interface StreamingResponse {
  async *[Symbol.asyncIterator](): AsyncIterator<string>
}

class UnifiedStream implements StreamingResponse {
  constructor(private provider: Provider, private stream: any) {}

  async *[Symbol.asyncIterator]() {
    if (this.provider === 'anthropic') {
      for await (const event of this.stream) {
        yield event.delta?.text || ''
      }
    } else if (this.provider === 'gemini') {
      for await (const chunk of this.stream) {
        yield chunk.text || ''
      }
    } else if (this.provider === 'openai') {
      for await (const chunk of this.stream) {
        yield chunk.choices[0]?.delta?.content || ''
      }
    }
  }
}
```

#### 3. Unified Error Handling
```typescript
class UnifiedAPIError extends Error {
  constructor(
    public provider: string,
    public statusCode: number,
    public errorType: 'rate_limit' | 'auth' | 'invalid_request' | 'server',
    public retryAfter?: number
  ) {
    super(`${provider} error: ${errorType}`)
  }
}

function normalizeError(provider: string, error: any): UnifiedAPIError {
  if (error.status === 429) {
    return new UnifiedAPIError(
      provider,
      429,
      'rate_limit',
      error.headers?.['retry-after']
    )
  }
  // ... other error mappings
}
```

#### 4. Cost Tracking
```typescript
interface UsageMetrics {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  latency: number
}

function calculateCost(
  provider: string,
  model: string,
  input: number,
  output: number
): UsageMetrics {
  const pricing = {
    'anthropic/claude-sonnet-4': { input: 3, output: 15 },
    'google/gemini-1.5-pro': { input: 1.25, output: 5 },
    'openai/gpt-5': { input: 10, output: 30 }
  }

  const key = `${provider}/${model}`
  const rates = pricing[key]

  return {
    provider,
    model,
    inputTokens: input,
    outputTokens: output,
    inputCost: (input / 1_000_000) * rates.input,
    outputCost: (output / 1_000_000) * rates.output,
    totalCost: ((input / 1_000_000) * rates.input) +
               ((output / 1_000_000) * rates.output),
    latency: 0 // populated separately
  }
}
```

#### 5. Intelligent Routing
```typescript
interface RoutingPolicy {
  selectProvider(task: Task): string
}

class CostOptimizedRouting implements RoutingPolicy {
  selectProvider(task: Task): string {
    if (task.complexity === 'simple') {
      return 'google/gemini-1.5-pro' // Cheapest
    } else if (task.type === 'coding') {
      return 'anthropic/claude-opus-4-5' // Best for code
    } else {
      return 'openai/gpt-5' // General purpose
    }
  }
}

class LoadBalancedRouting implements RoutingPolicy {
  private metrics: Map<string, RateLimitStatus>

  selectProvider(task: Task): string {
    // Find provider with most available capacity
    return Array.from(this.metrics.entries())
      .sort((a, b) => b[1].remaining - a[1].remaining)[0][0]
  }
}
```

### Implementation Checklist

- [ ] Unified message format with role normalization
- [ ] System prompt handling (separate for Claude, inline for others)
- [ ] Streaming abstraction with consistent async iterators
- [ ] Error normalization and retry logic
- [ ] Rate limit tracking per provider
- [ ] Cost tracking and reporting
- [ ] Authentication management (API keys, headers)
- [ ] Timeout and cancellation handling
- [ ] Token counting compatibility
- [ ] Vision/multimodal content normalization
- [ ] Response format consistency
- [ ] Logging and observability
- [ ] Provider health checks
- [ ] Failover mechanism
- [ ] Configuration management

### Tools and Libraries

**Recommended**:
- **Vercel AI SDK** - React-focused, excellent DX
- **LiteLLM** - Python, supports 100+ providers
- **LangChain** - Comprehensive but heavyweight
- **KrakenD** - Enterprise routing and gateway
- **Custom Abstraction** - Full control, maintenance overhead

**Selection Criteria**:
- Language/framework compatibility
- Number of providers needed
- Performance requirements (latency of abstraction layer)
- Streaming requirements
- Advanced features (tool use, function calling)
- Maintenance vs. features trade-off

### Common Pitfalls

1. **Over-abstraction**: Don't hide provider-specific advantages
2. **Performance Overhead**: Measure abstraction layer latency
3. **Incomplete Normalization**: Test edge cases in message formats
4. **Ignored Provider Limits**: Track quotas independently
5. **Cost Blindness**: Monitor actual spending across providers
6. **Brittle Error Handling**: Plan for provider API changes
7. **Single Point of Failure**: Ensure abstraction layer is robust
8. **Complex Configuration**: Keep provider setup simple

---

## 5. Provider Comparison Matrix

| Feature | Anthropic Claude | Google Gemini | OpenAI |
|---------|------------------|---------------|--------|
| **Roles** | user, assistant (system separate) | user, model | system, user, assistant, developer |
| **Streaming** | SSE (stream: true) | SSE + WebSocket (Live API) | SSE + Realtime WebSocket |
| **Vision** | Up to 20 images, 5 PDFs | Native multimodal, unlimited | Native multimodal |
| **Image Gen** | No | Yes (Gemini 3 Pro Image) | Yes (GPT-4o built-in) |
| **Audio** | No | No | Yes (gpt-4o-audio-preview) |
| **Context** | 200K tokens | 1M tokens | Varies by model |
| **Free Tier** | None | Yes (5 RPM, 25 RPD) | None (usage-based) |
| **Min Price** | $3/$15 (Sonnet 4) | $1.25/$5 (1.5 Pro) | $10/$30 (GPT-4 Turbo) |
| **Rate Limits** | RPM, TPM, Daily | RPM, RPD | RPM, TPM, RPD by tier |
| **Best For** | Coding, agents, reasoning | Cost, large context, multimodal | General purpose, audio, enterprise |
| **JSON Schema** | No (structured output WIP) | Yes (native support) | Yes (native support) |
| **Function Calling** | Yes (tool use) | Yes | Yes |
| **Thinking/Reasoning** | Sonnet 3.7 extended thinking | thinking_level parameter | o-series models |
| **Open Source** | No | No | gpt-oss models available |

---

## 6. Recommendation Summary

### When to Use Each Provider

**Anthropic Claude**:
- ✅ Complex coding tasks
- ✅ Agentic workflows
- ✅ Long-form content generation
- ✅ Safety-critical applications
- ❌ Budget-constrained projects
- ❌ Image generation needs
- ❌ Audio processing

**Google Gemini**:
- ✅ Cost optimization (cheapest)
- ✅ Very long context (1M tokens)
- ✅ Image understanding + generation
- ✅ Prototyping (free tier)
- ✅ Structured output requirements
- ❌ Real-time audio
- ❌ Enterprise SLAs

**OpenAI**:
- ✅ Mature ecosystem
- ✅ Audio/voice applications
- ✅ General-purpose tasks
- ✅ Enterprise deployments (Scale Tier)
- ✅ Open-weight model needs
- ❌ Cost optimization
- ❌ Extended context (vs. Gemini)

### Multi-Provider Strategy

**Recommended Approach**:
1. **Primary**: Choose based on core use case
2. **Secondary**: Fallback for rate limits/outages
3. **Specialized**: Route specific tasks to optimal provider

**Example Architecture**:
```typescript
const router = {
  coding: 'anthropic/claude-opus-4-5',
  simple: 'google/gemini-1.5-pro',  // Cheapest
  audio: 'openai/gpt-4o-audio',
  image_gen: 'google/gemini-3-pro-image',
  fallback: 'openai/gpt-5'
}
```

---

## Sources

### Anthropic Claude API
- [Features of Anthropic Models | AI/ML API Documentation](https://docs.aimlapi.com/capabilities/anthropic)
- [Claude Developer Platform - Claude Docs](https://docs.claude.com/en/release-notes/api)
- [Claude Opus 4.5 Announcement](https://www.anthropic.com/news/claude-opus-4-5)
- [Streaming Text Completions - Claude](https://docs.anthropic.com/claude/reference/streaming)
- [Claude API Integration Guide 2025](https://collabnix.com/claude-api-integration-guide-2025-complete-developer-tutorial-with-code-examples/)
- [Rate limits - Claude Docs](https://docs.claude.com/en/api/rate-limits)
- [Anthropic API Pricing Guide 2025](https://www.finout.io/blog/anthropic-api-pricing)
- [Messages API reference](https://docs.claude.com/en/api/messages)

### Google Gemini API
- [Gemini API reference | Google AI for Developers](https://ai.google.dev/api)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [New Gemini API updates for Gemini 3](https://developers.googleblog.com/new-gemini-api-updates-for-gemini-3/)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Image understanding | Gemini API](https://ai.google.dev/gemini-api/docs/vision)
- [Rate limits | Gemini API](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Structured Outputs | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)

### OpenAI API
- [Introducing the Realtime API | OpenAI](https://openai.com/index/introducing-the-realtime-api/)
- [Complete Guide to the OpenAI API 2025](https://zuplo.com/learning-center/openai-api)
- [Introducing gpt-realtime and Realtime API updates](https://openai.com/index/introducing-gpt-realtime/)
- [Chat Completions | OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat)
- [Rate limits - OpenAI API](https://platform.openai.com/docs/guides/rate-limits)
- [OpenAI API Pricing 2025](https://muneebdev.com/openai-api-pricing-2025/)
- [gpt-5 rate limit updates](https://simonwillison.net/2025/Sep/12/gpt-5-rate-limits/)

### Multi-Provider Abstraction
- [How to build unified AI interfaces using the Vercel AI SDK](https://blog.logrocket.com/unified-ai-interfaces-vercel-sdk/)
- [Unified LLM Interface | KrakenD AI Gateway](https://www.krakend.io/docs/ai-gateway/unified-llm-interface/)
- [The best unified API platforms in 2025](https://www.merge.dev/blog/best-unified-api)

---

**END OF DOCUMENT**
