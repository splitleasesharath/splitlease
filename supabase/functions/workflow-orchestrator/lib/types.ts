/**
 * Workflow Orchestrator Types
 * Split Lease - Workflow Orchestration System
 */

export interface WorkflowStep {
    name: string;
    function: string;
    action: string;
    payload_template: Record<string, unknown>;
    on_failure: "continue" | "abort" | "retry";
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    required_fields: string[];
    timeout_seconds: number;
    visibility_timeout: number;
    max_retries: number;
    active: boolean;
    version: number;
}

export interface WorkflowExecution {
    id: string;
    workflow_name: string;
    workflow_version: number;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    current_step: number;
    total_steps: number;
    input_payload: Record<string, unknown>;
    context: Record<string, unknown>;
    error_message?: string;
    error_step?: string;
    retry_count: number;
    correlation_id?: string;
    triggered_by: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface QueueMessage {
    msg_id: number;
    read_ct: number;
    vt: string;
    enqueued_at: string;
    message: {
        execution_id: string;
        workflow_name: string;
        workflow_version: number;
        steps: WorkflowStep[];
        current_step: number;
        context: Record<string, unknown>;
        visibility_timeout: number;
        max_retries: number;
    };
}
