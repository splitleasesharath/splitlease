---
name: webhook-handler-tests
description: Test incoming webhook handlers for Stripe, Twilio, and Zapier with signature verification and idempotency. Use this skill when implementing payment webhooks, SMS callbacks, or third-party integrations. Ensures webhooks process correctly and handle edge cases safely.
license: MIT
---

This skill guides testing webhook handlers that receive callbacks from external services like Stripe, Twilio, and Zapier. Webhooks are critical for payment confirmation, SMS delivery, and automation—untested webhooks cause lost revenue and broken workflows.

## When to Use This Skill

- Testing Stripe payment webhooks (payment success, failure, refunds)
- Testing Twilio SMS/call webhooks
- Testing Zapier/n8n automation triggers
- Testing any third-party callback handler
- Verifying signature validation
- Testing idempotent processing

## Core Concerns for Webhook Testing

```
┌─────────────────────────────────────────────────────────┐
│ 1. SIGNATURE: Verify request is from legitimate source │
│ 2. PARSING: Handle payload correctly                   │
│ 3. IDEMPOTENCY: Process same event only once           │
│ 4. RESPONSE: Return correct status codes               │
│ 5. SIDE EFFECTS: Trigger correct business logic        │
└─────────────────────────────────────────────────────────┘
```

## Testing Stripe Webhooks

### Signature Generation Helper

```typescript
// src/test/helpers/stripe.ts
import crypto from 'crypto'

export function generateStripeSignature(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000)
): string {
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  return `t=${timestamp},v1=${signature}`
}

export function createStripeEvent(
  type: string,
  data: Record<string, any>,
  id = `evt_${Date.now()}`
) {
  return {
    id,
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data,
    },
    livemode: false,
    api_version: '2024-12-18.acacia',
  }
}
```

### Testing Payment Success Webhook

```typescript
// src/api/webhooks/__tests__/stripe.test.ts
import request from 'supertest'
import { app } from '@/app'
import { db } from '@/lib/db'
import { generateStripeSignature, createStripeEvent } from '@/test/helpers/stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

describe('Stripe Webhook: payment_intent.succeeded', () => {
  beforeEach(async () => {
    // Create test booking
    await db.bookings.create({
      id: 'booking-123',
      status: 'pending',
      paymentIntentId: 'pi_test_123',
      buyerId: 'buyer-456',
      sellerId: 'seller-789',
      totalPrice: 15000,
    })
  })

  afterEach(async () => {
    await db.bookings.delete({ id: 'booking-123' })
  })

  it('updates booking status to confirmed', async () => {
    const event = createStripeEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      amount: 15000,
      currency: 'usd',
      metadata: {
        booking_id: 'booking-123',
      },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload)

    expect(response.status).toBe(200)

    const booking = await db.bookings.findById('booking-123')
    expect(booking.status).toBe('confirmed')
    expect(booking.paidAt).toBeDefined()
  })

  it('sends confirmation email to buyer', async () => {
    const sendEmail = vi.spyOn(emailService, 'send')

    const event = createStripeEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      metadata: { booking_id: 'booking-123' },
      receipt_email: 'buyer@example.com',
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        template: 'booking-confirmation',
        data: expect.objectContaining({
          bookingId: 'booking-123',
        }),
      })
    )
  })

  it('notifies seller of new booking', async () => {
    const sendNotification = vi.spyOn(notificationService, 'send')

    const event = createStripeEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      metadata: { booking_id: 'booking-123' },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    expect(sendNotification).toHaveBeenCalledWith(
      'seller-789',
      expect.objectContaining({
        type: 'new_booking',
        bookingId: 'booking-123',
      })
    )
  })
})
```

### Testing Payment Failure Webhook

```typescript
describe('Stripe Webhook: payment_intent.payment_failed', () => {
  beforeEach(async () => {
    await db.bookings.create({
      id: 'booking-fail',
      status: 'pending',
      paymentIntentId: 'pi_fail_123',
    })
  })

  it('updates booking status to payment_failed', async () => {
    const event = createStripeEvent('payment_intent.payment_failed', {
      id: 'pi_fail_123',
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      },
      metadata: { booking_id: 'booking-fail' },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    const booking = await db.bookings.findById('booking-fail')
    expect(booking.status).toBe('payment_failed')
    expect(booking.failureReason).toBe('Your card was declined.')
  })

  it('sends payment failure email', async () => {
    const sendEmail = vi.spyOn(emailService, 'send')

    const event = createStripeEvent('payment_intent.payment_failed', {
      id: 'pi_fail_123',
      last_payment_error: { message: 'Card declined' },
      metadata: { booking_id: 'booking-fail' },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'payment-failed',
      })
    )
  })
})
```

