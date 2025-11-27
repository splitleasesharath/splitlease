// Split Lease Help Center - Navigation JavaScript
// Last Updated: October 27, 2025

// Mobile Menu Toggle
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navCenter = document.querySelector('.nav-center');
    const navRight = document.querySelector('.nav-right');

    if (hamburger && navCenter && navRight) {
        hamburger.classList.toggle('active');
        navCenter.classList.toggle('mobile-active');
        navRight.classList.toggle('mobile-active');
    }
}

// Dropdown Menu Functionality
function setupDropdownMenus() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');

        if (!trigger || !menu) return;

        let isOpen = false;

        // Toggle on click
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            isOpen = !isOpen;

            if (isOpen) {
                dropdown.classList.add('active');
            } else {
                dropdown.classList.remove('active');
            }
        });

        // Keep open on hover (desktop only)
        if (window.innerWidth > 768) {
            dropdown.addEventListener('mouseenter', function() {
                dropdown.classList.add('active');
            });

            dropdown.addEventListener('mouseleave', function() {
                dropdown.classList.remove('active');
                isOpen = false;
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    setupDropdownMenus();

    // Add feather icons replacement
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});

// Handle Import Listing (Footer functionality)
function handleImportListing() {
    const url = document.getElementById('importUrl')?.value;
    const email = document.getElementById('importEmail')?.value;

    if (!url || !email) {
        alert('Please fill in all fields');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address');
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

        alert('Thank you! We\'ll process your listing import and contact you soon.');

        // Clear inputs
        document.getElementById('importUrl').value = '';
        document.getElementById('importEmail').value = '';
    }, 2000);
}

// Export functions to global scope
window.toggleMobileMenu = toggleMobileMenu;
window.handleImportListing = handleImportListing;
