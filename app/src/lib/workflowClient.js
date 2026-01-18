/**
 * Workflow Client
 * Split Lease - Workflow Orchestration System
 *
 * Utility for triggering workflows from the frontend.
 * Abstracts the Edge Function call and provides fire-and-forget or tracked execution.
 *
 * @module lib/workflowClient
 */

import { supabase } from './supabase';

/**
 * @typedef {Object} WorkflowResult
 * @property {string} execution_id - Unique execution ID
 * @property {string} workflow_name - Name of the workflow
 * @property {'queued'|'pending'|'running'|'completed'|'failed'} status - Current status
 * @property {number} [total_steps] - Total number of steps in workflow
 * @property {string} [message] - Additional message (e.g., for idempotent calls)
 */

/**
 * @typedef {Object} WorkflowStatusResult
 * @property {string} id - Execution ID
 * @property {string} workflow_name - Name of the workflow
 * @property {string} status - Current status
 * @property {number} current_step - Current step index (0-based)
 * @property {number} total_steps - Total steps
 * @property {Object} context - Accumulated context from steps
 * @property {string} [error_message] - Error message if failed
 * @property {string} [error_step] - Step that failed
 * @property {string} created_at - Creation timestamp
 * @property {string} [started_at] - Start timestamp
 * @property {string} [completed_at] - Completion timestamp
 */

/**
 * Trigger a named workflow with the provided data
 *
 * @param {string} workflow - The workflow name (e.g., 'proposal_accepted')
 * @param {Object} data - The payload data required by the workflow
 * @param {string} [correlationId] - Optional idempotency key
 * @returns {Promise<WorkflowResult>}
 * @throws {Error} If workflow fails to enqueue
 *
 * @example
 * // Trigger proposal accepted workflow
 * const result = await triggerWorkflow('proposal_accepted', {
 *   guest_email: 'guest@example.com',
 *   guest_name: 'John Doe',
 *   host_name: 'Jane Smith',
 *   listing_address: '123 Main St',
 *   start_date: '2025-01-15',
 *   end_date: '2025-03-15',
 *   monthly_rent: '2500',
 *   email_template_id: 'proposal_accepted_template'
 * });
 * console.log('Queued:', result.execution_id);
 */
export async function triggerWorkflow(workflow, data, correlationId = null) {
  const response = await supabase.functions.invoke('workflow-enqueue', {
    body: {
      action: 'enqueue',
      payload: {
        workflow,
        data,
        correlation_id: correlationId
      }
    }
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to trigger workflow');
  }

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to trigger workflow');
  }

  return response.data.data;
}

/**
 * Check the status of a workflow execution
 *
 * @param {string} executionId - The execution ID returned from triggerWorkflow
 * @returns {Promise<WorkflowStatusResult>}
 * @throws {Error} If status check fails
 *
 * @example
 * const status = await getWorkflowStatus('abc-123-def');
 * if (status.status === 'completed') {
 *   console.log('Workflow finished at', status.completed_at);
 * }
 */
export async function getWorkflowStatus(executionId) {
  const response = await supabase.functions.invoke('workflow-enqueue', {
    body: {
      action: 'status',
      payload: { execution_id: executionId }
    }
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to get workflow status');
  }

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get workflow status');
  }

  return response.data.data;
}

/**
 * Poll workflow status until completion or timeout
 *
 * @param {string} executionId - The execution ID to poll
 * @param {Object} [options] - Polling options
 * @param {number} [options.pollInterval=2000] - Interval between polls in ms
 * @param {number} [options.timeout=60000] - Max time to wait in ms
 * @param {function(WorkflowStatusResult): void} [options.onProgress] - Progress callback
 * @returns {Promise<WorkflowStatusResult>}
 * @throws {Error} If workflow times out or check fails
 *
 * @example
 * const finalStatus = await waitForWorkflow(result.execution_id, {
 *   pollInterval: 1000,
 *   timeout: 30000,
 *   onProgress: (status) => {
 *     console.log(`Step ${status.current_step + 1}/${status.total_steps}`);
 *   }
 * });
 */
export async function waitForWorkflow(executionId, options = {}) {
  const { pollInterval = 2000, timeout = 60000, onProgress } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getWorkflowStatus(executionId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Workflow ${executionId} timed out after ${timeout}ms`);
}

/**
 * Fire-and-forget workflow trigger
 * Triggers workflow but doesn't wait for result
 * Logs errors to console but doesn't throw
 *
 * @param {string} workflow - The workflow name
 * @param {Object} data - The payload data
 * @param {string} [correlationId] - Optional idempotency key
 * @returns {void}
 *
 * @example
 * // Fire and forget - don't block UI
 * triggerWorkflowAsync('user_signup_complete', {
 *   user_email: user.email,
 *   user_name: user.name,
 *   first_name: user.firstName,
 *   signup_date: new Date().toISOString(),
 *   welcome_email_template_id: 'welcome_template'
 * });
 */
export function triggerWorkflowAsync(workflow, data, correlationId = null) {
  triggerWorkflow(workflow, data, correlationId)
    .then(result => {
      console.log(`[workflowClient] Workflow '${workflow}' queued: ${result.execution_id}`);
    })
    .catch(error => {
      console.error(`[workflowClient] Failed to trigger workflow '${workflow}':`, error.message);
    });
}
