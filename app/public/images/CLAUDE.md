# Images - Public Root Images

**GENERATED**: 2025-11-27
**PARENT**: app/public/

---

## DIRECTORY_INTENT

[PURPOSE]: Additional images at the public root level
[PATTERN]: Static image assets served at /images/ path
[USAGE]: For images not categorized under /assets/images/

---

## USAGE_PATTERN

```html
<img src="/images/example.png" alt="Description" />
```

---

## NOTES

- Prefer using `/assets/images/` for organized asset management
- This directory may contain legacy images or special-purpose files
- Keep file names URL-friendly (lowercase, hyphens)

---

## OPTIMIZATION

- Compress images before committing
- Use appropriate formats (WebP for photos, PNG for transparency, SVG for icons)
- Consider responsive image sizes

---

**FILE_TYPES**: PNG, JPG, WebP, SVG
