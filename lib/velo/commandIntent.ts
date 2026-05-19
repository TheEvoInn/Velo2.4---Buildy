





import { invokeLLM } from "@/integrations/core";

/**
 * Shared deterministic intent helpers for Command Officer and Autopilot.
 */

export const VELO_MODULE_ALIASES: Record<string, string> = {
  "mission control": "dashboard",
  "dashboard": "dashboard",
  "launch checklist": "dashboard",
  "onboarding": "onboarding",
  "setup": "onboarding",
  "start setup": "onboarding",
  "finish setup": "onboarding",
  "start onboarding": "onboarding",
  "restart onboarding": "onboarding",
  "go-live readiness": "dashboard",
  "readiness": "dashboard",
  
  "autopilot": "autopilot",
  "command officer": "autopilot",
  "officer": "autopilot",
  "mission loop": "autopilot",
  "active loop": "autopilot",
  "continue mission": "autopilot",
  "resume mission": "autopilot",
  
  "clone bay": "clone-bay",
  "identity": "clone-bay",
  "profile": "clone-bay",
  "edit profile": "clone-bay",
  "update profile": "clone-bay",
  "edit skills": "clone-bay",
  "preferences": "clone-bay",
  "profile completion": "clone-bay",
  "complete profile": "clone-bay",
  "skills": "clone-bay",
  "boundaries": "clone-bay",
  "digital clone": "clone-bay",
  
  "secure core": "secure-core",
  "vault": "secure-core",
  "security": "secure-core",
  "security vault": "secure-core",
  "credentials": "secure-core",
  "sensitive labels": "secure-core",
  
  "galaxy scanner": "galaxy-scanner",
  "scanner": "galaxy-scanner",
  "find work": "galaxy-scanner",
  "find gigs": "galaxy-scanner",
  "search opportunities": "galaxy-scanner",
  "income opportunities": "galaxy-scanner",
  "opportunity feed": "galaxy-scanner",
  "work opportunities": "galaxy-scanner",
  
  "action center": "action-engine",
  "review center": "action-engine",
  "show what needs review": "action-engine",
  "needs review": "action-engine",
  "action engine": "action-engine",
  "approvals": "action-engine",
  "approval queue": "action-engine",
  "approve": "action-engine",
  "approve actions": "action-engine",
  "reject actions": "action-engine",
  "review work": "action-engine",
  "prepared work": "action-engine",
  "staged work": "action-engine",
  "pending items": "action-engine",
  
  "mission monitor": "mission-monitor",
  "alerts": "mission-monitor",
  "attention": "mission-monitor",
  "monitoring": "mission-monitor",
  "intelligence": "mission-monitor",
  "activity history": "mission-monitor",
  "mission history": "mission-monitor",
  "what did velo do": "mission-monitor",
  "activity log": "mission-monitor",
  "status": "mission-monitor",
  "progress": "mission-monitor",
  "what is velo doing": "mission-monitor",
  "current work": "mission-monitor",
  "mission progress": "mission-monitor",
  
  "command bridge": "command-bridge",
  "admin bridge": "command-bridge",
  "bridge": "continuity-core",
  "admin": "command-bridge",
  "system": "command-bridge",
  
  "comms deck": "comms-deck",
  "comms": "comms-deck",
  "communications": "comms-deck",
  "communication hub": "comms-deck",
  "email drafts": "comms-deck",
  "client follow-ups": "comms-deck",
  "follow-ups": "comms-deck",
  "draft message": "comms-deck",
  "messaging": "comms-deck",
  "draft queue": "comms-deck",
  "outreach": "comms-deck",
  "prepare outreach": "comms-deck",
  "client messages": "comms-deck",
  "reply drafts": "comms-deck",
  "message drafts": "comms-deck",
  "outreach drafts": "comms-deck",
  "follow-up planner": "comms-deck",
  "channel readiness": "comms-deck",
  
  "black box": "black-box",
  "audit log": "black-box",
  "audit": "black-box",
  
  "docking control": "docking-control",
  "docking": "docking-control",
  "platforms": "docking-control",
  
  "advanced settings": "continuity-core",
  "system settings": "continuity-core",
  "routing": "continuity-core",
  "autopilot settings": "continuity-core",
  "optimize setup": "continuity-core",
  "advanced autopilot": "continuity-core",
  "workflows": "continuity-core",
  "frameworks": "continuity-core",
  "connection settings": "continuity-core",
  "pickup queue": "continuity-core",
  "report execution": "continuity-core",
  "local setup": "continuity-core",
  "connect local": "continuity-core",
  "connect locally": "continuity-core",
  "local helper": "continuity-core",
  "install local helper": "continuity-core",
  "setup local": "continuity-core",
  "set up local": "continuity-core",
  "install ollama": "continuity-core",
  "setup ollama": "continuity-core",
  "set up ollama": "continuity-core",
  "use my computer": "continuity-core",
  "run ai on my computer": "continuity-core",
  "connect my computer": "continuity-core",
  "lm studio": "continuity-core",
  "desktop tools": "continuity-core",
  "local ai": "continuity-core",
  "connect ai": "continuity-core",
  "bridge runner": "continuity-core",
  "local bridge": "continuity-core",
  "setup bridge": "continuity-core",
  "pair computer": "continuity-core",
  "dry run": "continuity-core",
  "dry-run": "continuity-core",
  "rehearsal": "continuity-core",
  "emergency stop": "continuity-core",
  "stop everything": "continuity-core",
  "safety training": "continuity-core",
  "connection hub": "continuity-core",
  
  "playbook review": "playbook-review",
  "playbook": "playbook-review",
  "blueprint": "playbook-review",
  "income knowledge": "playbook-review",
  
  "freelance station": "freelance-station",
  "freelance": "freelance-station",
  "work desk": "freelance-station",
  "my tasks": "freelance-station",
  "applications": "freelance-station",
  "proposals": "freelance-station",
  "jobs i'm working on": "freelance-station",
  
  "commerce hub": "trade-bay",
  "commerce": "trade-bay",
  "e-commerce": "trade-bay",
  "ecommerce": "trade-bay",
  "dropshipping": "trade-bay",
  "pod": "trade-bay",
  "digital products": "trade-bay",
  "store": "trade-bay",
  "products and offers": "trade-bay",
  "offers": "trade-bay",
  "passive income": "autopilot",
  "mixed income": "autopilot",
  "blended income": "autopilot",
  
  "trade bay": "trade-bay",
  "trading bay": "trade-bay",
  
  "wallet": "wallet",
  "income": "wallet",
  "earnings": "wallet",
  "balance": "wallet",
  "payouts": "wallet",
  "profit": "wallet",
  "ledger": "wallet",
  
  "archive": "content-archive",
  "library": "content-archive",
  "content library": "content-archive",
  "my work": "content-archive",
  "my drafts": "content-archive",
  "previous work": "content-archive",
  "old work": "content-archive",
  "search archive": "content-archive",
  "find my work": "content-archive",
  "saved work": "content-archive",
  "generated work": "content-archive",
  "reuse": "content-archive",
  "reuse previous": "content-archive",
  "show archive": "content-archive",
  "content archive": "content-archive",
  
  "ai training": "galaxy-scanner",
  "rlhf": "galaxy-scanner",
  "data labeling": "galaxy-scanner",
  "testing gigs": "galaxy-scanner",
  "qa work": "galaxy-scanner",
  "microtasks": "galaxy-scanner",
  "paid studies": "galaxy-scanner",
  "translation tasks": "galaxy-scanner",
  "language gigs": "galaxy-scanner",
  "research tasks": "galaxy-scanner",
  "content gigs": "galaxy-scanner",
  "real listings": "galaxy-scanner",
  "verified payout": "galaxy-scanner",
  "source link": "galaxy-scanner",
  
  "tutorial": "dashboard",
  "guide": "dashboard",
  "help": "dashboard",
  "show me around": "dashboard",
  "tour": "dashboard"
};

