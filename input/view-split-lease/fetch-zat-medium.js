// Fetch data from location lookup tables
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

// IDs from the listings
const hoodIds = [
    '1686665230152x612341317545480300', // From Julia's listing
    '1686665230141x755924307821723600'  // From Robert's listing
];

const boroughId = '1607041299687x679479834266385900'; // Both listings

async function tryTableName(baseName, ids, idField = '_id') {
    const variations = [baseName, baseName.replace(/ /g, '_'), baseName.replace(/ /g, '-'), baseName.replace(/ /g, '')];

    for (const tableName of variations) {
        try {
            const filter = Array.isArray(ids)
                ? `${idField}=in.(${ids.map(id => `"${id}"`).join(',')})`
                : `${idField}=eq.${ids}`;

            const url = `${SUPABASE_URL}/rest/v1/${tableName}?${filter}&select=*`;

            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { tableName, data };
            }
        } catch (err) {
            // Continue to next variation
        }
    }

    return null;
}

async function fetchLocationData() {
    try {
        console.log('Searching for location lookup tables...\n');

        // Try medium level (likely for neighborhoods/hoods)
        console.log('=== Trying MEDIUM LEVEL variations ===');
        const mediumResult = await tryTableName('medium level', hoodIds);

        if (mediumResult) {
            console.log(`✅ Found table: "${mediumResult.tableName}"`);
            console.log(`   Records found: ${mediumResult.data.length}`);
            mediumResult.data.forEach(record => {
                console.log(`\n   ID: ${record._id}`);
                const nameFields = Object.keys(record).filter(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('display'));
                nameFields.forEach(field => {
                    console.log(`   ${field}: ${record[field]}`);
                });
            });
        } else {
            console.log('❌ Medium level table not found with any variation');
        }

        // Try zat top level (likely for boroughs)
        console.log('\n=== Trying ZAT TOP LEVEL variations ===');
        const topResult = await tryTableName('zat top level', boroughId);

        if (topResult) {
            console.log(`✅ Found table: "${topResult.tableName}"`);
            console.log(`   Records found: ${topResult.data.length}`);
            topResult.data.forEach(record => {
                console.log(`\n   ID: ${record._id}`);
                const nameFields = Object.keys(record).filter(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('display') || k.toLowerCase().includes('borough'));
                nameFields.forEach(field => {
                    console.log(`   ${field}: ${record[field]}`);
                });
            });
        } else {
            console.log('❌ Zat top level table not found with any variation');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchLocationData();
