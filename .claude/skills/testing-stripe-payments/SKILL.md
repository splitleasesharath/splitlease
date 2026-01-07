---
name: testing-stripe-payments
description: Test Stripe payment integrations including checkout flows, payment intents, subscription billing, and webhook handling. Use this skill when implementing payment features, testing checkout UX, verifying webhook processing, or ensuring PCI-compliant payment handling. Covers test cards, mock responses, and E2E payment testing.
license: MIT
---

This skill guides comprehensive testing of Stripe payment integrations. Payment flows are revenue-critical—broken payments mean lost bookings and customer trust.

## When to Use This Skill

- Implementing checkout flows (one-time or subscription)
- Testing payment form validation and UX
- Verifying webhook processing (payment success, failures, disputes)
- Testing refund and cancellation flows
- Debugging payment-related bugs
- Compliance testing for PCI requirements

## Testing Approaches

| Approach | Speed | Use Case |
|----------|-------|----------|
| **MSW Mocks** | Fast | Unit tests, component isolation |
| **Stripe Test Mode** | Medium | Integration tests, real Stripe API |
| **Playwright E2E** | Slow | Full checkout flow, card form interaction |

## Stripe Test Cards Reference

| Card Number | Scenario |
|-------------|----------|
| `4242424242424242` | Success |
| `4000000000000002` | Decline |
| `4000002500003155` | Requires 3D Secure |
| `4000000000009995` | Insufficient funds |
| `4000000000000069` | Expired card |
| `4000000000000127` | Incorrect CVC |
| `4000003720000278` | 3DS required (always) |

Always use expiry `12/34` and any 3-digit CVC.

## Unit Testing with MSW

### Mock Stripe API Handlers

```typescript
// src/mocks/stripeHandlers.ts
import { http, HttpResponse } from 'msw'

interface PaymentIntent {
  id: string
  client_secret: string
  status: string
  amount: number
  currency: string
}

const paymentIntents = new Map<string, PaymentIntent>()

export const stripeHandlers = [
  // Create Payment Intent
  http.post('https://api.stripe.com/v1/payment_intents', async ({ request }) => {
    const formData = await request.formData()
    const amount = parseInt(formData.get('amount') as string)
    const currency = formData.get('currency') as string
    
    const pi: PaymentIntent = {
      id: `pi_test_${Date.now()}`,
      client_secret: `pi_test_${Date.now()}_secret_${crypto.randomUUID()}`,
      status: 'requires_payment_method',
      amount,
      currency,
    }
    
    paymentIntents.set(pi.id, pi)
    
    return HttpResponse.json(pi)
  }),

  // Retrieve Payment Intent
  http.get('https://api.stripe.com/v1/payment_intents/:id', ({ params }) => {
    const pi = paymentIntents.get(params.id as string)
    
    if (!pi) {
      return HttpResponse.json(
        { error: { message: 'No such payment intent' } },
        { status: 404 }
      )
    }
    
    return HttpResponse.json(pi)
  }),

  // Confirm Payment Intent
  http.post('https://api.stripe.com/v1/payment_intents/:id/confirm', async ({ params, request }) => {
    const pi = paymentIntents.get(params.id as string)
    
    if (!pi) {
      return HttpResponse.json(
        { error: { message: 'No such payment intent' } },
        { status: 404 }
      )
    }
    
    const formData = await request.formData()
    const paymentMethod = formData.get('payment_method') as string
    
    // Simulate different card behaviors
    if (paymentMethod?.includes('decline')) {
      return HttpResponse.json({
        ...pi,
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      })
    }
    
    if (paymentMethod?.includes('3ds')) {
      return HttpResponse.json({
        ...pi,
        status: 'requires_action',
        next_action: {
          type: 'use_stripe_sdk',
          use_stripe_sdk: { type: 'three_d_secure_redirect' },
        },
      })
    }
    
    // Success case
    pi.status = 'succeeded'
    return HttpResponse.json(pi)
  }),

  // Create Refund
  http.post('https://api.stripe.com/v1/refunds', async ({ request }) => {
    const formData = await request.formData()
    const paymentIntent = formData.get('payment_intent') as string
    const amount = formData.get('amount')
    
    return HttpResponse.json({
      id: `re_test_${Date.now()}`,
      payment_intent: paymentIntent,
      amount: amount ? parseInt(amount as string) : 1000,
      status: 'succeeded',
    })
  }),
]
```

### Testing Checkout Component

