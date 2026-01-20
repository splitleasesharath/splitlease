import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryLeoData() {
  console.log('===== QUERYING PROPOSALS =====\n');

  // Query proposals where guest_name contains Leo or DiCaprio
  const { data: proposals, error: proposalsError } = await supabase
    .from('proposal')
    .select('*')
    .or('guest_name.ilike.%Leo%,guest_name.ilike.%DiCaprio%')
    .limit(10);

  if (proposalsError) {
    console.error('Error querying proposals:', proposalsError);
  } else {
    console.log(`Found ${proposals.length} proposal(s):`);
    proposals.forEach((proposal, i) => {
      console.log(`\nProposal ${i + 1}:`);
      console.log(JSON.stringify(proposal, null, 2));
    });
  }

  console.log('\n\n===== QUERYING USERS =====\n');

  // Query users table where name contains Leo or DiCaprio
  const { data: users, error: usersError } = await supabase
    .from('user')
    .select('*')
    .or('name.ilike.%Leo%,name.ilike.%DiCaprio%')
    .limit(10);

  if (usersError) {
    console.error('Error querying users:', usersError);
  } else {
    console.log(`Found ${users.length} user(s):`);
    users.forEach((user, i) => {
      console.log(`\nUser ${i + 1}:`);
      console.log(JSON.stringify(user, null, 2));
    });
  }

  console.log('\n\n===== QUERYING ACCOUNT_GUEST =====\n');

  // Query account_guest table
  const { data: guests, error: guestsError } = await supabase
    .from('account_guest')
    .select('*')
    .limit(5);

  if (guestsError) {
    console.error('Error querying account_guest:', guestsError);
  } else {
    console.log(`Found ${guests.length} guest account(s):`);
    guests.forEach((guest, i) => {
      console.log(`\nGuest ${i + 1}:`);
      console.log(JSON.stringify(guest, null, 2));
    });
  }
}

queryLeoData();
