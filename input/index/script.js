// Split Lease Clone - Interactive JavaScript

// ============================================================================
// URL LOCK MECHANISM - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION
// ============================================================================
// CRITICAL: All redirect URLs must use app.split.lease domain
// Any changes to these URLs require explicit authorization from the project owner
// Last authorized change: December 3, 2024
// ============================================================================
const URL_LOCK = {
    AUTHORIZED_DOMAIN: 'app.split.lease',
    LOCKED: true,
    LOCK_MESSAGE: '🔒 URL modifications are locked. Contact project owner for authorization.',
    
    // Validate that a URL uses the authorized domain
    validateURL: function(url) {
        if (!this.LOCKED) return true;
        return url.includes(this.AUTHORIZED_DOMAIN);
    },
    
    // Get the authorized base URL
    getBaseURL: function() {
        return `https://${this.AUTHORIZED_DOMAIN}`;
    }
};

// Protect against URL modifications
Object.freeze(URL_LOCK);

// Auth state management
let isUserLoggedIn = false;
let authCheckAttempts = 0;
const MAX_AUTH_CHECK_ATTEMPTS = 3;
let preloadedIframe = null;
let isPreloading = false;

// Parse username from cookies
function getUsernameFromCookies() {
    const cookies = document.cookie.split('; ');
    const usernameCookie = cookies.find(c => c.startsWith('username='));

    if (usernameCookie) {
        let username = decodeURIComponent(usernameCookie.split('=')[1]);
        // Remove surrounding quotes if present (both single and double quotes)
        username = username.replace(/^["']|["']$/g, '');
        return username;
    }

    return null;
}

// Check Split Lease cookies (from Bubble app)
function checkSplitLeaseCookies() {
    const cookies = document.cookie.split('; ');
    const loggedInCookie = cookies.find(c => c.startsWith('loggedIn='));
    const usernameCookie = cookies.find(c => c.startsWith('username='));

    const isLoggedIn = loggedInCookie ? loggedInCookie.split('=')[1] === 'true' : false;
    const username = getUsernameFromCookies();

    // Log the authentication status to console
    console.log('🔐 Split Lease Cookie Auth Check:');
    console.log('   Logged In:', isLoggedIn);
    console.log('   Username:', username || 'not set');
    console.log('   Raw Cookies:', { loggedInCookie, usernameCookie });

    return { isLoggedIn, username };
}

// Lightweight authentication status check (no iframe required)
function checkAuthStatus() {
    console.log('🔍 Checking authentication status...');

    // First check cross-domain cookies from .split.lease
    const splitLeaseAuth = checkSplitLeaseCookies();

    if (splitLeaseAuth.isLoggedIn) {
        console.log('✅ User authenticated via Split Lease cookies');
        console.log('   Username:', splitLeaseAuth.username);
        isUserLoggedIn = true;
        handleLoggedInUser(splitLeaseAuth.username);
        return true;
    }

    // Fallback to localStorage check
    const authToken = localStorage.getItem('splitlease_auth_token');
    const sessionId = localStorage.getItem('splitlease_session_id');
    const lastAuthTime = localStorage.getItem('splitlease_last_auth');

    // Check for legacy auth cookie
    const authCookie = document.cookie.split('; ').find(row => row.startsWith('splitlease_auth='));

    // Validate session age (24 hours)
    const sessionValid = lastAuthTime &&
        (Date.now() - parseInt(lastAuthTime)) < 24 * 60 * 60 * 1000;

    if ((authToken || sessionId || authCookie) && sessionValid) {
        console.log('✅ User authenticated via localStorage/legacy cookies');
        isUserLoggedIn = true;
        handleLoggedInUser();
        return true;
    } else {
        console.log('❌ User not authenticated');
        isUserLoggedIn = false;
        return false;
    }
}

// Preload the app site in background
function preloadAppSite() {
    if (isPreloading || preloadedIframe) return;
    
    isPreloading = true;
    console.log('🔄 Preloading app.split.lease...');
    
    // Create hidden iframe to preload the site
    preloadedIframe = document.createElement('iframe');
    preloadedIframe.src = 'https://app.split.lease';
    preloadedIframe.style.position = 'absolute';
    preloadedIframe.style.width = '1px';
    preloadedIframe.style.height = '1px';
    preloadedIframe.style.opacity = '0';
    preloadedIframe.style.pointerEvents = 'none';
    preloadedIframe.style.left = '-9999px';
    preloadedIframe.setAttribute('aria-hidden', 'true');
    preloadedIframe.setAttribute('tabindex', '-1');
    
    // Listen for load completion
    preloadedIframe.onload = function() {
        console.log('✅ app.split.lease preloaded successfully');
        isPreloading = false;
        
        // Show login alert
        showLoginAlert();
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'https://app.split.lease';
        }, 2000);
    };
    
    // Add iframe to document
    document.body.appendChild(preloadedIframe);
}

// Show login alert UI
function showLoginAlert() {
    // Create alert container
    const alertDiv = document.createElement('div');
    alertDiv.className = 'login-alert';
    alertDiv.innerHTML = `
        <div class="login-alert-content">
            <div class="login-alert-spinner"></div>
            <span>Logging in...</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Trigger animation
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);
}

// Handle logged-in state
function handleLoggedInUser(username = null) {
    // User is logged in - updating UI
    isUserLoggedIn = true;

    if (username) {
        console.log(`👤 Welcome back, ${username}!`);
        // Store username globally for use in redirects
        window.currentUsername = username;
    }

    // Update Sign In and Sign Up links to show Hello username
    const navLinks = document.querySelectorAll('a[onclick*="openAuthModal"]');
    navLinks.forEach(link => {
        if (link.textContent.includes('Sign In')) {
            if (username) {
                link.textContent = `Hello ${username}`;
                link.onclick = function() {
                    window.location.href = 'https://app.split.lease/account-profile';
                };
            } else {
                link.textContent = 'Already logged in';
                link.style.opacity = '0.7';
            }

            // Hide the divider and Sign Up link
            const divider = link.nextElementSibling;
            const signUpLink = divider?.nextElementSibling;
            if (divider?.textContent === '|') {
                divider.style.display = 'none';
            }
            if (signUpLink?.textContent?.includes('Sign Up')) {
                signUpLink.style.display = 'none';
            }
        } else if (link.textContent.includes('Sign Up')) {
            // Hide Sign Up link when logged in
            link.style.display = 'none';
        }
    });

    // Disable sign in and sign up buttons
    const signInBtns = document.querySelectorAll('.sign-in');
    const signUpBtns = document.querySelectorAll('.sign-up');

    signInBtns.forEach(btn => {
        if (username) {
            btn.textContent = `Hello ${username}`;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.onclick = function() {
                window.location.href = 'https://app.split.lease/account-profile';
            };
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.textContent = 'Already logged in';
        }
    });

    signUpBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });

    // Start preloading the app site
    preloadAppSite();
}

// Listen for messages from iframes
window.addEventListener('message', function(event) {
    // Accept messages from both app.split.lease and www.split.lease
    if (event.origin !== 'https://app.split.lease' && event.origin !== 'https://www.split.lease') {
        return;
    }
    
    console.log('Received message from iframe:', event.data);
    
    // Check if user is logged in
    if (event.data.type === 'auth-status' && event.data.isLoggedIn === true) {
        const username = getUsernameFromCookies();
        handleLoggedInUser(username);
    }

    // Alternative message format
    if (event.data.authenticated === true || event.data.loggedIn === true) {
        const username = getUsernameFromCookies();
        handleLoggedInUser(username);
    }
    
    // Handle auth state response from Market Research iframe
    if (event.data.type === 'auth-state-response') {
        const isLoggedIn = event.data.elementId === '596573';
        console.log('📨 PostMessage Response Received!');
        console.log(`🔐 Auth Status: User is ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
        console.log(`   Element ID: ${event.data.elementId}`);
        
        // Show alert if user is logged in
        if (isLoggedIn) {
            alert('Logging in...');
        }
        
        // Always update cache with fresh auth state
        // This ensures logout is properly reflected
        localStorage.setItem('bubble_market_research_auth', isLoggedIn.toString());
        localStorage.setItem('bubble_market_research_auth_time', Date.now().toString());
        
        // Also update a flag to indicate we got a fresh response
        localStorage.setItem('bubble_market_research_auth_fresh', 'true');
    }
});

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    // Check auth status immediately (no iframe to wait for)
    checkAuthStatus();
});

