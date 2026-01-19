import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs from Leo DiCaprio mockup proposal
const proposalId = "1766003595869x69815320637958696";
const hostUserId = "1766003593341x91809818309455488";
const listingId = "1766003594466x67309961278997728";

console.log("===== LISTING ASSOCIATED WITH LEO DICAPRIO PROPOSAL =====\n");

// Get the specific listing
const { data: listing, error: listingError } = await supabase
  .from("listing")
  .select("*")
  .eq("_id", listingId)
  .single();

if (listingError) {
  console.error("Error fetching listing:", listingError);
} else {
  console.log("Listing Details:");
  console.log(`  ID: ${listing._id}`);
  console.log(`  Name: ${listing["Name"]}`);
  console.log(`  Address: ${typeof listing["Location - Address"] === 'object' ? JSON.stringify(listing["Location - Address"]) : listing["Location - Address"]}`);
  console.log(`  Borough: ${listing["Location - Borough"]}`);
  console.log(`  Neighborhood: ${listing["Location - Hood"]}`);
  console.log(`  Description: ${listing["Description"]?.substring(0, 200)}...`);
  console.log(`  Thumbnail: ${listing["Features - Photos"]?.[0] || "None"}`);
  console.log(`  Photos (first 3): ${listing["Features - Photos"]?.slice(0, 3).join(", ") || "None"}`);
  console.log(`  Days Available: ${JSON.stringify(listing["Days Available (List of Days)"])}`);
  console.log(`  Nightly Host Rates:`);
  console.log(`    1 night: $${listing["💰Nightly Host Rate for 1 night"] || 0}`);
  console.log(`    2 nights: $${listing["💰Nightly Host Rate for 2 nights"] || 0}`);
  console.log(`    3 nights: $${listing["💰Nightly Host Rate for 3 nights"] || 0}`);
  console.log(`    4 nights: $${listing["💰Nightly Host Rate for 4 nights"] || 0}`);
  console.log(`    5 nights: $${listing["💰Nightly Host Rate for 5 nights"] || 0}`);
  console.log(`    6 nights: $${listing["💰Nightly Host Rate for 6 nights"] || 0}`);
  console.log(`    7 nights: $${listing["💰Nightly Host Rate for 7 nights"] || 0}`);
  console.log(`  Monthly Rate: $${listing["💰Monthly Host Rate"] || 0}`);
  console.log(`  Cleaning Fee: $${listing["💰Cleaning Cost / Maintenance Fee"] || 0}`);
  console.log(`  Damage Deposit: $${listing["💰Damage Deposit"] || 0}`);
  console.log(`  Bedrooms: ${listing["Features - Qty Bedrooms"]}`);
  console.log(`  Bathrooms: ${listing["Features - Qty Bathrooms"]}`);
  console.log(`  Property Type: ${listing["Features - Type of Space"]}`);
  console.log(`  Active: ${listing["Active"]}`);
  console.log(`  Approved: ${listing["Approved"]}`);
}

console.log("\n\n===== ALL LISTINGS BY THIS HOST =====\n");

// Get all listings by this host
const { data: hostListings, error: hostListingsError } = await supabase
  .from("listing")
  .select("_id, Name, \"Location - Address\", \"Location - Borough\", \"Location - Hood\", \"Features - Photos\", Active, Approved, \"Features - Qty Bedrooms\", \"Features - Qty Bathrooms\"")
  .eq("Host User", hostUserId);

if (hostListingsError) {
  console.error("Error fetching host listings:", hostListingsError);
} else {
  console.log(`Found ${hostListings?.length || 0} listing(s) for this host:\n`);

  if (hostListings && hostListings.length > 0) {
    hostListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing["Name"] || "Untitled"}`);
      console.log(`   ID: ${listing._id}`);
      console.log(`   Address: ${typeof listing["Location - Address"] === 'object' ? listing["Location - Address"]?.address : listing["Location - Address"]}`);
      console.log(`   Borough: ${listing["Location - Borough"]}`);
      console.log(`   Neighborhood: ${listing["Location - Hood"]}`);
      console.log(`   Active: ${listing["Active"]}, Approved: ${listing["Approved"]}`);
      console.log(`   Bedrooms: ${listing["Features - Qty Bedrooms"]}, Bathrooms: ${listing["Features - Qty Bathrooms"]}`);
      console.log(`   First Photo: ${listing["Features - Photos"]?.[0] || "None"}`);
      console.log("");
    });
  }
}

console.log("\n===== HOST USER DETAILS =====\n");

// Get host user details
const { data: hostUser, error: hostUserError } = await supabase
  .from("user")
  .select("*")
  .eq("_id", hostUserId)
  .single();

if (hostUserError) {
  console.error("Error fetching host user:", hostUserError);
} else {
  console.log(`Host Name: ${hostUser["Name - Full"]}`);
  console.log(`Email: ${hostUser["email as text"]}`);
  console.log(`User Type: ${hostUser["Type - User Current"]}`);
  console.log(`Profile Photo: ${hostUser["Profile Photo"]}`);
  console.log(`Phone: ${hostUser["Phone Number (as text)"]}`);
}