```typescript
// src/components/__tests__/Checkout.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkout } from '../Checkout'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

describe('Checkout', () => {
  const mockBooking = {
    id: 'booking-123',
    listingTitle: 'Downtown Studio',
    price: 15000, // $150.00 in cents
    nights: 3,
  }

  it('displays booking summary correctly', () => {
    render(<Checkout booking={mockBooking} />)
    
    expect(screen.getByText('Downtown Studio')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByText('3 nights')).toBeInTheDocument()
  })

  it('creates payment intent on mount', async () => {
    let piCreated = false
    
    server.use(
      http.post('https://api.stripe.com/v1/payment_intents', () => {
        piCreated = true
        return HttpResponse.json({
          id: 'pi_test',
          client_secret: 'pi_test_secret',
          status: 'requires_payment_method',
        })
      })
    )
    
    render(<Checkout booking={mockBooking} />)
    
    await waitFor(() => {
      expect(piCreated).toBe(true)
    })
  })

  it('shows loading state during payment creation', async () => {
    server.use(
      http.post('https://api.stripe.com/v1/payment_intents', async () => {
        await new Promise(r => setTimeout(r, 100))
        return HttpResponse.json({
          id: 'pi_test',
          client_secret: 'pi_test_secret',
        })
      })
    )
    
    render(<Checkout booking={mockBooking} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })
  })

  it('handles payment intent creation failure', async () => {
    server.use(
      http.post('https://api.stripe.com/v1/payment_intents', () => {
        return HttpResponse.json(
          { error: { message: 'Invalid amount' } },
          { status: 400 }
        )
      })
    )
    
    render(<Checkout booking={mockBooking} />)
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/payment setup failed/i)
    })
  })
})
```

### Testing usePayment Hook

```typescript
// src/hooks/__tests__/usePayment.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePayment } from '../usePayment'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

describe('usePayment', () => {
  it('creates payment intent', async () => {
    const { result } = renderHook(() => usePayment())
    
    await act(async () => {
      await result.current.createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        metadata: { booking_id: '123' },
      })
    })
    
    expect(result.current.clientSecret).toBeDefined()
    expect(result.current.clientSecret).toMatch(/^pi_test_.*_secret_/)
  })

  it('handles payment success', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => usePayment({ onSuccess }))
    
    await act(async () => {
      await result.current.createPaymentIntent({ amount: 10000, currency: 'usd' })
    })
    
    await act(async () => {
      await result.current.confirmPayment('pm_card_success')
    })
    
    expect(result.current.status).toBe('succeeded')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('handles card decline', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => usePayment({ onError }))
    
    server.use(
      http.post('*/payment_intents/:id/confirm', () => {
        return HttpResponse.json({
          status: 'requires_payment_method',
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined.',
          },
        })
      })
    )
    
    await act(async () => {
      await result.current.createPaymentIntent({ amount: 10000, currency: 'usd' })
      await result.current.confirmPayment('pm_card_decline')
    })
    
    expect(result.current.error).toBe('Your card was declined.')
    expect(onError).toHaveBeenCalled()
  })

  it('handles 3DS authentication required', async () => {
    const { result } = renderHook(() => usePayment())
    
    server.use(
      http.post('*/payment_intents/:id/confirm', () => {
        return HttpResponse.json({
          status: 'requires_action',
          next_action: {
            type: 'use_stripe_sdk',
          },
        })
      })
    )
    
    await act(async () => {
      await result.current.createPaymentIntent({ amount: 10000, currency: 'usd' })
      await result.current.confirmPayment('pm_card_3ds')
    })
    
    expect(result.current.status).toBe('requires_action')
    expect(result.current.requires3DS).toBe(true)
  })
})
```

## Integration Testing with Stripe Test Mode

### Testing Backend Payment Endpoints

