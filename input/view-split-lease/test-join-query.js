// Test if Location - Hood and Location - Borough can be expanded with joins
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const listingId = '1701196985127x160157906679627780';

async function testJoinQuery() {
    console.log('Testing join queries for Location - Hood and Location - Borough...\n');

    // Test if we can use the IDs to query back to the listing table
    // First, get the listing to see what IDs it has
    const listingUrl = `${SUPABASE_URL}/rest/v1/listing?_id=eq.${listingId}&select=_id,Name,Location - Hood,Location - Borough`;

    const response = await fetch(listingUrl, {
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
            console.log('Listing data:');
            console.log(`  Name: ${listing.Name}`);
            console.log(`  Location - Hood ID: ${listing['Location - Hood']}`);
            console.log(`  Location - Borough ID: ${listing['Location - Borough']}`);

            // These IDs might reference other listings that act as lookup tables
            // Try to query listings with these IDs
            console.log('\nAttempting to find hood and borough data...');

            const hoodId = listing['Location - Hood'];
            if (hoodId) {
                const hoodUrl = `${SUPABASE_URL}/rest/v1/listing?_id=eq.${hoodId}&select=Name`;
                const hoodResponse = await fetch(hoodUrl, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (hoodResponse.ok) {
                    const hoodData = await hoodResponse.json();
                    if (hoodData.length > 0) {
                        console.log(`  Hood Name: ${hoodData[0].Name}`);
                    } else {
                        console.log('  Hood: Not found as a listing');
                    }
                }
            }

            const boroughId = listing['Location - Borough'];
            if (boroughId) {
                const boroughUrl = `${SUPABASE_URL}/rest/v1/listing?_id=eq.${boroughId}&select=Name`;
                const boroughResponse = await fetch(boroughUrl, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (boroughResponse.ok) {
                    const boroughData = await boroughResponse.json();
                    if (boroughData.length > 0) {
                        console.log(`  Borough Name: ${boroughData[0].Name}`);
                    } else {
                        console.log('  Borough: Not found as a listing');
                    }
                }
            }
        }
    } else {
        const error = await response.json();
        console.error('Error:', error);
    }
}

testJoinQuery();
