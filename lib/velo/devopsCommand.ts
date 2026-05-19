



import { 
  VeloDevopsCommand, 
  VeloDeploymentRequest, 
  VeloMemberInvitation,
  AutopilotActionLog,
  User
} from "@/entities";

export interface StagedCommandPlan {
  steps: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  buildyMode: string;
  ubuntuMode: string;
}

/**
 * Classifies a natural language DevOps command into a structured type
 */
export function classifyDevOpsCommand(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('edit') || t.includes('update') || t.includes('change')) return 'EDIT_FILE';
  if (t.includes('create') || t.includes('new') || t.includes('generate')) return 'CREATE_MODULE';
  if (t.includes('delete') || t.includes('remove') || t.includes('archive')) return 'DELETE_RESOURCE';
  if (t.includes('deploy') || t.includes('publish') || t.includes('release')) return 'DEPLOY';
  if (t.includes('rollback') || t.includes('revert') || t.includes('undo')) return 'ROLLBACK';
  if (t.includes('diagnose') || t.includes('check') || t.includes('health')) return 'DIAGNOSTIC';
  return 'GENERAL_REQUEST';
}

/**
 * Estimates the risk level of a command
 */
export function estimateCommandRisk(commandType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (commandType) {
    case 'DELETE_RESOURCE': return 'CRITICAL';
    case 'DEPLOY': return 'HIGH';
    case 'ROLLBACK': return 'HIGH';
    case 'EDIT_FILE': return 'MEDIUM';
    case 'CREATE_MODULE': return 'LOW';
    case 'DIAGNOSTIC': return 'LOW';
    default: return 'LOW';
  }
}

/**
 * Generates a mock execution plan for the UI
 */
export function buildStagedPatchPlan(commandText: string, type: string): StagedCommandPlan {
  const risk = estimateCommandRisk(type);
  return {
    steps: [
      `Analyze request: "${commandText}"`,
      `Map targeted project areas and dependencies`,
      `Generate operational patch in virtual workspace`,
      `Run simulated validation tests`,
      `Queue for admin approval in ${risk} risk category`,
      `Active routing: Executed on Buildy or queued for Ubuntu`
    ],
    risk,
    buildyMode: "ACTIVE (Internal Ops)",
    ubuntuMode: "AUTONOMOUS (Host Ops Enabled)"
  };
}

/**
 * Helper to get current execution environment info
 */
export function getBuildyVsUbuntuExecutionMode() {
  return {
    isBuildy: true, // Hardcoded for now while on the platform
    statusLabel: "Dual-Platform Mode",
    description: "Internal records and administrative actions are active on Buildy. Destructive host changes and external platform submissions are queued for Ubuntu execution.",
    migrationReady: true
  };
}

/**
 * Generates a safe invitation token hint
 */
export function generateInvitationTokenHint(email: string): string {
  // Use a simple random component and sanitize base64 to be URL safe
  const randomPart = Math.random().toString(36).substring(2, 8);
  const hash = btoa(email + Date.now() + randomPart)
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '')
    .substring(0, 12);
  return `VELO-INV-${hash.toUpperCase()}`;
}

/**
 * Logs a DevOps or Admin action to the Black Box
 */
export async function logAdminAction(
  user: any, 
  action: string, 
  details: string, 
  category: 'DEVOPS' | 'MEMBER' | 'SYSTEM'
) {
  try {
    // Map internal category to department
    const departmentMap = {
      'DEVOPS': 'DevOps Command Deck',
      'MEMBER': 'Member Control Area',
      'SYSTEM': 'Admin Command System'
    };

    await AutopilotActionLog.create({
      department: departmentMap[category] || 'Admin Command System',
      action_type: `${category}_${action}`,
      status: "success",
      summary: details,
      details: JSON.stringify({
        staged_mode: true,
        host: "Buildy",
        performed_by: user.email,
        timestamp: new Date().toISOString()
      }),
      related_id: user.id
    });
  } catch (err) {
    console.error("[VELO] Failed to log admin action:", err);
  }
}