```typescript
// src/api/__tests__/payments.integration.test.ts
import request from 'supertest'
import Stripe from 'stripe'
import { app } from '../app'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

describe('Payment API', () => {
  describe('POST /api/payments/create-intent', () => {
    it('creates payment intent for valid booking', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          bookingId: 'booking-123',
          amount: 15000,
        })
        .expect(200)
      
      expect(response.body.clientSecret).toBeDefined()
      expect(response.body.paymentIntentId).toMatch(/^pi_/)
      
      // Verify in Stripe
      const pi = await stripe.paymentIntents.retrieve(response.body.paymentIntentId)
      expect(pi.amount).toBe(15000)
      expect(pi.metadata.booking_id).toBe('booking-123')
    })

    it('rejects invalid amount', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          bookingId: 'booking-123',
          amount: -100,
        })
        .expect(400)
      
      expect(response.body.error).toMatch(/invalid amount/i)
    })
  })

  describe('POST /api/payments/refund', () => {
    it('processes full refund', async () => {
      // Create and confirm payment first
      const pi = await stripe.paymentIntents.create({
        amount: 10000,
        currency: 'usd',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      })
      
      const response = await request(app)
        .post('/api/payments/refund')
        .send({ paymentIntentId: pi.id })
        .expect(200)
      
      expect(response.body.refundId).toMatch(/^re_/)
      expect(response.body.status).toBe('succeeded')
    })

    it('processes partial refund', async () => {
      const pi = await stripe.paymentIntents.create({
        amount: 10000,
        currency: 'usd',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      })
      
      const response = await request(app)
        .post('/api/payments/refund')
        .send({ 
          paymentIntentId: pi.id,
          amount: 5000, // Partial refund
        })
        .expect(200)
      
      expect(response.body.amount).toBe(5000)
    })
  })
})
```

### Testing Stripe Webhooks

```typescript
// src/api/__tests__/webhooks.integration.test.ts
import request from 'supertest'
import Stripe from 'stripe'
import { app } from '../app'
import { db } from '../db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')
  
  return `t=${timestamp},v1=${signature}`
}

describe('Stripe Webhooks', () => {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

  describe('payment_intent.succeeded', () => {
    it('updates booking status to confirmed', async () => {
      // Create test booking
      const booking = await db.bookings.create({
        id: 'booking-webhook-test',
        status: 'pending',
        paymentIntentId: 'pi_test_123',
      })
      
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 15000,
            metadata: { booking_id: 'booking-webhook-test' },
          },
        },
      })
      
      const signature = generateWebhookSignature(payload, WEBHOOK_SECRET)
      
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload)
        .expect(200)
      
      // Verify booking updated
      const updated = await db.bookings.findById('booking-webhook-test')
      expect(updated.status).toBe('confirmed')
      expect(updated.paidAt).toBeDefined()
    })

    it('sends confirmation email', async () => {
      const emailsSent: any[] = []
      vi.spyOn(emailService, 'send').mockImplementation(async (opts) => {
        emailsSent.push(opts)
      })
      
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_email_test',
            metadata: { booking_id: 'booking-email-test', user_email: 'test@example.com' },
          },
        },
      })
      
      const signature = generateWebhookSignature(payload, WEBHOOK_SECRET)
      
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200)
      
      expect(emailsSent).toContainEqual(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'booking-confirmation',
        })
      )
    })
  })

  describe('payment_intent.payment_failed', () => {
    it('updates booking status to failed', async () => {
      await db.bookings.create({
        id: 'booking-fail-test',
        status: 'pending',
        paymentIntentId: 'pi_fail_123',
      })
      
      const payload = JSON.stringify({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_fail_123',
            last_payment_error: { message: 'Card declined' },
            metadata: { booking_id: 'booking-fail-test' },
          },
        },
      })
      
      const signature = generateWebhookSignature(payload, WEBHOOK_SECRET)
      
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200)
      
      const updated = await db.bookings.findById('booking-fail-test')
      expect(updated.status).toBe('payment_failed')
      expect(updated.failureReason).toBe('Card declined')
    })
  })

  describe('Webhook Security', () => {
    it('rejects invalid signature', async () => {
      const payload = JSON.stringify({ type: 'test' })
      
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(payload)
        .expect(400)
    })

    it('rejects expired timestamp', async () => {
      const payload = JSON.stringify({ type: 'test' })
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400 // 6+ minutes ago
      const signature = `t=${oldTimestamp},v1=invalid`
      
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(400)
    })

    it('handles idempotent webhook replay', async () => {
      const payload = JSON.stringify({
        id: 'evt_idempotent_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: {} } },
      })
      
      const signature = generateWebhookSignature(payload, WEBHOOK_SECRET)
      
      // First request
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200)
      
      // Replay (should succeed but not duplicate processing)
      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200)
    })
  })
})
```

## E2E Testing with Playwright

