




import { 
  VeloConnectorProfile, 
  AutopilotPermission, 
  DecisionRule, 
  AutopilotActionLog,
  AutopilotMission
} from "@/entities";

export type ExecutionReadinessStatus = 
  | "blocked_by_emergency_stop"
  | "missing_connector"
  | "connector_read_only"
  | "permission_too_broad"
  | "approval_required"
  | "dry_run_passed_staged_only"
  | "admin_approved_real_world_ready"
  | "not_ready"
  | "ready_for_review";

export interface ReadinessEvaluation {
  status: ExecutionReadinessStatus;
  message: string;
  checks: {
    emergency_stop: boolean;
    connector_ready: boolean;
    permissions_valid: boolean;
    least_privilege_verified: boolean;
    dry_run_passed?: boolean;
  };
  suggested_action: string;
}

export function evaluateEmergencyStop(rules: any[], permissions: any[]): boolean {
  // Explicit emergency signal detection
  const emergencyRule = rules.find(r => 
    r.is_active && 
    (
      // Explicit action type
      r.action === "EMERGENCY_STOP" || 
      r.action === "GLOBAL_HALT" || 
      r.action === "KILL_SWITCH" || 
      r.action === "HALT_ALL" ||
      r.action === "BLOCK_ALL" ||
      // Explicit metadata flag
      r.metadata?.is_emergency_stop === true ||
      r.metadata?.global_stop === true ||
      r.metadata?.kill_switch === true ||
      // Explicit keyword in name
      (r.name?.toLowerCase().includes("emergency stop")) ||
      (r.name?.toLowerCase().includes("global halt")) ||
      (r.name?.toLowerCase().includes("kill switch")) ||
      (r.name?.toLowerCase().includes("halt all ops"))
    )
  );
  
  // High-level safety permissions revoked
  const revokedPermission = permissions.find(p => 
    p.status === "revoked" && 
    (p.scope === "GLOBAL" || p.department === "SAFETY" || p.department === "SYSTEM")
  );
  
  return !!emergencyRule || !!revokedPermission;
}

export function evaluateConnectorReadiness(
  connector: any, 
  requestedAction: string,
  permissions: any[]
): ReadinessEvaluation {
  const isEmergencyStop = evaluateEmergencyStop([], permissions); // Simplified for this check

  if (!connector) {
    return {
      status: "missing_connector",
      message: "No connector profile found for this department.",
      checks: { emergency_stop: isEmergencyStop, connector_ready: false, permissions_valid: false, least_privilege_verified: false },
      suggested_action: "Set up a connector profile in Secure Core."
    };
  }

  const isReadOnly = connector.connection_mode === "readonly" || connector.status === "manual_fallback";
  if (isReadOnly) {
    return {
      status: "connector_read_only",
      message: `Connector "${connector.name}" is in read-only mode.`,
      checks: { emergency_stop: false, connector_ready: true, permissions_valid: false, least_privilege_verified: false },
      suggested_action: "Switch connector to 'connector_ready' or 'staged_only' mode."
    };
  }

  const hasPermission = permissions.some(p => 
    p.status === "active" && 
    (p.allowed_actions || []).includes(requestedAction)
  );

  const isTooBroad = connector.allowed_actions?.length > 10 && !connector.metadata?.least_privilege_verified;

  return {
    status: hasPermission ? (isTooBroad ? "permission_too_broad" : "ready_for_review") : "approval_required",
    message: hasPermission 
      ? (isTooBroad ? "Connector permissions are overly broad." : "Connector and permissions aligned.") 
      : "Explicit permission grant required for this action.",
    checks: { 
      emergency_stop: false, 
      connector_ready: true, 
      permissions_valid: hasPermission, 
      least_privilege_verified: !isTooBroad 
    },
    suggested_action: hasPermission 
      ? (isTooBroad ? "Tighten connector scope to specific allowed actions." : "Proceed to dry-run simulation.")
      : "Stage a permission grant mission for review."
  };
}

