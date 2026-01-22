const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qzsmhgyojmwvtjmnrdea.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('='.repeat(80));
  console.log('INVESTIGATING MYSTERIOUS $220.22 PRICE PIN AT NULL ISLAND (0,0)');
  console.log('='.repeat(80));
  console.log('\nDatabase: supabase-dev');
  console.log('Timestamp:', new Date().toISOString());
  console.log('\n');

  try {
    // Query 1: Find listings with price $220.22
    console.log('QUERY 1: Listings with price around $220.22');
    console.log('-'.repeat(80));
    const { data: priceListings, error: priceError } = await supabase
      .from('listing')
      .select('_id, Name, Active, "Standarized Minimum Nightly Price (Filter)", "Location - Coordinates", "Location - Address"')
      .or('"Standarized Minimum Nightly Price (Filter)".eq.220.22,"Standarized Minimum Nightly Price (Filter)".gte.220,"Standarized Minimum Nightly Price (Filter)".lte.221')
      .limit(100);

    if (priceError) {
      console.error('ERROR:', priceError.message);
    } else {
      console.log(`Found ${priceListings.length} listings:\n`);
      priceListings.forEach((listing, idx) => {
        console.log(`${idx + 1}. ${listing.Name || 'N/A'}`);
        console.log(`   _id: ${listing._id}`);
        console.log(`   Active: ${listing.Active}`);
        console.log(`   Price: $${listing['Standarized Minimum Nightly Price (Filter)']}`);
        console.log(`   Coordinates: ${JSON.stringify(listing['Location - Coordinates'])}`);
        console.log(`   Address: ${JSON.stringify(listing['Location - Address'])}`);
        console.log();
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('QUERY 2: Listings with coordinates near (0,0) - Null Island');
    console.log('-'.repeat(80));

    // Query 2: Find listings with coordinates near (0,0)
    const { data: nullIslandListings, error: nullIslandError } = await supabase
      .from('listing')
      .select('_id, Name, Active, "Location - Coordinates", "Standarized Minimum Nightly Price (Filter)", "Location - Address"')
      .not('"Location - Coordinates"', 'is', null)
      .limit(500);

    if (nullIslandError) {
      console.error('ERROR:', nullIslandError.message);
    } else {
      const suspiciousListings = nullIslandListings.filter(listing => {
        const coords = listing['Location - Coordinates'];
        if (!coords || typeof coords !== 'object') return false;
        const lat = parseFloat(coords.lat);
        const lng = parseFloat(coords.lng);
        return lat >= -5 && lat <= 5 && lng >= -5 && lng <= 5;
      });

      console.log(`Found ${suspiciousListings.length} listings with coordinates between -5 and +5:\n`);
      suspiciousListings.forEach((listing, idx) => {
        const coords = listing['Location - Coordinates'];
        console.log(`${idx + 1}. ${listing.Name || 'N/A'}`);
        console.log(`   _id: ${listing._id}`);
        console.log(`   Active: ${listing.Active}`);
        console.log(`   Coordinates: lat=${coords.lat}, lng=${coords.lng}`);
        console.log(`   Price: $${listing['Standarized Minimum Nightly Price (Filter)']}`);
        console.log(`   Address: ${JSON.stringify(listing['Location - Address'])}`);
        console.log();
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('QUERY 3: Active listings with missing location data');
    console.log('-'.repeat(80));

    // Query 3: Find Active listings with missing location data
    const { data: allListings, error: allError } = await supabase
      .from('listing')
      .select('_id, Name, Active, "Location - Coordinates", "Location - Address", "Location - Borough", "Location - Hood", "Standarized Minimum Nightly Price (Filter)"')
      .eq('Active', true)
      .limit(500);

    if (allError) {
      console.error('ERROR:', allError.message);
    } else {
      const missingLocation = allListings.filter(listing =>
        !listing['Location - Coordinates'] || !listing['Location - Address']
      );

      console.log(`Found ${missingLocation.length} active listings with missing location data:\n`);
      missingLocation.forEach((listing, idx) => {
        console.log(`${idx + 1}. ${listing.Name || 'N/A'}`);
        console.log(`   _id: ${listing._id}`);
        console.log(`   Active: ${listing.Active}`);
        console.log(`   Coordinates: ${listing['Location - Coordinates'] ? 'Present' : 'MISSING'}`);
        console.log(`   Address: ${listing['Location - Address'] ? 'Present' : 'MISSING'}`);
        console.log(`   Borough: ${listing['Location - Borough'] || 'N/A'}`);
        console.log(`   Hood: ${listing['Location - Hood'] || 'N/A'}`);
        console.log(`   Price: $${listing['Standarized Minimum Nightly Price (Filter)']}`);
        console.log();
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('INVESTIGATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('FATAL ERROR:', error);
  }
}

runQueries();
