/**
 * Split Lease Header Component JavaScript
 * Handles dropdown menus, mobile menu, and authentication modal
 */

// Mobile Menu Toggle
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navCenter = document.querySelector('.nav-center');
    const navRight = document.querySelector('.nav-right');

    if (hamburger) hamburger.classList.toggle('active');
    if (navCenter) navCenter.classList.toggle('mobile-active');
    if (navRight) navRight.classList.toggle('mobile-active');
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
                if (menu) {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                }
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

// Authentication Modal (redirect to Split Lease)
function openAuthModal() {
    // Direct redirect to Split Lease login page
    window.location.href = 'https://app.split.lease/signup-login';
}

// Initialize header functionality
function initSplitLeaseHeader() {
    setupDropdownMenus();

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
                const header = document.querySelector('.main-header');
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplitLeaseHeader);
} else {
    initSplitLeaseHeader();
}

// Export functions for external use
if (typeof window !== 'undefined') {
    window.toggleMobileMenu = toggleMobileMenu;
    window.openAuthModal = openAuthModal;
    window.setupDropdownMenus = setupDropdownMenus;
    window.initSplitLeaseHeader = initSplitLeaseHeader;
}
