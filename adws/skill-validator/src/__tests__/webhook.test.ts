import crypto from 'crypto'
import { describe, it, expect } from 'vitest'

function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts.t
  const expectedSig = parts.v1

  const signedPayload = `${timestamp}.${payload}`
  const computedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  return computedSig === expectedSig
}

describe('Webhook Handler Tests', () => {
  const secret = 'whsec_test_secret'

  it('generates valid signature', () => {
    const payload = JSON.stringify({ event: 'test' })
    const signature = generateStripeSignature(payload, secret)
    expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/)
  })

  it('verifies valid signature', () => {
    const payload = JSON.stringify({ event: 'test' })
    const signature = generateStripeSignature(payload, secret)
    expect(verifySignature(payload, signature, secret)).toBe(true)
  })

  it('rejects invalid signature', () => {
    const payload = JSON.stringify({ event: 'test' })
    expect(verifySignature(payload, 't=123,v1=invalid', secret)).toBe(false)
  })
})