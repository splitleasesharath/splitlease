---
name: websocket-realtime-testing
description: Test WebSocket connections and real-time features using Playwright's routeWebSocket() and Vitest mocks. Use this skill when testing chat/messaging, live notifications, real-time updates, or Supabase Realtime subscriptions. Essential for marketplace communication features.
license: MIT
---

This skill guides testing WebSocket-based real-time features. Chat, notifications, and live updates are core to Split Lease's roommate matching—broken realtime means broken communication.

## When to Use This Skill

- Testing chat/messaging features
- Testing live notifications
- Testing real-time listing updates
- Testing Supabase Realtime subscriptions
- Testing connection loss and reconnection
- Testing presence indicators (online/offline)

## Testing Approaches

| Approach | Tool | Use Case |
|----------|------|----------|
| **E2E with real WS** | Playwright | Full integration, real server |
| **E2E with mock WS** | Playwright `routeWebSocket()` | Isolated E2E, controlled messages |
| **Unit/Integration** | Vitest + mock | Component tests, hook tests |

## Playwright E2E: Real WebSocket Monitoring

### Monitor Actual WebSocket Traffic

```typescript
// e2e/tests/messaging.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Real-time Messaging', () => {
  test('sends and receives messages via WebSocket', async ({ page }) => {
    const wsMessages: string[] = []

    // Monitor WebSocket traffic
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`)

      ws.on('framesent', event => {
        console.log('Sent:', event.payload)
        wsMessages.push(`sent: ${event.payload}`)
      })

      ws.on('framereceived', event => {
        console.log('Received:', event.payload)
        wsMessages.push(`received: ${event.payload}`)
      })

      ws.on('close', () => {
        console.log('WebSocket closed')
      })
    })

    // Login and navigate to chat
    await page.goto('/login')
    await page.getByLabel('Email').fill('buyer@test.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.goto('/messages/conversation-123')

    // Send a message
    await page.getByRole('textbox', { name: /message/i }).fill('Hello!')
    await page.getByRole('button', { name: 'Send' }).click()

    // Verify message appears in UI
    await expect(page.getByText('Hello!')).toBeVisible()

    // Verify WebSocket was used
    expect(wsMessages.some(m => m.includes('Hello!'))).toBe(true)
  })
})
```

## Playwright E2E: Mock WebSocket

### Basic Mock Setup

```typescript
// e2e/tests/chat-mock.spec.ts
import { test, expect } from '@playwright/test'

