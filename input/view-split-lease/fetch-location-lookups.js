// Fetch location lookup data from Supabase
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const hoodIds = [
    '1686665230152x612341317545480300', // From Julia's listing
    '1686665230141x755924307821723600'  // From Robert's listing
];

const boroughId = '1607041299687x679479834266385900'; // Both listings have this

async function fetchLookups() {
    try {
        console.log('Fetching location lookup data...\n');

        // Try to fetch hood data
        console.log('Checking for "hood" table...');
        const hoodUrl = `${SUPABASE_URL}/rest/v1/hood?_id=in.(${hoodIds.map(id => `"${id}"`).join(',')})&select=*`;
        const hoodResponse = await fetch(hoodUrl, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (hoodResponse.ok) {
            const hoods = await hoodResponse.json();
            console.log('✅ Hood table found!');
            console.log(JSON.stringify(hoods, null, 2));
        } else {
            const error = await hoodResponse.json();
            console.log('❌ Hood table error:', error.message);
        }

        // Try to fetch borough data
        console.log('\nChecking for "borough" table...');
        const boroughUrl = `${SUPABASE_URL}/rest/v1/borough?_id=eq.${boroughId}&select=*`;
        const boroughResponse = await fetch(boroughUrl, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (boroughResponse.ok) {
            const boroughs = await boroughResponse.json();
            console.log('✅ Borough table found!');
            console.log(JSON.stringify(boroughs, null, 2));
        } else {
            const error = await boroughResponse.json();
            console.log('❌ Borough table error:', error.message);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchLookups();
