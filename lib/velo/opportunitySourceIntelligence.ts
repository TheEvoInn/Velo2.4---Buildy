
/**
 * Source intelligence for real-world opportunity discovery and Autopilot execution.
 */

export interface OpportunityLane {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  targetPlatforms: string[];
  requirements: string[];
  autopilotSafeActions: string[];
  accountNeeds: string[];
}

export const OPPORTUNITY_LANES: OpportunityLane[] = [
  {
    id: "ai_training",
    label: "AI Training & Evaluation",
    description: "Training LLMs through RLHF, data labeling, and model evaluation.",
    keywords: ["rlhf", "data labeling", "model evaluation", "prompt engineering", "alignment", "annotation", "ai training", "dataset", "instruction tuning", "human feedback", "multimodal", "fine-tuning"],
    targetPlatforms: ["Remotasks", "DataAnnotation.tech", "Outlier", "Appen", "Invisible Tech"],
    requirements: ["English proficiency", "Analytical thinking", "Subject matter expertise"],
    autopilotSafeActions: ["opportunity_research", "content_generation_internal", "skill_matching"],
    accountNeeds: ["Identity verification usually required", "PayPal/Payoneer account"]
  },
  {
    id: "online_testing",
    label: "Online Testing & QA",
    description: "Testing websites, apps, and software for bugs and usability.",
    keywords: ["user testing", "qa cycle", "bug report", "usability test", "website test", "mobile test", "beta test", "test cycle", "uxtesting", "software testing", "test case"],
    targetPlatforms: ["UserTesting", "uTest", "TestIO", "Userlytics", "TryMyUI"],
    requirements: ["Device access", "Stable internet", "Critical eye"],
    autopilotSafeActions: ["opportunity_research", "workflow_creation", "preparation_brief"],
    accountNeeds: ["PayPal account", "Identity verification sometimes required"]
  },
  {
    id: "microtasks",
    label: "Microtasks & Data Gigs",
    description: "Short, high-speed tasks like categorization, transcription, or surveys.",
    keywords: ["microtask", "survey", "transcription", "categorization", "moderation", "clickworker", "uhrs", "short task", "paid study", "paid studies", "prolific", "mturk"],
    targetPlatforms: ["Amazon Mechanical Turk", "Clickworker", "Prolific", "OneForma", "Toloka"],
    requirements: ["Speed", "Accuracy", "Reliability"],
    autopilotSafeActions: ["opportunity_research", "task_preparation", "efficiency_optimization"],
    accountNeeds: ["Varies by platform", "Identity verification often required"]
  },
  {
    id: "ai_freelance",
    label: "AI Freelance Projects",
    description: "Custom AI implementation, automation, and chatbot development.",
    keywords: ["no-code ai", "chatbot setup", "automation workflow", "ai assistant", "research automation", "gpt customization", "ai automation gig", "ai freelance"],
    targetPlatforms: ["Upwork", "Fiverr", "Toptal", "Freelancer"],
    requirements: ["Technical implementation skills", "Client communication"],
    autopilotSafeActions: ["prospect_research", "content_generation_internal", "workflow_creation"],
    accountNeeds: ["Platform profile", "Portfolio items"]
  },
  {
    id: "content_research",
    label: "Content & Research Work",
    description: "Data gathering, summarization, and content quality assurance.",
    keywords: ["research brief", "data gathering", "summarization", "content qa", "editorial review", "article writing", "research gig", "content work"],
    targetPlatforms: ["ClearVoice", "Skyword", "Contently", "Direct Clients"],
    requirements: ["Research skills", "Writing proficiency"],
    autopilotSafeActions: ["prospect_research", "research_brief", "content_generation_internal"],
    accountNeeds: ["Portfolio", "Specialized niche profiles"]
  },
  {
    id: "global_language",
    label: "Global Language Tasks",
    description: "Translation, localization, and multilingual review.",
    keywords: ["translation", "localization", "bilingual", "multilingual", "interpretation", "transcription", "language qa", "translation gig", "localization work"],
    targetPlatforms: ["Gengo", "Unbabel", "Lionbridge", "Translated.com"],
    requirements: ["Native-level fluency", "Cultural context awareness"],
    autopilotSafeActions: ["opportunity_research", "content_generation_internal", "workflow_creation"],
    accountNeeds: ["Fluency verification", "Language proficiency tests"]
  }
];

/**
 * Normalizes lane ID aliases.
 */
export function normalizeLaneId(laneId: string): string {
  const low = laneId.toLowerCase();
  if (low === "microtask" || low === "microtasks") return "microtasks";
  if (low === "ai_training" || low === "ai-training") return "ai_training";
  if (low === "online_testing" || low === "online-testing" || low === "qa") return "online_testing";
  if (low === "ai_freelance" || low === "ai-freelance") return "ai_freelance";
  if (low === "content_research" || low === "content-research") return "content_research";
  if (low === "global_language" || low === "global-language" || low === "translation") return "global_language";
  return low;
}

/**
 * Detects the most likely opportunity lane from text.
 */
export function detectOpportunityGoalLane(text: string): OpportunityLane | null {
  const lowText = text.toLowerCase();
  
  // Explicit mappings for common lane synonyms
  if (lowText.includes("microtask")) {
    return OPPORTUNITY_LANES.find(l => l.id === "microtasks") || null;
  }
  
  return OPPORTUNITY_LANES.find(lane => 
    lane.keywords.some(k => lowText.includes(k)) || 
    lane.label.toLowerCase().includes(lowText)
  ) || null;
}