// Test function to simulate logged-in state (for development)
window.simulateLogin = function() {
    // Set auth tokens in localStorage
    localStorage.setItem('splitlease_auth_token', 'test_token_' + Date.now());
    localStorage.setItem('splitlease_session_id', 'test_session_' + Date.now());
    localStorage.setItem('splitlease_last_auth', Date.now().toString());
    
    console.log('✅ Simulated login - refresh page to see preload effect');
    console.log('Run window.clearLogin() to clear the test login state');
};

// Clear test login
window.clearLogin = function() {
    localStorage.removeItem('splitlease_auth_token');
    localStorage.removeItem('splitlease_session_id');
    localStorage.removeItem('splitlease_last_auth');
    console.log('🗑️ Login state cleared');
};

// Initialize Application
function initializeApp() {
    // Enable subdomain access between splitlease.app and app.split.lease
    // This allows iframe access when deployed to production
    try {
        if (window.location.hostname.includes('splitlease.app')) {
            document.domain = 'splitlease.app';
            console.log('🔓 Set document.domain to splitlease.app for subdomain access');
        }
    } catch (e) {
        // Not on splitlease.app domain, skip domain setting
    }
    
    // Clear stale auth cache on page load (older than 2 minutes)
    const cachedTime = localStorage.getItem('bubble_market_research_auth_time');
    if (cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge > 2 * 60 * 1000) { // 2 minutes
            console.log('🧹 Clearing stale auth cache (older than 2 minutes)');
            localStorage.removeItem('bubble_market_research_auth');
            localStorage.removeItem('bubble_market_research_auth_time');
            localStorage.removeItem('bubble_market_research_auth_fresh');
        }
    }
    
    setupNavigation();
    setupDaySelectors();
    setupScheduleControls();
    setupListings();
    setupSupport();
    setupReferral();
    setupAnimations();
    setupAuthModal();
    setupHeroDaySelector();
    setupFooterNavigation();
    setupDropdownMenus();
    setupFloatingBadge();
    setupModalEvents();
    setupIntentDetection();
    
    // Setup delayed preload for Market Research iframe (4 seconds after page load)
    setupDelayedMarketResearchPreload();
}

// Navigation Functionality
function setupNavigation() {
    const header = document.querySelector('.main-header');
    
    // Header stays fixed at all times - no hide/show on scroll

    // Smooth scroll for anchor links with offset for fixed header
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // Skip if it's an auth link
            if (this.getAttribute('href') === '#signin' || this.getAttribute('href') === '#signup') {
                return;
            }
            
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            
            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Day Selector Functionality - REMOVED (schedule cards are display-only)
function setupDaySelectors() {
    // Schedule cards are now display-only with animation controls
    // Day selection is only available in the hero section
    // This function is kept for backwards compatibility but does nothing
}

// Update schedule display based on selected days
function updateScheduleDisplay(scheduleCard) {
    if (!scheduleCard) return;
    
    const activeDays = scheduleCard.querySelectorAll('.day-badge.active');
    const dayMap = {
        'S': ['Sunday', 'Saturday'],
        'M': 'Monday',
        'T': ['Tuesday', 'Thursday'],
        'W': 'Wednesday',
        'F': 'Friday'
    };
    
    // Create schedule summary
    let selectedDays = [];
    activeDays.forEach(day => {
        const dayText = day.textContent;
        if (dayMap[dayText]) {
            if (Array.isArray(dayMap[dayText])) {
                selectedDays = selectedDays.concat(dayMap[dayText]);
            } else {
                selectedDays.push(dayMap[dayText]);
            }
        }
    });
    
    // Days have been selected
}

// Schedule Controls (removed - no longer using animations)
function setupScheduleControls() {
    // Schedule cards are now static visual representations
    // No animation controls needed
}

// Removed animation-related functions since we're using static visuals now

// Listings Functionality
function setupListings() {
    const exploreButtons = document.querySelectorAll('.explore-btn');
    const ctaButtons = document.querySelectorAll('.cta-button');
    const showMoreBtn = document.querySelector('.show-more-btn');
    
    // Handle schedule explore buttons
    exploreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.toLowerCase();
            
            if (buttonText.includes('weekend')) {
                // Weekend schedule: Fri-Sun + Mon (days 6,7,1,2)
                redirectToSearch('6,7,1,2', 'weekends');
            } else if (buttonText.includes('weeks of the month')) {
                // Weeks of the month: All days (1,2,3,4,5,6,7)
                redirectToSearch('1,2,3,4,5,6,7', 'weeks');
            } else if (buttonText.includes('weeknight')) {
                // Weeknight schedule: Mon-Fri (days 2,3,4,5,6)  
                redirectToSearch('2,3,4,5,6', 'weeknights');
            } else {
                // Default explore action (monthly)
                redirectToSearch('1,2,3,4,5,6,7', 'monthly');
            }
        });
    });
    
    // Handle general CTA buttons
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Use the hero day selector selection if available
            if (typeof selectedDays !== 'undefined' && selectedDays.length > 0) {
                exploreRentals();
            } else {
                // Default to weeknight schedule
                redirectToSearch('1,2,3,4,5', 'default');
            }
        });
    });
    
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', function() {
            // Use current day selection if available, otherwise default to all days
            const daysParam = (typeof selectedDays !== 'undefined' && selectedDays.length > 0) 
                ? selectedDays.join(',') 
                : '1,2,3,4,5,6';
            
            const searchUrl = `https://app.split.lease/search?days-selected=${daysParam}`;
            
            window.location.href = searchUrl;
        });
    }
    
    // Add click handlers to listing cards
    const listingCards = document.querySelectorAll('.listing-card');
    listingCards.forEach((card, index) => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            
            // Property IDs from the original site - matching each listing
            const propertyIds = [
                '1586447992720x748691103167545300', // One Platt | Studio - no change
                '1701107772942x447054126943830000', // Pied-à-terre , Perfect 2 BR
                '1701115344294x620453327586984000', // Fully furnished 1bdr apartment
                '1701196985127x160157906679627780'  // Furnished Studio Apt for Rent
            ];
            
            const propertyId = propertyIds[index] || propertyIds[0];
            
            // Use current day selection if available, otherwise default to weeknights
            const daysParam = (typeof selectedDays !== 'undefined' && selectedDays.length > 0) 
                ? selectedDays.join(',') 
                : '1,2,3,4,5';
            
            const propertyUrl = `https://app.split.lease/view-split-lease/${propertyId}?days-selected=${daysParam}&weekly-frequency=Every%20week`;
            
            window.location.href = propertyUrl;
        });
    });
}

