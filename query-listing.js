const https = require('https');

const targetId = '1637349440736x622780446630946800';
const supabaseUrl = 'qzsmhgyojmwvtjmnrdea.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc';

// Encode the ID for URL
const encodedId = encodeURIComponent(targetId);

const options = {
  hostname: supabaseUrl,
  port: 443,
  path: `/rest/v1/listing?_id=eq.${encodedId}&select=*`,
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  }
};

console.log('Querying Supabase for listing:', targetId);
console.log('URL:', options.path);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const listing = parsed[0];
        console.log('\n=== LISTING DATA ===');
        console.log(`ID: ${listing._id}`);
        console.log(`Name: ${listing.Name}`);
        console.log(`Active: ${listing.Active}`);
        console.log(`Deleted: ${listing.Deleted}`);
        console.log(`\n=== PHOTOS FIELD ===`);
        console.log(`Features - Photos: ${listing['Features - Photos']}`);
        console.log(`\n=== ALL FIELD KEYS (${Object.keys(listing).length} total) ===`);
        Object.keys(listing).sort().forEach(key => {
          const value = listing[key];
          if (value === null) {
            console.log(`${key}: null`);
          } else if (typeof value === 'string' && value.length > 100) {
            console.log(`${key}: ${value.substring(0, 100)}...`);
          } else if (typeof value === 'object') {
            console.log(`${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`${key}: ${value}`);
          }
        });
      } else {
        console.log('Listing not found');
      }
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
