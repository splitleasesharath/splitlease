# AI Signup Market Report Island

Advanced AI-powered market research signup modal component with intelligent email/phone extraction and multi-step form flow.

## Features

- 🎯 **Smart Contact Extraction**: Automatically extracts and validates email and phone numbers from freeform text
- ✨ **Auto-Correction**: Fixes common email typos (e.g., `gmail,com` → `gmail.com`)
- 📱 **Phone Number Handling**: Detects both complete and incomplete phone numbers
- 🎨 **Lottie Animations**: Three beautiful animations for parsing, loading, and success states
- 🔄 **Dynamic Flow**: Automatically determines whether to show contact form based on data quality
- 🔗 **Bubble.io Integration**: Pre-configured to work with Split Lease's backend workflow
- ♿ **Accessible**: Full ARIA support and keyboard navigation

## Installation

The component is already installed in your shared islands directory. No additional installation needed.

## Basic Usage

```jsx
import { useState } from 'react';
import AiSignupMarketReport from '../islands/shared/AiSignupMarketReport';

function MyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Get Market Report
      </button>

      <AiSignupMarketReport
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | boolean | Yes | Controls whether the modal is visible |
| `onClose` | function | Yes | Callback fired when modal should close |
| `onSubmit` | function | No | Custom submit handler (overrides default Bubble.io integration) |

## User Flow

The component intelligently determines the user experience based on the quality of extracted data:

### Scenario 1: Perfect Data (Auto-Submit)
User inputs: `"john@gmail.com call (415) 555-5555"`

1. **Freeform Input** - User describes their needs
2. **Parsing Stage** - Analyzes and extracts contact info
3. **Auto-Submit** - Submits directly (no contact form needed)
4. **Success Screen** - Shows confirmation

### Scenario 2: Corrected/Incomplete Data (Manual Verification)
User inputs: `"john@gmail,com call 7834"`

1. **Freeform Input** - User describes their needs
2. **Parsing Stage** - Analyzes and extracts contact info
3. **Contact Form** - Shows pre-filled form for user to verify/correct
4. **Loading Stage** - Processing submission
5. **Success Screen** - Shows confirmation

## Integration Details

### Bubble.io Workflow

The component submits to:
```
POST https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest
```

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer 5dbb448f9a6bbb043cb56ac16b8de109'
}
```

**Payload:**
```javascript
{
  email: string,           // User's email (required)
  phone: string,           // User's phone number (optional)
  'text inputted': string  // Market research description
}
```

### Custom Submit Handler

You can override the default Bubble.io integration:

```jsx
<AiSignupMarketReport
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSubmit={async (data) => {
    // Your custom logic here
    console.log('Form data:', data);
    // data.email
    // data.phone
    // data.marketResearchText
  }}
/>
```

## Email Auto-Correction

The component automatically corrects common email typos:

| Input | Output |
|-------|--------|
| `john@gmail,com` | `john@gmail.com` |
| `jane@gmial.com` | `jane@gmail.com` |
| `bob@yahooo.com` | `bob@yahoo.com` |
| `alice@hotmial.com` | `alice@hotmail.com` |
| `charlie@outlok.com` | `charlie@outlook.com` |

And many more common patterns...

## Phone Number Detection

### Complete Phone Numbers (Auto-Submit Eligible)
- `(415) 555-5555`
- `415-555-5555`
- `415.555.5555`
- `4155555555`

### Incomplete Phone Numbers (Requires Verification)
- `7834` (too short)
- `(415) 55` (incomplete)
- `555-12` (incomplete)

## Lottie Animations

The component uses three Lottie animations hosted on Bubble.io CDN:

1. **Parsing Animation** - Spinning loader during text analysis
2. **Loading Animation** - Processing animation during submission
3. **Success Animation** - Celebratory animation on successful completion

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles
- Screen reader friendly
- Escape key to close modal
- Focus management

## Styling

The component includes all styles inline using scoped CSS. The design follows Split Lease's brand colors:

- Primary Color: `#31135D` (purple)
- Hover Color: `#522580` (lighter purple)

All styles are scoped to the component and won't affect other parts of your application.

## Dependencies

- **React**: ^18.0.0
- **lottie-web**: Dynamically imported (loaded on-demand)

The `lottie-web` package is lazy-loaded to avoid SSR issues and reduce initial bundle size.

## Example Test Data

### Perfect Data (Will Auto-Submit)
```
I need a quiet studio apartment near downtown San Francisco for weekly stays.
Contact me at john.smith@gmail.com or (415) 555-5555
```

### Data Requiring Verification
```
Looking for storage space in Oakland area, monthly rental
Email: john@gmail,com Phone: 5551234
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Migration Notes

This component was converted from the standalone `ai-signup-market-report` repository and integrated as a shared island element. All functionality has been preserved while adapting to the app's island architecture.

## Troubleshooting

### Lottie animations not loading
Make sure you have internet connectivity as animations are loaded from Bubble.io CDN.

### Modal not closing
Ensure you're properly managing the `isOpen` state in your parent component.

### Styles conflict
All styles are scoped with unique class names (prefixed with `ai-signup-`). If you see conflicts, check for CSS specificity issues.

## Support

For issues or questions, contact the Split Lease development team.
