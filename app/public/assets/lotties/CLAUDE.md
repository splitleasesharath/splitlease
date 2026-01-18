# Lotties - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Lottie animation JSON files

---

## QUICK_STATS

[TOTAL_FILES]: 2
[FILE_TYPES]: JSON
[URL_PATH]: `/assets/lotties/*`

---

## DIRECTORY_INTENT

[PURPOSE]: Lottie animation JSON files for animated UI elements
[FORMAT]: JSON files exported from After Effects via Bodymovin
[USAGE]: Rendered via lottie-player or lottie-web library

---

## FILES

### atom-animation.json
[INTENT]: Atom/science-themed animation
[USE_CASE]: Loading states, science/technology context

### atom-white.json
[INTENT]: White-colored atom animation variant
[USE_CASE]: Dark background contexts

---

## LOTTIE_OVERVIEW

[TECHNOLOGY]: Vector-based animations exported from After Effects
[BENEFITS]: Small file sizes, scalable, interactive playback control
[COMPARISON]: Better than GIF/video for UI animations

---

## USAGE_PATTERN

### With lottie-player (Web Component)
```html
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<lottie-player
  src="/assets/lotties/atom-animation.json"
  background="transparent"
  speed="1"
  loop
  autoplay>
</lottie-player>
```

### With lottie-web (JavaScript)
```javascript
import lottie from 'lottie-web';
lottie.loadAnimation({
  container: element,
  path: '/assets/lotties/atom-animation.json',
  loop: true,
  autoplay: true
});
```

---

## COMMON_USES

[LOADING]: Animated loading spinners
[FEEDBACK]: Success/error state animations
[ONBOARDING]: Instructional animations
[HERO]: Landing page hero section animations
