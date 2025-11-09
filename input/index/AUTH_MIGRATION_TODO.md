# Authentication Migration Todo List
## Bubble Auth Widget Integration into Static Index Page

### Phase 1: Preparation & Planning

#### Bubble Tasks (User)
- [ ] Create new page in Bubble called "auth-widget"
- [ ] Remove all navigation elements from auth-widget page
- [ ] Remove footer from auth-widget page
- [ ] Set page background to transparent
- [ ] Add URL parameter "mode" (text) to auth-widget page
- [ ] Add URL parameter "embed" (yes/no) to auth-widget page
- [ ] Add URL parameter "origin" (text) to auth-widget page
- [ ] Create conditional to show login form when mode=login
- [ ] Create conditional to show signup form when mode=signup
- [ ] Test auth-widget page works standalone in browser

#### Static Page Tasks (Agent)
- [ ] Create backup of current index.html
- [ ] Create backup of current styles.css
- [ ] Create backup of current script.js
- [ ] Document current auth modal HTML structure (for reference)
- [ ] List all auth-related functions in script.js
- [ ] List all auth-related CSS classes

### Phase 2: Bubble Widget Development

#### Bubble Tasks (User)
- [ ] Style login form for 400px width container
- [ ] Style signup form for 400px width container
- [ ] Add mobile responsive breakpoint at 320px
- [ ] Remove border-radius from forms (modal handles this)
- [ ] Set form padding to 20px (modal provides outer padding)
- [ ] Add postMessage on successful login
- [ ] Add postMessage on successful signup
- [ ] Add postMessage for close request
- [ ] Test postMessage sends correct data structure
- [ ] Add origin validation for security
- [ ] Create test credentials for development

### Phase 3: Static Page Cleanup

#### Static Page Tasks (Agent)
- [ ] Remove complete auth modal HTML (keep only shell)
- [ ] Delete setupAuthModals() function from script.js
- [ ] Delete showAuthModal() function from script.js
- [ ] Delete switchAuthScreen() function from script.js
- [ ] Delete validateEmail() function from script.js
- [ ] Delete validatePassword() function from script.js
- [ ] Delete all password toggle logic from script.js
- [ ] Delete auth form submit handlers from script.js
- [ ] Remove .auth-screen CSS classes
- [ ] Remove .auth-form CSS classes
- [ ] Remove .form-group CSS classes (auth-specific)
- [ ] Remove .auth-btn CSS classes
- [ ] Remove .password-input-wrapper CSS
- [ ] Remove .password-toggle CSS
- [ ] Keep only .modal and .modal-overlay CSS

### Phase 4: New Modal Structure

#### Static Page Tasks (Agent)
- [ ] Create simplified modal HTML structure
- [ ] Add empty #authFrame div for iframe
- [ ] Add modal-close button
- [ ] Style modal-container for iframe content
- [ ] Set modal-container width to 450px
- [ ] Set modal-container max-width for mobile
- [ ] Add loading spinner div (hidden by default)
- [ ] Add error message div (hidden by default)

### Phase 5: Iframe Integration

#### Static Page Tasks (Agent)
- [ ] Create loadAuthWidget() function
- [ ] Add iframe creation logic
- [ ] Set iframe src with Bubble auth-widget URL
- [ ] Set iframe width/height to 100%
- [ ] Set iframe border to none
- [ ] Set iframe background to transparent
- [ ] Add iframe load event listener
- [ ] Add iframe error event listener
- [ ] Hide loading spinner on iframe load
- [ ] Show error message on iframe failure

#### Bubble Tasks (User)
- [ ] Test auth-widget loads correctly in iframe
- [ ] Verify transparent background works
- [ ] Verify form fits within 450px container
- [ ] Test mobile view in iframe
- [ ] Ensure no horizontal scrolling in iframe

### Phase 6: PostMessage Communication

#### Static Page Tasks (Agent)
- [ ] Add window message event listener
- [ ] Create handleAuthMessage() function
- [ ] Validate message origin matches Bubble domain
- [ ] Parse message data structure
- [ ] Handle "auth_success" message type
- [ ] Handle "close_modal" message type
- [ ] Handle "auth_error" message type
- [ ] Store auth token in localStorage on success
- [ ] Store user data in localStorage on success
- [ ] Update navigation UI on auth success
- [ ] Close modal on success
- [ ] Show toast notification on success

#### Bubble Tasks (User)
- [ ] Add JavaScript to send postMessage on login success
- [ ] Include user ID in success message
- [ ] Include user email in success message
- [ ] Include user name in success message
- [ ] Include session token in success message
- [ ] Add postMessage for signup success
- [ ] Add postMessage for password reset request
- [ ] Add postMessage for social login success
- [ ] Test all postMessage events fire correctly

### Phase 7: Lazy Loading Implementation

#### Static Page Tasks (Agent)
- [ ] Create shouldPreloadAuth() function
- [ ] Add idle time detection (3 seconds)
- [ ] Add hover detection on sign-in button
- [ ] Add scroll position detection (bottom 30%)
- [ ] Create preloadAuthWidget() function
- [ ] Load iframe in hidden state
- [ ] Set display:none on iframe container
- [ ] Add loaded flag to prevent duplicate loads
- [ ] Add timeout for lazy load (5 seconds max)

### Phase 8: State Management

