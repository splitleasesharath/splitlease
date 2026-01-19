import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("===== SEARCHING FOR LEO DICAPRIO IN PROPOSALS =====\n");

// Query proposals where "Guest email" contains Leo or DiCaprio
// Trying different approaches since we don't have a dedicated guest_name field
const { data: proposals, error: proposalsError } = await supabase
  .from("proposal")
  .select("*")
  .or('"Guest email".ilike.%Leo%,"Guest email".ilike.%DiCaprio%,"about_yourself".ilike.%Leo%,"about_yourself".ilike.%DiCaprio%,"need for space".ilike.%Leo%,"need for space".ilike.%DiCaprio%')
  .limit(20);

if (proposalsError) {
  console.error("Error querying proposals:", proposalsError);
} else {
  console.log(`Found ${proposals.length} proposal(s):\n`);
  if (proposals.length > 0) {
    proposals.forEach((proposal: any, i: number) => {
      console.log(`\nProposal ${i + 1}:`);
      console.log(`  ID: ${proposal._id}`);
      console.log(`  Guest Email: ${proposal["Guest email"]}`);
      console.log(`  Guest ID: ${proposal.Guest}`);
      console.log(`  Listing: ${proposal.Listing}`);
      console.log(`  Status: ${proposal.Status}`);
      console.log(`  Move in range: ${proposal["Move in range start"]} to ${proposal["Move in range end"]}`);
      console.log(`  Days Selected: ${JSON.stringify(proposal["Days Selected"])}`);
      console.log(`  About: ${proposal.about_yourself}`);
      console.log(`  Need for space: ${proposal["need for space"]}`);
    });
  }
}

console.log("\n\n===== SEARCHING FOR LEO DICAPRIO IN USERS =====\n");

// Query users table where "Name - Full" or "Name - First" or "Name - Last" contains Leo or DiCaprio
const { data: users, error: usersError } = await supabase
  .from("user")
  .select("*")
  .or('"Name - Full".ilike.%Leo%,"Name - Full".ilike.%DiCaprio%,"Name - First".ilike.%Leo%,"Name - First".ilike.%DiCaprio%,"Name - Last".ilike.%Leo%,"Name - Last".ilike.%DiCaprio%')
  .limit(20);

if (usersError) {
  console.error("Error querying users:", usersError);
} else {
  console.log(`Found ${users.length} user(s):\n`);
  if (users.length > 0) {
    users.forEach((user: any, i: number) => {
      console.log(`\nUser ${i + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Full Name: ${user["Name - Full"]}`);
      console.log(`  First Name: ${user["Name - First"]}`);
      console.log(`  Last Name: ${user["Name - Last"]}`);
      console.log(`  Email: ${user["email as text"]}`);
      console.log(`  User Type: ${user["Type - User Current"]}`);
      console.log(`  Created: ${user["Created Date"]}`);
    });
  }
}

// Try broader search in proposals
console.log("\n\n===== TRYING BROADER SEARCH IN ALL PROPOSALS =====\n");
const { data: allProposals, error: allProposalsError } = await supabase
  .from("proposal")
  .select("_id, Guest, \"Guest email\", Listing, Status, about_yourself, \"need for space\"")
  .limit(10);

if (allProposalsError) {
  console.error("Error querying all proposals:", allProposalsError);
} else {
  console.log(`Showing first ${allProposals.length} proposals:\n`);
  allProposals.forEach((p: any, i: number) => {
    console.log(`${i + 1}. ID: ${p._id}, Email: ${p["Guest email"]}`);
  });
}

console.log("\n\n===== SUMMARY =====");
console.log(`Total Proposals Found: ${proposals?.length || 0}`);
console.log(`Total Users Found: ${users?.length || 0}`);

if (proposals && proposals.length > 0) {
  console.log("\nProposal IDs:");
  proposals.forEach((p: any) => console.log(`  - ${p._id}`));
}

if (users && users.length > 0) {
  console.log("\nUser IDs:");
  users.forEach((u: any) => console.log(`  - ${u._id} (${u["Name - Full"]})`));
}
