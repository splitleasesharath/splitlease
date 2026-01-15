import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'

const sentMessages: { to: string; body: string }[] = []

const server = setupServer(
  http.post('https://api.twilio.com/2010-04-01/Accounts/:accountSid/Messages.json', async ({ request }) => {
    const formData = await request.formData()
    sentMessages.push({
      to: formData.get('To') as string,
      body: formData.get('Body') as string,
    })
    return HttpResponse.json({ sid: 'SM123', status: 'queued' })
  })
)

beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); sentMessages.length = 0 })
afterAll(() => server.close())

describe('Twilio SMS Mock', () => {
  it('captures sent messages', async () => {
    const formData = new FormData()
    formData.append('To', '+14155551234')
    formData.append('Body', 'Test message')

    await fetch('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json', {
      method: 'POST',
      body: formData,
    })

    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0].to).toBe('+14155551234')
    expect(sentMessages[0].body).toBe('Test message')
  })
})