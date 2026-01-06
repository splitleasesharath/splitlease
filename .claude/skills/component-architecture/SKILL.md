---
name: component-architecture
description: Guides component creation following Split Lease's Hollow Components pattern and four-layer logic architecture. Use when creating new components, refactoring existing ones, or asking about component structure.
---

# Component Architecture Guide

## Core Pattern: Hollow Components

Page components contain **NO logic** — they delegate everything to dedicated hooks:

```
PageComponent.jsx          →  usePageLogic.js
├── Renders UI only             ├── State management
├── Calls useXxxPageLogic       ├── Event handlers
└── Passes data to children     └── Business logic calls
```

## Four-Layer Logic Architecture

Business logic is separated into four distinct layers:

```
src/logic/
├── calculators/   Pure math functions (calculate*, get*)
├── rules/         Boolean predicates (is*, can*, should*)
├── processors/    Data transforms (adapt*, format*, process*)
└── workflows/     Orchestration (*Workflow)
```

## TODO(human): Define Your Component Conventions

Add 3-5 specific conventions that Claude should follow when working with your components. Consider:

- Naming patterns for files and functions
- Required prop types or interfaces
- State management approach
- Error handling patterns
- Testing requirements

Example format:
```
1. **File Naming**: Component files use PascalCase, hooks use camelCase with `use` prefix
2. **Props**: All components receive a `className` prop for styling override
3. **State**: Local state only for UI concerns; business state goes in hooks
```

YOUR CONVENTIONS HERE:

<!-- Delete this comment block and add your conventions above -->

## File Structure Example

```
src/islands/pages/ExamplePage/
├── ExamplePage.jsx           # Hollow component (UI only)
├── useExamplePageLogic.js    # All page logic lives here
├── components/               # Page-specific sub-components
│   ├── ExampleHeader.jsx
│   └── ExampleList.jsx
└── index.js                  # Barrel export
```

## When Creating New Components

1. Start with the page hook (`useXxxPageLogic.js`)
2. Define state and handlers in the hook
3. Create the hollow component that consumes the hook
4. Extract reusable logic to `src/logic/` layers
5. Keep components focused on rendering

## References

- [app/CLAUDE.md](../../../app/CLAUDE.md) - Frontend architecture details
- [src/logic/](../../../app/src/logic/) - Four-layer logic implementation