### Full Checkout Flow

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to listing
    await page.goto('/login')
    await page.getByLabel('Email').fill('buyer@test.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('/dashboard')
  })

  test('completes booking with successful payment', async ({ page }) => {
    await page.goto('/listings/test-listing-123')
    
    // Select dates and book
    await page.getByRole('button', { name: 'Book Now' }).click()
    await page.waitForURL(/\/checkout/)
    
    // Fill Stripe card form (in iframe)
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    await stripeFrame.getByPlaceholder('Card number').fill('4242424242424242')
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/34')
    await stripeFrame.getByPlaceholder('CVC').fill('123')
    await stripeFrame.getByPlaceholder('ZIP').fill('12345')
    
    // Submit payment
    await page.getByRole('button', { name: /pay \$/i }).click()
    
    // Verify success
    await expect(page).toHaveURL(/\/booking-confirmed/, { timeout: 30000 })
    await expect(page.getByText('Booking Confirmed')).toBeVisible()
    await expect(page.getByText('Confirmation email sent')).toBeVisible()
  })

  test('handles declined card', async ({ page }) => {
    await page.goto('/checkout?booking=test-123')
    
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    await stripeFrame.getByPlaceholder('Card number').fill('4000000000000002') // Decline
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/34')
    await stripeFrame.getByPlaceholder('CVC').fill('123')
    await stripeFrame.getByPlaceholder('ZIP').fill('12345')
    
    await page.getByRole('button', { name: /pay/i }).click()
    
    await expect(page.getByRole('alert')).toContainText(/declined/i)
    await expect(page).not.toHaveURL(/\/booking-confirmed/)
  })

  test('handles 3D Secure authentication', async ({ page }) => {
    await page.goto('/checkout?booking=test-123')
    
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    await stripeFrame.getByPlaceholder('Card number').fill('4000002500003155') // 3DS
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/34')
    await stripeFrame.getByPlaceholder('CVC').fill('123')
    await stripeFrame.getByPlaceholder('ZIP').fill('12345')
    
    await page.getByRole('button', { name: /pay/i }).click()
    
    // Handle 3DS modal
    const threeDSFrame = page.frameLocator('iframe[name="stripe-challenge-frame"]')
    await threeDSFrame.getByRole('button', { name: 'Complete' }).click()
    
    await expect(page).toHaveURL(/\/booking-confirmed/, { timeout: 30000 })
  })
})
```

### Helper: Stripe Card Form Fill

```typescript
// e2e/helpers/stripe.ts
import { Page, FrameLocator } from '@playwright/test'

export async function fillStripeCard(
  page: Page, 
  card: { number: string; exp: string; cvc: string; zip?: string }
) {
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
  
  await stripeFrame.getByPlaceholder('Card number').fill(card.number)
  await stripeFrame.getByPlaceholder('MM / YY').fill(card.exp)
  await stripeFrame.getByPlaceholder('CVC').fill(card.cvc)
  
  if (card.zip) {
    await stripeFrame.getByPlaceholder('ZIP').fill(card.zip)
  }
}

export const TEST_CARDS = {
  SUCCESS: { number: '4242424242424242', exp: '12/34', cvc: '123', zip: '12345' },
  DECLINE: { number: '4000000000000002', exp: '12/34', cvc: '123', zip: '12345' },
  REQUIRES_3DS: { number: '4000002500003155', exp: '12/34', cvc: '123', zip: '12345' },
  INSUFFICIENT_FUNDS: { number: '4000000000009995', exp: '12/34', cvc: '123', zip: '12345' },
}
```

## File Organization

```
src/
├── mocks/
│   └── stripeHandlers.ts
├── hooks/
│   ├── usePayment.ts
│   └── __tests__/
│       └── usePayment.test.ts
├── components/
│   ├── Checkout.tsx
│   ├── PaymentForm.tsx
│   └── __tests__/
│       └── Checkout.test.tsx
├── api/
│   ├── payments.ts
│   ├── webhooks.ts
│   └── __tests__/
│       ├── payments.integration.test.ts
│       └── webhooks.integration.test.ts
e2e/
├── checkout.spec.ts
└── helpers/
    └── stripe.ts
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Using real cards in tests | Always use Stripe test cards |
| Skipping webhook signature validation | Validate signatures in all environments |
| Not testing decline scenarios | Test all card decline types |
| Hardcoding API keys | Use environment variables |
| Testing only success path | Test 3DS, declines, refunds, disputes |
| Mocking Stripe.js client-side | Use real Stripe.js, mock server responses |

## Security Checklist

- [ ] Webhook signatures validated
- [ ] Idempotency keys used for payment creation
- [ ] Payment amounts validated server-side
- [ ] Card data never logged or stored
- [ ] Test mode keys not in production
- [ ] Webhook endpoint has rate limiting
- [ ] Failed payments logged for monitoring
