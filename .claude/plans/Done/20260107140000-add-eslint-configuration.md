# Implementation Plan: Add ESLint Configuration

## Overview
Add ESLint configuration to the Split Lease project with separate configurations for the React frontend (JavaScript/JSX in `app/`) and Deno-based Edge Functions (TypeScript in `supabase/functions/`). This will enforce code quality standards, catch common mistakes, and validate React-specific patterns.

## Success Criteria
- [ ] ESLint installed as dev dependency in `app/package.json`
- [ ] Flat config file (`eslint.config.js`) created in `app/` for frontend
- [ ] ESLint configured for React 18, JSX, and modern JavaScript
- [ ] Deno-native linting enabled via `deno.json` for Edge Functions
- [ ] Lint scripts added to `app/package.json`
- [ ] No breaking changes to existing code (warnings acceptable initially)
- [ ] Documentation updated with linting instructions

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/package.json` | NPM/Bun package config | Add ESLint devDependencies, lint scripts |
| `app/eslint.config.js` | **NEW** ESLint flat config | Create with React/JSX rules |
| `app/tsconfig.json` | TypeScript config | Reference only (no changes) |
| `app/vite.config.js` | Vite bundler config | Reference only (no changes) |
| `supabase/functions/deno.json` | **NEW** Root Deno config | Create for shared lint rules |
| `supabase/functions/*/deno.json` | Per-function Deno configs | May need updates for lint inheritance |

### Related Documentation
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files-new) - ESLint 9.x+ flat config format
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) - React-specific linting rules
- [Deno Linter](https://deno.land/manual/tools/linter) - Built-in Deno lint tool

### Existing Patterns to Follow
- **ES Modules**: Project uses `"type": "module"` - config must use ESM format
- **Bun Package Manager**: Use `bun add -d` for dev dependencies
- **Islands Architecture**: Frontend is multi-page, not SPA - lint rules should be appropriate
- **Four-Layer Logic**: Business logic in `src/logic/` - may benefit from specific rules

## Implementation Steps

### Step 1: Install ESLint and Plugins for Frontend
**Files:** `app/package.json`
**Purpose:** Add ESLint and necessary plugins as dev dependencies

**Details:**
- Install ESLint 9.x (latest with flat config by default)
- Install `eslint-plugin-react` for React rules
- Install `eslint-plugin-react-hooks` for hooks rules
- Install `globals` package for predefined globals (browser, node)
- Use Bun for installation

**Commands:**
```bash
cd app && bun add -d eslint eslint-plugin-react eslint-plugin-react-hooks globals
```

**Expected package.json additions:**
```json
"devDependencies": {
  "eslint": "^9.x.x",
  "eslint-plugin-react": "^7.x.x",
  "eslint-plugin-react-hooks": "^5.x.x",
  "globals": "^15.x.x"
}
```

**Validation:** Run `bun eslint --version` to verify installation

---

### Step 2: Create ESLint Flat Config for Frontend
**Files:** `app/eslint.config.js` (NEW)
**Purpose:** Configure ESLint rules for React/JSX frontend code

**Details:**
Create a flat config file with:
- JavaScript and JSX support
- React 18 settings
- React Hooks rules
- Browser globals
- Reasonable defaults that won't break existing code

**Configuration:**
```javascript
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    // Apply to all JS/JSX files in src/
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    settings: {
      react: {
        version: '18.2',
      },
    },
    rules: {
      // React rules - start with warnings for existing code
      'react/jsx-uses-react': 'off', // Not needed with React 17+ JSX transform
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off', // Not using PropTypes (using TypeScript for types)
      'react/jsx-key': 'warn', // Warn about missing keys in lists
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'warn',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-unescaped-entities': 'warn',
      'react/no-unknown-property': 'error',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General JavaScript rules - relaxed for existing code
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'off', // Allow console for now
      'no-debugger': 'warn',
      'no-undef': 'error',
      'no-duplicate-imports': 'warn',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'prefer-const': 'warn',
    },
  },
  {
    // Configuration files (vite.config.js, etc.)
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**/*.js', // Static assets
    ],
  },
];
```

**Validation:** Run `bun eslint src/main.jsx --no-error-on-unmatched-pattern` to verify config works

---

### Step 3: Add Lint Scripts to package.json
**Files:** `app/package.json`
**Purpose:** Add convenient lint commands for developers

**Details:**
Add the following scripts:
- `lint` - Run ESLint on all source files
- `lint:fix` - Run ESLint with auto-fix
- `lint:check` - Run ESLint in CI mode (report only)

**Changes to package.json:**
```json
"scripts": {
  "dev": "vite --port 8000",
  "generate-routes": "node scripts/generate-redirects.js",
  "prebuild": "bun run generate-routes",
  "build": "vite build",
  "preview": "vite preview --port 8000",
  "deploy": "wrangler pages deploy dist --project-name splitlease",
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix",
  "lint:check": "eslint src/ --max-warnings 0"
}
```

**Validation:** Run `bun run lint` and verify it executes without errors (warnings OK)

---

### Step 4: Configure Deno Linting for Edge Functions
**Files:** `supabase/functions/deno.json` (NEW)
**Purpose:** Enable Deno's built-in linter for TypeScript Edge Functions

**Details:**
Deno has a built-in linter (`deno lint`) that is more appropriate for Deno/TypeScript code than ESLint. Create a root `deno.json` config that applies to all functions.

**Configuration:**
```json
{
  "lint": {
    "include": [
      "./**/*.ts"
    ],
    "exclude": [
      "./**/*_test.ts"
    ],
    "rules": {
      "tags": ["recommended"],
      "include": [
        "ban-untagged-todo",
        "no-unused-vars",
        "no-explicit-any"
      ],
      "exclude": [
        "no-explicit-any"
      ]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true,
    "proseWrap": "always"
  }
}
```

**Note:** Start with recommended rules, exclude `no-explicit-any` since the codebase uses `any` in several places (this can be gradually tightened).

**Validation:** Run `deno lint supabase/functions/` from project root

---

### Step 5: Update Individual Function deno.json Files (Optional)
**Files:** `supabase/functions/*/deno.json`
**Purpose:** Ensure per-function configs don't conflict with root config

**Details:**
The existing per-function `deno.json` files only contain imports. They should continue to work with the root config. If needed, add:

```json
{
  "imports": {
    // existing imports...
  },
  "lint": {
    "include": ["./**/*.ts"]
  }
}
```

**No changes needed** if the root config is sufficient.

**Validation:** Run `deno lint` in each function directory to verify

---

### Step 6: Run Initial Lint and Document Results
**Files:** None (documentation only)
**Purpose:** Establish baseline and document any existing issues

**Details:**
1. Run `bun run lint` in `app/` directory
2. Run `deno lint` in `supabase/functions/` directory
3. Document the number and types of warnings found
4. Create a brief summary for the team

**Expected output types:**
- Unused variables (warn)
- Missing keys in lists (warn)
- Hook dependency warnings (warn)
- No blocking errors expected

**Validation:** Both lint commands complete without fatal errors

---

### Step 7: Update Project Documentation
**Files:** `.claude/CLAUDE.md` (project root)
**Purpose:** Document linting commands and conventions

**Details:**
Add a section to the Commands documentation:

```markdown
# Linting

