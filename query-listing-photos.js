const https = require('https');

const targetListingId = '1637349440736x622780446630946800';
const supabaseUrl = 'qzsmhgyojmwvtjmnrdea.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc';

// Query the listing_photo table for this listing
const options = {
  hostname: supabaseUrl,
  port: 443,
  path: `/rest/v1/listing_photo?Listing=eq.${encodeURIComponent(targetListingId)}&select=*`,
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  }
};

console.log('Querying listing_photo table for listing:', targetListingId);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const photos = JSON.parse(data);
      console.log('\n=== LISTING PHOTOS ===');
      console.log(`Found ${photos.length} photos\n`);

      if (photos.length === 0) {
        console.log('No photos found in listing_photo table for this listing');
      } else {
        photos.forEach((photo, idx) => {
          console.log(`Photo ${idx + 1}:`);
          console.log(`  ID: ${photo._id}`);
          console.log(`  Listing: ${photo.Listing}`);
          console.log(`  Photo URL: ${photo.Photo}`);
          console.log(`  Created: ${photo.created_at}`);
          console.log();
        });
      }

      // Also check listing table's Features-Photos field
      console.log('\n=== CHECKING LISTING RECORD ===');
      const listingOptions = {
        hostname: supabaseUrl,
        port: 443,
        path: `/rest/v1/listing?_id=eq.${encodeURIComponent(targetListingId)}&select=*`,
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      };

      const req2 = https.request(listingOptions, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          const listings = JSON.parse(data2);
          if (listings.length > 0) {
            const listing = listings[0];
            const photosField = listing['Features - Photos'];
            console.log(`Features - Photos field: ${photosField}`);
            console.log(`Type: ${typeof photosField}`);
            console.log(`Length: ${photosField ? photosField.length : 0}`);
            if (Array.isArray(photosField)) {
              console.log(`Array contents: ${JSON.stringify(photosField)}`);
            }
          }
        });
      });
      req2.end();

    } catch (err) {
      console.error('Parse error:', err);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
