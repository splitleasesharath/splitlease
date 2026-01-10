#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv"]
# ///

"""
ADW Skill Validator - Tests skills with dummy code

Usage: uv run adw_skill_validator.py [options]

Options:
  --skill NAME        Validate specific skill
  --category CAT      Validate all skills in category
  --list              List all skills
  --output FILE       Save results to JSON
  --create-dummy      Create dummy test project (required first run)

This script validates that skill patterns work correctly by:
1. Creating minimal test scenarios
2. Applying skill patterns
3. Verifying expected outcomes
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Skill definitions with validation commands
SKILLS = {
    # Category A: Test Infrastructure Setup
    "vitest-rtl-setup": {
        "category": "infrastructure",
        "description": "Vitest + React Testing Library setup",
        "dependencies": ["vitest", "@testing-library/react", "@testing-library/jest-dom", "jsdom"],
        "test_file": "src/__tests__/setup.test.tsx",
        "test_content": '''
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

function TestComponent() {
  return <div>Hello Test</div>
}

describe('Vitest RTL Setup', () => {
  it('renders component correctly', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })
})
''',
        "validate_cmd": "npm run test -- --run",
    },

    "coverage-thresholds": {
        "category": "infrastructure",
        "description": "Coverage threshold configuration",
        "dependencies": ["@vitest/coverage-v8"],
        "config_file": "vitest.config.ts",
        "config_addition": '''
coverage: {
  provider: 'v8',
  reporter: ['text', 'json'],
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
},
''',
        "validate_cmd": "npm run test:coverage",
    },

    "test-file-colocation": {
        "category": "infrastructure",
        "description": "Test file organization patterns",
        "dependencies": [],
        "validation": "structural",  # Validates file structure
    },

    "test-sharding-ci": {
        "category": "infrastructure",
        "description": "CI test sharding",
        "dependencies": [],
        "validation": "ci-only",  # Only validates in CI
    },

    # Category B: Mocking & Isolation
    "mocking-supabase-msw": {
        "category": "mocking",
        "description": "Mock Supabase with MSW",
        "dependencies": ["msw"],
        "test_file": "src/__tests__/supabase-mock.test.ts",
        "test_content": '''
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/supabase-mock.test.ts",
    },

    "mocking-auth-context": {
        "category": "mocking",
        "description": "Mock authentication context",
        "dependencies": [],
        "test_file": "src/__tests__/auth-mock.test.tsx",
        "test_content": '''
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/auth-mock.test.tsx",
    },

    "mocking-twilio-sms": {
        "category": "mocking",
        "description": "Mock Twilio SMS API",
        "dependencies": ["msw"],
        "test_file": "src/__tests__/twilio-mock.test.ts",
        "test_content": '''
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/twilio-mock.test.ts",
    },

    "testing-stripe-payments": {
        "category": "mocking",
        "description": "Mock Stripe payments",
        "dependencies": ["msw"],
        "test_file": "src/__tests__/stripe-mock.test.ts",
        "test_content": '''
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/stripe-mock.test.ts",
    },

    "webhook-handler-tests": {
        "category": "mocking",
        "description": "Test webhook handlers",
        "dependencies": [],
        "test_file": "src/__tests__/webhook.test.ts",
        "test_content": '''
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
    expect(signature).toMatch(/^t=\\d+,v1=[a-f0-9]+$/)
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/webhook.test.ts",
    },

    # Category C: Component Testing
    "testing-custom-hooks": {
        "category": "component",
        "description": "Test React hooks in isolation",
        "dependencies": ["@testing-library/react"],
        "test_file": "src/__tests__/hooks.test.ts",
        "test_content": '''
import { renderHook, act } from '@testing-library/react'
import { useState, useCallback } from 'react'
import { describe, it, expect } from 'vitest'

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  return { count, increment, decrement }
}

describe('Custom Hooks Testing', () => {
  it('starts with initial value', () => {
    const { result } = renderHook(() => useCounter(5))
    expect(result.current.count).toBe(5)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())
    act(() => result.current.increment())
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    act(() => result.current.decrement())
    expect(result.current.count).toBe(4)
  })
})
''',
        "validate_cmd": "npm run test -- --run src/__tests__/hooks.test.ts",
    },

    "testing-form-submissions": {
        "category": "component",
        "description": "Test forms with userEvent",
        "dependencies": ["@testing-library/user-event"],
        "test_file": "src/__tests__/form.test.tsx",
        "test_content": '''
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

function LoginForm({ onSubmit }: { onSubmit: (data: { email: string; password: string }) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input aria-label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Sign in</button>
    </form>
  )
}

describe('Form Submission Testing', () => {
  it('submits form with user input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
''',
        "validate_cmd": "npm run test -- --run src/__tests__/form.test.tsx",
    },

    "testing-async-loading-states": {
        "category": "component",
        "description": "Test async loading/error/success states",
        "dependencies": ["msw"],
        "test_file": "src/__tests__/async-states.test.tsx",
        "test_content": '''
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
''',
        "validate_cmd": "npm run test -- --run src/__tests__/async-states.test.tsx",
    },

    "accessible-query-patterns": {
        "category": "component",
        "description": "Use accessible Testing Library queries",
        "dependencies": [],
        "test_file": "src/__tests__/accessible-queries.test.tsx",
        "test_content": '''
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

function AccessibleForm() {
  return (
    <form>
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" role="textbox" />
      <button type="submit">Submit</button>
      <img src="/logo.png" alt="Company Logo" />
    </form>
  )
}

describe('Accessible Query Patterns', () => {
  // Priority 1: Queries accessible to everyone
  it('uses getByRole for interactive elements', () => {
    render(<AccessibleForm />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('uses getByLabelText for form fields', () => {
    render(<AccessibleForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('uses getByAltText for images', () => {
    render(<AccessibleForm />)
    expect(screen.getByAltText(/company logo/i)).toBeInTheDocument()
  })

  // Avoid: getByTestId should be last resort
  // it('avoids getByTestId when possible', () => { ... })
})
''',
        "validate_cmd": "npm run test -- --run src/__tests__/accessible-queries.test.tsx",
    },

    # Category D: E2E Testing - require Playwright
    "page-object-model": {
        "category": "e2e",
        "description": "Playwright Page Object Model",
        "dependencies": ["@playwright/test"],
        "validation": "playwright",
    },

    "visual-regression-testing": {
        "category": "e2e",
        "description": "Playwright visual comparison",
        "dependencies": ["@playwright/test"],
        "validation": "playwright",
    },

    "reusable-auth-state": {
        "category": "e2e",
        "description": "E2E auth state persistence",
        "dependencies": ["@playwright/test"],
        "validation": "playwright",
    },

    "websocket-realtime-testing": {
        "category": "e2e",
        "description": "WebSocket/Realtime testing",
        "dependencies": ["@playwright/test"],
        "validation": "playwright",
    },

    # Category E: Database Testing
    "testing-rls-pgtap": {
        "category": "database",
        "description": "PostgreSQL RLS testing with pgTAP",
        "dependencies": [],
        "validation": "database",
    },

    "database-seed-scripts": {
        "category": "database",
        "description": "Test data factories",
        "dependencies": [],
        "validation": "database",
    },
}


@dataclass
class SkillValidationResult:
    skill_name: str
    category: str
    status: str  # passed, failed, skipped
    duration_seconds: float
    error: Optional[str] = None
    output: Optional[str] = None


def create_dummy_project(path: str) -> bool:
    """Create minimal dummy project for testing skills."""
    project_path = Path(path)

    if project_path.exists():
        print(f"Project already exists at {path}")
        return True

    print(f"Creating dummy project at {path}")

    try:
        project_path.mkdir(parents=True)

        # package.json
        package_json = {
            "name": "skill-validator",
            "version": "1.0.0",
            "type": "module",
            "scripts": {
                "test": "vitest",
                "test:coverage": "vitest run --coverage"
            },
            "devDependencies": {
                "vitest": "^2.0.0",
                "@testing-library/react": "^16.0.0",
                "@testing-library/jest-dom": "^6.0.0",
                "@testing-library/user-event": "^14.0.0",
                "@vitest/coverage-v8": "^2.0.0",
                "msw": "^2.0.0",
                "jsdom": "^25.0.0",
                "react": "^18.0.0",
                "react-dom": "^18.0.0",
                "@types/react": "^18.0.0",
                "typescript": "^5.0.0"
            }
        }
        (project_path / "package.json").write_text(json.dumps(package_json, indent=2))

        # vitest.config.ts
        vitest_config = '''
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
'''
        (project_path / "vitest.config.ts").write_text(vitest_config)

        # tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "ESNext",
                "moduleResolution": "bundler",
                "jsx": "react-jsx",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True
            },
            "include": ["src"]
        }
        (project_path / "tsconfig.json").write_text(json.dumps(tsconfig, indent=2))

        # Setup files
        (project_path / "src").mkdir()
        (project_path / "src/__tests__").mkdir()
        (project_path / "src/test").mkdir()

        setup_ts = '''
import '@testing-library/jest-dom/vitest'
'''
        (project_path / "src/test/setup.ts").write_text(setup_ts)

        print("Created dummy project structure")
        print("Run: cd skill-validator && npm install")
        return True

    except Exception as e:
        print(f"Error creating project: {e}")
        return False


def validate_skill(skill_name: str, project_path: str) -> SkillValidationResult:
    """Validate a single skill."""
    if skill_name not in SKILLS:
        return SkillValidationResult(
            skill_name=skill_name,
            category="unknown",
            status="failed",
            duration_seconds=0,
            error=f"Unknown skill: {skill_name}"
        )

    skill = SKILLS[skill_name]
    category = skill["category"]
    start = datetime.now()

    # Check validation type
    validation_type = skill.get("validation", "test")

    if validation_type in ["playwright", "database", "ci-only", "structural"]:
        return SkillValidationResult(
            skill_name=skill_name,
            category=category,
            status="skipped",
            duration_seconds=0,
            error=f"Requires {validation_type} environment"
        )

    # Create test file
    test_file = skill.get("test_file")
    test_content = skill.get("test_content")

    if test_file and test_content:
        test_path = Path(project_path) / test_file
        test_path.parent.mkdir(parents=True, exist_ok=True)
        test_path.write_text(test_content.strip())

    # Run validation command
    validate_cmd = skill.get("validate_cmd", "npm run test -- --run")

    try:
        result = subprocess.run(
            validate_cmd,
            shell=True,
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=120
        )

        duration = (datetime.now() - start).total_seconds()
        passed = result.returncode == 0

        return SkillValidationResult(
            skill_name=skill_name,
            category=category,
            status="passed" if passed else "failed",
            duration_seconds=duration,
            error=result.stderr[:500] if not passed else None,
            output=result.stdout[:500] if passed else None
        )

    except subprocess.TimeoutExpired:
        return SkillValidationResult(
            skill_name=skill_name,
            category=category,
            status="failed",
            duration_seconds=120,
            error="Timeout after 120s"
        )
    except Exception as e:
        return SkillValidationResult(
            skill_name=skill_name,
            category=category,
            status="failed",
            duration_seconds=(datetime.now() - start).total_seconds(),
            error=str(e)
        )


def list_skills():
    """List all available skills."""
    print("\nAvailable Skills:")
    print("=" * 60)

    by_category: Dict[str, List[str]] = {}
    for name, skill in SKILLS.items():
        cat = skill["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(name)

    for category, skills in sorted(by_category.items()):
        print(f"\n[{category.upper()}]")
        for skill in sorted(skills):
            desc = SKILLS[skill]["description"]
            print(f"  {skill}: {desc}")


def main():
    parser = argparse.ArgumentParser(description="Validate TAC skills")
    parser.add_argument("--skill", help="Validate specific skill")
    parser.add_argument("--category", help="Validate all skills in category")
    parser.add_argument("--list", action="store_true", help="List all skills")
    parser.add_argument("--output", help="Save results to JSON")
    parser.add_argument("--create-dummy", action="store_true", help="Create dummy project")
    parser.add_argument("--project-path", default="./skill-validator", help="Path to test project")

    args = parser.parse_args()

    if args.list:
        list_skills()
        return

    if args.create_dummy:
        create_dummy_project(args.project_path)
        return

    # Determine which skills to validate
    skills_to_validate = []

    if args.skill:
        if args.skill in SKILLS:
            skills_to_validate = [args.skill]
        else:
            print(f"Unknown skill: {args.skill}")
            sys.exit(1)
    elif args.category:
        skills_to_validate = [
            name for name, skill in SKILLS.items()
            if skill["category"] == args.category
        ]
        if not skills_to_validate:
            print(f"No skills in category: {args.category}")
            sys.exit(1)
    else:
        # Validate all testable skills
        skills_to_validate = [
            name for name, skill in SKILLS.items()
            if skill.get("validation", "test") == "test"
        ]

    # Check project exists
    if not Path(args.project_path).exists():
        print(f"Project not found at {args.project_path}")
        print("Run with --create-dummy first")
        sys.exit(1)

    # Run validations
    print("\n" + "=" * 60)
    print("SKILL VALIDATION")
    print("=" * 60)

    results: List[SkillValidationResult] = []

    for skill_name in skills_to_validate:
        print(f"\nValidating: {skill_name}...")
        result = validate_skill(skill_name, args.project_path)
        results.append(result)

        status_icon = {"passed": "PASS", "failed": "FAIL", "skipped": "SKIP"}[result.status]
        print(f"  [{status_icon}] {result.duration_seconds:.1f}s")
        if result.error:
            print(f"  Error: {result.error[:100]}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results if r.status == "passed")
    failed = sum(1 for r in results if r.status == "failed")
    skipped = sum(1 for r in results if r.status == "skipped")

    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")

    # Save results
    if args.output:
        with open(args.output, "w") as f:
            json.dump([asdict(r) for r in results], f, indent=2)
        print(f"\nResults saved to: {args.output}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
