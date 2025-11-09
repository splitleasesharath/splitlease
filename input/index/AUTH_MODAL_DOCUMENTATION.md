# Current Auth Modal Documentation
## To be removed during auth migration

### JavaScript Functions to Remove (script.js)

**Main Auth Functions (Lines 624-772):**
1. `setupAuthModal()` - Line 624 - Sets up ESC key handler
2. `openAuthModal()` - Line 637 - Opens modal with focus trap
3. `closeAuthModal()` - Line 657 - Closes modal and resets forms
4. `trapFocus()` - Line 678 - Traps focus within modal
5. `showWelcomeScreen()` - Line 700 - Shows welcome screen
6. `showLoginForm()` - Line 706 - Shows login form
7. `showSignupForm()` - Line 712 - Shows signup form
8. `hideAllScreens()` - Line 718 - Hides all auth screens
9. `togglePassword()` - Line 725 - Toggles password visibility
10. `handleLogin()` - Line 740 - Handles login form submission
11. `handleSignup()` - Line 757 - Handles signup form submission

**Also Remove:**
- Line 17: `setupAuthModal();` call in DOMContentLoaded
- Line 634: `let modalTrigger = null;` variable

**Total JavaScript Lines to Remove:** ~148 lines

### HTML Structure (Lines ~565-687 in index.html)

```html
<!-- Auth Modal -->
<div id="authModal" class="modal">
    <div class="modal-overlay"></div>
    <div class="modal-content">
        <button class="modal-close">&times;</button>
        
        <!-- Welcome Screen -->
        <div id="welcomeScreen" class="auth-screen active">
            - Logo placeholder
            - "Have we met before?" text
            - Login button
            - Sign up button
        </div>
        
        <!-- Login Screen -->
        <div id="loginScreen" class="auth-screen">
            - Email input
            - Password input with toggle
            - Sign in button
            - Back to welcome link
        </div>
        
        <!-- Signup Screen -->
        <div id="signupScreen" class="auth-screen">
            - First name input
            - Last name input  
            - Email input
            - Note about government ID
            - Sign up button
            - Back to welcome link
        </div>
    </div>
</div>
```

### Total Lines to Remove: ~122 lines of HTML

### Key Elements:
- Modal wrapper with overlay
- Three separate screens (welcome, login, signup)
- Form inputs with validation
- Password visibility toggle
- Navigation between screens

### CSS Classes to Remove (styles.css)

**Main Auth-Related Classes (Lines ~1659-1900):**
1. `.modal` - Line 1659 - Modal container
2. `.modal.active` - Line 1670 - Active modal state
3. `.modal-overlay` - Line 1674 - Modal backdrop
4. `.modal-content` - Line 1683 - Modal content wrapper
5. `.modal-close` - Line 1710 - Close button
6. `.modal-close:hover` - Line 1724 - Close button hover
7. `.auth-screen` - Line 1728 - Auth screen container
8. `.auth-screen.active` - Line 1732 - Active screen
9. `.modal-header` - Line 1736 - Modal header
10. `.modal-logo` - Line 1741 - Logo container
11. `.modal-logo .logo-placeholder` - Line 1746 - Logo placeholder
12. `.modal-header h2` - Line 1759 - Header title
13. `.auth-subtitle` - Line 1766 - Subtitle text
14. `.auth-form` - Line 1774 - Form container
15. `.form-group` - Line 1778 - Form group
16. `.form-group label` - Line 1782 - Form labels
17. `.form-group input` - Line 1790 - Form inputs
18. `.form-group input:focus` - Line 1800 - Input focus
19. `.password-input-wrapper` - Line 1807 - Password wrapper
20. `.password-toggle` - Line 1811 - Password toggle button
21. `.auth-btn` - Line 1823 - Auth buttons
22. `.auth-btn-primary` - Line 1835 - Primary button
23. `.auth-btn-primary:hover` - Line 1840 - Primary hover
24. `.auth-btn-outline` - Line 1846 - Outline button
25. `.auth-btn-outline:hover` - Line 1852 - Outline hover
26. `.form-note` - Line 1859 - Form notes
27. `.form-help` - Line 1866 - Form help text
28. `.auth-footer` - Line 1873 - Auth footer
29. `.auth-footer a` - Line 1879 - Footer links
30. `.auth-footer a:hover` - Line 1885 - Footer link hover

**Also includes responsive styles (Lines ~2370-2432):**
- Mobile modal adjustments
- Mobile form field styles
- Mobile auth button styles

**Dark mode adjustments (Line 69):**
- `[data-theme="dark"] .modal-content`

**Total CSS Lines to Remove:** ~250+ lines