test('receives real-time message from other user', async ({ page }) => {
  // Intercept WebSocket connection
  await page.routeWebSocket('wss://*/realtime/*', ws => {
    // Handle incoming messages from client
    ws.onMessage(message => {
      const data = JSON.parse(message as string)

      // Respond to subscription
      if (data.type === 'subscribe') {
        ws.send(JSON.stringify({
          type: 'subscribed',
          channel: data.channel,
        }))
      }

      // Echo back sent messages (simulating server broadcast)
      if (data.type === 'message') {
        ws.send(JSON.stringify({
          type: 'message',
          payload: data.payload,
          sender: 'current-user',
        }))
      }
    })

    // Simulate incoming message after 2 seconds
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        payload: { text: 'Hey, is the room still available?' },
        sender: 'other-user',
        timestamp: new Date().toISOString(),
      }))
    }, 2000)
  })

  await page.goto('/messages/conversation-123')

  // Wait for incoming message
  await expect(page.getByText('Hey, is the room still available?')).toBeVisible({
    timeout: 5000,
  })
})
```

### Testing Connection Loss and Reconnection

```typescript
test('handles WebSocket disconnection gracefully', async ({ page }) => {
  let wsConnection: any

  await page.routeWebSocket('wss://*/realtime/*', ws => {
    wsConnection = ws

    ws.onMessage(message => {
      const data = JSON.parse(message as string)
      if (data.type === 'subscribe') {
        ws.send(JSON.stringify({ type: 'subscribed' }))
      }
    })
  })

  await page.goto('/messages/conversation-123')

  // Verify connected state
  await expect(page.getByTestId('connection-status')).toHaveText('Connected')

  // Simulate server closing connection
  wsConnection.close({ code: 1006, reason: 'Connection lost' })

  // Verify disconnected state shown
  await expect(page.getByText(/reconnecting/i)).toBeVisible()

  // Verify reconnection attempt (new WebSocket opens)
  await page.routeWebSocket('wss://*/realtime/*', ws => {
    ws.onMessage(message => {
      const data = JSON.parse(message as string)
      if (data.type === 'subscribe') {
        ws.send(JSON.stringify({ type: 'subscribed' }))
      }
    })
  })

  // Verify reconnected
  await expect(page.getByTestId('connection-status')).toHaveText('Connected')
})
```

### Testing Typing Indicators

```typescript
test('shows typing indicator when other user types', async ({ page }) => {
  await page.routeWebSocket('wss://*/realtime/*', ws => {
    ws.onMessage(message => {
      const data = JSON.parse(message as string)
      if (data.type === 'subscribe') {
        ws.send(JSON.stringify({ type: 'subscribed' }))
      }
    })

    // Simulate typing indicator
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'presence',
        event: 'typing',
        user: { id: 'seller-456', name: 'John' },
      }))
    }, 1000)

    // Stop typing after 3 seconds
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'presence',
        event: 'stopped_typing',
        user: { id: 'seller-456' },
      }))
    }, 3000)
  })

  await page.goto('/messages/conversation-123')

  // Typing indicator appears
  await expect(page.getByText('John is typing...')).toBeVisible()

  // Typing indicator disappears
  await expect(page.getByText('John is typing...')).not.toBeVisible({
    timeout: 5000,
  })
})
```

### Testing Online/Offline Presence

```typescript
test('shows user online status', async ({ page }) => {
  await page.routeWebSocket('wss://*/realtime/*', ws => {
    ws.onMessage(message => {
      const data = JSON.parse(message as string)
      
      if (data.type === 'subscribe' && data.channel === 'presence') {
        // Send initial presence state
        ws.send(JSON.stringify({
          type: 'presence_state',
          users: [
            { id: 'seller-456', status: 'online', lastSeen: null },
          ],
        }))
      }
    })

    // User goes offline after 2 seconds
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'presence_diff',
        leaves: [{ id: 'seller-456' }],
      }))
    }, 2000)
  })

  await page.goto('/messages/conversation-123')

  // Initially online
  await expect(page.getByTestId('user-status')).toHaveText('Online')

  // Goes offline
  await expect(page.getByTestId('user-status')).toHaveText('Offline')
})
```

## Vitest Unit Testing

### Mock WebSocket Class

```typescript
// src/test/mocks/MockWebSocket.ts
import { vi } from 'vitest'

export class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  readyState: number = WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)

    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: any) {
    const event = new MessageEvent('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    })
    this.onmessage?.(event)
  }

  // Test helper: simulate error
  simulateError() {
    this.onerror?.(new Event('error'))
  }

  static reset() {
    MockWebSocket.instances = []
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }
}

// Setup in vitest
beforeEach(() => {
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})
```

### Testing Chat Hook

```typescript
// src/hooks/useChat/useChat.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from './useChat'
import { MockWebSocket } from '@/test/mocks/MockWebSocket'

describe('useChat', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('connects to WebSocket on mount', async () => {
    const { result } = renderHook(() => useChat('conversation-123'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toContain('conversation-123')
  })

  it('receives and stores messages', async () => {
    const { result } = renderHook(() => useChat('conversation-123'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const ws = MockWebSocket.getLastInstance()!

    act(() => {
      ws.simulateMessage({
        type: 'message',
        payload: { id: '1', text: 'Hello!', sender: 'user-456' },
      })
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].text).toBe('Hello!')
  })

  it('sends messages through WebSocket', async () => {
    const { result } = renderHook(() => useChat('conversation-123'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    act(() => {
      result.current.sendMessage('Hi there!')
    })

    const ws = MockWebSocket.getLastInstance()!
    expect(ws.sentMessages).toHaveLength(1)

    const sent = JSON.parse(ws.sentMessages[0])
    expect(sent.type).toBe('message')
    expect(sent.payload.text).toBe('Hi there!')
  })

  it('reconnects on connection loss', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useChat('conversation-123'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const firstWs = MockWebSocket.getLastInstance()!

    // Simulate disconnect
    act(() => {
      firstWs.close(1006, 'Connection lost')
    })

    expect(result.current.isConnected).toBe(false)

    // Advance past reconnect delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    // New connection established
    expect(MockWebSocket.instances).toHaveLength(2)

    vi.useRealTimers()
  })

  it('disconnects on unmount', async () => {
    const { result, unmount } = renderHook(() => useChat('conversation-123'))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const ws = MockWebSocket.getLastInstance()!
    const closeSpy = vi.spyOn(ws, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })
})
```

### Testing Supabase Realtime Hook

```typescript
// src/hooks/useRealtimeListings/useRealtimeListings.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useRealtimeListings } from './useRealtimeListings'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
    unsubscribe: vi.fn(),
  }

  return {
    supabase: {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
    mockChannel, // Export for test access
  }
})

import { supabase, mockChannel } from '@/lib/supabase'

describe('useRealtimeListings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes to listing changes', async () => {
    renderHook(() => useRealtimeListings())

    expect(supabase.channel).toHaveBeenCalledWith('listings-changes')
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'listings',
      }),
      expect.any(Function)
    )
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('updates state on INSERT event', async () => {
    const { result } = renderHook(() => useRealtimeListings())

    // Get the callback passed to .on()
    const onCall = mockChannel.on.mock.calls.find(
      call => call[0] === 'postgres_changes'
    )
    const callback = onCall[2]

    // Simulate INSERT event
    callback({
      eventType: 'INSERT',
      new: { id: 'new-listing', title: 'New Room', price: 1000 },
    })

    await waitFor(() => {
      expect(result.current.listings).toContainEqual(
        expect.objectContaining({ id: 'new-listing' })
      )
    })
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeListings())

    unmount()

    expect(supabase.removeChannel).toHaveBeenCalled()
  })
})
```

### Testing Chat Component

```typescript
// src/components/ChatWindow/ChatWindow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatWindow } from './ChatWindow'
import { MockWebSocket } from '@/test/mocks/MockWebSocket'

