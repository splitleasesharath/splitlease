import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'

const server = setupServer(
  http.post('https://api.stripe.com/v1/payment_intents', () => {
    return HttpResponse.json({
      id: 'pi_test_123',
      status: 'requires_payment_method',
      client_secret: 'pi_test_123_secret',
    })
  }),
  http.post('https://api.stripe.com/v1/payment_intents/:id/confirm', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'succeeded',
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Stripe Payment Mock', () => {
  it('creates payment intent', async () => {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: 'Bearer sk_test' },
    })
    const data = await res.json()
    expect(data.id).toBe('pi_test_123')
    expect(data.client_secret).toBeDefined()
  })

  it('confirms payment', async () => {
    const res = await fetch('https://api.stripe.com/v1/payment_intents/pi_test_123/confirm', {
      method: 'POST',
    })
    const data = await res.json()
    expect(data.status).toBe('succeeded')
  })
})