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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[workflowClient]'

const EDGE_FUNCTIONS = Object.freeze({
  WORKFLOW_ENQUEUE: 'workflow-enqueue'
})

const ACTIONS = Object.freeze({
  ENQUEUE: 'enqueue',
  STATUS: 'status'
})

const DEFAULT_OPTIONS = Object.freeze({
  POLL_INTERVAL: 2000,
  TIMEOUT: 60000
})

const TERMINAL_STATUSES = Object.freeze([
  'completed',
  'failed',
  'cancelled'
])

const ERROR_MESSAGES = Object.freeze({
  TRIGGER_FAILED: 'Failed to trigger workflow',
  STATUS_FAILED: 'Failed to get workflow status',
  TIMEOUT: (id, ms) => `Workflow ${id} timed out after ${ms}ms`
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if status is terminal (workflow complete)
 * @pure
 */
const isTerminalStatus = (status) =>
  TERMINAL_STATUSES.includes(status)

/**
 * Check if timeout has been exceeded
 * @pure
 */
const isTimeoutExceeded = (startTime, timeout) =>
  Date.now() - startTime >= timeout

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Build enqueue payload
 * @pure
 */
const buildEnqueuePayload = (workflow, data, correlationId) =>
  Object.freeze({
    action: ACTIONS.ENQUEUE,
    payload: Object.freeze({
      workflow,
      data,
      correlation_id: correlationId
    })
  })

/**
 * Build status payload
 * @pure
 */
const buildStatusPayload = (executionId) =>
  Object.freeze({
    action: ACTIONS.STATUS,
    payload: Object.freeze({ execution_id: executionId })
  })

/**
 * Extract error message from response
 * @pure
 */
const extractErrorMessage = (response, defaultMessage) =>
  response?.error?.message || response?.data?.error || defaultMessage

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log workflow queued
 * @effectful
 */
const logQueued = (workflow, executionId) => {
  console.log(`${LOG_PREFIX} Workflow '${workflow}' queued: ${executionId}`)
}

/**
 * Log workflow error
 * @effectful
 */
const logError = (workflow, error) => {
  console.error(`${LOG_PREFIX} Failed to trigger workflow '${workflow}':`, error)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

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
 * @effectful
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
  const response = await supabase.functions.invoke(EDGE_FUNCTIONS.WORKFLOW_ENQUEUE, {
    body: buildEnqueuePayload(workflow, data, correlationId)
  })

  if (response.error) {
    throw new Error(extractErrorMessage(response, ERROR_MESSAGES.TRIGGER_FAILED))
  }

  if (!response.data.success) {
    throw new Error(extractErrorMessage(response, ERROR_MESSAGES.TRIGGER_FAILED))
  }

  return response.data.data
}

/**
 * Check the status of a workflow execution
 * @effectful
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
  const response = await supabase.functions.invoke(EDGE_FUNCTIONS.WORKFLOW_ENQUEUE, {
    body: buildStatusPayload(executionId)
  })

  if (response.error) {
    throw new Error(extractErrorMessage(response, ERROR_MESSAGES.STATUS_FAILED))
  }

  if (!response.data.success) {
    throw new Error(extractErrorMessage(response, ERROR_MESSAGES.STATUS_FAILED))
  }

  return response.data.data
}

/**
 * Poll workflow status until completion or timeout
 * @effectful
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
  const {
    pollInterval = DEFAULT_OPTIONS.POLL_INTERVAL,
    timeout = DEFAULT_OPTIONS.TIMEOUT,
    onProgress
  } = options
  const startTime = Date.now()

  while (!isTimeoutExceeded(startTime, timeout)) {
    const status = await getWorkflowStatus(executionId)

    if (onProgress) {
      onProgress(status)
    }

    if (isTerminalStatus(status.status)) {
      return status
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error(ERROR_MESSAGES.TIMEOUT(executionId, timeout))
}

/**
 * Fire-and-forget workflow trigger
 * Triggers workflow but doesn't wait for result
 * Logs errors to console but doesn't throw
 * @effectful
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
      logQueued(workflow, result.execution_id)
    })
    .catch(error => {
      logError(workflow, error.message)
    })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  EDGE_FUNCTIONS,
  ACTIONS,
  DEFAULT_OPTIONS,
  TERMINAL_STATUSES,
  ERROR_MESSAGES
}
