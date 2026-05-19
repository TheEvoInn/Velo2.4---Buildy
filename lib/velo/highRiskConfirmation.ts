
export type HighRiskCategory = 
  | 'credential_use' 
  | 'money_movement' 
  | 'trading_action' 
  | 'form_submission' 
  | 'browser_automation';

export interface ConfirmationPolicy {
  category: HighRiskCategory;
  label: string;
  riskDescription: string;
  requireTypedApproval: boolean;
  approvalPhrase: string;
  manualApprovalRequiredIfAutomationOff: boolean;
}

export const HIGH_RISK_POLICIES: Record<HighRiskCategory, ConfirmationPolicy> = {
  credential_use: {
    category: 'credential_use',
    label: 'Credential Authorization',
    riskDescription: 'This action involves accessing stored API keys or credentials. Incorrect use could lead to unauthorized access to external platforms.',
    requireTypedApproval: true,
    approvalPhrase: 'AUTHORIZE CREDENTIAL USE',
    manualApprovalRequiredIfAutomationOff: true
  },
  money_movement: {
    category: 'money_movement',
    label: 'Financial Transaction',
    riskDescription: 'This action involves moving real funds or assets. This is irreversible and carries high financial risk.',
    requireTypedApproval: true,
    approvalPhrase: 'I APPROVE THIS TRANSACTION',
    manualApprovalRequiredIfAutomationOff: true
  },
  trading_action: {
    category: 'trading_action',
    label: 'Market Trade Execution',
    riskDescription: 'This action involves executing trades on live markets. Market volatility can lead to financial loss.',
    requireTypedApproval: true,
    approvalPhrase: 'I ACCEPT MARKET RISK',
    manualApprovalRequiredIfAutomationOff: true
  },
  form_submission: {
    category: 'form_submission',
    label: 'External Platform Submission',
    riskDescription: 'This action will submit data to an external service or platform. This could affect your public profile or external accounts.',
    requireTypedApproval: false,
    approvalPhrase: 'CONFIRM SUBMISSION',
    manualApprovalRequiredIfAutomationOff: true
  },
  browser_automation: {
    category: 'browser_automation',
    label: 'Browser Control Sequence',
    riskDescription: 'This action uses a browser executor to navigate and interact with websites. If combined with credentials or form writes, it carries elevated risk.',
    requireTypedApproval: false,
    approvalPhrase: 'APPROVE BROWSER ACTION',
    manualApprovalRequiredIfAutomationOff: true
  }
};

export function getPolicyForAction(type: string): ConfirmationPolicy | null {
  if (type.includes('money') || type.includes('transfer') || type.includes('payment')) return HIGH_RISK_POLICIES.money_movement;
  if (type.includes('trade') || type.includes('order')) return HIGH_RISK_POLICIES.trading_action;
  if (type.includes('credential') || type.includes('auth') || type.includes('key')) return HIGH_RISK_POLICIES.credential_use;
  if (type.includes('browser') || type.includes('playwright') || type.includes('scraping')) return HIGH_RISK_POLICIES.browser_automation;
  if (type.includes('submit') || type.includes('post')) return HIGH_RISK_POLICIES.form_submission;
  return null;
}

export function requiresMultiStepConfirmation(category: HighRiskCategory): boolean {
  return ['money_movement', 'trading_action', 'credential_use'].includes(category);
}
