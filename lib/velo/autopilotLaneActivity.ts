
import { AutopilotActionLog, AutopilotMission, User } from "@/entities";
import { createSafeActionLog } from "./scannerNormalization";

export type LaneStage = 'searching' | 'drafting' | 'queued' | 'waiting_external' | 'returned' | 'needs_decision' | 'completed' | 'blocked';

export interface LaneActivityParams {
  department: string;
  stage: LaneStage;
  title: string;
  summary: string;
  details?: string;
  relatedId?: string;
  relatedType?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

/**
 * Records a meaningful milestone in a department's Autopilot lane.
 * These logs are picked up by the Autopilot Timeline on the dashboard.
 */
export async function recordLaneActivity(params: LaneActivityParams) {
  try {
    const user = await User.me().catch(() => null);
    if (!user) return null;

    return await createSafeActionLog({
      department: params.department,
      action_type: `LANE_${params.stage.toUpperCase()}`,
      status: params.stage === 'blocked' ? 'failure' : (params.stage === 'completed' ? 'success' : 'pending'),
      summary: params.summary,
      details: params.details,
      related_id: params.relatedId,
      // Metadata is not a standard field in AutopilotActionLog schema based on scannerNormalization
      // but we can pass it if we want to expand, though createSafeActionLog doesn't take it.
      // Let's stick to the existing schema but we can put metadata in details if needed as JSON.
    });
  } catch (error) {
    console.error(`[LANE ACTIVITY] Failed to record activity for ${params.department}:`, error);
    return null;
  }
}

/**
 * Specifically records that a department has staged an item requiring user review.
 */
export async function recordLaneDecision(params: Omit<LaneActivityParams, 'stage'>) {
  return recordLaneActivity({
    ...params,
    stage: 'needs_decision'
  });
}

/**
 * Standardizes the "Autopilot is X" status messages for department summaries.
 */
export function getLaneStatusMessage(stage: LaneStage, latestTitle: string): string {
  switch (stage) {
    case 'searching': return `Searching: ${latestTitle}`;
    case 'drafting': return `Drafting: ${latestTitle}`;
    case 'queued': return `Queued: ${latestTitle}`;
    case 'waiting_external': return `Waiting for external: ${latestTitle}`;
    case 'returned': return `Result absorbed: ${latestTitle}`;
    case 'needs_decision': return `Review needed: ${latestTitle}`;
    case 'completed': return `Completed: ${latestTitle}`;
    case 'blocked': return `Blocked: ${latestTitle}`;
    default: return latestTitle;
  }
}
