// Try to find tables that contain hood and borough display names
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const hoodIds = [
    '1686665230152x612341317545480300', // Greenwich Village
    '1686665230141x755924307821723600'  // Civic Center
];

const boroughId = '1607041299687x679479834266385900';

const possibleTableNames = [
    // Common patterns
    'hood', 'hoods', 'neighborhood', 'neighborhoods',
    'borough', 'boroughs',
    // With prefixes/suffixes
    'location_hood', 'location_hoods', 'hood_location',
    'location_borough', 'location_boroughs', 'borough_location',
    // Zat variations
    'zat_top_level', 'zattoplevel', 'zat-top-level',
    'top_level', 'toplevel', 'top-level',
    'medium_level', 'mediumlevel', 'medium-level',
    // Other patterns
    'area', 'areas', 'region', 'regions',
    'district', 'districts', 'zone', 'zones'
];

async function tryTable(tableName, idToFind) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?_id=eq.${idToFind}&select=*&limit=1`;

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
            if (data.length > 0) {
                return { tableName, data: data[0] };
            }
        }
    } catch (err) {
        // Silently continue
    }

    return null;
}

async function findTables() {
    console.log('Searching for hood/borough tables...\n');

    console.log('=== SEARCHING FOR HOOD TABLE ===');
    for (const tableName of possibleTableNames) {
        const result = await tryTable(tableName, hoodIds[0]);
        if (result) {
            console.log(`\n✅ FOUND: "${result.tableName}"`);
            console.log('Sample record:');
            console.log(JSON.stringify(result.data, null, 2));
            break;
        }
    }

    console.log('\n\n=== SEARCHING FOR BOROUGH TABLE ===');
    for (const tableName of possibleTableNames) {
        const result = await tryTable(tableName, boroughId);
        if (result) {
            console.log(`\n✅ FOUND: "${result.tableName}"`);
            console.log('Sample record:');
            console.log(JSON.stringify(result.data, null, 2));
            break;
        }
    }

    console.log('\n\n=== DONE ===');
}

findTables();
