# Atomic Components

The most fundamental UI building blocks. These are simple, single-purpose components that can't be broken down further without losing their meaning.

## Characteristics

- **Single Responsibility**: Each atom does one thing well
- **Highly Reusable**: Used throughout the application
- **Stateless**: Typically don't manage their own state
- **Minimal Dependencies**: Don't depend on other components

## Examples

### Button
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Submit
</Button>
```

### Input
```tsx
<Input
  type="text"
  placeholder="Enter your email"
  value={email}
  onChange={handleChange}
/>
```

### Icon
```tsx
<Icon name="search" size={24} color="currentColor" />
```

### Text
```tsx
<Text variant="h1" color="primary">
  Welcome to SplitLease
</Text>
```

## Creating a New Atom

1. Create a new directory with the component name
2. Add TypeScript interface for props
3. Implement the component with styled-components
4. Write unit tests
5. Export from index.ts

Example structure:
```
atomic/
└── Button/
    ├── Button.tsx
    ├── Button.test.tsx
    └── index.ts
```
