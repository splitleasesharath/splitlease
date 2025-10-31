# Molecular Components

Simple combinations of atoms that work together as a functional unit. Molecules are still relatively simple but provide more functionality than individual atoms.

## Characteristics

- **Composed of Atoms**: Built from multiple atomic components
- **Single Purpose**: Serve a specific, well-defined function
- **Reusable**: Can be used in multiple contexts
- **May Have Simple State**: Can manage basic UI state

## Examples

### SearchBar
```tsx
<SearchBar
  placeholder="Search listings..."
  onSearch={handleSearch}
  suggestions={suggestions}
/>
```

Composed of:
- Input (atom)
- Button (atom)
- Icon (atom)

### FormField
```tsx
<FormField
  label="Email Address"
  type="email"
  value={email}
  error={emailError}
  onChange={handleChange}
/>
```

Composed of:
- Label (atom)
- Input (atom)
- Text (atom) for error message

### ListingCard
```tsx
<ListingCard
  image={listing.image}
  title={listing.title}
  price={listing.price}
  location={listing.location}
  onClick={handleClick}
/>
```

Composed of:
- Image (atom)
- Text (atom)
- Button (atom)

## Creating a New Molecule

1. Identify the atoms needed
2. Define the molecule's interface
3. Implement composition logic
4. Add interaction handling
5. Write integration tests

Example structure:
```
molecules/
└── SearchBar/
    ├── SearchBar.tsx
    ├── SearchBar.test.tsx
    └── index.ts
```
