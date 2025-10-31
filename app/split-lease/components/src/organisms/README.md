# Organism Components

Complex UI sections composed of molecules and atoms. Organisms are distinct sections of the interface that form larger, more sophisticated components.

## Characteristics

- **Complex Composition**: Built from multiple molecules and/or atoms
- **Business Logic**: May contain application logic
- **Stateful**: Often manage their own state
- **Context-Specific**: May be tailored to specific use cases

## Examples

### Header
```tsx
<Header
  logo={<Logo />}
  navigation={navigationItems}
  searchBar={<SearchBar />}
  userMenu={<UserMenu user={currentUser} />}
/>
```

Composed of:
- Logo (atom)
- Navigation (molecule)
- SearchBar (molecule)
- UserMenu (molecule)

### ListingGrid
```tsx
<ListingGrid
  listings={listings}
  onListingClick={handleListingClick}
  loading={isLoading}
  filters={activeFilters}
/>
```

Composed of:
- Multiple ListingCard components (molecules)
- LoadingSpinner (atom)
- FilterBar (molecule)

### BookingForm
```tsx
<BookingForm
  listing={listing}
  onSubmit={handleBooking}
  validation={validationRules}
/>
```

Composed of:
- Multiple FormField components (molecules)
- DatePicker (molecule)
- Button (atom)
- PriceCalculator (molecule)

## Creating a New Organism

1. Identify the molecules and atoms needed
2. Define the organism's responsibilities
3. Implement state management
4. Handle business logic
5. Write comprehensive tests

Example structure:
```
organisms/
└── Header/
    ├── Header.tsx
    ├── Header.test.tsx
    ├── Header.styles.ts
    └── index.ts
```

## State Management

Organisms may use:
- React hooks (useState, useEffect)
- Context API for shared state
- External state management (Zustand) when needed
