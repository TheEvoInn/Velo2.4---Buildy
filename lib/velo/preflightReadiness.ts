import { 
  SecureVaultItem, 
  DecisionRule, 
  AutopilotPermission,
  VeloConnectorProfile,
  AutopilotProfile
} from "@/entities";
import { buildMissionReadinessGate } from "./profileReadiness";
import { evaluateEmergencyStop, evaluateConnectorReadiness } from "./executionReadiness";
import { 
  getRealWorldModeSettings,
  UBUNTU_QUEUED_CATEGORIES
} from "./dualPlatformRealWorldMode";
import { findScopedProfile, isRecordOwnedByUser } from "./accessControl";

export interface PreflightCheckItem {
  id: string;
  label: string;
  status: 'ready' | 'warning' | 'blocked';
  message: string;
  fix_url?: string;
}

export interface PreflightReport {
  overall_status: 'ready' | 'ready_with_warnings' | 'blocked';
  score: number; // 0-100
  blockers: PreflightCheckItem[];
  warnings: PreflightCheckItem[];
  ready_items: PreflightCheckItem[];
  next_steps: string[];
  summary: string;
}

export interface PreflightContext {
  goal: string;
  department: string;
  mission_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  action_type?: string;
}

/**
 * Runs a comprehensive preflight check before a mission is launched or staged.
 */
