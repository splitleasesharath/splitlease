# Modal Component

A generic, reusable Modal component for the Split Lease application, built following the project's architecture requirements.

## File Location

```
C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\Modal.jsx
```

## Features Implemented

- **Modal Overlay (Backdrop)**: Semi-transparent black background that covers the entire viewport
- **Modal Content Container**: Centered, white container with rounded corners and shadow
- **Close Button (X Icon)**: Lucide React X icon in the top-right corner with hover effects
- **Close on ESC Key Press**: Keyboard accessibility for quick modal dismissal
- **Close on Overlay Click**: Click outside the modal content to close
- **Body Scroll Prevention**: Prevents background scrolling when modal is open
- **Smooth Animations**: Fade-in overlay and slide-in content animations
- **Controlled Component Pattern**: Uses isOpen prop and onClose callback
- **Accessibility**: Proper ARIA labels and keyboard support
- **Responsive Design**: Adapts to different screen sizes (90vw max width, 90vh max height)

## Architecture Compliance

✅ **MUST use .jsx extension**: `Modal.jsx`
✅ **MUST use default export**: `export default function Modal(props) {}`
✅ **Import lucide-react for close icon**: `import { X } from 'lucide-react';`
✅ **Use React hooks**: `import { useEffect } from 'react';`
✅ **NO fallback mechanisms**: Direct implementation without compatibility layers
✅ **Controlled component pattern**: Uses isOpen prop + onClose callback

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controls whether the modal is visible |
| `onClose` | `function` | **required** | Callback function called when modal should close |
| `children` | `React.ReactNode` | - | The content to display inside the modal |
| `title` | `string` | `undefined` | Optional modal title displayed at the top |
| `className` | `string` | `''` | Additional CSS classes for the modal content |
| `closeOnOverlayClick` | `boolean` | `true` | Whether clicking the overlay should close the modal |
| `closeOnEsc` | `boolean` | `true` | Whether pressing ESC key should close the modal |
| `showCloseButton` | `boolean` | `true` | Whether to show the X close button |

## Basic Usage

```jsx
import { useState } from 'react';
import Modal from './Modal.jsx';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Open Modal
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <p>This is the modal content!</p>
      </Modal>
    </>
  );
}
```

## Advanced Usage Examples

### 1. Modal with Title

```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Welcome to Split Lease"
>
  <p>Your content here...</p>
</Modal>
```

### 2. Form Modal (Prevent Accidental Closure)

```jsx
<Modal
  isOpen={isFormOpen}
  onClose={handleFormClose}
  title="Sign In"
  closeOnOverlayClick={false}
  closeOnEsc={false}
>
  <form onSubmit={handleSubmit}>
    <input type="email" placeholder="Email" />
    <input type="password" placeholder="Password" />
    <button type="submit">Submit</button>
  </form>
</Modal>
```

### 3. Custom Styled Modal

```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Custom Modal"
  className="custom-modal-class"
>
  <div style={{ padding: '20px', backgroundColor: '#f3f4f6' }}>
    <p>Custom styled content</p>
  </div>
</Modal>
```

### 4. Confirmation Modal

```jsx
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Action"
  closeOnOverlayClick={false}
>
  <p>Are you sure you want to continue?</p>
  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
    <button onClick={() => setShowConfirm(false)}>Cancel</button>
    <button onClick={handleConfirm}>Confirm</button>
  </div>
</Modal>
```

## Implementation Details

### Body Scroll Management

The modal automatically prevents body scroll when open and restores it when closed:

```javascript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);
```

### ESC Key Handling

The modal listens for ESC key presses when open (if enabled):

```javascript
useEffect(() => {
  if (!isOpen || !closeOnEsc) return;

  const handleEscKey = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscKey);
  return () => document.removeEventListener('keydown', handleEscKey);
}, [isOpen, closeOnEsc, onClose]);
```

### Overlay Click Handling

Clicking the overlay closes the modal (if enabled):

```javascript
const handleOverlayClick = (event) => {
  if (closeOnOverlayClick && event.target === event.currentTarget) {
    onClose();
  }
};
```

## Animations

The modal includes two CSS animations:

1. **Fade In** (overlay): Smooth opacity transition from 0 to 1
2. **Slide In** (content): Slides from -20px to 0 with opacity change

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Styling

The modal uses inline styles for portability and consistency. Key styles:

- **Overlay**: Full viewport coverage, semi-transparent black (rgba(0, 0, 0, 0.5))
- **Content**: White background, rounded corners (12px), centered positioning
- **Close Button**: Top-right placement, hover effect with gray background
- **Responsive**: Max 90vw width and 90vh height with overflow scrolling

## Accessibility

- Close button has proper `aria-label="Close modal"`
- ESC key support for keyboard users
- Focus management (modal content receives focus when opened)
- Semantic HTML structure

## Integration with Split Lease

This modal can be used throughout the Split Lease application for:

- Authentication forms (sign in/sign up)
- Property detail previews
- Booking confirmations
- Error messages
- Help/info dialogs
- Image galleries
- Filter options

## Example: Auth Modal Integration

Based on the original `input/index/index.html` and `input/index/script.js`:

```jsx
import { useState } from 'react';
import Modal from './Modal.jsx';

function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState('welcome'); // 'welcome' | 'login' | 'signup'

  const handleClose = () => {
    setIsOpen(false);
    setAuthMode('welcome');
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Sign In</button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={authMode === 'welcome' ? 'Have we met before?' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
        closeOnOverlayClick={false}
      >
        {authMode === 'welcome' && (
          <div>
            <button onClick={() => setAuthMode('login')}>Yes, sign me in</button>
            <button onClick={() => setAuthMode('signup')}>No, create account</button>
          </div>
        )}

        {authMode === 'login' && (
          <form>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button type="submit">Sign In</button>
          </form>
        )}

        {authMode === 'signup' && (
          <form>
            <input type="text" placeholder="First Name" />
            <input type="text" placeholder="Last Name" />
            <input type="email" placeholder="Email" />
            <button type="submit">Sign Up</button>
          </form>
        )}
      </Modal>
    </>
  );
}
```

## Testing Checklist

- [ ] Modal opens when isOpen is true
- [ ] Modal closes when isOpen is false
- [ ] X button closes the modal
- [ ] ESC key closes the modal (when enabled)
- [ ] Overlay click closes the modal (when enabled)
- [ ] Body scroll is prevented when modal is open
- [ ] Body scroll is restored when modal closes
- [ ] Animations play smoothly
- [ ] Title is displayed when provided
- [ ] Close button is hidden when showCloseButton is false
- [ ] Modal is responsive on mobile devices
- [ ] Modal content scrolls when exceeding max height
- [ ] Custom className is applied correctly

## Related Files

- **Component**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\Modal.jsx`
- **Examples**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\Modal.example.jsx`
- **Documentation**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\Modal.README.md`

## Future Enhancements (Optional)

While the current implementation follows the "no fallback" principle and keeps things simple, future versions could consider:

- Custom animation durations via props
- Multiple size presets (small, medium, large, full)
- Portal rendering to document.body (currently renders in place)
- Transition callbacks (onOpen, onOpenComplete, onCloseComplete)
- Modal stacking support for nested modals

Note: These enhancements should only be added when there's a clear, demonstrated need, following the principle of "match solution to scale."
