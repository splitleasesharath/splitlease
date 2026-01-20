import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qzsmhgyojmwvtjmnrdea.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c21oZ3lvam13dnRqbW5yZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTE2NDksImV4cCI6MjA4MzUyNzY0OX0.cSPOwU1wyiBorIicEGoyDEmoh34G0Hf_39bRXkwvCDc";

const supabase = createClient(supabaseUrl, supabaseKey);

const listingId = "1766003594466x67309961278997728";

const { data: listing, error } = await supabase
  .from("listing")
  .select("*")
  .eq("_id", listingId)
  .single();

if (error) {
  console.error("Error:", error);
} else {
  console.log("All columns in listing:");
  console.log(Object.keys(listing).sort().join("\n"));
}
