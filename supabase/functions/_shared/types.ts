/**
 * Shared TypeScript type definitions for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 */

export interface BubbleWorkflowResponse {
  status?: string;
  response?: {
    listing_id?: string;
    id?: string;
    user_id?: string;
    token?: string;
    expires?: number;
    [key: string]: any;
  };
  listing_id?: string;
  id?: string;
  [key: string]: any;
}

export interface EdgeFunctionRequest {
  action: string;
  payload: Record<string, any>;
}

export interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface BubbleSyncConfig {
  bubbleBaseUrl: string;
  bubbleApiKey: string;
  supabaseServiceKey: string;
}

export interface WorkflowConfig {
  workflowName: string;
  bubbleObjectType: string;
  supabaseTable: string;
}

export interface AuthResponse {
  success: boolean;
  user_id?: string;
  token?: string;
  expires?: number;
  error?: string;
  reason?: string;
}