export function evaluateRealWorldActionGovernance(
  request: any,
  connector: any,
  vaultItem: any
): ReadinessEvaluation {
  if (request.execution_mode === 'blocked') {
    return {
      status: "blocked_by_emergency_stop",
      message: `Action blocked: ${request.blocked_reason}`,
      checks: { emergency_stop: true, connector_ready: false, permissions_valid: false, least_privilege_verified: false },
      suggested_action: "Resolve block reason or stage new request."
    };
  }

  const isApproved = request.permission_status === 'approved';
  const hasConnector = request.connector_status === 'write_ready' || (request.connector_status === 'not_required');
  const hasCredential = request.credential_scope_status === 'scoped_ready' || (request.credential_scope_status === 'not_required');

  if (isApproved && hasConnector && hasCredential) {
    return {
      status: "admin_approved_real_world_ready",
      message: "Action governance complete. Ready for provider-specific execution.",
      checks: { emergency_stop: false, connector_ready: true, permissions_valid: true, least_privilege_verified: true },
      suggested_action: "Trigger provider adapter (if available)."
    };
  }

  return {
    status: "approval_required",
    message: "Action governance pending. Review approval, connector, and credential status.",
    checks: { 
      emergency_stop: false, 
      connector_ready: hasConnector, 
      permissions_valid: isApproved, 
      least_privilege_verified: hasCredential 
    },
    suggested_action: "Complete pending governance steps in Real-World Execution Center."
  };
}

export function buildDryRunPlan(actionIntent: any, connector: any, department: string) {
  return {
    action_intent_id: actionIntent.id,
    connector_id: connector?.id,
    department,
    action_type: actionIntent.action_type || "STAGED_ACTION",
    payload: actionIntent.payload || actionIntent.staged_data || {},
    timestamp: new Date().toISOString(),
    is_simulation: true
  };
}

export async function runDryRunSimulation(plan: any, rules: any[] = [], permissions: any[] = []): Promise<any> {
  const isEmergencyStop = evaluateEmergencyStop(rules, permissions);
  
  if (isEmergencyStop) {
    const blockedLog = {
      department: plan.department,
      action_type: "EXECUTION_DRY_RUN_BLOCKED",
      status: "blocked",
      summary: `Dry-run for ${plan.action_type} BLOCKED.`,
      details: "Global emergency stop or safety halt is active. Simulation aborted for safety.",
      metadata: {
        is_dry_run: true,
        was_blocked: true,
        original_intent_id: plan.action_intent_id,
        simulated_at: new Date().toISOString()
      }
    };
    
    try {
      await AutopilotActionLog.create(blockedLog);
      return { success: false, blocked: true, message: "Emergency stop active. Dry-run blocked." };
    } catch (e) {
      return { success: false, blocked: true, message: "Dry-run blocked by emergency stop." };
    }
  }

  // This is a simulation only. Create a log entry.
  const logEntry = {
    department: plan.department,
    action_type: "EXECUTION_DRY_RUN",
    status: "success", // Simulated success
    summary: `Dry-run for ${plan.action_type} completed.`,
    details: `Simulated execution using connector ${plan.connector_id || 'manual'}. No external calls were made.`,
    metadata: {
      is_dry_run: true,
      original_intent_id: plan.action_intent_id,
      simulated_at: new Date().toISOString()
    }
  };

  try {
    const log = await AutopilotActionLog.create(logEntry);
    return { success: true, log_id: log.id, message: "Dry-run simulation recorded." };
  } catch (error) {
    console.error("Dry-run log creation failed:", error);
    return { success: false, message: "Failed to record dry-run simulation." };
  }
}

export function buildExecutionReadinessSnapshot(records: {
  connectors: any[];
  permissions: any[];
  rules: any[];
  actionLogs: any[];
  missions: any[];
}) {
  const isEmergencyStop = evaluateEmergencyStop(records.rules, records.permissions);
  const dryRuns = records.actionLogs.filter(l => l.action_type === "EXECUTION_DRY_RUN");
  const pendingApprovals = records.missions.filter(m => m.status === "pending" && m.mission_type?.includes("EXECUTION"));
  
  const connectorWarnings = records.connectors.filter(c => 
    c.connection_mode === "readonly" || (c.allowed_actions?.length || 0) > 10
  ).length;

  return {
    emergency_stop: isEmergencyStop,
    dry_run_count: dryRuns.length,
    pending_execution_approvals: pendingApprovals.length,
    connector_warnings: connectorWarnings,
    overall_status: isEmergencyStop ? "BLOCKED" : (connectorWarnings > 0 ? "WARNING" : "READY_FOR_STAGING")
  };
}
