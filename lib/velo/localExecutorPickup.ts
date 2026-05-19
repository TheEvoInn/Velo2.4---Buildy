














import { AutopilotMission, VeloRealWorldActionRequest, AutopilotActionLog, User, AutopilotProfile } from "@/entities";
import { getAccessContext } from "./accessControl";
import { completeCurrentMissionStep, failCurrentMissionStep, getSequentialMissionState } from "./sequentialMissionEngine";
import { recordLearningOutcome } from "./learningLoop";

export type LocalExecutorStatus = 
  | "ready_for_pickup" 
  | "picked_up"
  | "waiting_for_approval" 
  | "waiting_for_host" 
  | "blocked" 
  | "completed" 
  | "failed";

export interface LocalExecutorPickupItem {
  mission: any;
  request: any;
  status: LocalExecutorStatus;
  can_run: boolean;
  can_report: boolean;
}

export interface LocalRunPacket {
  version: "1.0.0";
  mission_id: string;
  request_id: string;
  title: string;
  type: string;
  action: string;
  provider?: string;
  target_url?: string;
  instructions: string;
  risk_level: string;
  required_gates: string[];
  credential_references: string[];
  output_format?: string;
  timestamp: string;
  do_not_run_unless: string[];
}

export interface LocalExecutorReport {
  outcome: "success" | "failed" | "blocked" | "needs_review";
  summary: string;
  notes?: string;
  extracted_data?: any;
}

/**
 * Fetches and filters missions/requests that require local execution.
 */
export async function getLocalExecutorQueue(): Promise<LocalExecutorPickupItem[]> {
  try {
    const me = await User.me();
    const profiles = await AutopilotProfile.list();
    const myProfile = profiles.find(p => p.created_by === me.email);
    const ctx = getAccessContext(me, myProfile);

    const [missions, requests] = await Promise.all([
      AutopilotMission.list("-created_at", 100),
      VeloRealWorldActionRequest.list("-created_at", 100)
    ]);

    // Filter missions that explicitly require a local executor or are high-risk real-world actions
    let eligibleMissions = missions.filter(m => {
      const request = requests.find(r => r.related_mission_id === m.id);
      
      const requiresLocal = 
        m.metadata?.local_executor_required === true || 
        m.mission_type === 'BROWSER_CONTROL_POC' ||
        m.requested_action === 'money_movement' ||
        m.requested_action === 'trading_action' ||
        request?.execution_mode === 'queued_for_ubuntu' ||
        request?.connector_status === 'pending_host' ||
        (request?.metadata?.step_id !== undefined && m.metadata?.sequential);

      return requiresLocal;
    });

    // If not admin, only show missions owned/requested by current user
    if (ctx.role !== 'admin') {
      eligibleMissions = eligibleMissions.filter(m => {
        const req = requests.find(r => r.related_mission_id === m.id);
        return (
          m.metadata?.owner_email === me.email || 
          m.metadata?.requested_by_email === me.email ||
          req?.requested_by_email === me.email
        );
      });
    }

    return eligibleMissions.map(mission => {
      const request = requests.find(r => r.related_mission_id === mission.id);
      
      const status = determinePickupStatus(mission, request);
      
      return {
        mission,
        request,
        status,
        can_run: status === "ready_for_pickup" || status === "picked_up",
        can_report: status === "ready_for_pickup" || status === "picked_up"
      };
    });
  } catch (error) {
    console.error("Failed to load local executor queue:", error);
    return [];
  }
}

/**
 * Determines the current status of a pickup item.
 */
function determinePickupStatus(mission: any, request?: any): LocalExecutorStatus {
  if (mission.status === "executed") return "completed";
  if (mission.status === "failed") return "failed";
  if (mission.status === "denied" || mission.status === "cancelled") return "blocked";
  
  if (mission.metadata?.local_pickup_status === 'picked_up') return "picked_up";

  if (!request) return "waiting_for_approval";

  if (request.execution_mode === "completed") return "completed";
  if (request.execution_mode === "blocked") return "blocked";
  
  // Permission gate
  if (request.permission_status !== "approved") return "waiting_for_approval";
  
  // Safety gate
  if (request.safety_validation_status === "blocked") return "blocked";
  if (request.safety_validation_status !== "passed") return "waiting_for_approval";

  // If all gates passed and mode is queued_for_ubuntu or admin_approved_ready
  if (request.execution_mode === "queued_for_ubuntu" || request.execution_mode === "admin_approved_ready") {
    return "ready_for_pickup";
  }

  return "waiting_for_host";
}

