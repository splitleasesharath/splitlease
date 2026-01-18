import { render, screen } from '@testing-library/react'
import { createContext, useContext } from 'react'
import { describe, it, expect } from 'vitest'

type User = { id: string; email: string } | null
const AuthContext = createContext<{ user: User }>({ user: null })

function MockAuthProvider({ children, user }: { children: React.ReactNode; user: User }) {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}

function UserDisplay() {
  const { user } = useContext(AuthContext)
  return <div>{user ? user.email : 'Not logged in'}</div>
}

describe('Auth Context Mock', () => {
  it('renders authenticated user', () => {
    render(
      <MockAuthProvider user={{ id: '1', email: 'test@example.com' }}>
        <UserDisplay />
      </MockAuthProvider>
    )
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders unauthenticated state', () => {
    render(
      <MockAuthProvider user={null}>
        <UserDisplay />
      </MockAuthProvider>
    )
    expect(screen.getByText('Not logged in')).toBeInTheDocument()
  })
})