// Create skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'listing-card skeleton-card fade-in';
    card.innerHTML = `
        <div class="listing-image-placeholder"></div>
        <div class="listing-details">
            <span class="listing-location">📍</span>
            <h3>Loading...</h3>
            <p>Loading property details...</p>
        </div>
    `;
    return card;
}

// Load more listings dynamically
function loadMoreListings() {
    const listingsGrid = document.querySelector('.listings-grid');
    const showMoreBtn = document.querySelector('.show-more-btn');
    
    // Show loading state
    showMoreBtn.textContent = 'Loading...';
    showMoreBtn.disabled = true;
    
    // Add skeleton cards
    const skeletonCards = [];
    for (let i = 0; i < 2; i++) {
        const skeleton = createSkeletonCard();
        skeletonCards.push(skeleton);
        listingsGrid.appendChild(skeleton);
    }
    
    // Simulate API call
    setTimeout(() => {
        // Remove skeleton cards
        skeletonCards.forEach(card => card.remove());
        // Sample new listings data
        const newListings = [
            {
                title: 'Luxury Downtown Loft',
                description: '1 bedroom • 1 bed • 1 bathroom • Gym Access',
                image: 'assets/listing3.jpg'
            },
            {
                title: 'Cozy Brooklyn Studio',
                description: 'Studio • 1 bed • 1 bathroom • Rooftop Access',
                image: 'assets/listing4.jpg'
            }
        ];
        
        // Add new listings to grid
        newListings.forEach(listing => {
            const listingCard = createListingCard(listing);
            listingsGrid.appendChild(listingCard);
        });
        
        // Reset button
        showMoreBtn.textContent = 'Show me more Rentals';
        showMoreBtn.disabled = false;
        
        // Listings loaded
    }, 1000);
}

// Create listing card element
function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card fade-in';
    card.innerHTML = `
        <img src="${listing.image}" alt="${listing.title}" class="listing-image">
        <div class="listing-details">
            <span class="listing-location">📍</span>
            <h3>${listing.title}</h3>
            <p>${listing.description}</p>
        </div>
    `;
    
    card.addEventListener('click', function() {
        // Use default property ID for new listings
        const propertyId = '1586447992720x748691103167545300';
        const daysParam = (typeof selectedDays !== 'undefined' && selectedDays.length > 0) 
            ? selectedDays.join(',') 
            : '1,2,3,4,5';
        
        const propertyUrl = `https://app.split.lease/view-split-lease/${propertyId}?days-selected=${daysParam}`;
        
        window.location.href = propertyUrl;
    });
    
    return card;
}

// Support Section
function setupSupport() {
    const supportCards = document.querySelectorAll('.support-card');
    
    supportCards.forEach(card => {
        card.addEventListener('click', function() {
            const supportType = this.querySelector('p').textContent;
            handleSupportAction(supportType);
        });
    });
}

// Handle support actions
function handleSupportAction(type) {
    switch(type.toLowerCase()) {
        case 'chat':
            openChatWidget();
            break;
        case 'email':
            window.location.href = 'mailto:support@splitlease.com';
            break;
        case 'call':
            window.location.href = 'tel:1-800-SPLIT-LEASE';
            break;
        case 'faq':
            window.location.href = 'https://app.split.lease/faq';
            break;
    }
}

// Chat widget simulation
function openChatWidget() {
    // Create chat widget if it doesn't exist
    let chatWidget = document.getElementById('chat-widget');
    if (!chatWidget) {
        chatWidget = document.createElement('div');
        chatWidget.id = 'chat-widget';
        chatWidget.innerHTML = `
            <div class="chat-header">
                <span>Chat Support</span>
                <button onclick="closeChatWidget()">×</button>
            </div>
            <div class="chat-body">
                <div class="chat-message">Hello! How can we help you today?</div>
            </div>
            <div class="chat-input">
                <input type="text" placeholder="Type your message..." />
                <button>Send</button>
            </div>
        `;
        document.body.appendChild(chatWidget);
    }
    
    chatWidget.classList.add('active');
}

// Close chat widget
function closeChatWidget() {
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget) {
        chatWidget.classList.remove('active');
    }
}

// Referral System
function setupReferral() {
    const shareBtn = document.querySelector('.share-btn');
    const referralOptions = document.querySelectorAll('input[name="referral"]');
    const referralInput = document.querySelector('.referral-input');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            const selectedMethod = document.querySelector('input[name="referral"]:checked');
            const contact = referralInput.value;
            
            if (!selectedMethod || !contact) {
                return;
            }
            
            // Process referral
            processReferral(selectedMethod.value, contact);
        });
    }
    
    // Update placeholder based on selection
    referralOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'text') {
                referralInput.placeholder = "Your friend's phone number";
            } else {
                referralInput.placeholder = "Your friend's email";
            }
        });
    });
}

// Process referral submission
async function processReferral(method, contact) {
    // Enhanced validation
    if (method === 'email') {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact)) {
            alert('Please enter a valid email address');
            return;
        }
    } else if (method === 'text') {
        // Phone validation - basic check for 10+ digits
        const phoneDigits = contact.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            alert('Please enter a valid phone number with at least 10 digits');
            return;
        }
    }

    // Show loading state
    const shareBtn = document.querySelector('.share-btn');
    const originalText = shareBtn.textContent;
    shareBtn.textContent = 'Sending...';
    shareBtn.disabled = true;

    // Add spinner
    shareBtn.classList.add('loading');

    try {
        // Make real API call to Split Lease
        const response = await fetch('https://app.split.lease/api/1.1/wf/referral-index-lite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: method === 'text' ? 'phone' : 'email',
                contact: contact
            })
        });

        // Reset button state
        shareBtn.textContent = originalText;
        shareBtn.disabled = false;
        shareBtn.classList.remove('loading');

        if (response.ok) {
            // Success - show popup
            alert('🎉 Referral sent successfully! Thank you for spreading the word about Split Lease.');

            // Clear input and reset radio
            document.querySelector('.referral-input').value = '';
            document.querySelectorAll('input[name="referral"]').forEach(radio => {
                radio.checked = false;
            });

            console.log('✅ Referral API response:', response.status);
        } else {
            // Error response from server
            console.error('❌ Referral API error:', response.status);
            alert('Sorry, there was an issue sending your referral. Please try again later.');
        }
    } catch (error) {
        // Network or other error
        console.error('❌ Referral API error:', error);

        // Reset button state
        shareBtn.textContent = originalText;
        shareBtn.disabled = false;
        shareBtn.classList.remove('loading');

        alert('Sorry, there was a network error. Please check your connection and try again.');
    }
}

// Animations and Effects
function setupAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
    
    // Parallax effect for hero image
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        if (heroImage) {
            heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
}

// Toast Notification System - Removed for faster navigation
// All navigation now happens immediately without notifications

