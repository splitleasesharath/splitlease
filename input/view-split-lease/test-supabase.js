// Test Supabase connection and query listings
const SUPABASE_URL = 'https://qcfifybkaddcoimjroca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8';

const listingIds = [
    '1701196985127x160157906679627780',
    '1586447992720x748691103167545300'
];

async function testSupabase() {
    try {
        // Import supabase using fetch
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        console.log('Testing Supabase connection...\n');

        for (const listingId of listingIds) {
            console.log(`\n========================================`);
            console.log(`Testing listing ID: ${listingId}`);
            console.log(`========================================\n`);

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
                    "neighborhood (manual input by user)",
                    "host name"
                `)
                .eq('_id', listingId)
                .single();

            if (listingError) {
                console.error(`❌ Error fetching listing: ${listingError.message}`);
                console.error(`   Code: ${listingError.code}`);
                console.error(`   Details: ${listingError.details}`);
            } else if (listing) {
                console.log(`✅ Listing found!`);
                console.log(`   Name: ${listing.Name}`);
                console.log(`   Bedrooms: ${listing['Features - Qty Bedrooms']}`);
                console.log(`   Bathrooms: ${listing['Features - Qty Bathrooms']}`);
                console.log(`   Host: ${listing['host name']}`);
                console.log(`   Neighborhood: ${listing['neighborhood (manual input by user)']}`);
            } else {
                console.log(`⚠️  No listing found with this ID`);
            }

            // Query listing photos
            const { data: photos, error: photosError } = await supabase
                .from('listing_photo')
                .select('*')
                .eq('Listing', listingId)
                .eq('Active', true)
                .order('SortOrder', { ascending: true, nullsLast: true });

            if (photosError) {
                console.error(`❌ Error fetching photos: ${photosError.message}`);
            } else {
                console.log(`   Photos: ${photos ? photos.length : 0} found`);
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
