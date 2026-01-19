#!/usr/bin/env -S deno run --allow-net --allow-env
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("===== QUERYING PROPOSALS =====\n");

// Query proposals where guest_name contains Leo or DiCaprio
const { data: proposals, error: proposalsError } = await supabase
  .from("proposal")
  .select("*")
  .or("guest_name.ilike.%Leo%,guest_name.ilike.%DiCaprio%")
  .limit(10);

if (proposalsError) {
  console.error("Error querying proposals:", proposalsError);
} else {
  console.log(`Found ${proposals.length} proposal(s):\n`);
  proposals.forEach((proposal: any, i: number) => {
    console.log(`Proposal ${i + 1}:`);
    console.log(JSON.stringify(proposal, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");
  });
}

console.log("\n===== QUERYING USERS =====\n");

// Query users table where name contains Leo or DiCaprio
const { data: users, error: usersError } = await supabase
  .from("user")
  .select("*")
  .or("name.ilike.%Leo%,name.ilike.%DiCaprio%")
  .limit(10);

if (usersError) {
  console.error("Error querying users:", usersError);
} else {
  console.log(`Found ${users.length} user(s):\n`);
  users.forEach((user: any, i: number) => {
    console.log(`User ${i + 1}:`);
    console.log(JSON.stringify(user, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");
  });
}

console.log("\n===== SUMMARY =====");
console.log(`Total Proposals: ${proposals?.length || 0}`);
console.log(`Total Users: ${users?.length || 0}`);

if (proposals && proposals.length > 0) {
  console.log("\nProposal IDs:");
  proposals.forEach((p: any) => console.log(`  - ${p._id}`));
}

if (users && users.length > 0) {
  console.log("\nUser IDs:");
  users.forEach((u: any) => console.log(`  - ${u._id}`));
}
