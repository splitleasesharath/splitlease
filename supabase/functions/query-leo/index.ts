import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query proposals where guest_name contains Leo or DiCaprio
    const { data: proposals, error: proposalsError } = await supabaseClient
      .from("proposal")
      .select("*")
      .or("guest_name.ilike.%Leo%,guest_name.ilike.%DiCaprio%")
      .limit(10);

    if (proposalsError) {
      throw proposalsError;
    }

    // Query users table where name contains Leo or DiCaprio
    const { data: users, error: usersError } = await supabaseClient
      .from("user")
      .select("*")
      .or("name.ilike.%Leo%,name.ilike.%DiCaprio%")
      .limit(10);

    if (usersError) {
      throw usersError;
    }

    // Query account_guest table
    const { data: guests, error: guestsError } = await supabaseClient
      .from("account_guest")
      .select("*")
      .limit(10);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          proposals,
          users,
          guests,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
