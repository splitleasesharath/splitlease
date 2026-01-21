/**
 * Step E: Host SMS Handler
 *
 * Simulates receiving an SMS notification from the host.
 * In a real scenario, this would trigger an actual SMS.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StepEPayload {
  simulationId: string;
}

interface StepEResult {
  message: {
    id: string;
    from: string;
    content: string;
    receivedAt: string;
    readAt: string;
  };
}

export async function handleStepE(
  supabase: SupabaseClient,
  payload: StepEPayload
): Promise<StepEResult> {
  const { simulationId } = payload;

  if (!simulationId) {
    throw new Error('simulationId is required');
  }

  console.log(`[step_e] Processing host SMS for simulation: ${simulationId}`);

  // Simulate a host message
  const mockMessage = {
    id: `msg_${Date.now()}`,
    from: 'Your Host',
    content: 'Hi! Just wanted to check in and make sure everything is going well with your stay. Let me know if you need anything!',
    receivedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    readAt: new Date().toISOString()
  };

  // In a real implementation, we might log this to a message_thread table
  // For simulation purposes, we just return the mock message

  console.log(`[step_e] Host message simulated`);

  return {
    message: mockMessage
  };
}
