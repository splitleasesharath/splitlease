// Day selector functionality
document.addEventListener('DOMContentLoaded', function() {
    // Day selector buttons
    const dayButtons = document.querySelectorAll('.day-btn');
    dayButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateScheduleSummary();
        });
    });

    function updateScheduleSummary() {
        const selectedDays = document.querySelectorAll('.day-btn.selected');
        const count = selectedDays.length;
        const summary = document.querySelector('.schedule-summary');

        if (summary && count > 0) {
            const nights = count > 0 ? count - 1 : 0;
            summary.textContent = `${count} days, ${nights} nights Selected`;
        }
    }

    // Read More functionality
    const readMoreLink = document.querySelector('.read-more');
    const descriptionText = document.querySelector('.description-text');

    if (readMoreLink) {
        readMoreLink.addEventListener('click', function(e) {
            e.preventDefault();

            if (descriptionText.classList.contains('expanded')) {
                descriptionText.classList.remove('expanded');
                const fullDesc = descriptionText.dataset.fullDescription;
                if (fullDesc) {
                    descriptionText.textContent = fullDesc.substring(0, 150) + '...';
                }
                this.textContent = 'Read More';
            } else {
                descriptionText.classList.add('expanded');
                const fullDesc = descriptionText.dataset.fullDescription;
                if (fullDesc) {
                    descriptionText.textContent = fullDesc;
                }
                this.textContent = 'Show Less';
            }
        });
    }

    // Image gallery click handlers
    const images = document.querySelectorAll('.image-gallery img, .more-images');
    images.forEach(image => {
        image.addEventListener('click', function() {
            console.log('Image clicked - would open gallery viewer');
            // TODO: Implement full image gallery viewer
        });
    });

    // Contact host buttons
    const contactButtons = document.querySelectorAll('.contact-icon');
    contactButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Contact host clicked');
            // TODO: Implement contact host functionality
        });
    });

    // Chat button
    const chatButton = document.querySelector('.chat-button');
    if (chatButton) {
        chatButton.addEventListener('click', function() {
            console.log('Chat button clicked');
            // TODO: Implement chat functionality
        });
    }

    // CTA Button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            console.log('Create Proposal clicked');
            // TODO: Implement proposal creation
        });
    }
});

// Auth modal functions (referenced in header)
function openAuthModal() {
    console.log('Opening auth modal');
    // TODO: Implement authentication modal
    alert('Sign In / Sign Up functionality would be implemented here');
}

// Footer referral functionality
function handleReferral() {
    const method = document.querySelector('input[name="referral"]:checked').value;
    const contact = document.getElementById('referralInput').value;

    if (!contact.trim()) {
        alert('Please enter contact information');
        return;
    }

    console.log(`Referral via ${method}:`, contact);
    alert(`Referral submitted via ${method}: ${contact}`);
    document.getElementById('referralInput').value = '';
}

// Update referral input placeholder
document.addEventListener('DOMContentLoaded', function() {
    const referralRadios = document.querySelectorAll('input[name="referral"]');
    referralRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const input = document.getElementById('referralInput');
            if (this.value === 'text') {
                input.placeholder = "Your friend's phone number";
            } else {
                input.placeholder = "Your friend's email";
            }
        });
    });
});

// Footer import functionality
function handleImport() {
    const url = document.getElementById('importUrl').value;
    const email = document.getElementById('importEmail').value;

    if (!url.trim() || !email.trim()) {
        alert('Please fill in both fields');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Please enter a valid URL');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email');
        return;
    }

    const btn = event.target;
    btn.textContent = 'Importing...';
    btn.disabled = true;

    console.log('Import listing:', { url, email });

    setTimeout(() => {
        btn.textContent = 'Submit';
        btn.disabled = false;
        alert('Listing imported successfully!');
        document.getElementById('importUrl').value = '';
        document.getElementById('importEmail').value = '';
    }, 2000);
}

// Initialize Google Maps (placeholder)
function initMap() {
    // TODO: Initialize Google Maps with actual API key
    console.log('Google Maps would be initialized here');
}
