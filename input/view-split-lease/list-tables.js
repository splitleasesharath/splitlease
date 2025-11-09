// List all available tables in Supabase
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const commonTableNames = [
    'listing', 'listing_photo',
    'hood', 'hoods', 'neighborhood', 'neighborhoods',
    'borough', 'boroughs',
    'location', 'locations',
    'location_hood', 'location_borough'
];

async function checkTables() {
    console.log('Checking for available tables...\n');

    for (const tableName of commonTableNames) {
        const url = `${SUPABASE_URL}/rest/v1/${tableName}?limit=1`;

        try {
            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${tableName} - Found (${data.length} records in first fetch)`);
                if (data.length > 0) {
                    console.log(`   Sample fields: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
                }
            } else {
                const error = await response.json();
                if (error.code === 'PGRST204' || error.message?.includes('not find')) {
                    // Table doesn't exist - skip silently
                } else {
                    console.log(`❌ ${tableName} - Error: ${error.message}`);
                }
            }
        } catch (err) {
            console.log(`❌ ${tableName} - ${err.message}`);
        }
    }
}

checkTables();
