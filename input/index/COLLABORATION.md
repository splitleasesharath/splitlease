# Collaboration Guide for Split Lease Clone

## Working in Parallel

This guide helps multiple developers work on the project simultaneously without conflicts.

## Branching Strategy

### Main Branch
- `main` - Production-ready code, deployed to GitHub Pages
- Never commit directly to main
- All changes via Pull Requests

### Feature Branches
```bash
# Format: feature/description
git checkout -b feature/footer-improvements
git checkout -b fix/day-selector-bug
git checkout -b refactor/modularize-js
```

## Before Starting Work

Always sync with latest main:
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature
```

## Work Division

### Safe Parallel Areas (Low Conflict Risk)
1. **New Sections** - Adding new HTML sections
2. **New Features** - Adding new JS functions at end of file
3. **Documentation** - README, CLAUDE.md updates
4. **Assets** - Adding images, icons

### High Conflict Areas (Coordinate First)
1. **Core Functions** - `toggleDay()`, `setupHeroDaySelector()`
2. **Global CSS** - `:root` variables, reset styles
3. **HTML Structure** - Header, Hero section changes

## Workflow

### 1. Claim Your Task
Create an issue on GitHub or communicate in team chat:
```
"I'm working on: Footer navigation improvements"
"Files affected: index.html (footer), styles.css (footer styles)"
"Branch: feature/footer-nav"
```

### 2. Make Small Commits
```bash
git add index.html
git commit -m "Add social media links to footer"

git add styles.css  
git commit -m "Style social media icons in footer"
```

### 3. Push Your Branch
```bash
git push origin feature/footer-nav
```

### 4. Create Pull Request
- Go to GitHub repository
- Click "New Pull Request"
- Select your branch
- Add description of changes
- Request review from team

### 5. Handle Merge Conflicts
If conflicts occur:
```bash
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main
# Resolve conflicts in VS Code or preferred editor
git add .
git commit -m "Resolve merge conflicts with main"
git push origin feature/your-feature
```

## Communication Channels

### Recommended Setup
1. **GitHub Issues** - Task tracking
2. **Pull Request Comments** - Code review
3. **Discord/Slack** - Real-time coordination
4. **GitHub Projects** - Sprint planning

## Code Style Agreement

### JavaScript
- Functions start with lowercase
- Use descriptive names
- Comment complex logic
- One function = one purpose

### CSS
- Use CSS custom properties for colors
- Mobile-first media queries
- BEM-like naming for components
- Group related styles together

### HTML
- Semantic HTML5 elements
- Consistent indentation (2 spaces)
- Comments for section starts/ends
- Meaningful class names

## Conflict Prevention Tips

1. **Communicate Early**: "I need to modify the day selector logic"
2. **Work in Sections**: Each person owns a section temporarily
3. **Frequent Pulls**: `git pull origin main` often
4. **Small PRs**: Easier to review and merge
5. **Feature Flags**: Add new features without breaking existing

## Testing Before PR

1. Test all your changes locally
2. Test on different screen sizes
3. Check browser console for errors
4. Verify no existing features broken
5. Update documentation if needed

## Emergency Contacts

If you break production:
1. Revert the merge commit immediately
2. Notify team in emergency channel
3. Fix in new branch, not on main

## Module Separation (Future)

Consider splitting into modules:
```javascript
// auth.js - Authentication logic
// daySelector.js - Day selection logic  
// listings.js - Property listings
// support.js - Support features
// animations.js - Animation utilities
```

This would allow true parallel development without conflicts.