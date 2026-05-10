const { createClient } = require('@supabase/supabase-js');

// This script pings Supabase to prevent the project from pausing due to inactivity.
// It can be run manually, or scheduled as a cron job or GitHub Action.
//
// SECURITY: Credentials must be provided via environment variables.
// Usage: SUPABASE_URL=https://your-project.supabase.co SUPABASE_ANON_KEY=your-key node scripts/keep-alive.js

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.');
  console.error('Usage: SUPABASE_URL=https://your-project.supabase.co SUPABASE_ANON_KEY=your-key node scripts/keep-alive.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function keepAlive() {
  console.log('--- Supabase Keep-Alive Script ---');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  
  try {
    // Making a simple query to the 'users' table to register activity.
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      console.error('Failed to query Supabase:', error.message);
      process.exit(1);
    }

    console.log('Successfully pinged Supabase Database.');
    console.log(`Status: Active (Records found: ${data.length})`);
    process.exit(0);
  } catch (err) {
    console.error('An unexpected error occurred:', err.message);
    process.exit(1);
  }
}

keepAlive();
