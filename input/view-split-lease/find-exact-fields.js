// Find exact field names for hood and borough from Supabase
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const listingIds = [
    '1701196985127x160157906679627780',
    '1586447992720x748691103167545300'
];

async function findFields() {
    console.log('Fetching full listing data to find exact field names...\n');

    for (const listingId of listingIds) {
        const url = `${SUPABASE_URL}/rest/v1/listing?_id=eq.${listingId}&select=*`;

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                const listing = data[0];

                console.log(`\n========== Listing: ${listing.Name} ==========`);

                // Find all fields containing hood, borough, neighborhood, or location
                const relevantFields = Object.keys(listing).filter(key =>
                    key.toLowerCase().includes('hood') ||
                    key.toLowerCase().includes('borough') ||
                    key.toLowerCase().includes('neighborhood') ||
                    key.toLowerCase().includes('location') ||
                    key.toLowerCase().includes('display')
                );

                console.log('\nLocation/Hood/Borough Related Fields:');
                console.log('=====================================');

                relevantFields.forEach(field => {
                    const value = listing[field];
                    let displayValue;

                    if (value === null || value === undefined) {
                        displayValue = 'null';
                    } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value);
                    } else {
                        displayValue = value;
                    }

                    console.log(`\nField: "${field}"`);
                    console.log(`Value: ${displayValue}`);
                    console.log(`Type: ${typeof value}`);
                });
            }
        }
    }
}

findFields();
