import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

// Get Leo Di Caprio user details
const leoUserId = "1697550315775x613621430341750000";
const leoProposalId = "1766003595869x69815320637958696";

console.log("===== LEO DI CAPRIO USER DETAILS =====\n");

const { data: user, error: userError } = await supabase
  .from("user")
  .select("*")
  .eq("_id", leoUserId)
  .single();

if (userError) {
  console.error("Error fetching user:", userError);
} else {
  console.log(JSON.stringify(user, null, 2));
}

console.log("\n\n===== LEO DI CAPRIO PROPOSAL DETAILS =====\n");

const { data: proposal, error: proposalError } = await supabase
  .from("proposal")
  .select("*")
  .eq("_id", leoProposalId)
  .single();

if (proposalError) {
  console.error("Error fetching proposal:", proposalError);
} else {
  console.log(JSON.stringify(proposal, null, 2));
}

// Get the listing associated with this proposal
if (proposal && proposal.Listing) {
  console.log("\n\n===== ASSOCIATED LISTING DETAILS =====\n");

  const { data: listing, error: listingError } = await supabase
    .from("listing")
    .select("*")
    .eq("_id", proposal.Listing)
    .single();

  if (listingError) {
    console.error("Error fetching listing:", listingError);
  } else {
    console.log(`Listing ID: ${listing._id}`);
    console.log(`Address: ${listing["Location - Address"]}`);
    console.log(`Borough: ${listing["Location - Borough"]}`);
    console.log(`Price - 1 night: ${listing["Nightly - $ - 1n"]}`);
    console.log(`Price - 2 nights: ${listing["Nightly - $ - 2n"]}`);
    console.log(`Price - 3 nights: ${listing["Nightly - $ - 3n"]}`);
    console.log(`Price - 4 nights: ${listing["Nightly - $ - 4n"]}`);
    console.log(`Price - 5 nights: ${listing["Nightly - $ - 5n"]}`);
    console.log(`Price - 6 nights: ${listing["Nightly - $ - 6n"]}`);
    console.log(`Price - 7 nights: ${listing["Nightly - $ - 7n"]}`);
    console.log(`Days Available: ${JSON.stringify(listing["Days Available"])}`);
  }
}

console.log("\n\n===== DEMO MODE DATA SUMMARY =====");
console.log(`\nUser for Demo Mode:`);
console.log(`  User ID: ${leoUserId}`);
console.log(`  Name: Leo Di Caprio`);
console.log(`  Email: splitleasefrederick@gmail.com`);
console.log(`  User Type: Guest`);

console.log(`\nProposal for Demo Mode:`);
console.log(`  Proposal ID: ${leoProposalId}`);
console.log(`  Guest: ${proposal?.Guest}`);
console.log(`  Listing: ${proposal?.Listing}`);
console.log(`  Status: ${proposal?.Status}`);
console.log(`  Days Selected: ${JSON.stringify(proposal?.["Days Selected"])}`);
console.log(`  Move In Range: ${proposal?.["Move in range start"]} to ${proposal?.["Move in range end"]}`);