export interface OpportunityPreferences {
  verified_payout_only: boolean;
  avoid_id_verification: boolean;
  avoid_account_creation: boolean;
  low_risk_only: boolean;
  remote_only: boolean;
  quick_tasks_only: boolean;
  focus_lane?: string;
  focus_keywords?: string[];
}

/**
 * Detects safe preference directives from natural language.
 */
export function parseOpportunityPreferenceDirectives(text: string): OpportunityPreferences {
  const lowText = text.toLowerCase();
  
  return {
    verified_payout_only: lowText.includes("verified payout") || lowText.includes("real payout") || lowText.includes("paid only"),
    avoid_id_verification: lowText.includes("avoid id") || lowText.includes("no kyc") || lowText.includes("no passport") || lowText.includes("avoid verification"),
    avoid_account_creation: lowText.includes("avoid account") || lowText.includes("no signup") || lowText.includes("low friction"),
    low_risk_only: lowText.includes("low risk") || lowText.includes("safe only"),
    remote_only: lowText.includes("remote only") || lowText.includes("online only") || lowText.includes("work from home"),
    quick_tasks_only: lowText.includes("quick task") || lowText.includes("short task") || lowText.includes("same day") || lowText.includes("same-day")
  };
}

/**
 * Merges new preferences with existing ones safely.
 */
export function mergeOpportunityPreferences(existing: any, updates: OpportunityPreferences): any {
  const current = typeof existing === 'string' ? JSON.parse(existing) : (existing || {});
  
  return {
    ...current,
    opportunity_preferences: {
      ...(current.opportunity_preferences || {}),
      ...updates,
      updated_at: new Date().toISOString()
    }
  };
}

/**
 * Maps an opportunity lane ID to a scanner lane ID.
 */
export function getScannerLaneForOpportunityLane(laneId: string): string {
  // Most match 1:1, but microtasks vs microtask is common
  if (laneId === "microtasks") return "microtask";
  return laneId;
}

/**
 * Builds a normalized opportunity preference payload for profile metadata.
 * Includes both primary and compatibility keys.
 */
export function buildOpportunityPreferencePayload(
  existingMetadata: any, 
  lane: OpportunityLane | null, 
  directives: OpportunityPreferences
) {
  const current = typeof existingMetadata === 'string' ? JSON.parse(existingMetadata) : (existingMetadata || {});
  const existingPrefs = current.opportunity_preferences || current.opportunityPreferences || {};
  
  const scannerLanes = lane ? [getScannerLaneForOpportunityLane(lane.id)] : (existingPrefs.scannerLanes || []);
  
  const preferenceObj = {
    ...existingPrefs,
    ...directives,
    focus_lane: lane?.id || existingPrefs.focus_lane,
    focus_keywords: lane?.keywords || existingPrefs.focus_keywords || [],
    scannerLanes,
    updated_at: new Date().toISOString(),
    source: "chat"
  };

  return {
    ...current,
    opportunity_preferences: preferenceObj,
    opportunityPreferences: preferenceObj // Compatibility key
  };
}

/**
 * Checks if the preference object contains any active user-defined directives.
 */
export function hasActiveOpportunityPreferences(preferences: OpportunityPreferences | null | undefined): boolean {
  if (!preferences) return false;
  return !!(
    preferences.verified_payout_only ||
    preferences.avoid_id_verification ||
    preferences.avoid_account_creation ||
    preferences.low_risk_only ||
    preferences.remote_only ||
    preferences.quick_tasks_only ||
    preferences.focus_lane ||
    (preferences.focus_keywords && preferences.focus_keywords.length > 0)
  );
}

/**
 * Builds goal context for Autopilot based on the detected lane.
 */
export function buildOpportunityGoalContext(goal: string, profile?: any) {
  const lane = detectOpportunityGoalLane(goal);
  const preferences = parseOpportunityPreferenceDirectives(goal);
  
  // Safely parse profile metadata if available
  let profileMetadata: any = {};
  try {
    profileMetadata = typeof profile?.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata) 
      : (profile?.onboarding_metadata || {});
  } catch (err) {
    console.warn("[VELO] Failed to parse profile onboarding metadata", err);
    profileMetadata = {};
  }
    
  const storedPrefs = profileMetadata.opportunity_preferences || profileMetadata.opportunityPreferences || {};
  
  const laneId = lane?.id || storedPrefs.focus_lane;
  const activeLane = OPPORTUNITY_LANES.find(l => l.id === normalizeLaneId(laneId || ""));

  const hasActiveDirectives = hasActiveOpportunityPreferences(preferences) || hasActiveOpportunityPreferences(storedPrefs);

  if (!activeLane && !hasActiveDirectives) return null;

  return {
    lane: activeLane?.id,
    label: activeLane?.label,
    keywords: activeLane?.keywords || storedPrefs.focus_keywords || [],
    target_platforms: activeLane?.targetPlatforms || storedPrefs.target_platforms || [],
    suggested_actions: activeLane?.autopilotSafeActions || ["opportunity_research"],
    requirements: activeLane?.requirements || [],
    account_needs: activeLane?.accountNeeds || [],
    preferences: {
      ...storedPrefs,
      ...preferences
    },
    metadata: {
      discovery_focus: activeLane?.id,
      real_world_priority: "high",
      verified_sources_only: preferences.verified_payout_only || storedPrefs.verified_payout_only,
      ...storedPrefs,
      ...preferences
    }
  };
}
