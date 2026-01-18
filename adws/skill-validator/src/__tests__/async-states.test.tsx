import { render, screen, waitFor } from '@testing-library/react'
import { useState, useEffect } from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function DataLoader() {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [data, setData] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error('HTTP error')
        return res.json()
      })
      .then(d => { setData(d.message); setState('success') })
      .catch(() => setState('error'))
  }, [])

  if (state === 'loading') return <div data-testid="loading">Loading...</div>
  if (state === 'error') return <div role="alert">Error loading data</div>
  return <div data-testid="success">{data}</div>
}

describe('Async Loading States', () => {
  it('shows loading then success', async () => {
    server.use(
      http.get('/api/data', async () => {
        await new Promise(r => setTimeout(r, 50))
        return HttpResponse.json({ message: 'Loaded!' })
      })
    )

    render(<DataLoader />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('Loaded!')
    })
  })

  it('shows error state on failure', async () => {
    server.use(
      http.get('/api/data', () => HttpResponse.json({}, { status: 500 }))
    )

    render(<DataLoader />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/error/i)
    })
  })
})