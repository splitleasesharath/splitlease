/**
 * SearchPageTest - Ultra-simple test page to verify Supabase connection
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function SearchPageTest() {
  const [status, setStatus] = useState('Loading...');
  const [count, setCount] = useState(0);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function test() {
      try {
        setStatus('Connecting to Supabase...');
        console.log('🧪 TEST: Starting Supabase query...');

        // SIMPLEST query - just get Active=true
        const { data, error: queryError } = await supabase
          .from('listing')
          .select('_id, Name, "Location - Borough", Active, Complete, isForUsability, "Standarized Minimum Nightly Price (Filter)"')
          .eq('Active', true)
          .limit(100);

        if (queryError) {
          console.error('❌ Query error:', queryError);
          throw queryError;
        }

        console.log('✅ Got data:', data);
        setStatus('Success!');
        setCount(data.length);
        setListings(data);

      } catch (err) {
        console.error('❌ Error:', err);
        setError(err.message);
        setStatus('Error!');
      }
    }

    test();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#5B21B6' }}>🧪 Search Test Page</h1>

      <div style={{
        background: '#f0f0f0',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Total Active Listings:</strong> {count}</p>
        {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
      </div>

      {listings.length > 0 && (
        <div>
          <h2>Listings (showing first 20)</h2>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white'
          }}>
            <thead>
              <tr style={{ background: '#5B21B6', color: 'white' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>#</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Price</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Active</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Complete</th>
              </tr>
            </thead>
            <tbody>
              {listings.slice(0, 20).map((listing, i) => (
                <tr key={listing._id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{i + 1}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{listing.Name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    ${listing['Standarized Minimum Nightly Price (Filter)'] || 'N/A'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {listing.Active ? '✅' : '❌'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {listing.Complete === true ? '✅' : listing.Complete === false ? '❌' : '⚪'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#e7f3ff', borderRadius: '8px' }}>
        <h3>ℹ️ Instructions</h3>
        <ol>
          <li>Open browser DevTools (F12)</li>
          <li>Check the Console tab for detailed logs</li>
          <li>Look for the "Total Active Listings" count above</li>
          <li>If you see an error, share the full error message</li>
        </ol>
      </div>
    </div>
  );
}
