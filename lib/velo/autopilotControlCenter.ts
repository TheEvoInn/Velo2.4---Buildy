
import { PaymentConnectorStatus } from "./paymentConnectorSetup";

export interface AutopilotControlSnapshot {
  statusLabel: 'Ready' | 'Needs Profile Info' | 'Needs Review' | 'Setup Suggested' | 'Blocked' | 'Offline';
  primaryNextAction: {
    label: string;
    reason: string;
    moduleId: string;
  };
  setupCards: Array<{
    id: string;
    label: string;
    status: 'complete' | 'incomplete' | 'warning';
    description: string;
  }>;
  autopilotCanHandle: string[];
  requiresUserDecision: string[];
  adminDiagnostics?: {
    score: number;
    blockerCount: number;
    activeTiers: string[];
    connectionTierStatus: Record<string, string>;
  };
}

/**
 * Pure helper to convert backend status into user-facing guidance.
 */
export function buildAutopilotControlSnapshot(params: {
  profile: any;
  readiness: any;
  connectionSettings: Record<string, string>;
  paymentStatuses: PaymentConnectorStatus[];
  operatingSnapshot?: any;
  isAdmin?: boolean;
}): AutopilotControlSnapshot {
  const { profile, readiness, connectionSettings, paymentStatuses, operatingSnapshot, isAdmin } = params;
  
  const score = readiness?.score || 0;
  const autopilotEnabled = profile?.autopilot_enabled;
  const reviewCount = operatingSnapshot?.counts?.review || 0;
  const opportunityCount = operatingSnapshot?.counts?.opportunity || 0;
  
  // 1. Determine Status Label
  let statusLabel: AutopilotControlSnapshot['statusLabel'] = 'Offline';
  if (!autopilotEnabled) {
    statusLabel = 'Offline';
  } else if (score < 70) {
    statusLabel = 'Needs Profile Info';
  } else if (reviewCount > 0) {
    statusLabel = 'Needs Review';
  } else if (score >= 70 && score < 100) {
    statusLabel = 'Setup Suggested';
  } else if (autopilotEnabled) {
    statusLabel = 'Ready';
  }

  // 2. Primary Next Action
  let primaryNextAction = {
    label: 'Open Assistant',
    reason: 'I am ready to help you discover new opportunities.',
    moduleId: 'autopilot'
  };

  if (score < 50) {
    primaryNextAction = {
      label: 'Complete Profile',
      reason: 'Your profile is the foundation of every Autopilot mission.',
      moduleId: 'clone-bay'
    };
  } else if (reviewCount > 0) {
    primaryNextAction = {
      label: 'Review Staged Items',
      reason: `You have ${reviewCount} items waiting for your approval.`,
      moduleId: 'action-engine'
    };
  } else if (!autopilotEnabled) {
    primaryNextAction = {
      label: 'Turn on Autopilot',
      reason: 'Enable Autopilot to let me handle discovery and drafting while you focus on approvals.',
      moduleId: 'dashboard'
    };
  } else if (opportunityCount > 0) {
    primaryNextAction = {
      label: 'Check Results',
      reason: `I've found ${opportunityCount} new matches for you.`,
      moduleId: isAdmin ? 'galaxy-scanner' : 'action-engine'
    };
  }

  // 3. Setup Cards (Outcome language)
  const setupCards: AutopilotControlSnapshot['setupCards'] = [
    {
      id: 'profile',
      label: 'Profile',
      status: score >= 90 ? 'complete' : (score > 50 ? 'warning' : 'incomplete'),
      description: score >= 90 ? 'Fully calibrated.' : 'Tell me more about your skills and goals.'
    },
    {
      id: 'autopilot',
      label: 'Autopilot',
      status: autopilotEnabled ? 'complete' : 'incomplete',
      description: autopilotEnabled ? 'Active and monitoring.' : 'Engage to enable discovery cycles.'
    },
    {
      id: 'connections',
      label: 'Connections',
      status: Object.values(connectionSettings).some(v => v === 'enabled') ? 'complete' : 'warning',
      description: 'Optional private tools for extra privacy or speed.'
    }
  ];

  // 4. Capabilities (Outcome language)
  const autopilotCanHandle = [
    'Find high-match opportunities',
    'Draft proposals and messages',
    'Prepare marketing materials',
    'Organize items for your review',
    'Learn from your decisions'
  ];

  // 5. User Decisions (Outcome language)
  const requiresUserDecision = [
    'Final approval before anything is sent or published',
    'Permission before moving money or making purchases',
    'Authorization before using your private accounts',
    'Personal review of all high-risk actions'
  ];

  // 6. Admin Diagnostics
  let adminDiagnostics;
  if (isAdmin) {
    adminDiagnostics = {
      score,
      blockerCount: readiness?.incompleteCount || 0,
      activeTiers: Object.entries(connectionSettings)
        .filter(([_, v]) => v === 'enabled')
        .map(([k]) => k),
      connectionTierStatus: connectionSettings
    };
  }

  return {
    statusLabel,
    primaryNextAction,
    setupCards,
    autopilotCanHandle,
    requiresUserDecision,
    adminDiagnostics
  };
}

/**
 * Summarizes connection tier status for plain-language display.
 */
export function getPlainConnectionSummary(connectionSettings: Record<string, string>, localStatus?: any, paymentStatuses?: PaymentConnectorStatus[]) {
  const activeTiers = Object.entries(connectionSettings).filter(([_, v]) => v === "enabled").length;
  const connectedPayments = paymentStatuses?.filter(s => s.status === "connected").length || 0;
  
  if (activeTiers === 0 && connectedPayments === 0) return "Standard VELO AI is ready.";
  return `${activeTiers} optional private tools ready, ${connectedPayments} payment trackers ready.`;
}
