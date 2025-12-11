# SelfListingPage Components - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Reusable UI components for listing creation form

---

## QUICK_STATS

[TOTAL_FILES]: 1
[PRIMARY_LANGUAGE]: TypeScript/TSX
[KEY_PATTERNS]: Shadow DOM, Controlled component, Dynamic pricing calculation

---

## FILES

### NightlyPriceSlider.tsx
[INTENT]: Interactive pricing slider with visual gradient legend showing nightly price decay
[EXPORTS]: NightlyPriceSlider (React component)
[PATTERN]: Shadow DOM component with isolated styles
[PROPS]: initialP1 (base price), initialDecay (decay rate), onPricesChange (callback)
[CALLBACK_DATA]: { p1, n1-n7, decay, total }
[KEY_FEATURES]: Base rate input, long stay discount slider, 7-night gradient palette, price calculations

---

## NIGHTLY_PRICE_SLIDER

### Purpose
[INTENT]: Calculate and display nightly pricing with decay curve for long-stay discounts
[USE_CASE]: Section 4 Pricing for Nightly rental type
[VISUAL_STYLE]: Color palette with gradient swatches (dark to light)

### Shadow DOM Architecture
[TECHNOLOGY]: React component using attachShadow({ mode: 'open' })
[WHY_SHADOW_DOM]: Complete style isolation, no CSS conflicts with parent page
[INITIALIZATION]: Single initialization via useRef and useEffect with empty deps
[STYLES]: Embedded in Shadow DOM via <style> tag

### Input Controls
[BASE_RATE]: Number input with currency symbol, range 0-infinity
[DISCOUNT_SLIDER]: Range input 0-50%, controls decay curve steepness
[DISCOUNT_MEANING]: "20%" means night 5 is ~20% cheaper than night 1
[DEFAULT_VALUES]: initialP1=100, initialDecay=0.95 (converted to ~20% discount)

### Pricing Calculation
[DECAY_RANGE]: 0.7 to 1.0 (70% to 100% of previous night)
[ALGORITHM]: solveDecay(p1, p5Target) calculates decay to hit target 5th night price
[FORMULA]: decay = (p5/p1)^0.25, then nightlyPrices[i] = nightlyPrices[i-1] * decay
[ROUNDING]: Math.ceil() on all nightly prices

### Visual Display
[PALETTE_ROW]: 7 swatches showing nights 1-7 with prices
[GRADIENT_COLORS]: n1 (#374151) dark grey → n7 (#f3f4f6) light grey
[TEXT_CONTRAST]: White text on dark swatches, dark text on light swatches
[CUMULATIVE_ROW]: Running totals below each night (e.g., $100, $195, $285, ...)
[TOTAL_DISPLAY]: 7-Night Total in highlighted box

### Summary Calculations
[5_NIGHT_TOTAL]: Sum of first 5 nights
[EST_MONTHLY]: 5-night total × 4 (assumes 4 weeks)
[AVG_PRICE]: 5-night total / 5, displayed in discount description text

### Callback Data Structure
```typescript
{
  p1: number,      // Base price (same as n1)
  n1-n7: number,   // Individual night prices
  decay: number,   // Decay rate (0.7-1.0)
  total: number    // Sum of all 7 nights
}
```

### React Integration
[REF_PATTERN]: containerRef for DOM node, shadowRootRef for Shadow DOM
[CALLBACK_REF]: onPricesChangeRef to avoid re-initialization on prop change
[UPDATE_FLOW]: User input → calculateCurve() → renderPaletteDisplay() → calculateSummary() → broadcast()
[REACTIVITY]: Updates immediately on base rate or discount change

---

## USAGE_PATTERN

```typescript
import { NightlyPriceSlider } from './components/NightlyPriceSlider';

// In Section4Pricing component
<NightlyPriceSlider
  initialP1={100}
  initialDecay={0.95}
  onPricesChange={(data) => {
    // Update store with pricing data
    updatePricing({
      nightlyPricing: {
        oneNightPrice: data.p1,
        decayPerNight: data.decay,
        fiveNightTotal: data.n1 + data.n2 + data.n3 + data.n4 + data.n5,
        calculatedRates: {
          night1: data.n1,
          night2: data.n2,
          night3: data.n3,
          night4: data.n4,
          night5: data.n5,
          cumulativeNight2: data.n1 + data.n2,
          cumulativeNight3: data.n1 + data.n2 + data.n3,
          cumulativeNight4: data.n1 + data.n2 + data.n3 + data.n4,
          cumulativeNight5: data.n1 + data.n2 + data.n3 + data.n4 + data.n5,
        }
      }
    });
  }}
/>
```

---

## TECHNICAL_NOTES

### Why Shadow DOM?
[BENEFIT_1]: Complete CSS isolation - no conflicts with parent page styles
[BENEFIT_2]: No need for CSS modules or scoped styles
[BENEFIT_3]: Predictable rendering across different page contexts
[TRADEOFF]: Cannot be styled from outside (intentional)

### Initialization Pattern
[SINGLE_INIT]: useEffect with empty deps and initializedRef guard
[WHY]: Shadow DOM can only be attached once, re-attaching throws error
[CALLBACK_REF]: onPricesChangeRef.current updated without triggering re-init

### Number Formatting
[CURRENCY]: fmt0(n) → $100 (no cents)
[SHORT]: fmtShort(n) → $100 (for compact display)
[ROUNDING]: roundUp(n) → Math.ceil(n) for all prices

### Event Handling
[BASE_INPUT]: addEventListener('input') on number input
[DISCOUNT_SLIDER]: addEventListener('input') on range input
[VALIDATION]: Clamps values to valid ranges, handles NaN

---

## INTEGRATION_POINTS

### Section4Pricing
[CONSUMER]: Only component that uses NightlyPriceSlider
[CONDITIONAL]: Only shown when rentalType === 'Nightly'
[DATA_FLOW]: Slider → onPricesChange callback → updatePricing() → store

### Store (pricing.nightlyPricing)
[INTERFACE]: NightlyPricing type in listing.types.ts
[FIELDS]: oneNightPrice, decayPerNight, fiveNightTotal, calculatedRates
[VALIDATION]: Checked in listingLocalStore.validateForSubmission()

### Bubble API Submission
[TRANSFORM]: prepareListingSubmission() maps nightlyPricing to Bubble fields
[FIELDS]: 'Price 1 night selected', 'Price 2 nights selected', ..., 'Price 5 nights selected', 'Nightly Decay Rate'

---

## HELP_CONTENT

### "How does Smart Pricing work?" Details
[DESCRIPTION]: Calculates a "decay curve" for pricing. First night is full Base Rate. Each consecutive night gets slightly cheaper based on Discount setting.
[BENEFIT]: Encourages guests to book longer blocks (Mon-Fri) instead of just two nights, maximizing occupancy and reducing turnover effort.

---

**FILE_COUNT**: 1
**COMPONENT_COUNT**: 1
**TOTAL_LINES**: 458
