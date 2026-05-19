
import { 
  AutopilotMission, 
  VeloRealWorldActionRequest, 
  GalaxyOpportunityFeed, 
  VeloContentAsset,
  VeloBridgeJob,
  AutopilotActionLog,
  User,
  TradeScannerRun,
  TradeProductOpportunity
} from "@/entities";
import { isRecordOwnedByUser } from "./accessControl";
import { buildReviewSummary } from "./reviewCenter";

export type AutopilotStage = 'searching' | 'drafting' | 'queued' | 'waiting_external' | 'returned' | 'needs_decision' | 'completed' | 'blocked';

export interface TimelineItem {
  id: string;
  stage: AutopilotStage;
  title: string;
  summary: string;
  source_label: string;
  status_label: string;
  timestamp: string;
  action_label?: string;
  action_target?: string;
  risk_level?: string;
  metadata?: any;
}

export interface AutopilotUserBrief {
  headline: string;
  summary: string;
  workingNowCount: number;
  needsDecisionCount: number;
  waitingCount: number;
  completedCount: number;
  latestRealWorldSignal?: string;
  recommendedNextStepLabel: string;
  recommendedNextStepTarget: string;
}

/**
 * Builds a user-scoped timeline of Autopilot activity.
 */
export async function buildAutopilotTimeline(userEmail: string, isAdmin: boolean = false): Promise<TimelineItem[]> {
  const me = { email: userEmail };

  const [
    missions, 
    actionRequests, 
    opportunities, 
    contentAssets, 
    bridgeJobs, 
    logs,
    tradeRuns,
    tradeOpps
  ] = await Promise.all([
    isAdmin ? AutopilotMission.list("-updated_at", 30) : AutopilotMission.query().where("created_by", userEmail).sort("-updated_at").limit(20).exec().catch(() => []),
    isAdmin ? VeloRealWorldActionRequest.list("-updated_at", 30) : VeloRealWorldActionRequest.query().where("requested_by_email", userEmail).sort("-updated_at").limit(20).exec().catch(() => []),
    isAdmin ? GalaxyOpportunityFeed.list("-created_at", 30) : GalaxyOpportunityFeed.query().where("created_by", userEmail).sort("-created_at").limit(20).exec().catch(() => []),
    isAdmin ? VeloContentAsset.list("-updated_at", 30) : VeloContentAsset.query().where("created_by", userEmail).sort("-updated_at").limit(20).exec().catch(() => []),
    isAdmin ? VeloBridgeJob.list("-updated_at", 30) : VeloBridgeJob.query().where("owner_email", userEmail).sort("-updated_at").limit(20).exec().catch(() => []),
    isAdmin ? AutopilotActionLog.list("-created_at", 50) : AutopilotActionLog.query().where("created_by", userEmail).sort("-created_at").limit(40).exec().catch(() => []),
    isAdmin ? TradeScannerRun.list("-started_at", 10) : TradeScannerRun.query().where("created_by", userEmail).sort("-started_at").limit(10).exec().catch(() => []),
    isAdmin ? TradeProductOpportunity.list("-created_at", 20) : TradeProductOpportunity.query().where("created_by", userEmail).sort("-created_at").limit(20).exec().catch(() => [])
  ]);

  const items: TimelineItem[] = [];

  // 1. Process Missions
  missions.forEach((m: any) => {
    if (!isAdmin && m.created_by !== userEmail && m.metadata?.owner_email !== userEmail && m.metadata?.user_id !== userEmail) return;

    const stage = (m.metadata?.autopilot_stage || (m.status === 'pending' ? 'needs_decision' : (m.status === 'executed' ? 'completed' : 'searching'))) as AutopilotStage;
    
    items.push({
      id: m.id,
      stage,
      title: m.title,
      summary: m.metadata?.user_facing_summary || m.details || "Autopilot is processing this mission.",
      source_label: m.metadata?.department || "Mission Control",
      status_label: (m.status || "pending").toUpperCase(),
      timestamp: m.updated_at || m.created_at,
      action_label: stage === 'needs_decision' ? "Review Decision" : undefined,
      action_target: "action-engine",
      risk_level: m.risk_level,
      metadata: m.metadata
    });
  });

  // 2. Process Action Requests
  actionRequests.forEach((r: any) => {
    if (items.some(i => i.metadata?.related_mission_id === r.related_mission_id && r.related_mission_id)) return;

    let stage: AutopilotStage = 'queued';
    if (r.safety_validation_status === 'needs_review' || r.execution_mode === 'manual') stage = 'needs_decision';
    else if (r.connector_status === 'queued' || r.connector_status === 'pending_host' || r.connector_status === 'waiting_external') stage = 'waiting_external';
    else if (r.execution_mode === 'completed' || r.completed_at) stage = 'completed';

    items.push({
      id: r.id,
      stage,
      title: r.title,
      summary: r.required_approval_summary || r.explicit_user_request_summary || "Waiting for execution or review.",
      source_label: "Action Bridge",
      status_label: (r.permission_status || "pending").toUpperCase(),
      timestamp: r.updated_at || r.created_at,
      action_label: stage === 'needs_decision' ? "Review Request" : undefined,
      action_target: "action-engine",
      risk_level: r.risk_level
    });
  });

  // 3. Process Opportunities (Galaxy, Trade)
  opportunities.forEach((o: any) => {
    if (items.some(i => i.metadata?.opportunity_id === o.id || i.metadata?.trigger_source_id === o.id)) return;
    items.push({
      id: o.id,
      stage: 'searching',
      title: `Opportunity: ${o.title || 'Found matched work'}`,
      summary: `Discovered a high-match opportunity in ${o.source_name || 'market scanner'}.`,
      source_label: "Galaxy Scanner",
      status_label: "DISCOVERED",
      timestamp: o.created_at,
      action_label: "View Opportunity",
      action_target: "action-engine"
    });
  });

  tradeOpps.forEach((o: any) => {
    items.push({
      id: o.id,
      stage: 'searching',
      title: `Product Opportunity: ${o.title}`,
      summary: `Found high-demand product listing for ${o.category}.`,
      source_label: "Trade Bay",
      status_label: "DISCOVERED",
      timestamp: o.created_at,
      metadata: { department: "Trade Bay" }
    });
  });

  // 5. Process Scanner Runs
  tradeRuns.forEach((r: any) => {
    const stage: AutopilotStage = r.status === 'running' ? 'searching' : 'completed';
    items.push({
      id: r.id,
      stage,
      title: `Commerce Scan: ${r.target_marketplace}`,
      summary: `Searching for arbitrage opportunities in ${r.target_category}.`,
      source_label: "Trade Bay",
      status_label: r.status?.toUpperCase() || "IDLE",
      timestamp: r.started_at,
      metadata: { department: "Trade Bay" }
    });
  });

  // 6. Process Content Assets
  contentAssets.forEach((a: any) => {
    if (items.some(i => i.metadata?.content_asset_id === a.id || i.metadata?.related_asset_id === a.id)) return;

    items.push({
      id: a.id,
      stage: 'drafting',
      title: `Asset: ${a.title || 'Mission Draft'}`,
      summary: `Autopilot generated a ${a.asset_type || 'document'} for your review.`,
      source_label: "Drafting",
      status_label: "DRAFT_READY",
      timestamp: a.updated_at || a.created_at,
      action_label: "Open Archive",
      action_target: "content-archive"
    });
  });

  // 7. Process Bridge Jobs
  bridgeJobs.forEach((j: any) => {
    if (j.metadata?.absorbed_by_autopilot) return;

    let stage: AutopilotStage = 'waiting_external';
    if (j.status === 'completed' || j.completed_at) stage = 'returned';
    else if (j.status === 'failed' || j.status === 'denied' || j.status === 'emergency_blocked') stage = 'blocked';

    items.push({
      id: j.id,
      stage,
      title: `Runner Result: ${j.title || 'External Execution'}`,
      summary: j.result_summary || (j.status === 'staged' ? "Job staged for local pickup." : "An external runner is processing this request."),
      source_label: "Local Runner",
      status_label: (j.status || "pending").toUpperCase(),
      timestamp: j.updated_at || j.created_at,
      action_label: "View Progress",
      action_target: "mission-monitor"
    });
  });

  // 8. Process All Activity Logs
  logs.forEach((l: any) => {
    if (l.related_id && items.some(i => i.id === l.related_id)) return;
    if (items.some(i => i.id === l.id)) return;

    let stage: AutopilotStage = 'completed';
    if (l.action_type?.startsWith("LANE_")) {
       stage = l.action_type.replace("LANE_", "").toLowerCase() as AutopilotStage;
    } else {
      if (l.status === 'pending') stage = 'queued';
      else if (l.status === 'blocked' || l.status === 'failure') stage = 'blocked';
      else if (l.status === 'success' || l.status === 'completed') stage = 'completed';
    }

    items.push({
      id: l.id,
      stage,
      title: l.summary || l.action_type || "Pilot Action",
      summary: l.details || `Autopilot performed an action in the ${l.department} lane.`,
      source_label: l.department || "Autopilot",
      status_label: (l.status || "completed").toUpperCase(),
      timestamp: l.created_at,
      action_label: stage === 'needs_decision' ? "Review Activity" : undefined,
      action_target: "action-engine",
      metadata: { ...l, department: l.department, log_id: l.id }
    });
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Generates an intelligent high-level brief of Autopilot status for the user.
 */
export async function getAutopilotUserBrief(userEmail: string, isAdmin: boolean = false): Promise<AutopilotUserBrief> {
  const timeline = await buildAutopilotTimeline(userEmail, isAdmin).catch(() => []);
  
  const workingNow = timeline.filter(i => ['searching', 'drafting', 'queued', 'returned'].includes(i.stage));
  const needsDecision = timeline.filter(i => i.stage === 'needs_decision');
  const waiting = timeline.filter(i => i.stage === 'waiting_external');
  const completed = timeline.filter(i => i.stage === 'completed');

  // Find latest real-world signal (from opportunities or risks)
  const signal = timeline.find(i => 
    i.source_label.includes("Bay") || 
    i.source_label.includes("Scanner")
  );

  let headline = "Autopilot is standby.";
  let summary = "Monitoring freelance and commerce lanes for your next opportunity.";
  let nextStepLabel = "Open Assistant";
  let nextStepTarget = "autopilot";

  if (workingNow.length > 0) {
    const top = workingNow[0];
    headline = "Autopilot is active.";
    summary = `Currently ${top.stage}: ${top.title}. ${workingNow.length > 1 ? `(+${workingNow.length - 1} other tasks)` : ''}`;
  } else if (needsDecision.length > 0) {
    headline = "Decision required.";
    summary = `Autopilot found ${needsDecision.length} items requiring your review before proceeding.`;
    nextStepLabel = "Review Decisions";
    nextStepTarget = "action-engine";
  } else if (waiting.length > 0) {
    headline = "Waiting for runner.";
    summary = `Autopilot is waiting for local or Ubuntu execution results for ${waiting.length} tasks.`;
    nextStepLabel = "Check Runner";
    nextStepTarget = "connection-hub";
  }

  return {
    headline,
    summary,
    workingNowCount: workingNow.length,
    needsDecisionCount: needsDecision.length,
    waitingCount: waiting.length,
    completedCount: completed.length,
    latestRealWorldSignal: signal?.summary,
    recommendedNextStepLabel: nextStepLabel,
    recommendedNextStepTarget: nextStepTarget
  };
}


/**
 * Gets a department-specific summary for the Autopilot panel.
 */
export async function getDepartmentAutopilotSummary(department: string, userEmail: string, isAdmin: boolean = false) {
  try {
    if (!userEmail) {
      return {
        state: 'waiting' as const,
        reviewCount: 0,
        latestAction: "Initializing system link..."
      };
    }

    const timeline = await buildAutopilotTimeline(userEmail, isAdmin).catch(() => []);
    const deptItems = timeline.filter(item => {
      const meta = item.metadata || {};
      const deptMatch = meta.department?.toLowerCase() === department.toLowerCase();
      const sourceMatch = item.source_label.toLowerCase().includes(department.toLowerCase());
      return deptMatch || sourceMatch;
    });

    const reviewItems = deptItems.filter(i => i.stage === 'needs_decision');
    const activeStages: AutopilotStage[] = ['searching', 'drafting', 'queued', 'waiting_external', 'returned'];
    const activeItems = deptItems.filter(i => activeStages.includes(i.stage));
    
    return {
      state: activeItems.length > 0 ? 'active' as const : 'waiting' as const,
      reviewCount: reviewItems.length,
      latestAction: deptItems[0]?.title || `Monitoring for ${department} opportunities`
    };
  } catch (error) {
    console.error(`Failed to get Autopilot summary for ${department}:`, error);
    return {
      state: 'waiting' as const,
      reviewCount: 0,
      latestAction: "Monitoring for opportunities"
    };
  }
}

/**
 * Gets the current summary of the Autopilot cycle.
 */
export function getAutopilotCycleSummary(items: TimelineItem[], autopilotEnabled: boolean = true): string {
  if (items.length === 0) {
    return autopilotEnabled ? "Preparing first cycle. Autopilot is warming up..." : "Autopilot is offline.";
  }
  
  const active = items.find(i => ['searching', 'drafting', 'queued', 'waiting_external', 'returned'].includes(i.stage));
  if (active) {
    return `Autopilot is active: ${active.title}.`;
  }
  
  const decision = items.find(i => i.stage === 'needs_decision');
  if (decision) {
    return `Autopilot needs your decision: ${decision.title}.`;
  }

  const completed = items.find(i => i.stage === 'completed');
  if (completed) {
    return `Autopilot recently completed: ${completed.title}.`;
  }

  return "Autopilot is monitoring for new opportunities.";
}
