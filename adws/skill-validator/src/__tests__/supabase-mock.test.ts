import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'

const server = setupServer(
  http.get('*/rest/v1/listings', () => {
    return HttpResponse.json([{ id: '1', title: 'Test Listing' }])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Supabase MSW Mock', () => {
  it('intercepts Supabase API calls', async () => {
    const res = await fetch('https://test.supabase.co/rest/v1/listings')
    const data = await res.json()
    expect(data[0].title).toBe('Test Listing')
  })
})