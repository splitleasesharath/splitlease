# SplitLease Component Library

This directory contains all React components for the SplitLease application, organized using the **Atomic Design** methodology.

## Directory Structure

```
components/src/
├── atomic/       # Basic building blocks (buttons, inputs, icons)
├── molecules/    # Simple combinations of atoms (form fields, cards)
├── organisms/    # Complex UI sections (headers, forms, listings)
├── templates/    # Page-level layout templates
└── index.ts      # Barrel export for all components
```

## Atomic Design Principles

### Atoms (`atomic/`)
The smallest, most fundamental UI elements. These are the building blocks that can't be broken down further without losing their meaning.

**Examples:**
- Button
- Input
- Label
- Icon
- Text
- Link

### Molecules (`molecules/`)
Groups of atoms that function together as a unit. Still relatively simple but more functional than atoms alone.

**Examples:**
- SearchBar (input + icon + button)
- FormField (label + input + error message)
- ListingCard (image + text + button)

### Organisms (`organisms/`)
Complex UI components composed of groups of molecules and/or atoms. These are distinct sections of the interface.

**Examples:**
- Header (logo + navigation + search bar)
- ListingGrid (collection of listing cards)
- BookingForm (multiple form fields + validation)

### Templates (`templates/`)
Page-level layouts that combine organisms, molecules, and atoms. These define the overall structure of pages.

**Examples:**
- MainLayout (header + main content + footer)
- DashboardLayout (sidebar + content area)

## Component Guidelines

### 1. TypeScript Required
All components must be written in TypeScript with proper type definitions.

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  // Implementation
};
```

### 2. Styled Components
Use styled-components for styling to maintain consistency and leverage TypeScript.

```tsx
import styled from 'styled-components';

const StyledButton = styled.button<{ variant: string }>`
  padding: 0.5rem 1rem;
  background: ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
`;
```

### 3. Component File Structure
Each component should follow this structure:

```
ComponentName/
├── ComponentName.tsx      # Component implementation
├── ComponentName.test.tsx # Unit tests
├── ComponentName.styles.ts # Styled components (if separate)
└── index.ts               # Barrel export
```

### 4. Props Documentation
Use JSDoc comments to document component props:

```tsx
/**
 * Primary button component for user actions
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = (props) => {
  // Implementation
};
```

### 5. Accessibility (a11y)
All components must meet WCAG 2.1 AA standards:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast

### 6. Testing Requirements
- Unit tests with React Testing Library
- Accessibility tests with jest-axe
- Minimum 80% code coverage

```tsx
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = render(<Button>Click Me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Animation Guidelines

Use Framer Motion for animations:

```tsx
import { motion } from 'framer-motion';

export const FadeIn = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);
```

## Importing Components

Components can be imported from the root of the components package:

```tsx
import { Button, SearchBar, Header } from '@components';
```

## Building Components

To build the component library:

```bash
cd components
npm run build
```

## Future Considerations

- Component documentation with Storybook
- Visual regression testing
- Design system tokens
- Theme provider for dark mode