/**
 * Sanitizes text to remove potential secrets, keys, and tokens.
 */
export function sanitizeLocalReportText(text: string): string {
  if (!text) return "";
  
  // Pattern to catch common secret indicators
  const secretPatterns = [
    /(api[_-]?key[:=]\s*)[^\s,}"']+/gi,
    /(secret[:=]\s*)[^\s,}"']+/gi,
    /(token[:=]\s*)[^\s,}"']+/gi,
    /(password[:=]\s*)[^\s,}"']+/gi,
    /(bearer\s+)[^\s,}"']+/gi,
    /(private[_-]?key[:=]\s*)[^\s,}"']+/gi
  ];

  let sanitized = text;
  secretPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "$1[REDACTED]");
  });

  // Also redact long strings that look like hex/base64 keys (32+ chars)
  sanitized = sanitized.replace(/[a-zA-Z0-9+/=]{32,}/g, (match) => {
    // Keep common words/paths, redact if it looks like a hash
    if (match.includes('/') || match.includes(' ') || match.length < 32) return match;
    return "[REDACTED_KEY]";
  });

  return sanitized;
}

/**
 * Marks a mission as picked up by a local executor.
 */
export async function markLocalMissionPickedUp(missionId: string): Promise<boolean> {
  try {
    const me = await User.me();
    const mission = await AutopilotMission.get(missionId);
    if (!mission) throw new Error("Mission not found");

    await AutopilotMission.update(missionId, {
      metadata: {
        ...mission.metadata,
        local_pickup_status: 'picked_up',
        local_picked_up_at: new Date().toISOString(),
        local_picked_up_by_email: me.email
      }
    });

    await AutopilotActionLog.create({
      department: "Mission Control",
      action_type: "LOCAL_PICKUP",
      status: "success",
      summary: `Mission Picked Up Locally: ${mission.id}`,
      details: `Mission "${mission.title}" marked as picked up by ${me.email}. Waiting for execution report.`,
      related_id: mission.id
    });

    return true;
  } catch (error) {
    console.error("Failed to mark mission as picked up:", error);
    return false;
  }
}

/**
 * Builds a safe run packet for a local executor.
 * NEVER includes raw secrets.
 */
export function buildLocalRunPacket(item: LocalExecutorPickupItem): LocalRunPacket {
  const { mission, request } = item;
  
  const gates = [
    `Permission: ${request?.permission_status || 'pending'}`,
    `Safety: ${request?.safety_validation_status || 'pending'}`,
    `Credentials: ${request?.credential_scope_status || 'not_required'}`,
    `Mode: ${request?.execution_mode || 'manual'}`
  ];

  // Redact any credential refs that look like raw secrets
  const safeCredRefs = (mission.metadata?.credential_refs || []).map((ref: string) => 
    ref.length > 32 && !ref.includes(' ') ? "[SENSITIVE_REDACTED]" : ref
  );

  // If sequential, use current step summary for instructions
  let instructions = mission.details || mission.metadata?.extraction_goal || "No specific instructions provided.";
  const seqState = getSequentialMissionState(mission);
  if (seqState && seqState.steps && seqState.steps[seqState.current_step_index]) {
    const step = seqState.steps[seqState.current_step_index];
    instructions = `[Step ${seqState.current_step_index + 1}: ${step.label}]\n\n${step.summary}\n\nMission Context: ${instructions}`;
  }

  return {
    version: "1.0.0",
    mission_id: mission.id,
    request_id: request?.id || "N/A",
    title: mission.title,
    type: mission.mission_type,
    action: mission.requested_action,
    provider: mission.metadata?.provider || request?.metadata?.provider,
    target_url: mission.metadata?.target_url || request?.metadata?.target_url,
    instructions,
    risk_level: mission.risk_level,
    required_gates: gates,
    credential_references: safeCredRefs,
    output_format: mission.metadata?.expected_result_format || "text/json",
    timestamp: new Date().toISOString(),
    do_not_run_unless: [
      "Permission status is APPROVED",
      "Safety validation status is PASSED",
      "Local host has been verified by the operator",
      "User session is authorized for high-risk action"
    ]
  };
}

/**
 * Reports the result of a local execution back to Buildy.
 */
