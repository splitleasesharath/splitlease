# Lotties - Animation Assets

**GENERATED**: 2025-11-27
**PARENT**: app/public/assets/

---

## DIRECTORY_INTENT

[PURPOSE]: Lottie animation JSON files for animated UI elements
[FORMAT]: JSON files exported from After Effects via Bodymovin
[USAGE]: Rendered via lottie-player or lottie-web library

---

## LOTTIE_OVERVIEW

Lottie is a library for rendering animations exported from After Effects.
Benefits:
- Small file sizes compared to video/GIF
- Scalable (vector-based)
- Interactive (can control playback)

---

## USAGE_PATTERN

### With lottie-player (Web Component)
```html
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<lottie-player src="/assets/lotties/animation.json" background="transparent" speed="1" loop autoplay></lottie-player>
```

### With lottie-web (JavaScript)
```javascript
import lottie from 'lottie-web';
lottie.loadAnimation({
  container: element,
  path: '/assets/lotties/animation.json',
  loop: true,
  autoplay: true
});
```

---

## COMMON_USES

- Loading spinners
- Success/error feedback
- Onboarding illustrations
- Hero section animations

---

**FILE_TYPE**: JSON