// Add chat widget styles dynamically
const chatStyles = `
    .scroll-down {
        transform: translateY(-100%);
    }
    
    .scroll-up {
        transform: translateY(0);
    }
    
    #chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 450px;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        z-index: 9999;
    }
    
    #chat-widget.active {
        display: flex;
    }
    
    .chat-header {
        background: var(--primary-color);
        color: white;
        padding: 1rem;
        border-radius: 1rem 1rem 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .chat-header button {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    }
    
    .chat-body {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
    }
    
    .chat-message {
        background: #f0f0f0;
        padding: 0.75rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
    }
    
    .chat-input {
        display: flex;
        padding: 1rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .chat-input input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.25rem;
        margin-right: 0.5rem;
    }
    
    .chat-input button {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
    }
`;

// Inject toast styles
const styleSheet = document.createElement('style');
styleSheet.textContent = chatStyles;
document.head.appendChild(styleSheet);

// Auth Modal Functions - Simplified for redirect
function setupAuthModal() {
    // Modal functionality removed - now redirects directly to Split Lease
}

// Setup modal events
function setupModalEvents() {
    const modal = document.getElementById('authModal');
    const iframe = document.getElementById('authIframe');
    
    if (modal) {
        // Event listeners are now handled by IframeLoader.loadAuthIframe()
        // This ensures events are only added when iframe is actually loaded
        
        // Click outside modal to close
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAuthModal();
            }
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeAuthModal();
            }
        });
        
        // Intent-based preloading will be added in Phase 3
        // No automatic preloading to improve performance
        
        // Close modals when clicking outside
        window.onclick = function(event) {
            const authModal = document.getElementById('authModal');
            const marketResearchModal = document.getElementById('marketResearchModal');
            
            if (event.target === authModal) {
                closeAuthModal();
            }
            
            if (event.target === marketResearchModal) {
                closeMarketResearchModal();
            }
        };
    }
}

// Iframe loading state management with intent-based preloading
const IframeLoader = {
    states: {
        auth: 'NOT_LOADED',
        marketResearch: 'NOT_LOADED'
    },
    
    preloadStartTime: null,
    intentScore: 0,
    preloadThreshold: 30,
    
    // Load iframe on demand only
    loadAuthIframe() {
        if (this.states.auth !== 'NOT_LOADED') {
            // Auth iframe already loaded or loading
            return;
        }
        
        const iframe = document.getElementById('authIframe');
        if (iframe && (!iframe.src || iframe.src === '' || iframe.src === 'about:blank')) {
            // Loading auth iframe on demand
            this.states.auth = 'LOADING';
            iframe.src = 'https://app.split.lease/signup-login';
            
            // Update state when loaded
            iframe.addEventListener('load', () => {
                this.states.auth = 'LOADED';
                // Auth iframe loaded successfully
                
                // Track preload effectiveness
                if (this.preloadStartTime) {
                    const loadTime = Date.now() - this.preloadStartTime;
                    console.log(`Preload completed in ${loadTime}ms`);
                    this.preloadStartTime = null;
                }
            }, { once: true });
            
            iframe.addEventListener('error', () => {
                this.states.auth = 'ERROR';
                console.error('Auth iframe failed to load');
            }, { once: true });
        }
    },
    
    // Preload iframe based on user intent
    preloadAuthIframe() {
        if (this.states.auth === 'NOT_LOADED') {
            // Intent detected - preloading auth iframe
            this.preloadStartTime = Date.now();
            
            // Show subtle preloading indicator
            const loader = document.querySelector('.iframe-loader');
            if (loader) {
                loader.classList.add('preloading');
            }
            
            this.loadAuthIframe();
        }
    },
    
    // Track user intent signals
    addIntentScore(points, reason) {
        this.intentScore += points;
        console.log(`Intent: ${reason} (+${points}) Total: ${this.intentScore}`);
        
        if (this.intentScore >= this.preloadThreshold && this.states.auth === 'NOT_LOADED') {
            this.preloadAuthIframe();
        }
    },
    
    isLoaded(type) {
        return this.states[type] === 'LOADED';
    }
};

// Direct redirect to login page (no modal, no iframe)
function openAuthModal() {
    // Direct redirect to Split Lease login page
    window.location.href = 'https://app.split.lease/signup-login';
}

// Close auth modal (kept for compatibility but not used)
function closeAuthModal() {
    // No longer needed - using direct redirect
}

// Market Research Modal Functions with Login Detection
function openMarketResearchModal() {
    const modal = document.getElementById('marketResearchModal');
    const iframe = document.getElementById('marketResearchIframe');
    const loader = document.querySelector('.market-research-loader');
    
    if (modal && iframe) {
        // Force a reflow before adding the class to ensure smooth animation
        modal.offsetHeight;
        
        // Show modal with smooth animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        });
        
        // Set iframe source if not already set or preloaded
        if (!iframe.src || iframe.src === '' || iframe.src === 'about:blank' || iframe.src === window.location.href) {
            iframe.src = 'https://app.split.lease/embed-ai-drawer';
            
            // Show loader
            if (loader) {
                loader.classList.remove('hidden');
            }
            
            // Hide loader and check auth when iframe loads
            iframe.onload = function() {
                if (loader) {
                    loader.classList.add('hidden');
                }
                // Check auth state after iframe loads
                checkBubbleAuthState(iframe);
            };
        } else {
            // If already loaded, hide loader immediately and check auth
            if (loader) {
                loader.classList.add('hidden');
            }
            // Check auth state for preloaded iframe
            checkBubbleAuthState(iframe);
        }
    }
}