```bash
# Frontend (from app/ directory)
bun run lint              # Check for issues
bun run lint:fix          # Auto-fix where possible

# Edge Functions (from project root)
deno lint supabase/functions/   # Check TypeScript functions
deno fmt --check supabase/functions/  # Check formatting
```

**Validation:** Documentation is clear and commands work as documented

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Existing code has many warnings | Use `warn` level initially, not `error` |
| JSX files with .js extension | Config handles both `.js` and `.jsx` |
| Third-party code in node_modules | Excluded via ignores pattern |
| Build artifacts in dist/ | Excluded via ignores pattern |
| Config files (vite.config.js) | Separate config block with Node globals |
| Deno-specific APIs | Deno linter understands Deno runtime |

## Testing Considerations

1. **Frontend Lint Test**
   - Run `bun run lint` - should complete without errors
   - Run `bun run lint:fix` - should not break any functionality
   - Run `bun run build` after lint:fix - build should succeed

2. **Backend Lint Test**
   - Run `deno lint supabase/functions/` - should complete
   - Deploy a function after any fixes - should work normally

3. **Key Scenarios**
   - New file creation respects lint rules
   - Existing code continues to work
   - Build process is not affected

## Rollback Strategy

If issues arise:

1. **Frontend rollback:**
   ```bash
   cd app
   rm eslint.config.js
   bun remove eslint eslint-plugin-react eslint-plugin-react-hooks globals
   ```
   Then revert `package.json` script changes.

2. **Backend rollback:**
   ```bash
   rm supabase/functions/deno.json
   ```
   Per-function configs remain unchanged.

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Bun package manager | Available | Used for installations |
| ESLint 9.x | Available | Flat config format |
| Deno 2.x | Available | Built-in linter |
| Internet access | Required | For package download |

**No blockers identified.**

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Lint errors break build | Low | Medium | Use warn-level rules initially |
| Conflicts with existing tooling | Low | Low | ESLint is standalone |
| Developer workflow disruption | Low | Low | Opt-in lint scripts |
| Deno lint incompatibility | Very Low | Low | Uses built-in Deno tooling |

---

## File References Summary

### Files to Create
- `c:\Users\Split Lease\Documents\Split Lease\app\eslint.config.js`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\deno.json`

### Files to Modify
- `c:\Users\Split Lease\Documents\Split Lease\app\package.json`
- `c:\Users\Split Lease\Documents\Split Lease\.claude\CLAUDE.md` (optional documentation update)

### Reference Files (Read Only)
- `c:\Users\Split Lease\Documents\Split Lease\app\tsconfig.json`
- `c:\Users\Split Lease\Documents\Split Lease\app\vite.config.js`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\ai-gateway\deno.json`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\listing\deno.json`

---

**Plan Version:** 1.0
**Created:** 2026-01-07
**Classification:** BUILD
**Complexity:** Low-Medium (straightforward configuration task)