export const CONTENT_VERBS = ["write", "create", "draft", "generate", "make", "produce", "rewrite", "edit", "improve", "turn this into", "convert this to", "help me write"];
export const CONTENT_OBJECTS = ["proposal", "pitch", "outreach", "message", "email", "caption", "post", "content", "copy", "product listing", "sales page", "delivery message", "bio", "profile", "resume", "portfolio", "design asset", "image prompt", "pdf brief", "code brief", "content pack", "marketing pack"];
export const AUTOPILOT_EXCLUSIONS = ["make money", "passive income", "find work", "find clients", "start mission", "run autopilot", "discover opportunities", "income plan", "dropshipping", "commerce", "scanner"];

export function isContentCreationIntent(command: string) {
  const cmd = command.toLowerCase();
  
  // Exclude broad autopilot phrases first
  if (AUTOPILOT_EXCLUSIONS.some(ex => cmd.includes(ex))) {
    return false;
  }

  // Check if it contains a clear content object
  const hasObject = CONTENT_OBJECTS.some(obj => cmd.includes(obj));
  
  // Check if it contains a content verb
  const hasVerb = CONTENT_VERBS.some(v => cmd.includes(v));

  // It's content creation if it has an object, or if it has a verb paired with an object,
  // or if it uses specific verbs that are content-only (like draft/rewrite/improve)
  const isSpecificVerb = ["draft", "rewrite", "improve", "edit"].some(v => cmd.includes(v));
  
  return hasObject || (hasVerb && (hasObject || isSpecificVerb));
}