export async function reportLocalExecutionResult(missionId: string, report: LocalExecutorReport): Promise<boolean> {
  try {
    const me = await User.me();
    const mission = await AutopilotMission.get(missionId);
    if (!mission) throw new Error("Mission not found");

    const requests = await VeloRealWorldActionRequest.list();
    const request = requests.find(r => r.related_mission_id === missionId);

    // 1. Sanitize report data
    const sanitizedSummary = sanitizeLocalReportText(report.summary);
    const sanitizedNotes = report.notes ? sanitizeLocalReportText(report.notes) : "";
    const sanitizedReport = {
      ...report,
      summary: sanitizedSummary,
      notes: sanitizedNotes
    };

    // 2. Update Mission
    let missionStatus: any = mission.status;
    if (report.outcome === "success") missionStatus = "executed";
    else if (report.outcome === "failed") missionStatus = "failed";
    else if (report.outcome === "needs_review") missionStatus = "pending";

    // Handle sequential mission progress if applicable
    const seqState = getSequentialMissionState(mission);
    if (seqState && seqState.steps && seqState.steps.length > 0) {
      if (report.outcome === "success") {
        await completeCurrentMissionStep(missionId, {
          summary: `Local execution success: ${sanitizedSummary}`,
          details: sanitizedNotes
        });
        // Keep a copy of the last local report in mission metadata for visibility
        const updatedMission = await AutopilotMission.get(missionId);
        await AutopilotMission.update(missionId, {
          metadata: {
            ...updatedMission?.metadata,
            local_executor_report: {
              ...sanitizedReport,
              reported_at: new Date().toISOString(),
              reported_by_email: me.email
            }
          }
        });

        // Learning is handled by sequentialMissionEngine -> captureSequentialMissionLearning
      } else if (report.outcome === "failed" || report.outcome === "blocked") {
        await failCurrentMissionStep(missionId, `Local execution failed: ${sanitizedSummary}. ${sanitizedNotes}`);
      }
    } else {
      // Legacy behavior for non-sequential missions
      const alreadyLearned = !!mission.metadata?.learning_captured_at;

      await AutopilotMission.update(missionId, {
        status: missionStatus,
        resolved_at: (report.outcome === "success" || report.outcome === "failed") ? new Date().toISOString() : undefined,
        metadata: {
          ...mission.metadata,
          local_executor_report: {
            ...sanitizedReport,
            reported_at: new Date().toISOString(),
            reported_by_email: me.email
          }
        }
      });

      // Record learning from local success for non-sequential
      if (report.outcome === "success" && !alreadyLearned) {
        try {
          const learned = await recordLearningOutcome({
            department: mission.source_department || "Local Operations",
            workflow_type: mission.mission_type,
            workflow_name: mission.title,
            steps: [{ label: "Local Execution", action: mission.requested_action, mode: "ubuntu_executor" }],
            outcome_label: 'success',
            success_score: 1.0,
            mission_id: missionId,
            notes: `Local success reported: ${sanitizedSummary}`
          });
          
          if (learned) {
            const updatedMission = await AutopilotMission.get(missionId);
            await AutopilotMission.update(missionId, {
              metadata: {
                ...updatedMission?.metadata,
                learning_captured_at: new Date().toISOString()
              }
            });
          }
        } catch (err) {
          console.error("Local learning capture failed:", err);
        }
      }
    }

    // 3. Update Request if present
    if (request) {
      let executionMode = request.execution_mode;
      if (report.outcome === "success") executionMode = "completed";
      else if (report.outcome === "failed" || report.outcome === "blocked") executionMode = "blocked";

      await VeloRealWorldActionRequest.update(request.id, {
        execution_mode: executionMode,
        completed_at: report.outcome === "success" ? new Date().toISOString() : undefined,
        provider_notes: sanitizedSummary + (sanitizedNotes ? `\n\nNotes: ${sanitizedNotes}` : "")
      });
    }

    // 4. Create Audit Log
    await AutopilotActionLog.create({
      department: mission.source_department || "Local Operations",
      action_type: "LOCAL_EXECUTION_REPORT",
      status: report.outcome === "success" ? "success" : "failure",
      summary: `Local Result Reported: ${report.outcome.toUpperCase()}`,
      details: `Mission: ${mission.title} (${mission.id}). Result: ${sanitizedSummary}. Reported by: ${me.email}.`,
      related_id: mission.id
    });

    return true;
  } catch (error) {
    console.error("Failed to report local execution result:", error);
    return false;
  }
}