// Check Bubble auth state by examining iframe content
function checkBubbleAuthState(iframe) {
    console.log('🔍 Attempting to check Bubble page for auth state...');

    // First check cookies before trying iframe access
    const cookieAuth = checkSplitLeaseCookies();
    if (cookieAuth.isLoggedIn) {
        console.log('✅ Auth confirmed via Split Lease cookies:');
        console.log('   Username:', cookieAuth.username);

        // Handle logged in user
        handleLoggedInUser(cookieAuth.username);

        // Cache the result
        localStorage.setItem('bubble_market_research_auth', 'true');
        localStorage.setItem('bubble_market_research_auth_time', Date.now().toString());

        return true;
    }

    // Wait a moment for iframe to be ready and set its document.domain
    // This is necessary for subdomain access between splitlease.app and app.split.lease
    if (window.location.hostname.includes('splitlease.app')) {
        try {
            // The iframe also needs to set document.domain='splitlease.app' on its side
            console.log('🌐 Domain: Parent is on splitlease.app, attempting subdomain access...');
        } catch (e) {
            // Domain setting might fail in development
        }
    }

    try {
        // Try to access the iframe document
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        console.log('✅ Successfully accessed iframe document!');
        
        // Look for elements with the IDs you specified
        // ID "596573" = logged in, ID "4E6F" = not logged in
        const loggedInElement = iframeDoc.getElementById('596573');
        const notLoggedInElement = iframeDoc.getElementById('4E6F');
        
        // Also try looking for main-page class with these IDs
        const mainPage = iframeDoc.querySelector('.main-page');
        
        let isLoggedIn = null;
        let detectionMethod = '';
        
        if (loggedInElement) {
            isLoggedIn = true;
            detectionMethod = 'Found element with ID 596573';
        } else if (notLoggedInElement) {
            isLoggedIn = false;
            detectionMethod = 'Found element with ID 4E6F';
        } else if (mainPage) {
            const pageId = mainPage.id;
            if (pageId === '596573') {
                isLoggedIn = true;
                detectionMethod = `Found .main-page with ID ${pageId}`;
            } else if (pageId === '4E6F') {
                isLoggedIn = false;
                detectionMethod = `Found .main-page with ID ${pageId}`;
            } else {
                detectionMethod = `Found .main-page but ID is "${pageId}" (unexpected)`;
            }
        } else {
            // Try to log what we CAN see in the iframe
            const body = iframeDoc.body;
            const html = iframeDoc.documentElement;
            
            // Check if the HTML or BODY element has the ID
            if (html && html.id) {
                console.log(`🎯 Found ID on <html> element: "${html.id}"`);
                if (html.id === '596573') {
                    isLoggedIn = true;
                    detectionMethod = 'Found ID 596573 on html element';
                } else if (html.id === '4E6F') {
                    isLoggedIn = false;
                    detectionMethod = 'Found ID 4E6F on html element';
                }
            }
            
            if (body && body.id && isLoggedIn === null) {
                console.log(`🎯 Found ID on <body> element: "${body.id}"`);
                if (body.id === '596573') {
                    isLoggedIn = true;
                    detectionMethod = 'Found ID 596573 on body element';
                } else if (body.id === '4E6F') {
                    isLoggedIn = false;
                    detectionMethod = 'Found ID 4E6F on body element';
                }
            }
            
            // Also check all other elements
            if (body && isLoggedIn === null) {
                const allElements = body.querySelectorAll('[id]');
                const allIds = Array.from(allElements).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id
                }));
                
                console.log(`📋 Found ${allIds.length} elements with IDs in iframe:`);
                allIds.forEach(item => {
                    console.log(`   <${item.tag} id="${item.id}">`);
                });
                
                // Check if any element contains our target IDs
                const hasLoggedInId = allIds.some(item => item.id === '596573');
                const hasNotLoggedInId = allIds.some(item => item.id === '4E6F');
                
                if (hasLoggedInId) {
                    isLoggedIn = true;
                    const element = allIds.find(item => item.id === '596573');
                    detectionMethod = `Found ID 596573 on <${element.tag}> element`;
                } else if (hasNotLoggedInId) {
                    isLoggedIn = false;
                    const element = allIds.find(item => item.id === '4E6F');
                    detectionMethod = `Found ID 4E6F on <${element.tag}> element`;
                }
                
                // If still no IDs found, log more debug info
                if (allIds.length === 0) {
                    console.log('⚠️ No elements with ID attributes found in iframe');
                    console.log('   Body innerHTML length:', body.innerHTML.length);
                    console.log('   Body text content preview:', body.textContent.substring(0, 100));
                }
            }
        }
        
        if (isLoggedIn !== null) {
            console.log(`🔐 Auth Status: User is ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
            console.log(`   Detection method: ${detectionMethod}`);
            
            // Show alert if user is logged in
            if (isLoggedIn) {
                alert('Logging in...');
            }
            
            // Cache the result
            localStorage.setItem('bubble_market_research_auth', isLoggedIn.toString());
            localStorage.setItem('bubble_market_research_auth_time', Date.now().toString());
            
            return isLoggedIn;
        } else {
            console.log('⚠️ Could not find auth indicators (596573 or 4E6F) in iframe');
            return null;
        }
        
    } catch (e) {
        console.log('❌ Cannot access iframe content due to cross-origin restrictions');
        console.log(`   iframe.src: ${iframe.src}`);
        console.log(`   Current origin: ${window.location.origin}`);
        console.log(`   Error: ${e.message}`);
        
        // Note about subdomain access
        if (window.location.hostname.includes('splitlease.app') && iframe.src.includes('app.split.lease')) {
            console.log('💡 Note: Both sites are on splitlease.app subdomains.');
            console.log('   The Bubble app needs to set: document.domain = "splitlease.app"');
            console.log('   to enable cross-subdomain access.');
        }
        
        // Always try postMessage first for fresh auth state
        try {
            iframe.contentWindow.postMessage(
                { type: 'request-auth-state' }, 
                'https://app.split.lease'
            );
            console.log('📨 Sent auth state request via postMessage');
            
            // Don't use cache immediately - wait for postMessage response
            // The response handler will update the cache with fresh data
        } catch (postMessageError) {
            console.log('⚠️ Could not send postMessage to iframe');
            
            // Only use cache as last resort if postMessage fails
            const cachedAuth = localStorage.getItem('bubble_market_research_auth');
            const cachedTime = localStorage.getItem('bubble_market_research_auth_time');
            
            if (cachedAuth && cachedTime) {
                const cacheAge = Date.now() - parseInt(cachedTime);
                // Reduce cache validity to 1 minute for more frequent checks
                if (cacheAge < 60 * 1000) { // 1 minute
                    const isLoggedIn = cachedAuth === 'true';
                    console.log(`🔐 Auth Status (from 1-min cache): User is ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
                    console.log(`   Cache age: ${Math.round(cacheAge / 1000)}s`);
                    
                    // Show alert if user is logged in (from cache)
                    if (isLoggedIn) {
                        alert('Logging in...');
                    }
                    
                    return isLoggedIn;
                } else {
                    console.log('🕰️ Cache expired (older than 1 minute)');
                    localStorage.removeItem('bubble_market_research_auth');
                    localStorage.removeItem('bubble_market_research_auth_time');
                }
            }
        }
        
        return null;
    }
}

// Delayed preload for Market Research iframe
function setupDelayedMarketResearchPreload() {
    console.log('⏰ Scheduling Market Research iframe preload in 4 seconds...');
    
    setTimeout(() => {
        console.log('🏃 Starting delayed preload now...');
        preloadMarketResearchIframe();
    }, 4000);
}

// Preload Market Research iframe
function preloadMarketResearchIframe() {
    const iframe = document.getElementById('marketResearchIframe');
    
    if (iframe && (!iframe.src || iframe.src === '' || iframe.src === 'about:blank' || iframe.src === window.location.href)) {
        console.log('🚀 Starting to preload Market Research iframe...');
        
        // Set the iframe source to preload it
        iframe.src = 'https://app.split.lease/embed-ai-drawer';
        
        // Hide the iframe while preloading
        const modal = document.getElementById('marketResearchModal');
        if (modal && !modal.classList.contains('active')) {
            iframe.style.visibility = 'hidden';
        }
        
        // When iframe loads, check auth state
        iframe.onload = function() {
            console.log('✅ Market Research iframe preloaded successfully');
            
            // Make iframe visible again
            iframe.style.visibility = '';
            
            // Check auth state after a delay to allow Bubble page to fully render
            setTimeout(() => {
                console.log('🕒 Checking auth state after 2 second delay...');
                checkBubbleAuthState(iframe);
            }, 2000);
        };
        
        iframe.onerror = function() {
            console.error('❌ Failed to preload Market Research iframe');
            iframe.style.visibility = '';
        };
    } else if (iframe && iframe.src && iframe.src !== '' && iframe.src !== 'about:blank') {
        console.log('ℹ️ Market Research iframe already loaded');
        // Check auth state with delay to ensure Bubble page is fully rendered
        setTimeout(() => {
            console.log('🕒 Checking auth state after delay...');
            checkBubbleAuthState(iframe);
        }, 1500);
    }
}

