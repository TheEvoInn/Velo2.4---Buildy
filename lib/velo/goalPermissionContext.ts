
import { AutopilotProfile, AutopilotPermission } from "@/entities";

export type GoalLane = 'freelance' | 'commerce' | 'market_research' | 'outreach' | 'profile' | 'general';

export interface GoalPermissionContext {
  goalLane: GoalLane;
  isSafePreparationAllowed: boolean;
  approvedDepartments: string[];
  blockedReasons: string[];
}

/**
 * Detects the goal lane for a mission based on its title, details, or metadata.
 */
export function detectGoalLane(mission: any): GoalLane {
  if (!mission) return 'general';
  
  const title = (mission.title || "").toLowerCase();
  const details = (mission.details || "").toLowerCase();
  const missionType = (mission.mission_type || "").toUpperCase();
  const goal = (mission.metadata?.goal || "").toLowerCase();

  const text = `${title} ${details} ${goal} ${missionType}`;

  if (text.includes("freelance") || text.includes("gig") || text.includes("find work") || text.includes("upwork") || text.includes("fiverr")) {
    return 'freelance';
  }
  
  if (text.includes("commerce") || text.includes("digital product") || text.includes("shop") || text.includes("store") || text.includes("listing") || text.includes("print on demand") || text.includes("pod") || text.includes("dropship") || text.includes("merch") || text.includes("tshirt") || text.includes("apparel") || text.includes("sales page")) {
    return 'commerce';
  }
  
  if (text.includes("trade") || text.includes("market") || text.includes("crypto") || text.includes("trading") || text.includes("portfolio")) {
    return 'market_research';
  }
  
  if (text.includes("outreach") || text.includes("lead") || text.includes("prospect") || text.includes("campaign") || text.includes("email")) {
    return 'outreach';
  }
  
  if (text.includes("profile") || text.includes("resume") || text.includes("bio") || text.includes("onboarding")) {
    return 'profile';
  }
  
  return 'general';
}

/**
 * Builds a goal and permission context for a user and mission.
 */
export async function getGoalPermissionContext(mission: any, user: any): Promise<GoalPermissionContext> {
  const lane = detectGoalLane(mission);
  const blockedReasons: string[] = [];
  
  // 1. Check Profile
  const profiles = await AutopilotProfile.list();
  const profile = profiles.find(p => p.created_by === user?.email);
  
  if (!profile) {
    blockedReasons.push("Missing pilot profile");
  }

  // 2. Check Permissions
  const permissions = await AutopilotPermission.list();
  const userPermissions = permissions.filter(p => p.created_by === user?.email && p.status === 'active');
  
  const approvedDepartments = userPermissions.map(p => p.department);

  // 3. Determine if safe preparation is allowed
  // Safe preparation is allowed if:
  // - The user has a profile
  // - AND the mission is in a lane that the user has shown interest in (via profile description or previous approvals)
  // - OR the mission is explicitly marked as "approved" or "goal_lane_safe"
  
  let isSafePreparationAllowed = false;
  
  if (profile && !blockedReasons.length) {
    const laneText = lane === 'freelance' ? 'freelance' : 
                     lane === 'commerce' ? 'commerce' : 
                     lane === 'market_research' ? 'trading' : 
                     lane === 'outreach' ? 'outreach' : 'profile';
    
    const profileText = `${profile.service_description} ${profile.product_focus} ${profile.autopilot_brief}`.toLowerCase();
    
    if (profileText.includes(laneText) || mission.metadata?.goal_lane_safe) {
      isSafePreparationAllowed = true;
    }
  }

  return {
    goalLane: lane,
    isSafePreparationAllowed,
    approvedDepartments,
    blockedReasons
  };
}

/**
 * Identifies if an action is a critical user decision gate (review, approval, submission).
 * These must NEVER be automated even if they use "safe" categories.
 */
export function isUserDecisionAction(actionType: string, text?: string): boolean {
  const type = (actionType || "").toUpperCase();
  const content = (text || "").toLowerCase();
  
  const decisionKeywords = [
    "review", "approval", "confirm", "publish", "send", "submit", "authorize", 
    "gate", "final sign-off", "strategic review", "submission review", "validation",
    "credential", "payment", "trading", "money", "external", "public", "manual",
    "sign-off", "human gate", "manual review"
  ];
  
  const highRiskTypes = [
    "MONEY_MOVEMENT", "TRADING_EXECUTION", "CREDENTIAL_USE", 
    "CLIENT_MESSAGING_EXTERNAL", "PUBLISHING_EXTERNAL", "APPLICATION_SUBMISSION_EXTERNAL"
  ];

  if (highRiskTypes.some(t => type.includes(t))) return true;
  if (decisionKeywords.some(k => content.includes(k))) return true;
  
  return false;
}

/**
 * Checks if a specific action type is considered "safe internal preparation" within a goal lane.
 */
export function isSafeInternalAction(actionType: string, riskLevel: string, titleOrDetails?: string): boolean {
  const type = actionType.toUpperCase();
  const isLowRisk = riskLevel === 'low';
  
  // If it's a user decision gate, it is NOT a safe internal auto-action
  if (isUserDecisionAction(actionType, titleOrDetails)) return false;
  
  const internalTypes = [
    "WORKFLOW_CREATION", 
    "TEMPLATE_GENERATION", 
    "INTERNAL_PLANNING", 
    "PLATFORM_PREP_INTERNAL",
    "PLAYBOOK_SYNC",
    "SYSTEM_ORIENTATION",
    "DIAGNOSTICS",
    "DATABASE_WRITE",
    "AI_LOGIC_SYNC",
    "CONTENT_GENERATION_INTERNAL",
    "DRAFT_CONTENT_INTERNAL",
    "OPPORTUNITY_RESEARCH",
    "LEAD_DISCOVERY",
    "PROSPECT_RESEARCH",
    "ACCOUNT_UPDATES",
    "PRODUCT_RESEARCH",
    "DESIGN_GENERATION",
    "MOCKUP_GENERATION",
    "STORE_CREATION",
    "MARKETING_CREATION"
  ];

  return isLowRisk && internalTypes.some(t => type.includes(t));
}
