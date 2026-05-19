

export type UnlockCategory = 'browser_automation' | 'credential_use' | 'form_submission' | 'trading_action' | 'money_movement';

export interface UnlockMetadata {
  action_type: string;
  label: string;
  description: string;
  whatLocalAiCanDo: string;
  whatRemainsLocked: string;
  requiredGates: string[];
  department: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  execution_mode: string;
  blocked_reason?: string;
}

export const LOCAL_AUTONOMY_UNLOCKS: Record<UnlockCategory, UnlockMetadata> = {
  browser_automation: {
    action_type: 'browser_automation',
    label: 'Browser Control',
    description: 'Prepare for controlled browser execution. Allow VELO to coordinate browser tasks without direct API access.',
    whatLocalAiCanDo: 'Reason about web tasks and prepare automation scripts.',
    whatRemainsLocked: 'Real-time browser execution and visual interaction.',
    requiredGates: ['Governance Approval', 'Verified Local/Ubuntu Executor', 'Headless Mode Restrictions'],
    department: 'DevOps & Automation',
    risk_level: 'high',
    execution_mode: 'queued_for_ubuntu'
  },
  credential_use: {
    action_type: 'credential_use',
    label: 'Credential Use',
    description: 'Request a secure gate for local AI to reference stored credentials from your Secure Vault for authenticated tasks.',
    whatLocalAiCanDo: 'Identify which credentials are needed for a specific task.',
    whatRemainsLocked: 'Plain-text secret exposure and cross-domain credential usage.',
    requiredGates: ['Governance Approval', 'Scoped Vault Reference', 'Hardware Key Verification'],
    department: 'Security & Infrastructure',
    risk_level: 'high',
    execution_mode: 'staged_review'
  },
  form_submission: {
    action_type: 'form_submission',
    label: 'External Submissions',
    description: 'Request access gates for submitting forms, applications, and data to external platforms.',
    whatLocalAiCanDo: 'Draft form content and validate data against platform requirements.',
    whatRemainsLocked: 'Live HTTP POST/Submit actions to external endpoints.',
    requiredGates: ['Governance Approval', 'Platform Connector Readiness', 'Submission Review Step'],
    department: 'Continuity Core',
    risk_level: 'medium',
    execution_mode: 'staged_review'
  },
  trading_action: {
    action_type: 'trading_action',
    label: 'Automated Trading',
    description: 'Establish governance gates for local signals to trigger trade orders on connected exchanges.',
    whatLocalAiCanDo: 'Analyze market data and generate trade signal recommendations.',
    whatRemainsLocked: 'Order execution and API-key-based trade submission.',
    requiredGates: ['Governance Approval', 'Exchange Connector Active', 'Strict Financial Limits'],
    department: 'Financial Operations',
    risk_level: 'critical',
    execution_mode: 'blocked',
    blocked_reason: 'Requires verified financial connector and limit policy setup.'
  },
  money_movement: {
    action_type: 'money_movement',
    label: 'Money Movement',
    description: 'Initiate a governance request for local workflows to prepare transfers or payments within specified limits.',
    whatLocalAiCanDo: 'Prepare payment batches and verify recipient data.',
    whatRemainsLocked: 'Actual fund fund transfer and transaction signing.',
    requiredGates: ['Governance Approval', 'Verified Bank/Wallet Connector', 'Explicit Value Limits'],
    department: 'Financial Operations',
    risk_level: 'critical',
    execution_mode: 'blocked',
    blocked_reason: 'Requires multi-signature approval and verified payment gateway.'
  }
};

export function buildUnlockRequestPayload(category: UnlockCategory, userEmail: string, userId: string) {
  const metadata = LOCAL_AUTONOMY_UNLOCKS[category];
  
  return {
    action_type: metadata.action_type,
    department: metadata.department,
    title: `Access Gate Request: ${metadata.label}`,
    requested_by_email: userEmail,
    requested_by_user_id: userId,
    explicit_user_request_summary: `User requested controlled access gate for ${metadata.label} via local AI connection.`,
    autopilot_intent_confirmation: `Request validated as a controlled governance request for local autonomy tier.`,
    safety_validation_status: 'needs_review',
    permission_status: 'pending',
    credential_scope_status: 'required_missing',
    connector_status: 'missing',
    execution_mode: metadata.execution_mode,
    risk_level: metadata.risk_level,
    blocked_reason: metadata.blocked_reason || 'Awaiting governance review and local executor verification.',
    metadata: {
      beta_unlock_request: true,
      local_ai_connection_context: true,
      requires_local_executor: true,
      requires_admin_review: true,
      category: category
    }
  };
}
