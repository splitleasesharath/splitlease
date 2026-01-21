/**
 * Create Counteroffer Action Handler
 *
 * Creates a counteroffer on a proposal from the host.
 * Used in usability simulations to simulate host counteroffers.
 *
 * @param payload - Contains proposalId and counteroffer details
 * @param supabase - Supabase client with service role
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateCounterofferPayload {
  proposalId: string;
  counterofferData: {
    'hc nightly price'?: number;
    'hc nights per week'?: number;
    'hc check in day'?: number;
    'hc check out day'?: number;
    'hc move in start'?: string;
    'hc move out'?: string;
  };
  isUsabilityTest?: boolean;
  hostPersona?: string;
}

export async function handleCreateCounteroffer(
  payload: CreateCounterofferPayload,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  console.log('[create_counteroffer] Starting with proposalId:', payload.proposalId);

  const { proposalId, counterofferData, isUsabilityTest = false, hostPersona } = payload;

  if (!proposalId) {
    throw new Error('proposalId is required');
  }

  if (!counterofferData || Object.keys(counterofferData).length === 0) {
    throw new Error('counterofferData is required');
  }

  // Fetch current proposal to preserve existing data
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('*')
    .eq('_id', proposalId)
    .single();

  if (fetchError) {
    console.error('[create_counteroffer] Fetch error:', fetchError);
    throw new Error(`Failed to fetch proposal: ${fetchError.message}`);
  }

  // Update proposal with counteroffer data
  const updateData: Record<string, unknown> = {
    Status: 'Host Counteroffer',
    'Modified Date': new Date().toISOString(),
    'last_modified_by': 'host',
    'has_host_counteroffer': true,
    ...(hostPersona && { 'counteroffer_by_persona': hostPersona })
  };

  // Apply counteroffer fields
  if (counterofferData['hc nightly price'] !== undefined) {
    updateData['hc nightly price'] = counterofferData['hc nightly price'];
  }
  if (counterofferData['hc nights per week'] !== undefined) {
    updateData['hc nights per week'] = counterofferData['hc nights per week'];
  }
  if (counterofferData['hc check in day'] !== undefined) {
    updateData['hc check in day'] = counterofferData['hc check in day'];
  }
  if (counterofferData['hc check out day'] !== undefined) {
    updateData['hc check out day'] = counterofferData['hc check out day'];
  }
  if (counterofferData['hc move in start']) {
    updateData['hc move in start'] = counterofferData['hc move in start'];
  }
  if (counterofferData['hc move out']) {
    updateData['hc move out'] = counterofferData['hc move out'];
  }

  const { error: updateError } = await supabase
    .from('proposal')
    .update(updateData)
    .eq('_id', proposalId);

  if (updateError) {
    console.error('[create_counteroffer] Update error:', updateError);
    throw new Error(`Failed to create counteroffer: ${updateError.message}`);
  }

  console.log('[create_counteroffer] Counteroffer created for proposal:', proposalId);

  return {
    success: true,
    message: `Counteroffer created${hostPersona ? ` by ${hostPersona}` : ''}`
  };
}
