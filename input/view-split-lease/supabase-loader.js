// Supabase Configuration
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

// Initialize Supabase client (will be set when library loads)
let supabase = null;

// Lookup data cache
const LOOKUP_CACHE = {
    amenities: {
        "1558470368024x124705598302821140": { name: "Air Conditioned", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1748556802154x262647125701224830/air%20condicioner-2-svgrepo-com%201.svg" },
        "1555340850683x868929351440588700": { name: "Gym", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750445096649x615671972670948100/ChatGPT%20Image%2020%20de%20jun.%20de%202025%2C%2015_44_28.png" },
        "1555340851282x193736739492841540": { name: "Hair Dryer", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750683196629x746988299040201100/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2009_52_08.png" },
        "1555340855187x816189646717209200": { name: "Premium TV", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750683091179x909765138960774800/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2009_50_25.png" },
        "1555340856469x472364328782922900": { name: "WiFi", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1748556786261x793146581576578100/wifi%20%282%29.svg" }
    },
    safety: {
        "1555343668134x731801591789591700": { name: "Carbon Monoxide Detector", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750684812047x287550172612533800/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2009_56_03.png" },
        "1555343669006x402120568105726100": { name: "Fire Extinguisher", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750684926778x880547697562342900/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2010_05_51.png" },
        "1555343667837x829435456336909600": { name: "Smoke Detector", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750684838017x148904723818961570/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2010_10_41.png" }
    },
    houseRules: {
        "1556151848468x314854653954062850": { name: "No Pets", icon: "//50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1750686795963x195226599444654270/ChatGPT%20Image%2023%20de%20jun.%20de%202025%2C%2010_52_57.png" }
    },
    listingTypes: {
        "1569530331984x152755544104023800": { label: "Entire Place", description: "In you want to relax (or work!) alone your own space or if want to bring your family, Entire Space is ideal for you." }
    },
    parking: {
        "1642428637379x970678957586007000": { label: "Street Parking" }
    }
};

// Extract listing ID from URL path segment
function getListingIdFromUrl() {
    // Extract ID from path: /view-split-lease/<id> or /view-split-lease-1/<id> or /<id>
    const pathSegments = window.location.pathname.split('/').filter(segment => segment);

    // Find the index of 'view-split-lease' or 'view-split-lease-1' segment
    const viewSegmentIndex = pathSegments.findIndex(segment =>
        segment === 'view-split-lease' || segment === 'view-split-lease-1'
    );

    // If found and there's a next segment that's not a file, use it as the ID
    if (viewSegmentIndex !== -1 && pathSegments[viewSegmentIndex + 1]) {
        const nextSegment = pathSegments[viewSegmentIndex + 1];
        // Make sure it's not a filename (doesn't end with .html, .php, etc.)
        if (!nextSegment.includes('.')) {
            return nextSegment;
        }
    }

    // Check if the first path segment looks like a listing ID (contains 'x' and numbers)
    // Format: ################x################## (e.g., 1586447992720x748691103167545300)
    if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0];
        // Check if it matches the listing ID pattern and is not a filename
        if (/^\d+x\d+$/.test(firstSegment)) {
            return firstSegment;
        }
    }

    return null;
}

// Format price for display
function formatPrice(price) {
    if (!price || price === 0) return null;
    return `$${parseFloat(price).toFixed(2)}`;
}

// Get bedroom/studio display text
function getBedroomText(bedrooms) {
    return bedrooms === 0 ? 'Studio' : `${bedrooms} Bedroom${bedrooms > 1 ? 's' : ''}`;
}

// Resolve lookup IDs to readable data
function resolveAmenities(amenityIds) {
    if (!amenityIds || !Array.isArray(amenityIds)) return [];
    return amenityIds.map(id => LOOKUP_CACHE.amenities[id]).filter(Boolean);
}

function resolveSafety(safetyIds) {
    if (!safetyIds || !Array.isArray(safetyIds)) return [];
    return safetyIds.map(id => LOOKUP_CACHE.safety[id]).filter(Boolean);
}

function resolveHouseRules(ruleIds) {
    if (!ruleIds || !Array.isArray(ruleIds)) return [];
    return ruleIds.map(id => LOOKUP_CACHE.houseRules[id]).filter(Boolean);
}

// Fetch listing data from Supabase
async function fetchListingData(listingId) {
    try {
        console.log('Fetching listing data for ID:', listingId);

        // Query main listing data
        const { data: listing, error: listingError } = await supabase
            .from('listing')
            .select(`
                _id,
                "Name",
                "Description",
                "Features - Qty Bedrooms",
                "Features - Qty Bathrooms",
                "Features - Qty Beds",
                "Features - Qty Guests",
                "Kitchen Type",
                "Location - Address",
                "Location - Hood",
                "Location - Borough",
                "neighborhood (manual input by user)",
                "host name",
                "💰Nightly Host Rate for 4 nights",
                "💰Nightly Host Rate for 3 nights",
                "💰Nightly Host Rate for 5 nights",
                "Days Available (List of Days)",
                " First Available",
                "Features - Amenities In-Unit",
                "Features - Safety",
                "Features - House Rules",
                "Features - Type of Space",
                "Features - Parking type",
                "Cancellation Policy"
            `)
            .eq('_id', listingId)
            .single();

        if (listingError) throw listingError;

        // Fetch neighborhood data if Location - Hood is set
        let neighborhood = null;
        if (listing['Location - Hood']) {
            const { data: hoodData, error: hoodError } = await supabase
                .from('zat_geo_hood_mediumlevel')
                .select('Display')
                .eq('_id', listing['Location - Hood'])
                .single();

            if (!hoodError && hoodData) {
                neighborhood = hoodData.Display;
            }
        }

        // Fetch borough data if Location - Borough is set
        let borough = null;
        if (listing['Location - Borough']) {
            const { data: boroughData, error: boroughError } = await supabase
                .from('zat_geo_borough_toplevel')
                .select('"Display Borough"')
                .eq('_id', listing['Location - Borough'])
                .single();

            if (!boroughError && boroughData) {
                borough = boroughData['Display Borough'];
            }
        }

        // Fetch type of space data if Features - Type of Space is set
        let typeOfSpace = null;
        if (listing['Features - Type of Space']) {
            const { data: typeData, error: typeError } = await supabase
                .from('zat_features_listingtype')
                .select('"Label "')
                .eq('_id', listing['Features - Type of Space'])
                .single();

            if (!typeError && typeData) {
                typeOfSpace = typeData['Label '];
            }
        }

        // Add resolved location and type data to listing
        listing.resolvedNeighborhood = neighborhood;
        listing.resolvedBorough = borough;
        listing.resolvedTypeOfSpace = typeOfSpace;

        // Query listing photos
        const { data: photos, error: photosError } = await supabase
            .from('listing_photo')
            .select('*')
            .eq('Listing', listingId)
            .eq('Active', true)
            .order('SortOrder', { ascending: true, nullsLast: true });

        if (photosError) throw photosError;

        return { listing, photos };
    } catch (error) {
        console.error('Error fetching listing data:', error);
        throw error;
    }
}

// Update the page with listing data
function updatePageContent(listing, photos) {
    // Update title and meta
    document.title = `${listing.Name} | Split Lease`;

    // Update property title
    const titleElement = document.querySelector('.property-title');
    if (titleElement) {
        titleElement.textContent = listing.Name;
    }

    // Update location with resolved neighborhood and borough
    const locationText = document.querySelector('.location-text');
    if (locationText && listing.resolvedNeighborhood && listing.resolvedBorough) {
        locationText.textContent = `${listing.resolvedNeighborhood}, ${listing.resolvedBorough}`;
    }

    // Update capacity
    const capacityElement = document.querySelector('.property-capacity');
    if (capacityElement && listing.resolvedTypeOfSpace && listing['Features - Qty Guests']) {
        capacityElement.textContent = `${listing.resolvedTypeOfSpace} - ${listing['Features - Qty Guests']} guests max`;
    }

    // Update feature icons
    updateFeatureIcons(listing);

    // Update description
    const descriptionText = document.querySelector('.description-text');
    if (descriptionText && listing.Description) {
        // Show truncated description initially
        const shortDesc = listing.Description.substring(0, 150) + '...';
        descriptionText.textContent = shortDesc;
        descriptionText.dataset.fullDescription = listing.Description;
    }

    // Update commute section (parking)
    updateCommuteSection(listing);

    // Update amenities
    updateAmenities(listing);

    // Update safety features
    updateSafetyFeatures(listing);

    // Update house rules
    updateHouseRules(listing);

    // Update host name
    const hostName = document.querySelector('.host-info h3');
    if (hostName && listing['host name']) {
        hostName.textContent = listing['host name'];
    }

    // Update price
    const priceElement = document.querySelector('.price');
    if (priceElement) {
        const price = listing['💰Nightly Host Rate for 4 nights'];
        if (price) {
            priceElement.textContent = formatPrice(price);
        }
    }

    // Update photos
    updatePhotos(photos);

    // Update map with coordinates
    updateMap(listing['Location - Address']);

    // Update available days
    updateAvailableDays(listing['Days Available (List of Days)']);
}

// Update feature icons section
function updateFeatureIcons(listing) {
    const featureIconsContainer = document.querySelector('.feature-icons');
    if (!featureIconsContainer) return;

    const features = [];

    if (listing['Kitchen Type']) {
        features.push({ icon: 'chef-hat', text: listing['Kitchen Type'] });
    }

    if (listing['Features - Qty Bathrooms']) {
        const bathroomCount = listing['Features - Qty Bathrooms'];
        const bathroomText = bathroomCount === 1 ? 'Bathroom' : 'Bathrooms';
        features.push({ icon: 'bath', text: `${bathroomCount} ${bathroomText}` });
    }

    // Use resolved type of space from database
    if (listing.resolvedTypeOfSpace) {
        features.push({ icon: 'home', text: listing.resolvedTypeOfSpace });
    }

    if (listing['Features - Qty Beds']) {
        const bedCount = listing['Features - Qty Beds'];
        const bedText = bedCount === 1 ? 'Bed' : 'Beds';
        features.push({ icon: 'bed-double', text: `${bedCount} ${bedText}` });
    }

    featureIconsContainer.innerHTML = features.map(feature => `
        <div class="feature-item">
            <i data-lucide="${feature.icon}" style="width: 30px; height: 30px;"></i>
            <span>${feature.text}</span>
        </div>
    `).join('');

    // Re-initialize Lucide icons for the newly added elements
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Update commute section
function updateCommuteSection(listing) {
    const commuteGrid = document.querySelector('.commute-grid');
    if (!commuteGrid) return;

    const commuteItems = [];

    if (listing['Features - Parking type']) {
        const parking = LOOKUP_CACHE.parking[listing['Features - Parking type']];
        if (parking) {
            commuteItems.push({
                title: parking.label,
                description: 'Convenient parking for your car.'
            });
        }
    }

    // Only display if there are actual commute items from database
    if (commuteItems.length > 0) {
        commuteGrid.innerHTML = commuteItems.map(item => `
            <div class="commute-item">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
        `).join('');
    } else {
        commuteGrid.innerHTML = '';
    }
}

// Update amenities section
function updateAmenities(listing) {
    const amenitiesGrid = document.querySelector('.amenities-grid');
    if (!amenitiesGrid) return;

    const amenities = resolveAmenities(listing['Features - Amenities In-Unit']);

    // Map amenity names to Lucide icon names
    const amenityIconMap = {
        'Air Conditioned': 'wind',
        'Gym': 'dumbbell',
        'Hair Dryer': 'wind',
        'Premium TV': 'tv',
        'WiFi': 'wifi'
    };

    amenitiesGrid.innerHTML = amenities.map(amenity => {
        const iconName = amenityIconMap[amenity.name];
        return iconName ? `
            <div class="amenity-item">
                <i data-lucide="${iconName}" style="width: 27px; height: 27px;"></i>
                <span>${amenity.name}</span>
            </div>
        ` : '';
    }).filter(html => html).join('');

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Update safety features
function updateSafetyFeatures(listing) {
    const safetyGrid = document.querySelector('.safety-grid');
    if (!safetyGrid) return;

    const safetyFeatures = resolveSafety(listing['Features - Safety']);

    // Map safety feature names to Lucide icon names
    const safetyIconMap = {
        'Carbon Monoxide Detector': 'shield-alert',
        'Fire Extinguisher': 'flame',
        'Smoke Detector': 'shield-check'
    };

    safetyGrid.innerHTML = safetyFeatures.map(feature => {
        const iconName = safetyIconMap[feature.name];
        return iconName ? `
            <div class="amenity-item">
                <i data-lucide="${iconName}" style="width: 27px; height: 27px;"></i>
                <span>${feature.name}</span>
            </div>
        ` : '';
    }).filter(html => html).join('');

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Update house rules
function updateHouseRules(listing) {
    const rulesSection = document.querySelector('.house-rules-section');
    if (!rulesSection) return;

    const houseRules = resolveHouseRules(listing['Features - House Rules']);

    // Find or create the rules container
    let rulesContainer = rulesSection.querySelector('.rules-container');
    if (!rulesContainer) {
        rulesContainer = document.createElement('div');
        rulesContainer.className = 'rules-container';
        rulesSection.appendChild(rulesContainer);
    }

    rulesContainer.innerHTML = houseRules.map(rule => `
        <div class="rule-item">
            <span>${rule.name}</span>
        </div>
    `).join('');
}

// Update photos
function updatePhotos(photos) {
    if (!photos || photos.length === 0) return;

    // Sort photos: main photo first, then by SortOrder, then by ID
    const sortedPhotos = photos.sort((a, b) => {
        if (a.toggleMainPhoto) return -1;
        if (b.toggleMainPhoto) return 1;
        if (a.SortOrder !== null && b.SortOrder === null) return -1;
        if (a.SortOrder === null && b.SortOrder !== null) return 1;
        if (a.SortOrder !== null && b.SortOrder !== null) {
            return a.SortOrder - b.SortOrder;
        }
        return a._id.localeCompare(b._id);
    });

    // Update main image
    const mainImage = document.querySelector('.main-image img');
    if (mainImage && sortedPhotos[0]) {
        mainImage.src = sortedPhotos[0].Photo;
        mainImage.alt = 'Property main image';
    }

    // Update thumbnail grid
    const thumbnailGrid = document.querySelector('.thumbnail-grid');
    if (thumbnailGrid && sortedPhotos.length > 1) {
        const thumbnails = sortedPhotos.slice(1, 4); // Get up to 3 thumbnails
        const thumbnailHTML = thumbnails.map((photo, index) => {
            const thumbnail = photo['Photo (thumbnail)'] || photo.Photo;
            if (index === 2 && sortedPhotos.length > 4) {
                // Last thumbnail with overlay
                return `
                    <div class="more-images">
                        <img src="${thumbnail}" alt="Property thumbnail ${index + 2}">
                        <div class="overlay">+${sortedPhotos.length - 4}</div>
                    </div>
                `;
            }
            return `<img src="${thumbnail}" alt="Property thumbnail ${index + 2}">`;
        }).join('');

        thumbnailGrid.innerHTML = thumbnailHTML;
    }
}

// Update map
function updateMap(locationAddress) {
    if (!locationAddress || !locationAddress.lat || !locationAddress.lng) return;

    const mapIframe = document.querySelector('.map-container iframe');
    if (mapIframe) {
        const embedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${locationAddress.lat},${locationAddress.lng}`;
        // Note: For production, you'll need a Google Maps API key
        // For now, keep the existing static map
        console.log('Map coordinates:', locationAddress.lat, locationAddress.lng);
    }
}

// Update available days
function updateAvailableDays(availableDays) {
    if (!availableDays || !Array.isArray(availableDays)) return;

    const dayButtons = document.querySelectorAll('.day-btn');
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayButtons.forEach((button, index) => {
        const dayName = dayMap[index];
        if (availableDays.includes(dayName)) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
}

// Show loading state
function showLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.opacity = '0.5';
        mainContent.style.pointerEvents = 'none';
    }
}

// Hide loading state
function hideLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'auto';
    }
}

// Show error message
function showError(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem;">
                <h2>Error Loading Listing</h2>
                <p>${message}</p>
                <a href="https://app.split.lease/search" style="display: inline-block; margin-top: 2rem; padding: 1rem 2rem; background: #0066cc; color: white; text-decoration: none; border-radius: 8px;">
                    Browse All Listings
                </a>
            </div>
        `;
    }
}

// Initialize the page
async function initializePage() {
    try {
        // Wait for Supabase library to load
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }

        // Initialize Supabase client
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        showLoading();

        // Get listing ID from URL
        const listingId = getListingIdFromUrl();

        if (!listingId) {
            throw new Error('No listing ID found in URL. Please provide a valid listing URL.');
        }

        console.log('Loading listing:', listingId);

        // Fetch data
        const { listing, photos } = await fetchListingData(listingId);

        // Update page
        updatePageContent(listing, photos);

        hideLoading();

        console.log('Page loaded successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        hideLoading();
        showError(error.message);
    }
}

// Initialize when DOM and Supabase library are ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
