
import { 
  AutopilotMission, 
  VeloRealWorldActionRequest, 
  GalaxyOpportunityFeed, 
  VeloContentAsset,
  AutopilotActionLog
} from "@/entities";

export interface OperatingItem {
  id: string;
  type: 'active' | 'review' | 'opportunity' | 'queued' | 'starter';
  title: string;
  description: string;
  status: string;
  timestamp: string;
  navigationId: string;
  priority: number; // 1 (highest) to 10
  recommendedPrompt?: string;
  actionKind?: 'buildy-active' | 'queued-follow-up';
}

export interface MissionStarter {
  label: string;
  description: string;
  prompt: string;
  icon: string;
  actionKind: 'buildy-active' | 'queued-follow-up';
}

export interface BuildyOperatingSnapshot {
  activeWork: OperatingItem[];
  needsReview: OperatingItem[];
  opportunityPipeline: OperatingItem[];
  queuedForUbuntu: OperatingItem[];
  missionStarters: MissionStarter[];
  nextBestAction: OperatingItem | null;
  counts: {
    active: number;
    review: number;
    opportunity: number;
    queued: number;
    platforms: number;
  };
}

export const MISSION_STARTERS: MissionStarter[] = [
  {
    label: "Find Online Digital Gigs",
    description: "Prioritize 100% online, instant-claim digital tasks, bounties, and AI training work.",
    prompt: "Find online digital gigs and instant-claim tasks that can be completed 100% remotely. Prioritize microtasks, bounties, and fixed-scope digital projects over traditional jobs.",
    icon: "Zap",
    actionKind: "buildy-active"
  },
  {
    label: "Find Freelance Leads",
    description: "Scan for traditional freelance roles and prepare tailored proposals.",
    prompt: "Find traditional freelance leads matching my skills and draft tailored proposals for my review.",
    icon: "Target",
    actionKind: "buildy-active"
  },
  {
    label: "Research Commerce",
    description: "Identify high-margin commerce opportunities and trending product niches for your shop.",
    prompt: "Research high-margin commerce opportunities and trending niches for Commerce Hub listings.",
    icon: "ShoppingBag",
    actionKind: "buildy-active"
  },
  {
    label: "Draft Outreach",
    description: "Prepare professional message sequences for clients or partners to review.",
    prompt: "Draft a sequence of 3 professional outreach messages for potential partners or clients.",
    icon: "Mail",
    actionKind: "buildy-active"
  },
  {
    label: "Optimize Profile",
    description: "Strengthen your digital clone and readiness for external platform onboarding.",
    prompt: "Analyze my current profile and draft improvements to maximize trust and readiness.",
    icon: "User",
    actionKind: "buildy-active"
  }
];

/**
 * Builds a user-scoped operating snapshot from provided records.
 */