### Testing Signature Validation

```typescript
describe('Stripe Webhook: Security', () => {
  it('rejects requests without signature', async () => {
    const response = await request(app)
      .post('/webhooks/stripe')
      .send({ type: 'test' })

    expect(response.status).toBe(400)
    expect(response.body.error).toMatch(/signature/i)
  })

  it('rejects requests with invalid signature', async () => {
    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 't=123,v1=invalidsignature')
      .send({ type: 'test' })

    expect(response.status).toBe(400)
  })

  it('rejects requests with expired timestamp', async () => {
    const event = createStripeEvent('payment_intent.succeeded', { id: 'pi_123' })
    const payload = JSON.stringify(event)

    // Timestamp from 10 minutes ago (beyond tolerance)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET, oldTimestamp)

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    expect(response.status).toBe(400)
    expect(response.body.error).toMatch(/timestamp/i)
  })
})
```

### Testing Idempotency

```typescript
describe('Stripe Webhook: Idempotency', () => {
  it('processes same event only once', async () => {
    const updateBooking = vi.spyOn(bookingService, 'confirmPayment')

    const event = createStripeEvent(
      'payment_intent.succeeded',
      { id: 'pi_123', metadata: { booking_id: 'booking-123' } },
      'evt_idempotent_123' // Same event ID
    )

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    // First request
    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    // Second request (replay)
    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    // Should only process once
    expect(updateBooking).toHaveBeenCalledTimes(1)
  })

  it('returns 200 for duplicate events without reprocessing', async () => {
    const event = createStripeEvent(
      'payment_intent.succeeded',
      { id: 'pi_123', metadata: { booking_id: 'booking-123' } },
      'evt_duplicate_123'
    )

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    const response1 = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    const response2 = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    // Both return 200 (Stripe needs 2xx to stop retrying)
    expect(response1.status).toBe(200)
    expect(response2.status).toBe(200)
  })
})
```

## Testing Twilio Webhooks

### Signature Validation Helper

```typescript
// src/test/helpers/twilio.ts
import crypto from 'crypto'

export function generateTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string
): string {
  const data = url + Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], '')

  return crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64')
}
```

### Testing SMS Delivery Webhook

```typescript
// src/api/webhooks/__tests__/twilio.test.ts
import request from 'supertest'
import { app } from '@/app'
import { generateTwilioSignature } from '@/test/helpers/twilio'

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const WEBHOOK_URL = 'https://splitlease.com/webhooks/twilio/sms-status'

describe('Twilio SMS Status Webhook', () => {
  it('updates message status to delivered', async () => {
    const params = {
      MessageSid: 'SM123456',
      MessageStatus: 'delivered',
      To: '+15551234567',
      From: '+15559876543',
    }

    const signature = generateTwilioSignature(WEBHOOK_URL, params, TWILIO_AUTH_TOKEN)

    const response = await request(app)
      .post('/webhooks/twilio/sms-status')
      .set('x-twilio-signature', signature)
      .type('form')
      .send(params)

    expect(response.status).toBe(200)

    const message = await db.messages.findBySid('SM123456')
    expect(message.deliveryStatus).toBe('delivered')
  })

  it('handles failed delivery', async () => {
    const params = {
      MessageSid: 'SM789',
      MessageStatus: 'failed',
      ErrorCode: '30007',
      ErrorMessage: 'Carrier violation',
    }

    const signature = generateTwilioSignature(WEBHOOK_URL, params, TWILIO_AUTH_TOKEN)

    const response = await request(app)
      .post('/webhooks/twilio/sms-status')
      .set('x-twilio-signature', signature)
      .type('form')
      .send(params)

    expect(response.status).toBe(200)

    const message = await db.messages.findBySid('SM789')
    expect(message.deliveryStatus).toBe('failed')
    expect(message.errorCode).toBe('30007')
  })

  it('rejects invalid signature', async () => {
    const response = await request(app)
      .post('/webhooks/twilio/sms-status')
      .set('x-twilio-signature', 'invalid')
      .type('form')
      .send({ MessageSid: 'SM123' })

    expect(response.status).toBe(403)
  })
})
```

### Testing Incoming SMS Webhook