export const RESEARCH_KEYWORDS = [
  "research", "find information about", "scan sources for", "summarize the market", 
  "competitor research", "product research", "find job platforms", 
  "research opportunities", "market analysis", "deep dive into", "summarize"
];

export const ACTIVE_LOOP_KEYWORDS = [
  "execute goal", "active loop", "run autopilot", "start mission", 
  "full autonomy", "do everything for", "find leads", "discover leads", 
  "prospect for", "lead discovery", "generate leads", "find prospects", 
  "discover prospects", "prospecting mission", "plan lead discovery",
  "plan a lead discovery mission", "plan a mission", "plan mission",
  "mission planning", "start mission planning", "planning mission",
  "find work", "find gigs", "find opportunities", "scan for work",
  "product research", "dropshipping", "print on demand", "pod", "digital product", "digital products",
  "commerce", "ecommerce", "e-commerce",
  "create listing", "product page", "draft offer", "draft outreach", "client follow up", "client follow-up",
  "prepare online income workflow", "prepare account", "setup platform", "connect platform",
  "passive income", "commerce hub",
  "continue mission", "resume mission", "run approved", "execute approved"
];

export const REVIEW_KEYWORDS = [
  "review", "approve", "authorize", "what next", "staged", "pending", "approvals"
];

export const RUNTIME_KEYWORDS = [
  "system status", "advanced settings", "routing status", 
  "autopilot routing", "system settings", "check settings",
  "unlock browser control", "unlock trading", "unlock money movement", 
  "unlock credentials", "advanced local autonomy", "request beta unlock",
  "browser proof", "test browser", "create test mission",
  "local vault", "credential vault", "store keys", "private storage",
  "pickup queue", "report result", "report execution",
  "friction", "blocker", "captcha", "verify", "identity check", "sms code", "manual action"
];

export const FRICTION_KEYWORDS = [
  "friction", "blocker", "stuck", "paused", "captcha", "verify", "verification", 
  "sms", "email code", "identity check", "what happened to the mission",
  "why is it paused", "help with blocker", "how to resolve", "manual action"
];

export const ADMIN_BRIDGE_KEYWORDS: Record<string, string[]> = {
  "console": ["devops", "console", "deck", "edit code", "deploy"],
  "people": ["invite", "member", "crew", "onboard"],
  "settings": ["setting", "toggle", "disable", "enable"],
  "health": ["health", "status", "stability"],
  "audit": ["audit", "black box", "logs"],
  "operations": ["ops", "operations", "workflow"],
  "migration": ["migration", "export", "transfer"]
};

/**
 * Finds if a command matches a module for navigation.
 */
export function findModuleIntent(command: string) {
  const cmd = command.toLowerCase();
  for (const [alias, moduleId] of Object.entries(VELO_MODULE_ALIASES)) {
    if (cmd.includes(alias)) {
      return { moduleId, label: alias.toUpperCase() };
    }
  }
  return null;
}

/**
 * Identifies if a command is intended for the Active Autopilot Loop.
 */
export function isActiveMissionIntent(command: string) {
  const cmd = command.toLowerCase();
  return ACTIVE_LOOP_KEYWORDS.some(k => cmd.includes(k)) || (cmd.includes("execute") && cmd.length > 15);
}

/**
 * Identifies if a command is a research request.
 */
export function isResearchIntent(command: string) {
  const cmd = command.toLowerCase();
  return RESEARCH_KEYWORDS.some(k => cmd.includes(k));
}

/**
 * Extracts the core mission goal from a command.
 */
export function extractMissionGoal(rawInput: string) {
  let goal = rawInput.trim();
  const lowGoal = goal.toLowerCase();
  
  ACTIVE_LOOP_KEYWORDS.forEach(k => {
    if (lowGoal.includes(k)) {
      // Find the position of the keyword to slice correctly if it's not at the start
      const index = lowGoal.indexOf(k);
      if (index !== -1) {
        // Simple heuristic: if keyword is followed by "for" or "to", skip those too
        const afterK = goal.substring(index + k.length).trim();
        if (afterK.toLowerCase().startsWith("for ") || afterK.toLowerCase().startsWith("to ")) {
          goal = afterK.substring(4).trim();
        } else {
          goal = afterK;
        }
      }
    }
  });

  if (!goal || goal.length < 3) {
    return rawInput.trim();
  }
  return goal;
}