describe('ChatWindow', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  it('displays received messages', async () => {
    render(<ChatWindow conversationId="123" />)

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1)
    })

    const ws = MockWebSocket.getLastInstance()!

    // Simulate incoming message
    ws.simulateMessage({
      type: 'message',
      payload: {
        id: 'msg-1',
        text: 'Hello from seller!',
        sender: { id: 'seller-456', name: 'John' },
        timestamp: new Date().toISOString(),
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Hello from seller!')).toBeInTheDocument()
    })

    expect(screen.getByText('John')).toBeInTheDocument()
  })

  it('sends message on form submit', async () => {
    const user = userEvent.setup()

    render(<ChatWindow conversationId="123" />)

    await waitFor(() => {
      expect(MockWebSocket.getLastInstance()?.readyState).toBe(WebSocket.OPEN)
    })

    await user.type(screen.getByRole('textbox'), 'My message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    const ws = MockWebSocket.getLastInstance()!
    expect(ws.sentMessages).toHaveLength(1)

    const sent = JSON.parse(ws.sentMessages[0])
    expect(sent.payload.text).toBe('My message')

    // Input cleared after send
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('shows connection status', async () => {
    render(<ChatWindow conversationId="123" />)

    // Initially connecting
    expect(screen.getByText(/connecting/i)).toBeInTheDocument()

    // Connected after WebSocket opens
    await waitFor(() => {
      expect(screen.getByText(/connected/i)).toBeInTheDocument()
    })
  })

  it('disables send button when disconnected', async () => {
    render(<ChatWindow conversationId="123" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send/i })).toBeEnabled()
    })

    const ws = MockWebSocket.getLastInstance()!
    ws.close(1006, 'Disconnected')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    })
  })
})
```

## File Organization

```
src/
├── hooks/
│   ├── useChat/
│   │   ├── useChat.ts
│   │   ├── useChat.test.ts
│   │   └── index.ts
│   ├── useRealtimeListings/
│   │   ├── useRealtimeListings.ts
│   │   ├── useRealtimeListings.test.ts
│   │   └── index.ts
├── components/
│   ├── ChatWindow/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatWindow.test.tsx
│   │   └── index.ts
├── test/
│   └── mocks/
│       └── MockWebSocket.ts
e2e/
├── tests/
│   ├── messaging.spec.ts
│   └── realtime-updates.spec.ts
```

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Testing with real WS server in unit tests | Mock WebSocket class |
| No reconnection testing | Test disconnect + reconnect flow |
| Ignoring message ordering | Verify messages arrive in order |
| Skipping presence tests | Test typing, online/offline |
| No cleanup on unmount | Verify unsubscribe called |

## Checklist

- [ ] Connection established on mount
- [ ] Messages sent correctly
- [ ] Messages received and displayed
- [ ] Reconnection on disconnect
- [ ] Typing indicators work
- [ ] Presence (online/offline) works
- [ ] Cleanup on unmount
- [ ] Error states handled
- [ ] Offline mode graceful degradation
