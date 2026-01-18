// Add this code AFTER Step 10's catch block (after line 665) in createMockupProposal.ts
// Insert BEFORE "console.log('[createMockupProposal] ========== SUCCESS =========');"

    // ─────────────────────────────────────────────────────────
    // Step 11: Create messaging thread for host notification
    // ─────────────────────────────────────────────────────────
    console.log('[createMockupProposal] Step 11: Creating messaging thread...');

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && serviceRoleKey) {
        const messagesPayload = {
          action: 'create_proposal_thread',
          payload: {
            proposalId: proposalId,
            guestId: guestData._id,
            hostId: resolvedHostUserId,
            listingId: listingId,
            proposalStatus: 'Host Review',
          },
        };

        // Fire and forget - don't await the response
        fetch(`${supabaseUrl}/functions/v1/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagesPayload),
        }).then((response) => {
          if (response.ok) {
            console.log('[createMockupProposal] Messaging thread creation triggered');
          } else {
            console.warn('[createMockupProposal] Messaging trigger returned:', response.status);
          }
        }).catch((err) => {
          console.warn('[createMockupProposal] Messaging trigger failed:', err.message);
        });
      } else {
        console.warn('[createMockupProposal] Missing env vars for messaging trigger');
      }
    } catch (msgError) {
      // Non-blocking - log but don't fail
      console.warn('[createMockupProposal] Messaging trigger error (non-blocking):', msgError);
    }