export function buildBuildyOperatingSnapshot(records: {
  missions: any[];
  actionRequests: any[];
  opportunities: any[];
  contentAssets: any[];
  recentLogs: any[];
  platforms?: any[];
}): BuildyOperatingSnapshot {
  const activeWork: OperatingItem[] = [];
  const needsReview: OperatingItem[] = [];
  const opportunityPipeline: OperatingItem[] = [];
  const queuedForUbuntu: OperatingItem[] = [];

  // 1. Process Missions
  records.missions.forEach(m => {
    const timestamp = m.updated_at || m.created_at;
    if (m.status === 'failed') {
      needsReview.push({
        id: m.id,
        type: 'review',
        title: `Fix Failed Mission: ${m.title}`,
        description: `Mission stalled in ${m.source_department}. ${m.metadata?.visible_error_message || 'Action required to resume.'}`,
        status: 'Action Required',
        timestamp,
        navigationId: 'action-engine',
        priority: 0 // Absolute highest
      });
    } else if (m.status === 'approved' || m.status === 'in_progress') {
      activeWork.push({
        id: m.id,
        type: 'active',
        title: m.title,
        description: m.metadata?.last_visible_status || `Mission in progress in ${m.source_department}.`,
        status: m.status === 'approved' ? 'Ready for next step' : 'Working in Buildy',
        timestamp,
        navigationId: 'action-engine',
        priority: 3
      });
    } else if (m.status === 'pending') {
      const preflight = m.metadata?.preflight_status;
      const isBlocked = preflight === 'blocked' || (m.metadata?.preflight_blocker_count || 0) > 0;
      
      needsReview.push({
        id: m.id,
        type: 'review',
        title: isBlocked ? `Setup Required: ${m.title}` : `Authorize Mission: ${m.title}`,
        description: isBlocked ? "Missing profile or connection requirements." : `Strategic plan prepared. Needs your command review to proceed.`,
        status: isBlocked ? 'Setup Required' : 'Needs your review',
        timestamp,
        navigationId: 'action-engine',
        priority: isBlocked ? 1.5 : 1
      });
    }
  });

  // 2. Process Content Assets
  records.contentAssets.forEach(a => {
    if (a.status === 'ready' || a.status === 'draft') {
      needsReview.push({
        id: a.id,
        type: 'review',
        title: `Review Content: ${a.title}`,
        description: `Autopilot drafted a ${a.asset_type || 'document'} for you.`,
        status: 'Draft ready',
        timestamp: a.updated_at || a.created_at,
        navigationId: 'content-arsenal',
        priority: 2
      });
    }
  });

  // 3. Process Action Requests (Ubuntu Lane)
  records.actionRequests.forEach(r => {
    const timestamp = r.created_at;
    if (r.execution_mode === 'queued_for_ubuntu') {
      queuedForUbuntu.push({
        id: r.id,
        type: 'queued',
        title: r.title,
        description: `This action requires local execution. Waiting for your computer.`,
        status: 'Waiting for your computer',
        timestamp,
        navigationId: 'real-world-center',
        priority: 5
      });
    } else if (r.safety_validation_status === 'needs_review' || r.permission_status === 'pending') {
      needsReview.push({
        id: r.id,
        type: 'review',
        title: `Authorize Action: ${r.title}`,
        description: `External action requested. Needs high-risk validation.`,
        status: 'High-risk review',
        timestamp,
        navigationId: 'real-world-center',
        priority: 1
      });
    }
  });

  // 4. Process Opportunities
  records.opportunities.forEach(o => {
    const m = o.metadata || {};
    let priority = 4;
    let status = 'Ready for action';
    
    // Prioritize high-fit online digital gigs
    if (m.online_completion_fit === 'high' && !m.is_traditional_job) {
      priority = 2;
      status = 'High-fit digital gig';
    } else if (m.instant_claim_fit === 'high') {
      priority = 3;
      status = 'Online task ready';
    } else if (m.is_traditional_job) {
      priority = 6;
      status = 'Traditional job';
    }
    
    if (m.requires_ubuntu || o.requires_ubuntu) {
      status = 'Needs local claim';
    }

    opportunityPipeline.push({
      id: o.id,
      type: 'opportunity',
      title: o.title,
      description: o.summary || `New opportunity found in ${o.department}.`,
      status,
      timestamp: o.created_at,
      navigationId: 'galaxy-scanner',
      priority,
      actionKind: 'buildy-active'
    });
  });

  // 5. Add Starters if snapshot is relatively empty or as baseline options
  const missionStarters = MISSION_STARTERS;

  // Sort all lists by priority and timestamp
  const sortFn = (a: OperatingItem, b: OperatingItem) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  };

  activeWork.sort(sortFn);
  needsReview.sort(sortFn);
  opportunityPipeline.sort(sortFn);
  queuedForUbuntu.sort(sortFn);

  // Determine Next Best Action
  let nextBestAction: OperatingItem | null = null;
  if (needsReview.length > 0) {
    nextBestAction = needsReview[0];
  } else if (opportunityPipeline.length > 0) {
    nextBestAction = opportunityPipeline[0];
  } else if (activeWork.length > 0) {
    nextBestAction = activeWork[0];
  } else if (queuedForUbuntu.length > 0 && (needsReview.length === 0 && opportunityPipeline.length === 0 && activeWork.length === 0)) {
    // Only suggest Ubuntu queued as "next best" if there's nothing else to do on Buildy
    nextBestAction = queuedForUbuntu[0];
  } else if (activeWork.length === 0 && needsReview.length === 0 && opportunityPipeline.length === 0) {
    // If truly empty, suggest a starter
    const starter = MISSION_STARTERS[0];
    nextBestAction = {
      id: 'starter-1',
      type: 'starter',
      title: starter.label,
      description: starter.description,
      status: 'Ready to start',
      timestamp: new Date().toISOString(),
      navigationId: 'autopilot',
      priority: 10,
      recommendedPrompt: starter.prompt,
      actionKind: starter.actionKind
    };
  }

  return {
    activeWork,
    needsReview,
    opportunityPipeline,
    queuedForUbuntu,
    missionStarters,
    nextBestAction,
    counts: {
      active: activeWork.length,
      review: needsReview.length,
      opportunity: opportunityPipeline.length,
      queued: queuedForUbuntu.length,
      platforms: (records.platforms || []).length
    }
  };
}