export async function runMissionPreflight(
  context: PreflightContext,
  user: any
): Promise<PreflightReport> {
  const blockers: PreflightCheckItem[] = [];
  const warnings: PreflightCheckItem[] = [];
  const ready_items: PreflightCheckItem[] = [];

  // 1. Profile & Basic Readiness
  const allProfiles = await AutopilotProfile.list();
  const profile = findScopedProfile(user, allProfiles);
  let vaultItems: any[] = [];

  if (!profile) {
    blockers.push({
      id: 'profile_missing',
      label: 'No Pilot Profile',
      status: 'blocked',
      message: "No mission-scoped profile found for your account. Create one in the Clone Bay.",
      fix_url: "/clone-bay"
    });
  } else {
    const allVaultItems = await SecureVaultItem.list();
    vaultItems = allVaultItems.filter(item => isRecordOwnedByUser(item, user));
    const readinessGate = buildMissionReadinessGate(profile, { vaultItemCount: vaultItems.length });

    if (!readinessGate.isReady) {
      readinessGate.blockers.forEach(b => {
        blockers.push({
          id: `profile_${b.id}`,
          label: b.label,
          status: 'blocked',
          message: "Crucial profile data is missing in the Clone Bay.",
          fix_url: "/clone-bay"
        });
      });
    } else if (!readinessGate.allDone) {
      readinessGate.warnings.forEach(w => {
        warnings.push({
          id: `profile_${w.id}`,
          label: w.label,
          status: 'warning',
          message: "Secondary profile data is missing. Quality may be lower.",
          fix_url: "/clone-bay"
        });
      });
    } else {
      ready_items.push({
        id: 'profile_ready',
        label: 'Profile Complete',
        status: 'ready',
        message: 'All core and secondary profile fields verified.'
      });
    }
  }

  // 2. Connection Tier & Host Readiness Check
  const realWorldSettings = await getRealWorldModeSettings();
  const isUbuntuAction = context.action_type && UBUNTU_QUEUED_CATEGORIES.includes(context.action_type);

  if (isUbuntuAction) {
    if (realWorldSettings.ubuntuFullAutonomy === 'disabled') {
      blockers.push({
        id: 'connection_ubuntu_locked',
        label: 'Ubuntu Executor Locked',
        status: 'blocked',
        message: 'This action requires the Ubuntu Executor tier to be enabled. It will be prepared and queued, not executed directly.',
        fix_url: "/connection-hub"
      });
    } else if (realWorldSettings.ubuntuFullAutonomy === 'pending_host_attestation') {
      warnings.push({
        id: 'connection_ubuntu_pending',
        label: 'Ubuntu Host Attestation Pending',
        status: 'warning',
        message: 'Ubuntu tier is configured but awaiting trusted host attestation. Actions will be queued until the host is verified.',
        fix_url: "/connection-hub"
      });
    } else {
      // enabled
      ready_items.push({
        id: 'connection_ubuntu_queued',
        label: 'Ubuntu Tier Ready',
        status: 'ready',
        message: 'Ubuntu Executor is enabled. Actions will be prepared and queued for the trusted host.'
      });
      warnings.push({
        id: 'host_attestation_notice',
        label: 'Host-Restricted Execution Notice',
        status: 'warning',
        message: 'Host-only actions require trusted host attestation before execution, even when the Ubuntu tier is enabled.',
        fix_url: "/connection-hub"
      });
    }
  }

  // 3. Safety Gate & Emergency Stop
  const rules = await DecisionRule.list();
  const permissions = await AutopilotPermission.list();
  const isEmergencyStop = evaluateEmergencyStop(rules, permissions);

  if (isEmergencyStop) {
    blockers.push({
      id: 'safety_emergency_stop',
      label: 'Global Safety Halt',
      status: 'blocked',
      message: 'A global emergency stop or safety halt is currently active.',
      fix_url: "/action-center"
    });
  } else {
    ready_items.push({
      id: 'safety_passed',
      label: 'Safety Gates Clear',
      status: 'ready',
      message: 'No active emergency stops or safety halts detected.'
    });
  }

  // 3.5 Risk Level & Approval Requirements
  const isHighOrCriticalRisk = context.risk_level === 'high' || context.risk_level === 'critical';
  if (isHighOrCriticalRisk) {
    warnings.push({
      id: 'risk_high_approval',
      label: 'High-Risk Operation',
      status: 'warning',
      message: 'This mission is flagged as high or critical risk. Explicit review and human authorization will be required before final execution.',
      fix_url: "/action-center"
    });
  }

  // 4. Credential Requirements
  // We check if the mission likely needs credentials based on department/action
  const needsCredentials = ['freelance', 'trade', 'crypto'].includes(context.department) || (context.action_type && context.action_type.includes('EXTERNAL'));
  
  if (needsCredentials && vaultItems.length === 0) {
    warnings.push({
      id: 'vault_empty',
      label: 'No Secure Credentials',
      status: 'warning',
      message: 'No credentials found in Secure Core. External actions will require manual entry.',
      fix_url: "/connection-hub"
    });
  } else if (needsCredentials) {
    ready_items.push({
      id: 'vault_ready',
      label: 'Secure Vault Linked',
      status: 'ready',
      message: `${vaultItems.length} credential references found in Secure Core.`
    });
  }

  // 5. Connector & Platform Readiness
  if (context.department && context.department !== 'Command Officer') {
    const connectors = await VeloConnectorProfile.list();
    const deptConnector = connectors.find(c => c.category?.toLowerCase().includes(context.department.toLowerCase()) || c.name?.toLowerCase().includes(context.department.toLowerCase()));
    
    if (context.action_type) {
      const evaluation = evaluateConnectorReadiness(deptConnector, context.action_type, permissions);
      if (evaluation.status === 'missing_connector' || evaluation.status === 'not_ready') {
        warnings.push({
          id: 'connector_missing',
          label: `${context.department} Connector Missing`,
          status: 'warning',
          message: evaluation.message,
          fix_url: "/connection-hub"
        });
      } else if (evaluation.status === 'approval_required') {
        warnings.push({
          id: 'permission_required',
          label: 'Action Permission Required',
          status: 'warning',
          message: 'This specific action requires an explicit permission grant.',
          fix_url: "/action-center"
        });
      } else {
        ready_items.push({
          id: 'connector_ready',
          label: 'Connector Verified',
          status: 'ready',
          message: 'Connector and permissions aligned for this department.'
        });
      }
    }
  }

  // 6. Final Report Calculation
  const totalChecks = blockers.length + warnings.length + ready_items.length;
  const score = totalChecks > 0 ? Math.round((ready_items.length / totalChecks) * 100) : 100;
  
  let overall_status: PreflightReport['overall_status'] = 'ready';
  if (blockers.length > 0) overall_status = 'blocked';
  else if (warnings.length > 0 || score < 80) overall_status = 'ready_with_warnings';

  const next_steps: string[] = [];
  if (blockers.length > 0) {
    next_steps.push(`Resolve ${blockers.length} critical blockers in the ${blockers[0].fix_url?.replace('/', '') || 'Action Center'}.`);
  } else if (warnings.length > 0) {
    next_steps.push(`Review ${warnings.length} operational warnings to improve mission quality.`);
  }
  if (overall_status !== 'blocked') {
    next_steps.push("Proceed with mission staging and internal drafting.");
  }

  const summary = blockers.length > 0 
    ? `Mission blocked by ${blockers.length} critical requirements.` 
    : (warnings.length > 0 ? `Mission ready with ${warnings.length} operational warnings.` : "Mission preflight complete. All systems ready.");

  return {
    overall_status,
    score,
    blockers,
    warnings,
    ready_items,
    next_steps,
    summary
  };
}

/**
 * Formats a preflight report into mission metadata.
 */
export function formatPreflightMetadata(report: PreflightReport) {
  return {
    preflight_status: report.overall_status,
    preflight_score: report.score,
    preflight_summary: report.summary,
    preflight_next_steps: report.next_steps,
    preflight_blocker_count: report.blockers.length,
    preflight_warning_count: report.warnings.length,
    preflight_report: report // Store full report for UI use
  };
}