```typescript
describe('Twilio Incoming SMS Webhook', () => {
  it('creates message from incoming SMS', async () => {
    const params = {
      MessageSid: 'SM_incoming_123',
      From: '+15551234567',
      To: '+15559876543',
      Body: 'Is the room still available?',
    }

    const signature = generateTwilioSignature(
      'https://splitlease.com/webhooks/twilio/incoming',
      params,
      TWILIO_AUTH_TOKEN
    )

    const response = await request(app)
      .post('/webhooks/twilio/incoming')
      .set('x-twilio-signature', signature)
      .type('form')
      .send(params)

    expect(response.status).toBe(200)
    expect(response.type).toBe('text/xml')

    // Verify message saved
    const messages = await db.messages.findByPhone('+15551234567')
    expect(messages[0].content).toBe('Is the room still available?')
  })

  it('responds with TwiML', async () => {
    const params = {
      MessageSid: 'SM_auto_reply',
      From: '+15551234567',
      To: '+15559876543',
      Body: 'Hello',
    }

    const signature = generateTwilioSignature(
      'https://splitlease.com/webhooks/twilio/incoming',
      params,
      TWILIO_AUTH_TOKEN
    )

    const response = await request(app)
      .post('/webhooks/twilio/incoming')
      .set('x-twilio-signature', signature)
      .type('form')
      .send(params)

    expect(response.text).toContain('<?xml version="1.0"')
    expect(response.text).toContain('<Response>')
  })
})
```

## Testing Zapier/Generic Webhooks

```typescript
// src/api/webhooks/__tests__/zapier.test.ts
import request from 'supertest'
import { app } from '@/app'

describe('Zapier Webhook', () => {
  const ZAPIER_SECRET = process.env.ZAPIER_WEBHOOK_SECRET!

  it('triggers automation on new booking', async () => {
    const triggerZap = vi.spyOn(zapierService, 'trigger')

    const response = await request(app)
      .post('/webhooks/zapier/booking-created')
      .set('x-zapier-secret', ZAPIER_SECRET)
      .send({
        bookingId: 'booking-123',
        listingTitle: 'Downtown Studio',
        buyerEmail: 'buyer@example.com',
        checkIn: '2025-03-01',
        checkOut: '2025-03-05',
        totalPrice: 400,
      })

    expect(response.status).toBe(200)
    expect(triggerZap).toHaveBeenCalledWith('booking_created', expect.any(Object))
  })

  it('validates webhook secret', async () => {
    const response = await request(app)
      .post('/webhooks/zapier/booking-created')
      .set('x-zapier-secret', 'wrong-secret')
      .send({ bookingId: '123' })

    expect(response.status).toBe(401)
  })

  it('returns data for Zapier polling', async () => {
    // Seed test data
    await db.bookings.createMany([
      { id: 'b1', createdAt: new Date('2025-01-01') },
      { id: 'b2', createdAt: new Date('2025-01-02') },
    ])

    const response = await request(app)
      .get('/webhooks/zapier/bookings')
      .set('x-zapier-secret', ZAPIER_SECRET)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].id).toBe('b2') // Newest first
  })
})
```

## Testing Webhook Retry Handling

```typescript
describe('Webhook Retry Handling', () => {
  it('returns 500 for transient errors (triggers retry)', async () => {
    vi.spyOn(db.bookings, 'update').mockRejectedValueOnce(new Error('DB timeout'))

    const event = createStripeEvent('payment_intent.succeeded', {
      id: 'pi_retry_123',
      metadata: { booking_id: 'booking-123' },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    // 5xx tells Stripe to retry
    expect(response.status).toBe(500)
  })

  it('returns 200 for permanent errors (no retry)', async () => {
    // Booking doesn't exist - no point retrying
    const event = createStripeEvent('payment_intent.succeeded', {
      id: 'pi_123',
      metadata: { booking_id: 'nonexistent-booking' },
    })

    const payload = JSON.stringify(event)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload)

    // 2xx tells Stripe not to retry
    expect(response.status).toBe(200)
  })
})
```

## File Organization

```
src/
├── api/
│   └── webhooks/
│       ├── stripe.ts
│       ├── twilio.ts
│       ├── zapier.ts
│       └── __tests__/
│           ├── stripe.test.ts
│           ├── twilio.test.ts
│           └── zapier.test.ts
├── test/
│   └── helpers/
│       ├── stripe.ts       # Signature generation
│       └── twilio.ts       # Signature generation
```

## Webhook Testing Checklist

- [ ] Signature validation (valid, invalid, missing)
- [ ] Timestamp validation (fresh, expired)
- [ ] Payload parsing (valid JSON, malformed)
- [ ] Idempotency (duplicate event handling)
- [ ] Business logic (status updates, notifications)
- [ ] Error responses (retry vs no-retry)
- [ ] Logging (audit trail)

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Skipping signature validation tests | Test valid, invalid, and missing signatures |
| No idempotency tests | Verify same event processed only once |
| Always returning 200 | Return 5xx for transient errors (enables retry) |
| Not testing side effects | Verify emails, notifications, DB updates |
| Hardcoded secrets in tests | Use environment variables |
| No timestamp validation | Check signature freshness |