function closeMarketResearchModal() {
    const modal = document.getElementById('marketResearchModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Hide loader when iframe loads
function hideIframeLoader() {
    const loader = document.querySelector('.iframe-loader');
    
    if (loader) {
        // Actually hide the loader to show the iframe content
        loader.classList.add('hidden');
    }
    
    // Update IframeLoader state
    IframeLoader.states.auth = 'LOADED';
}

// Legacy functions kept empty for compatibility
function showWelcomeScreen() {}
function showLoginForm() {}
function showSignupForm() {}
function hideAllScreens() {}
function switchToLogin() {}
function switchToSignup() {}
function togglePasswordVisibility() {}
function handleAuthSubmit() {}
function togglePassword() {}
function handleLogin() {}
function handleSignup() {}

// Auth State Discovery System - Hybrid Approach
const AuthStateManager = {
    isLoggedIn: false,
    lastCheckTime: null,
    checkInProgress: false,
    
    // Initialize auth state checking after page load
    init() {
        // Run after page is fully loaded to avoid any impact on page load time
        window.addEventListener('load', () => {
            this.performInstantCheck();
            this.scheduleLazyVerification();
        });
    },
    
    // Step 1: Instant check using localStorage (0ms impact)
    performInstantCheck() {
        const lastAuth = localStorage.getItem('split_lease_last_auth');
        const authExpiry = localStorage.getItem('split_lease_auth_expiry');
        
        if (lastAuth && authExpiry) {
            const now = Date.now();
            const expiryTime = parseInt(authExpiry);
            
            // Check if auth is still valid (within 24 hours)
            if (now < expiryTime) {
                this.isLoggedIn = true;
                this.updateUIForLoggedInState();
                // Likely logged in (from cache)
            } else {
                // Auth expired, clean up
                localStorage.removeItem('split_lease_last_auth');
                localStorage.removeItem('split_lease_auth_expiry');
                // Cache expired
            }
        } else {
            // No cached auth found
        }
    },
    
    // Step 2: Lazy verification in background (after 2 seconds)
    scheduleLazyVerification() {
        setTimeout(() => {
            if (!this.checkInProgress) {
                this.performBackgroundCheck();
            }
        }, 2000);
    },
    
    // Background verification using Bubble API
    performBackgroundCheck() {
        this.checkInProgress = true;
        // Starting background verification
        
        const timestamp = Date.now();
        
        // Try to fetch current user data from Bubble API
        // This endpoint returns user data if logged in, or empty/error if not
        fetch('https://app.split.lease/version-test/api/1.1/obj/user', {
            method: 'GET',
            credentials: 'include', // Include cookies for auth
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors'
        })
        .then(response => {
            // Auth check response
            
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Not authenticated');
            }
        })
        .then(data => {
            // Check if we got actual user data
            // Bubble returns an object with 'response' containing user records
            const hasUserData = data && data.response && 
                               data.response.results && 
                               data.response.results.length > 0;
            
            // Auth check data received
            
            const wasLoggedIn = this.isLoggedIn;
            this.isLoggedIn = hasUserData;
            
            if (hasUserData) {
                // User is logged in
                localStorage.setItem('split_lease_last_auth', timestamp.toString());
                localStorage.setItem('split_lease_auth_expiry', (timestamp + 86400000).toString()); // 24 hours
                
                if (!wasLoggedIn) {
                    this.updateUIForLoggedInState();
                } else {
                    // Still logged in
                }
            } else {
                // No user data means not logged in
                localStorage.removeItem('split_lease_last_auth');
                localStorage.removeItem('split_lease_auth_expiry');
                
                if (wasLoggedIn) {
                    this.updateUIForLoggedOutState();
                } else {
                    // Not logged in
                }
            }
            
            this.checkInProgress = false;
            this.lastCheckTime = timestamp;
        })
        .catch(error => {
            // Auth check error
            
            // Error means not authenticated or CORS issue
            // For CORS issues, we'll fall back to iframe method
            if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
                // CORS issue detected, trying iframe method
                this.performIframeCheck();
            } else {
                // Assume logged out
                const wasLoggedIn = this.isLoggedIn;
                this.isLoggedIn = false;
                
                localStorage.removeItem('split_lease_last_auth');
                localStorage.removeItem('split_lease_auth_expiry');
                
                if (wasLoggedIn) {
                    this.updateUIForLoggedOutState();
                }
                // Not logged in
                
                this.checkInProgress = false;
                this.lastCheckTime = timestamp;
            }
        });
        
        // Timeout fallback - assume logged out if no response in 5 seconds
        setTimeout(() => {
            if (this.checkInProgress) {
                // Check timeout - assuming logged out
                this.isLoggedIn = false;
                localStorage.removeItem('split_lease_last_auth');
                localStorage.removeItem('split_lease_auth_expiry');
                this.updateUIForLoggedOutState();
                this.checkInProgress = false;
            }
        }, 5000);
    },
    
    // Fallback iframe check method if CORS fails
    performIframeCheck() {
        // Using iframe fallback method
        
        // Create a minimal iframe to check auth
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.src = 'https://app.split.lease/version-test/api/1.1/obj/user';
        
        const timestamp = Date.now();
        let checkComplete = false;
        
        iframe.onload = () => {
            if (!checkComplete) {
                try {
                    // Try to access iframe content (will fail for CORS but that's ok)
                    // The fact it loaded means the request succeeded
                    // Iframe loaded successfully
                    this.isLoggedIn = true;
                    localStorage.setItem('split_lease_last_auth', timestamp.toString());
                    localStorage.setItem('split_lease_auth_expiry', (timestamp + 86400000).toString());
                    this.updateUIForLoggedInState();
                } catch (e) {
                    // Can't access content but load succeeded - likely authenticated
                    // Iframe loaded (CORS protected)
                }
                checkComplete = true;
                document.body.removeChild(iframe);
                this.checkInProgress = false;
            }
        };
        
        iframe.onerror = () => {
            if (!checkComplete) {
                // Iframe failed - not logged in
                this.isLoggedIn = false;
                localStorage.removeItem('split_lease_last_auth');
                localStorage.removeItem('split_lease_auth_expiry');
                this.updateUIForLoggedOutState();
                checkComplete = true;
                document.body.removeChild(iframe);
                this.checkInProgress = false;
            }
        };
        
        document.body.appendChild(iframe);
        
        // Clean up after 3 seconds if nothing happens
        setTimeout(() => {
            if (!checkComplete) {
                // Iframe timeout
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                this.checkInProgress = false;
            }
        }, 3000);
    },
    
    // Update UI to reflect logged-in state
    updateUIForLoggedInState() {
        // Just log for now - no UI changes
        // User is LOGGED IN
    },
    
    // Update UI to reflect logged-out state  
    updateUIForLoggedOutState() {
        // Just log for now - no UI changes
        // User is LOGGED OUT
    },
    
    // Manual check method (can be called on demand)
    checkNow() {
        if (!this.checkInProgress) {
            this.performBackgroundCheck();
        }
        return this.isLoggedIn;
    },
    
    // Get current auth state
    getState() {
        return {
            isLoggedIn: this.isLoggedIn,
            lastCheck: this.lastCheckTime,
            checking: this.checkInProgress
        };
    }
};

// Auth state discovery removed - using delayed preload instead

// Hero Day Selector Functions - Exact Split Lease Replication
let selectedDays = [];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function setupHeroDaySelector() {
    // Load initial state from URL or start clean
    loadStateFromURL();
    updateDayBadges();
    updateCheckinCheckout();
    updateExploreButtons();  // Initialize button states on page load
}

function loadStateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const daysParam = urlParams.get('days-selected');
    
    if (daysParam) {
        // Parse days from URL parameter (decode URL encoding)
        const decoded = decodeURIComponent(daysParam);
        // Convert from 1-based (Bubble) to 0-based (JavaScript) by subtracting 1
        const bubbleDays = decoded.split(',').map(d => parseInt(d.trim()));
        selectedDays = bubbleDays.map(day => day - 1).filter(d => d >= 0 && d <= 6);
    } else {
        // Default to Monday-Friday (indices 1-5 in JavaScript, days 2-6 in URL)
        selectedDays = [1, 2, 3, 4, 5];
    }
}

function toggleDay(dayIndex) {
    // Day mapping: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
    
    // Treat Sunday like any other day - simple toggle on/off
    const dayNumber = dayIndex;
    
    if (selectedDays.includes(dayNumber)) {
        // FAILSAFE: Prevent unselection if only 2 days are selected
        if (selectedDays.length <= 2) {
            console.log('Cannot unselect: Minimum 2 days must remain selected');
            showToast('Minimum 2 days must be selected');
            return;
        }
        // Remove the day if it's already selected
        selectedDays = selectedDays.filter(d => d !== dayNumber);
    } else {
        // Add the day if it's not selected
        selectedDays.push(dayNumber);
        selectedDays.sort((a, b) => a - b);
    }
    
    updateDayBadges();
    updateCheckinCheckout();
    updateURL();
    updateExploreButtons();  // Update button states based on continuity
}

function updateDayBadges() {
    const badges = document.querySelectorAll('.hero-section .day-badge');
    badges.forEach((badge, index) => {
        // Direct mapping for all days: Sunday=0, Monday=1, etc.
        const isSelected = selectedDays.includes(index);
        
        if (isSelected) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    });
}

function updateCheckinCheckout() {
    const checkinCheckoutEl = document.getElementById('checkinCheckout');
    
    if (selectedDays.length === 0) {
        checkinCheckoutEl.style.display = 'none';
        return;
    }
    
    // Debug logging
    console.log('updateCheckinCheckout called with selectedDays:', selectedDays);
    const isContinuous = areDaysContinuous(selectedDays);
    console.log('areDaysContinuous result:', isContinuous);
    
    // Check if days are continuous
    if (!isContinuous) {
        // Show error message for non-continuous days
        checkinCheckoutEl.innerHTML = 'Please select a continuous set of days';
        checkinCheckoutEl.style.display = 'block';
        return;
    }
    
    // Calculate check-in and check-out days based on selected days
    let checkinDay, checkoutDay;
    
    if (selectedDays.length === 1) {
        // Single day selection
        checkinDay = dayNames[selectedDays[0]];
        checkoutDay = dayNames[selectedDays[0]];
    } else {
        // Multiple day selection
        const sortedDays = [...selectedDays].sort((a, b) => a - b);
        const hasSunday = sortedDays.includes(0);
        const hasSaturday = sortedDays.includes(6);
        
        // Check if this is a wrap-around case
        if (hasSunday && hasSaturday && sortedDays.length < 7) {
            // Find the gap (unselected days) in the week
            let gapStart = -1;
            let gapEnd = -1;
            
            // Look for the gap in the sorted days
            for (let i = 0; i < sortedDays.length - 1; i++) {
                if (sortedDays[i + 1] - sortedDays[i] > 1) {
                    // Found the gap
                    gapStart = sortedDays[i] + 1;  // First unselected day
                    gapEnd = sortedDays[i + 1] - 1;  // Last unselected day
                    break;
                }
            }
            
            if (gapStart !== -1 && gapEnd !== -1) {
                // Wrap-around case with a gap in the middle
                // Check-in: First selected day AFTER the gap ends
                // Check-out: Last selected day BEFORE the gap starts
                
                // All days after the gap end are check-in candidates
                const daysAfterGap = sortedDays.filter(day => day > gapEnd || day < gapStart);
                // All days before the gap start are check-out candidates  
                const daysBeforeGap = sortedDays.filter(day => day < gapStart || day > gapEnd);
                
                // Check-in is the smallest day after the gap (considering wrap)
                let checkinDayIndex;
                if (sortedDays.some(day => day > gapEnd)) {
                    // There are days after the gap in the same week
                    checkinDayIndex = sortedDays.find(day => day > gapEnd);
                } else {
                    // Wrap to Sunday
                    checkinDayIndex = 0;
                }
                
                // Check-out is the largest day before the gap
                let checkoutDayIndex;
                if (sortedDays.some(day => day < gapStart)) {
                    // There are days before the gap
                    checkoutDayIndex = sortedDays.filter(day => day < gapStart).pop();
                } else {
                    // Wrap to Saturday
                    checkoutDayIndex = 6;
                }
                
                checkinDay = dayNames[checkinDayIndex];
                checkoutDay = dayNames[checkoutDayIndex];
                
                console.log(`🔄 Wrap-around: Gap is ${dayNames[gapStart]}-${dayNames[gapEnd]}`);
                console.log(`   Check-in: ${checkinDay}, Check-out: ${checkoutDay}`);
            } else {
                // No gap found (shouldn't happen with Sunday and Saturday selected)
                // Use standard min/max
                checkinDay = dayNames[sortedDays[0]];
                checkoutDay = dayNames[sortedDays[sortedDays.length - 1]];
            }
        } else {
            // Non-wrap-around case: use first and last in sorted order
            checkinDay = dayNames[sortedDays[0]];
            checkoutDay = dayNames[sortedDays[sortedDays.length - 1]];
        }
    }
    
    // Restore original HTML structure for valid selections
    checkinCheckoutEl.innerHTML = `
        <span><strong>Check-in:</strong> <span id="checkinDay">${checkinDay}</span></span>
        <span class="separator">•</span>
        <span><strong>Check-out:</strong> <span id="checkoutDay">${checkoutDay}</span></span>
    `;
    checkinCheckoutEl.style.display = 'flex';
}

function areDaysContinuous(days) {
    console.log('areDaysContinuous called with:', days);
    
    // Edge cases
    if (days.length <= 1) {
        console.log('-> Length <= 1, returning true');
        return true;
    }
    
    if (days.length >= 6) {
        console.log('-> Length >= 6, returning true');
        return true;
    }
    
    const sortedDays = [...days].sort((a, b) => a - b);
    console.log('-> Sorted days:', sortedDays);
    
    // STEP 1: Check if selected days are continuous (regular check)
    let isRegularContinuous = true;
    for (let i = 1; i < sortedDays.length; i++) {
        if (sortedDays[i] !== sortedDays[i-1] + 1) {
            isRegularContinuous = false;
            break;
        }
    }
    
    if (isRegularContinuous) {
        console.log('-> Regular continuous check passed');
        return true;
    }
    
    // STEP 2: Check if UNSELECTED days are continuous (implies wrap-around)
    console.log('-> Regular check failed, checking wrap-around via unselected days');
    
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const unselectedDays = allDays.filter(day => !sortedDays.includes(day));
    
    if (unselectedDays.length === 0) {
        // All days selected
        return true;
    }
    
    console.log('-> Unselected days:', unselectedDays);
    
    // Check if unselected days are continuous
    const sortedUnselected = [...unselectedDays].sort((a, b) => a - b);
    for (let i = 1; i < sortedUnselected.length; i++) {
        if (sortedUnselected[i] !== sortedUnselected[i-1] + 1) {
            console.log('-> Unselected days not continuous, selection is not valid');
            return false;
        }
    }
    
    console.log('-> Unselected days are continuous, selection wraps around!');
    return true;
}

