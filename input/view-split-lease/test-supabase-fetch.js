// Test Supabase connection using fetch API
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const listingIds = [
    '1701196985127x160157906679627780',
    '1586447992720x748691103167545300'
];

async function testSupabase() {
    try {
        console.log('Testing Supabase REST API...\n');

        for (const listingId of listingIds) {
            console.log(`\n========================================`);
            console.log(`Testing listing ID: ${listingId}`);
            console.log(`========================================\n`);

            // Test listing query - get all fields to see what's available
            const listingUrl = `${SUPABASE_URL}/rest/v1/listing?_id=eq.${listingId}&select=*`;

            console.log('Querying listing...');
            const listingResponse = await fetch(listingUrl, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });

            const listingData = await listingResponse.json();

            if (!listingResponse.ok) {
                console.error(`❌ HTTP Error: ${listingResponse.status}`);
                console.error(`   Response:`, listingData);
            } else if (listingData.length === 0) {
                console.log(`⚠️  No listing found with this ID`);
                console.log(`   Response: Empty array`);
            } else {
                const listing = listingData[0];
                console.log(`✅ Listing found!`);
                console.log(`   Name: ${listing.Name}`);

                // Look for all fields with "Display" in the name
                const displayFields = Object.keys(listing).filter(key =>
                    key.toLowerCase().includes('display')
                );

                console.log(`\n   Fields with "Display":`);
                displayFields.forEach(field => {
                    const value = listing[field];
                    const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
                    console.log(`     - "${field}": ${displayValue}`);
                });
            }

            // Test photos query
            const photosUrl = `${SUPABASE_URL}/rest/v1/listing_photo?Listing=eq.${listingId}&Active=eq.true&select=*&order=SortOrder.asc.nullslast`;

            console.log('\nQuerying photos...');
            const photosResponse = await fetch(photosUrl, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const photosData = await photosResponse.json();

            if (!photosResponse.ok) {
                console.error(`❌ HTTP Error: ${photosResponse.status}`);
                console.error(`   Response:`, photosData);
            } else {
                console.log(`   Photos: ${photosData.length} found`);
            }
        }

        console.log('\n========================================');
        console.log('Test complete!');
        console.log('========================================\n');

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSupabase();