/**
 * Identifies if a command is a direct runtime/tier query.
 */
export function isRuntimeIntent(command: string) {
  const cmd = command.toLowerCase();
  return RUNTIME_KEYWORDS.some(k => cmd.includes(k));
}

/**
 * Identifies if a command is a scanner prompt or scan request.
 */
export function isScannerPromptIntent(command: string) {
  const cmd = command.toLowerCase();
  return cmd.includes("scan") || cmd.includes("find") || cmd.includes("search");
}

/**
 * Infers industry lane labels from a command.
 */
export function inferScannerLaneLabels(command: string) {
  const cmd = command.toLowerCase();
  const lanes = [];
  if (cmd.includes("ai")) lanes.push("AI Freelance");
  if (cmd.includes("ecommerce") || cmd.includes("shop") || cmd.includes("product") || cmd.includes("dropship")) lanes.push("Commerce Hub");
  if (cmd.includes("creator") || cmd.includes("influence")) lanes.push("Creator Bay");
  if (cmd.includes("freelance") && !cmd.includes("ai")) lanes.push("General Freelance");
  if (cmd.includes("emerging") || cmd.includes("new tech")) lanes.push("Emerging Platforms");
  return lanes;
}

/**
 * Identifies if a command is asking about a friction blocker.
 */
export function isFrictionHelpIntent(command: string) {
  const cmd = command.toLowerCase();
  return FRICTION_KEYWORDS.some(k => cmd.includes(k)) && (cmd.includes("help") || cmd.includes("how") || cmd.includes("why") || cmd.includes("stuck") || cmd.includes("paused"));
}

/**
 * Identifies if a command is an admin bridge intent.
 */
export function isAdminBridgeIntent(command: string) {
  return null;
}

/**
 * Advanced agentic intent classification using LLM for complex natural language goals.
 */
export async function classifyComplexIntent(command: string, contextSnapshot?: any) {
  const cmd = command.toLowerCase();
  
  // Quick deterministic fallbacks for high-frequency terms
  if (cmd.includes("passive income") || (cmd.includes("digital") && cmd.includes("commerce"))) {
    return {
      intent: "PASSIVE_INCOME_PLAN",
      goal: "Build a passive income plan focusing on digital products in the Commerce Hub",
      confidence: 1.0,
      departments: ["Commerce Hub", "Command Officer"],
      suggested_response: "Passive income protocol initiated. I am drafting digital product assets in the Commerce Hub."
    };
  }

  if (cmd.includes("wallet") || cmd.includes("balance") || cmd.includes("earnings") || cmd.includes("payout") || cmd.includes("income")) {
    return {
      intent: "SYSTEM_QUERY",
      goal: "Check wallet balance, earnings, and payout status",
      confidence: 1.0,
      departments: ["Wallet"],
      suggested_response: "Accessing your financial ledger. Your current balance, pending earnings, and payout status are tracked in the Wallet module. Transitioning you there now."
    };
  }

  try {
    const result = await invokeLLM({
      prompt: `Act as the VELO Command Intent Engine. Classify the user's command into a structured intent.
      
      User Command: "${command}"
      
      System Context:
      - Departments: Freelance Station, Commerce Hub, Galaxy Scanner, Command Officer.
      - Capabilities: Lead discovery, content generation, market analysis, mission planning, digital product creation.
      
      Return a JSON object:
      {
        "intent": "GOAL_EXECUTION" | "NAVIGATION" | "SYSTEM_QUERY" | "UNKNOWN",
        "goal": "Refined core goal description",
        "departments": ["List of involved departments"],
        "confidence": 0-1,
        "suggested_response": "Short acknowledgement"
      }`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          goal: { type: "string" },
          departments: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
          suggested_response: { type: "string" }
        },
        required: ["intent", "goal", "departments", "confidence", "suggested_response"]
      }
    });

    if (typeof result === 'object' && result.intent) {
      return result;
    }
  } catch (error) {
    console.error("LLM Intent Classification failed:", error);
  }

  // Fallback to basic extraction
  return {
    intent: isActiveMissionIntent(command) ? "GOAL_EXECUTION" : "UNKNOWN",
    goal: extractMissionGoal(command),
    departments: inferScannerLaneLabels(command),
    confidence: 0.5,
    suggested_response: "Station command received. Initiating mission protocols."
  };
}