#### Static Page Tasks (Agent)
- [ ] Create AuthState object
- [ ] Add isAuthenticated property
- [ ] Add user property
- [ ] Add token property
- [ ] Add checkLocalAuth() function
- [ ] Add saveAuthState() function
- [ ] Add clearAuthState() function
- [ ] Add updateUIForAuth() function
- [ ] Change "Sign In" to "Dashboard" when authenticated
- [ ] Change "Sign Up" to "Logout" when authenticated
- [ ] Add logout() function
- [ ] Clear localStorage on logout
- [ ] Refresh page after logout

### Phase 9: Navigation Updates

#### Static Page Tasks (Agent)
- [ ] Update sign-in link click handler
- [ ] Update sign-up link click handler
- [ ] Add data-auth-action attributes
- [ ] Create single delegated event handler
- [ ] Remove individual button handlers
- [ ] Add dashboard URL configuration
- [ ] Add logout confirmation dialog
- [ ] Update mobile navigation for auth state

### Phase 10: Fallback Mechanisms

#### Static Page Tasks (Agent)
- [ ] Detect if iframes are blocked
- [ ] Add direct link fallback
- [ ] Create popup window fallback
- [ ] Add fallback detection timeout (5 seconds)
- [ ] Show appropriate message if iframe blocked
- [ ] Test with ad blockers enabled
- [ ] Test with strict security settings

#### Bubble Tasks (User)
- [ ] Create non-embedded version of auth page
- [ ] Add return_url parameter handling
- [ ] Add redirect after successful auth
- [ ] Test direct navigation flow
- [ ] Test popup window flow

### Phase 11: Performance Optimization

#### Static Page Tasks (Agent)
- [ ] Add preconnect link for Bubble domain
- [ ] Add dns-prefetch for Bubble domain  
- [ ] Minimize modal CSS to <1KB
- [ ] Extract auth code to separate file
- [ ] Load auth code with defer attribute
- [ ] Inline critical auth check (<200 bytes)
- [ ] Remove unused modal animations
- [ ] Optimize modal open/close transitions

### Phase 12: Mobile Optimization

#### Static Page Tasks (Agent)
- [ ] Make modal fullscreen on mobile
- [ ] Add touch event handlers
- [ ] Prevent background scroll when modal open
- [ ] Add swipe-down to close gesture
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Fix any viewport issues

#### Bubble Tasks (User)
- [ ] Optimize form for mobile keyboards
- [ ] Add proper input types (email, tel)
- [ ] Increase touch target sizes to 44px
- [ ] Add appropriate autocomplete attributes
- [ ] Test on real mobile devices

### Phase 13: Security Hardening

#### Static Page Tasks (Agent)
- [ ] Add Content Security Policy for iframe
- [ ] Whitelist only Bubble domain for iframe
- [ ] Add X-Frame-Options considerations
- [ ] Sanitize postMessage data
- [ ] Add rate limiting for auth attempts
- [ ] Clear sensitive data on page unload

#### Bubble Tasks (User)
- [ ] Add origin validation in Bubble
- [ ] Whitelist static page domain
- [ ] Add CORS headers for iframe
- [ ] Implement rate limiting
- [ ] Add captcha for multiple failures
- [ ] Test security headers

### Phase 14: Testing & Debugging

#### Both (User & Agent)
- [ ] Test login flow end-to-end
- [ ] Test signup flow end-to-end  
- [ ] Test logout flow
- [ ] Test page refresh with auth
- [ ] Test browser back/forward buttons
- [ ] Test with cookies disabled
- [ ] Test with localStorage disabled
- [ ] Test with JavaScript disabled
- [ ] Test network failure scenarios
- [ ] Test slow network (3G)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Phase 15: Cleanup & Documentation

#### Static Page Tasks (Agent)
- [ ] Remove all console.log statements
- [ ] Remove commented old code
- [ ] Optimize and minify JavaScript
- [ ] Optimize and minify CSS
- [ ] Add code comments for auth flow
- [ ] Update CLAUDE.md with new auth system

#### Bubble Tasks (User)
- [ ] Remove test credentials
- [ ] Set production URLs
- [ ] Enable production security settings
- [ ] Document postMessage API

### Phase 16: Deployment

#### Both (User & Agent)
- [ ] Deploy Bubble auth-widget to production
- [ ] Test production Bubble URL
- [ ] Update static page with production URL
- [ ] Commit and push static page changes
- [ ] Test on GitHub Pages
- [ ] Monitor for errors (first 24 hours)
- [ ] Gather user feedback
- [ ] Fix any reported issues

### Completion
- [ ] All tasks completed and tested
- [ ] System working in production for 48 hours
- [ ] No critical bugs reported
- [ ] Delete this TODO file

---

## Notes
- Check off tasks as completed with [x]
- Add any new tasks discovered during implementation
- Document blockers or issues below each task
- Target completion: [Add your target date]

## Progress Tracking
- Phase 1: ⬜ Not Started
- Phase 2: ⬜ Not Started  
- Phase 3: ⬜ Not Started
- Phase 4: ⬜ Not Started
- Phase 5: ⬜ Not Started
- Phase 6: ⬜ Not Started
- Phase 7: ⬜ Not Started
- Phase 8: ⬜ Not Started
- Phase 9: ⬜ Not Started
- Phase 10: ⬜ Not Started
- Phase 11: ⬜ Not Started
- Phase 12: ⬜ Not Started
- Phase 13: ⬜ Not Started
- Phase 14: ⬜ Not Started
- Phase 15: ⬜ Not Started
- Phase 16: ⬜ Not Started