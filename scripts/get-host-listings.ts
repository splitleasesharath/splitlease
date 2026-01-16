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
  console.log(`  Title: ${listing["Title"]}`);
  console.log(`  Address: ${listing["Location - Address"]}`);
  console.log(`  Borough: ${listing["Location - Borough"]}`);
  console.log(`  Neighborhood: ${listing["Location - Neighborhood"]}`);
  console.log(`  Thumbnail: ${listing["Thumbnail"]}`);
  console.log(`  Photos: ${listing["Photos"]?.slice(0, 3).join(", ") || "None"}`);
  console.log(`  Days Available: ${JSON.stringify(listing["Days Available"])}`);
  console.log(`  Nightly Prices:`);
  console.log(`    1 night: $${listing["Nightly - $ - 1n"] || 0}`);
  console.log(`    2 nights: $${listing["Nightly - $ - 2n"] || 0}`);
  console.log(`    3 nights: $${listing["Nightly - $ - 3n"] || 0}`);
  console.log(`    4 nights: $${listing["Nightly - $ - 4n"] || 0}`);
  console.log(`    5 nights: $${listing["Nightly - $ - 5n"] || 0}`);
  console.log(`    6 nights: $${listing["Nightly - $ - 6n"] || 0}`);
  console.log(`    7 nights: $${listing["Nightly - $ - 7n"] || 0}`);
  console.log(`  Bedrooms: ${listing["Bedrooms"]}`);
  console.log(`  Bathrooms: ${listing["Bathrooms"]}`);
  console.log(`  Property Type: ${listing["Property Type"]}`);
  console.log(`  Status: ${listing["Status"]}`);
}

console.log("\n\n===== ALL LISTINGS BY THIS HOST =====\n");

// Get all listings by this host
const { data: hostListings, error: hostListingsError } = await supabase
  .from("listing")
  .select("_id, Title, Location - Address, Location - Borough, Location - Neighborhood, Thumbnail, Status, Bedrooms, Bathrooms")
  .eq("Host User", hostUserId);

if (hostListingsError) {
  console.error("Error fetching host listings:", hostListingsError);
} else {
  console.log(`Found ${hostListings?.length || 0} listing(s) for this host:\n`);

  if (hostListings && hostListings.length > 0) {
    hostListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing["Title"] || "Untitled"}`);
      console.log(`   ID: ${listing._id}`);
      console.log(`   Address: ${listing["Location - Address"]}`);
      console.log(`   Borough: ${listing["Location - Borough"]}`);
      console.log(`   Neighborhood: ${listing["Location - Neighborhood"]}`);
      console.log(`   Status: ${listing["Status"]}`);
      console.log(`   Bedrooms: ${listing["Bedrooms"]}, Bathrooms: ${listing["Bathrooms"]}`);
      console.log(`   Thumbnail: ${listing["Thumbnail"]}`);
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
}
