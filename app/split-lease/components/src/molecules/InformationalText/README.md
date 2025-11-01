# InformationalText Component

A flexible, accessible React component for displaying informational messages, notices, tips, or contextual help text with various severity levels.

## Overview

The `InformationalText` component provides a standardized way to display different types of messages to users with appropriate styling, icons, and accessibility features. It supports info, warning, success, and error variants, along with optional titles, action buttons, and dismiss functionality.

## Features

- 🎨 **Multiple Variants**: Info, warning, success, and error styles
- 📏 **Three Sizes**: Small, medium, and large
- ♿ **Fully Accessible**: WCAG 2.1 AA compliant with proper ARIA attributes
- ⌨️ **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space)
- 🎯 **Action Buttons**: Support for multiple action buttons
- ❌ **Dismissible**: Optional dismiss functionality
- 🔧 **Customizable**: Custom icons and styling
- 🚀 **Performance Optimized**: Memoized with React.memo
- 📦 **Type Safe**: Full TypeScript support with runtime validation

## Installation

```tsx
import { InformationalText } from '@split-lease/components/molecules/InformationalText';
```

## Basic Usage

### Simple Info Message

```tsx
<InformationalText variant="info">
  This is an informational message
</InformationalText>
```

### Warning with Title

```tsx
<InformationalText variant="warning" title="Important Notice">
  Please review your settings before continuing
</InformationalText>
```

### Success Message

```tsx
<InformationalText variant="success">
  Your changes have been saved successfully
</InformationalText>
```

### Error Message

```tsx
<InformationalText variant="error" title="Error">
  Failed to save changes. Please try again.
</InformationalText>
```

## Advanced Usage

### Dismissible Message

```tsx
<InformationalText
  variant="warning"
  title="Temporary Notice"
  onDismiss={() => console.log('Dismissed')}
>
  This message can be dismissed
</InformationalText>
```

### Message with Action Buttons

```tsx
<InformationalText
  variant="error"
  title="Connection Failed"
  actions={[
    { label: 'Retry', onClick: handleRetry },
    { label: 'View Details', onClick: showDetails }
  ]}
>
  Unable to connect to the server
</InformationalText>
```

### Custom Icon

```tsx
<InformationalText
  variant="info"
  icon={<CustomIcon />}
>
  Message with custom icon
</InformationalText>
```

### Different Sizes

```tsx
{/* Small */}
<InformationalText size="small" variant="info">
  Compact message
</InformationalText>

{/* Medium (default) */}
<InformationalText size="medium" variant="info">
  Standard message
</InformationalText>

{/* Large */}
<InformationalText size="large" variant="info">
  Large message
</InformationalText>
```

### Complex Content

```tsx
<InformationalText variant="warning" title="Multiple Items">
  <ul>
    <li>Item 1 requires attention</li>
    <li>Item 2 needs review</li>
    <li>Item 3 is pending</li>
  </ul>
</InformationalText>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'info' \| 'warning' \| 'success' \| 'error'` | `'info'` | Visual style and semantic type of the message |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size of the component |
| `title` | `string` | `undefined` | Optional title/heading for the message |
| `children` | `React.ReactNode` | required | Main content/message to display |
| `icon` | `React.ReactNode` | `undefined` | Custom icon to override default variant icon |
| `onDismiss` | `() => void` | `undefined` | Callback when dismiss button is clicked |
| `actions` | `InformationalTextAction[]` | `undefined` | Array of action button configurations |
| `className` | `string` | `undefined` | Additional CSS class names |
| `data-testid` | `string` | `undefined` | Test ID for automated testing |

### InformationalTextAction Interface

```typescript
interface InformationalTextAction {
  label: string;           // Button label text
  onClick: () => void;     // Click handler
  ariaLabel?: string;      // Optional custom aria-label
  disabled?: boolean;      // Optional disabled state
}
```

## Variants

### Info (default)
- **Color**: Blue
- **Use case**: General information, tips, helpful notes
- **ARIA role**: `status`
- **ARIA live**: `polite`

### Warning
- **Color**: Orange/Yellow
- **Use case**: Cautions, important notices that need attention
- **ARIA role**: `alert`
- **ARIA live**: `assertive`

### Success
- **Color**: Green
- **Use case**: Successful operations, confirmations
- **ARIA role**: `status`
- **ARIA live**: `polite`

### Error
- **Color**: Red
- **Use case**: Errors, failures, critical issues
- **ARIA role**: `alert`
- **ARIA live**: `assertive`