// Update Explore Rentals button states based on day continuity
function updateExploreButtons() {
    const isContinuous = areDaysContinuous(selectedDays);
    
    // Store continuity state globally for explore functions to check
    window.isDaySelectionContinuous = isContinuous;
}

function updateURL() {
    const currentUrl = new URL(window.location);
    
    if (selectedDays.length === 0) {
        currentUrl.searchParams.delete('days-selected');
    } else {
        // Convert to 1-based indexing for Bubble (add 1 to each day)
        const bubbleDays = selectedDays.map(day => day + 1);
        // Use exact URL encoding format like original site: %2C%20 = ", "
        currentUrl.searchParams.set('days-selected', bubbleDays.join(', '));
    }
    
    // Update URL without page reload
    window.history.replaceState({}, '', currentUrl);
}

function exploreRentals() {
    if (selectedDays.length === 0) {
        showToast('Please select at least one day');
        return;
    }
    
    // Check if days are continuous before allowing exploration
    if (!areDaysContinuous(selectedDays)) {
        showToast('Please select a continuous set of days');
        return;
    }
    
    // Convert to 1-based indexing for Bubble (add 1 to each day)
    const bubbleDays = selectedDays.map(day => day + 1);
    
    // Redirect with selected days using exact format
    const searchUrl = `https://app.split.lease/search?days-selected=${bubbleDays.join(',')}`;
    
    window.location.href = searchUrl;
}

function redirectToSearch(daysSelected, preset) {
    // Note: daysSelected here is already a string like "2,3,4,5,6" for weeknight
    // These are already 1-based from the schedule section, so no conversion needed
    const searchUrl = `https://app.split.lease/search?days-selected=${daysSelected}`;
    
    window.location.href = searchUrl;
}

// Dropdown Menu Functionality
function setupDropdownMenus() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        let isOpen = false;
        
        // Toggle on click
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            isOpen = !isOpen;
            
            if (isOpen) {
                dropdown.classList.add('active');
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
            } else {
                dropdown.classList.remove('active');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
            }
        });
        
        // Keep open on hover
        dropdown.addEventListener('mouseenter', function() {
            dropdown.classList.add('hover');
        });
        
        dropdown.addEventListener('mouseleave', function() {
            dropdown.classList.remove('hover');
            if (!isOpen) {
                dropdown.classList.remove('active');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                const menu = dropdown.querySelector('.dropdown-menu');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
            });
        }
    });
    
    // Keyboard navigation
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const items = dropdown.querySelectorAll('.dropdown-item');
        
        trigger.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger.click();
            } else if (e.key === 'ArrowDown' && dropdown.classList.contains('active')) {
                e.preventDefault();
                items[0]?.focus();
            }
        });
        
        items.forEach((item, index) => {
            item.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    items[index + 1]?.focus() || items[0].focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    items[index - 1]?.focus() || trigger.focus();
                } else if (e.key === 'Escape') {
                    dropdown.classList.remove('active');
                    trigger.focus();
                }
            });
        });
    });
}

// Footer Navigation Functionality
function setupFooterNavigation() {
    // Only handle the emergency assistance link
    const emergencyBtn = document.querySelector('.footer-column a.emergency');
    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Direct call to 911
            window.location.href = 'tel:911';
        });
    }
}


// Mobile Menu Toggle
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navCenter = document.querySelector('.nav-center');
    const navRight = document.querySelector('.nav-right');
    
    hamburger.classList.toggle('active');
    navCenter.classList.toggle('mobile-active');
    navRight.classList.toggle('mobile-active');
}

// Handle Import Listing
function handleImportListing() {
    const url = document.getElementById('importUrl').value;
    const email = document.getElementById('importEmail').value;
    
    if (!url || !email) {
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        return;
    }
    
    // Show loading state
    const btn = document.querySelector('.import-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Importing...';
    btn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        
        // Import completed successfully
        
        // Clear inputs
        document.getElementById('importUrl').value = '';
        document.getElementById('importEmail').value = '';
    }, 2000);
}


// Floating Badge Setup
function setupFloatingBadge() {
    const badge = document.querySelector('.floating-badge');
    if (!badge) return;
    
    // Show badge by default (unless user is logged in)
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        badge.style.display = 'none';
    } else {
        badge.style.display = 'block';
    }
    
    // Hide badge when user logs in
    window.addEventListener('userLoggedIn', function() {
        badge.style.display = 'none';
        localStorage.setItem('isLoggedIn', 'true');
    });
    
    // Show badge when user logs out
    window.addEventListener('userLoggedOut', function() {
        badge.style.display = 'block';
        localStorage.setItem('isLoggedIn', 'false');
    });
}

// Setup intent-based preloading detection
function setupIntentDetection() {
    console.log('Setting up intent detection for smart preloading...');
    
    // 1. Mouse proximity to header (contains sign-in button)
    let headerProximityTriggered = false;
    document.addEventListener('mousemove', function(e) {
        if (!headerProximityTriggered && e.clientY < 150) {
            headerProximityTriggered = true;
            IframeLoader.addIntentScore(10, 'Mouse near header');
        }
    });
    
    // 2. Hover on sign-in/sign-up links (high intent)
    const signInElements = document.querySelectorAll('.nav-link');
    signInElements.forEach(el => {
        if (el.textContent.includes('Sign')) {
            el.addEventListener('mouseenter', function() {
                IframeLoader.addIntentScore(40, 'Hover on Sign In/Up');
            }, { once: true });
            
            // Focus event for keyboard navigation
            el.addEventListener('focus', function() {
                IframeLoader.addIntentScore(35, 'Focus on Sign In/Up');
            }, { once: true });
        }
    });
    
    // 3. Scroll depth tracking (medium intent)
    let scrollTriggered = false;
    window.addEventListener('scroll', function() {
        if (!scrollTriggered) {
            const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercentage > 50) {
                scrollTriggered = true;
                IframeLoader.addIntentScore(20, 'Scrolled past 50%');
            }
        }
    });
    
    // 4. Idle time detection (3 seconds of idle = interested user)
    let idleTimer = null;
    let idleTriggered = false;
    
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        if (!idleTriggered) {
            idleTimer = setTimeout(function() {
                idleTriggered = true;
                IframeLoader.addIntentScore(15, 'User idle for 3s');
            }, 3000);
        }
    }
    
    // Reset idle timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
    
    // 5. Mobile touch detection (first touch = engagement)
    document.addEventListener('touchstart', function() {
        IframeLoader.addIntentScore(25, 'Mobile touch detected');
    }, { once: true });
    
    // 6. Tab/focus navigation (accessibility)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            IframeLoader.addIntentScore(5, 'Tab navigation');
        }
    }, { once: true });
    
    console.log('Intent detection setup complete');
}

// Export functions for global use
window.closeChatWidget = closeChatWidget;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.openMarketResearchModal = openMarketResearchModal;
window.closeMarketResearchModal = closeMarketResearchModal;
window.hideIframeLoader = hideIframeLoader;
window.AuthStateManager = AuthStateManager;
window.checkBubbleAuthState = checkBubbleAuthState;
window.preloadMarketResearchIframe = preloadMarketResearchIframe;
window.setupDelayedMarketResearchPreload = setupDelayedMarketResearchPreload;
window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.toggleDay = toggleDay;
window.exploreRentals = exploreRentals;
window.toggleMobileMenu = toggleMobileMenu;
window.handleImportListing = handleImportListing;