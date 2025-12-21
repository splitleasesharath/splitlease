// Temporary script to query os_cohost_admins table
import { createClient } from '@supabase/supabase-js';

// Use command line arguments for credentials
const supabaseUrl = process.argv[2];
const supabaseAnonKey = process.argv[3];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Usage: node query-os-cohost-admins.js <SUPABASE_URL> <SUPABASE_ANON_KEY>');
  console.error('\nPlease provide Supabase URL and Anon Key as command line arguments.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryOsCohostAdmins() {
  try {
    console.log('Querying os_cohost_admins table...\n');

    const { data, error } = await supabase
      .from('os_cohost_admins')
      .select('*')
      .limit(10);

    if (error) {
      console.error('Error querying database:', error);
      return;
    }

    console.log('Results from os_cohost_admins:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nTotal rows returned: ${data?.length || 0}`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

queryOsCohostAdmins();