## Accessibility

### WCAG 2.1 AA Compliance

The component meets WCAG 2.1 AA standards:

- ✅ **Color Contrast**: All text meets 4.5:1 ratio (normal text), 3:1 for large text
- ✅ **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space)
- ✅ **Focus Indicators**: Visible focus indicators (2px minimum)
- ✅ **Touch Targets**: All interactive elements are 44x44px minimum
- ✅ **ARIA Attributes**: Proper roles and live regions
- ✅ **Screen Reader Support**: Meaningful announcements

### Keyboard Support

- **Tab**: Move focus through action buttons and dismiss button
- **Enter/Space**: Activate focused button
- **Escape**: (Future enhancement) Dismiss message

### ARIA Attributes

The component automatically sets appropriate ARIA attributes:

- `role="alert"` for error and warning variants (assertive announcements)
- `role="status"` for info and success variants (polite announcements)
- `aria-live="assertive"` for error/warning
- `aria-live="polite"` for info/success
- `aria-label="Dismiss notification"` on dismiss button
- Custom `aria-label` support for action buttons

### Screen Reader Behavior

- **Error/Warning**: Announced immediately when rendered
- **Info/Success**: Announced when screen reader is idle
- **Icons**: Properly hidden from screen readers (`aria-hidden="true"`)
- **Buttons**: Clearly labeled and focusable

## Styling

### CSS Modules

The component uses CSS Modules for scoped styling. All styles are contained in `InformationalText.module.css`.

### Custom Styling

Add custom styles using the `className` prop:

```tsx
<InformationalText className="custom-message" variant="info">
  Custom styled message
</InformationalText>
```

### Theme Customization

The component uses CSS custom properties for colors. Future enhancement will support theme customization.

## Best Practices

### When to Use Each Variant

- **Info**: General information, tips, help text, neutral notices
- **Warning**: Things that need attention but aren't errors (e.g., "Your trial expires soon")
- **Success**: Confirm successful operations (e.g., "Settings saved")
- **Error**: Critical issues requiring immediate attention (e.g., "Payment failed")

### Action Buttons

- Limit to 1-2 action buttons for clarity
- Use clear, action-oriented labels ("Retry", "View Details", not "OK")
- Place primary action first
- Consider disabled state for unavailable actions

### Content Guidelines

- Keep messages concise and scannable
- Use title for main point, body for details
- Avoid technical jargon when possible
- Provide actionable next steps

### Dismissibility

- Make informational and success messages dismissible
- Consider non-dismissible for critical errors requiring action
- Use auto-dismiss (future enhancement) sparingly

## Performance

- **Bundle Size**: < 20KB gzipped
- **Initial Render**: < 16ms (60 FPS)
- **Re-render**: < 10ms
- **Optimizations**:
  - React.memo prevents unnecessary re-renders
  - useCallback stabilizes event handlers
  - useMemo for computed values

## Browser Support

- Modern browsers with ES2020+ support
- React 18+
- CSS Grid and Flexbox required
- No IE11 support

## Testing

### Unit Testing Example

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InformationalText } from '@split-lease/components';

test('calls onDismiss when dismiss button clicked', async () => {
  const handleDismiss = vi.fn();
  const user = userEvent.setup();

  render(
    <InformationalText onDismiss={handleDismiss}>
      Test message
    </InformationalText>
  );

  await user.click(screen.getByLabelText('Dismiss notification'));
  expect(handleDismiss).toHaveBeenCalledTimes(1);
});
```

### Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(
    <InformationalText variant="error">Error message</InformationalText>
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Related Components

- **Toast**: For temporary notifications (future component)
- **Modal**: For important dialogs requiring user action
- **Banner**: For page-level announcements

## Migration Notes

This is a new component with no prior versions.

## Changelog

### v1.0.0 (2025-01-31)
- Initial release
- Support for info, warning, success, error variants
- Three size options (small, medium, large)
- Action buttons and dismiss functionality
- Full WCAG 2.1 AA accessibility compliance
- Comprehensive test coverage (>90%)

## Contributing

When modifying this component:

1. Maintain WCAG 2.1 AA compliance
2. Keep test coverage >90%
3. Update this README with changes
4. Follow the Ten Commandments of Architecture
5. Add examples for new features

## License

Proprietary - Split Lease

---

**Last Updated**: 2025-01-31
**Component Version**: 1.0.0
**Maintained By**: Split Lease Development Team
