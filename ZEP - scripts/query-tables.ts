import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("===== LISTING PROPOSAL TABLE COLUMNS =====\n");

// Get one row to see column structure
const { data: sampleProposal, error: proposalError } = await supabase
  .from("proposal")
  .select("*")
  .limit(1);

if (proposalError) {
  console.error("Error querying proposal:", proposalError);
} else if (sampleProposal && sampleProposal.length > 0) {
  console.log("Proposal columns:");
  Object.keys(sampleProposal[0]).forEach(col => console.log(`  - ${col}`));
  console.log("\nSample proposal:");
  console.log(JSON.stringify(sampleProposal[0], null, 2));
}

console.log("\n\n===== LISTING USER TABLE COLUMNS =====\n");

// Get one row to see column structure
const { data: sampleUser, error: userError } = await supabase
  .from("user")
  .select("*")
  .limit(1);

if (userError) {
  console.error("Error querying user:", userError);
} else if (sampleUser && sampleUser.length > 0) {
  console.log("User columns:");
  Object.keys(sampleUser[0]).forEach(col => console.log(`  - ${col}`));
  console.log("\nSample user:");
  console.log(JSON.stringify(sampleUser[0], null, 2));
}
