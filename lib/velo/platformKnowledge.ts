export interface PlatformKnowledgeEntry {
  id: string;
  term: string;
  aliases: string[];
  plainDefinition: string;
  whyItMatters: string;
  userCanDo: string;
  moduleId?: string;
  category: 'onboarding' | 'safety' | 'navigation' | 'profile' | 'approvals' | 'connection' | 'history' | 'learning';
  riskLevel: 'low' | 'medium' | 'high';
  workflowTrigger: string;
  safetyBoundary: string;
  adminOnly?: boolean;
}

export const PLATFORM_KNOWLEDGE_ENTRIES: PlatformKnowledgeEntry[] = [
  {
    id: "mission-control",
    term: "Mission Control",
    aliases: ["dashboard", "home base", "command center"],
    plainDefinition: "Your primary dashboard and central hub for monitoring station health.",
    whyItMatters: "It gives you a high-level briefing on your overall readiness and active operations.",
    userCanDo: "Monitor active mission progress, check system alerts, and see your 'Go-Live' status.",
    moduleId: "dashboard",
    category: "onboarding",
    riskLevel: "low",
    workflowTrigger: "activity_review",
    safetyBoundary: "This is a monitoring surface; no direct external actions are triggered from here."
  },
  {
    id: "autopilot",
    term: "Autopilot",
    aliases: ["ai assistant", "automated helper", "velo autopilot"],
    plainDefinition: "The intelligent automation engine that plans and coordinates your missions.",
    whyItMatters: "It handles the complex logic of finding opportunities and preparing work for your review.",
    userCanDo: "Assign goals, ask questions about your data, and set up recurring automation loops.",
    moduleId: "autopilot",
    category: "learning",
    riskLevel: "medium",
    workflowTrigger: "mission_planning",
    safetyBoundary: "Autopilot only stages work; it cannot execute high-risk actions without human approval."
  },
  {
    id: "command-officer",
    term: "Command Officer",
    aliases: ["officer", "ai chat", "command interface"],
    plainDefinition: "Your dedicated AI chat interface for direct communication and navigation.",
    whyItMatters: "It's the easiest way to interact with the system using plain natural language.",
    userCanDo: "Ask for help, open specific modules, start missions, or explain platform terminology.",
    moduleId: "autopilot",
    category: "navigation",
    riskLevel: "low",
    workflowTrigger: "terminology_help",
    safetyBoundary: "The officer can navigate and explain, but cannot bypass approval gates for execution."
  },
  {
    id: "digital-clone",
    term: "Digital Clone",
    aliases: ["my digital clone", "clone", "professional profile", "identity"],
    plainDefinition: "A digital representation of your professional skills, experience, and personality.",
    whyItMatters: "It ensures Autopilot's work (like drafts or replies) sounds exactly like you.",
    userCanDo: "Update your resume, list your skills, set your voice preferences, and define boundaries.",
    moduleId: "clone-bay",
    category: "profile",
    riskLevel: "low",
    workflowTrigger: "profile_setup",
    safetyBoundary: "Personal data is used only for internal planning and is never sold to third parties."
  },
  {
    id: "boundaries",
    term: "Boundaries",
    aliases: ["rules", "restrictions", "constraints", "limitations"],
    plainDefinition: "Strict rules that define what Autopilot can and cannot do on your behalf.",
    whyItMatters: "They provide a core safety layer, ensuring the AI never oversteps your comfort level.",
    userCanDo: "Set prohibited actions, specify mandatory review triggers, and define working hours.",
    moduleId: "clone-bay",
    category: "profile",
    riskLevel: "medium",
    workflowTrigger: "safety_training",
    safetyBoundary: "Boundaries are immutable by the AI; only the user can modify these core restrictions."
  },
  {
    id: "review-center",
    term: "Review Center",
    aliases: ["action engine", "approval queue", "approvals", "action center"],
    plainDefinition: "A safety gate where all prepared tasks wait for your final 'GO' signal.",
    whyItMatters: "It ensures you are the ultimate authority over every action taken in the real world.",
    userCanDo: "Approve, edit, or reject drafts, emails, posts, and other staged actions.",
    moduleId: "action-engine",
    category: "approvals",
    riskLevel: "high",
    workflowTrigger: "approval_review",
    safetyBoundary: "No high-risk external action leaves this station without explicit human approval."
  },
  {
    id: "connection-hub",
    term: "Connection Hub",
    aliases: ["continuity core", "bridge", "local connection"],
    plainDefinition: "The secure interface for linking VELO to your local computer or private AI.",
    whyItMatters: "It allows for private, local execution of tasks that shouldn't happen in the cloud.",
    userCanDo: "Set up the Bridge Runner, check local AI status, and manage hardware pairings.",
    moduleId: "continuity-core",
    category: "connection",
    riskLevel: "medium",
    workflowTrigger: "bridge_setup",
    safetyBoundary: "Local execution requires the 'Bridge Runner' app to be active on your own device."
  },
  {
    id: "bridge-runner",
    term: "Bridge Runner",
    aliases: ["local bridge", "runner", "local helper"],
    plainDefinition: "A small application that runs on your computer to execute approved cloud tasks.",
    whyItMatters: "It enables 'Hybrid Autonomy'—cloud planning combined with secure, local execution.",
    userCanDo: "Download the runner, pair your device, and monitor local task processing.",
    moduleId: "continuity-core",
    category: "connection",
    riskLevel: "medium",
    workflowTrigger: "bridge_setup",
    safetyBoundary: "The runner only pulls tasks you have already approved in the Review Center."
  },
  {
    id: "dry-run",
    term: "Dry-run",
    aliases: ["rehearsal", "practice mode", "simulation"],
    plainDefinition: "A safe simulation mode where VELO plans a mission without any real-world effect.",
    whyItMatters: "It lets you see exactly what the AI would do before you trust it with real tasks.",
    userCanDo: "Start a rehearsal mission, review simulated outcomes, and test your configuration.",
    moduleId: "continuity-core",
    category: "safety",
    riskLevel: "low",
    workflowTrigger: "dry_run_training",
    safetyBoundary: "External APIs, payments, and publishing are strictly blocked during a dry-run."
  },
  {
    id: "emergency-stop",
    term: "Emergency Stop",
    aliases: ["stop", "kill switch", "abort mission"],
    plainDefinition: "A global 'Freeze' command that immediately halts all active operations.",
    whyItMatters: "It provides instant peace of mind if you see something unexpected happening.",
    userCanDo: "Click the red Stop button to pause all missions and disconnect the local bridge.",
    moduleId: "continuity-core",
    category: "safety",
    riskLevel: "low",
    workflowTrigger: "emergency_stop_training",
    safetyBoundary: "Stopping the system is always safe and does not delete your data or progress."
  },
  {
    id: "security-vault",
    term: "Security Vault",
    aliases: ["secure core", "vault", "credentials", "sensitive labels"],
    plainDefinition: "A secure environment for managing sensitive labels and security guidance for your station.",
    whyItMatters: "It ensures your automation missions are correctly labeled and handled with appropriate security measures.",
    userCanDo: "Review safety acknowledgments, manage sensitive mission labels, and receive guidance on secure credential management.",
    moduleId: "secure-core",
    category: "onboarding",
    riskLevel: "high",
    workflowTrigger: "vault_setup",
    safetyBoundary: "This view is scoped for guidance; raw admin credentials and system keys remain protected and non-visible."
  },
  {
    id: "mission-monitor",
    term: "Mission Monitor",
    aliases: ["activity log", "history", "intelligence reports"],
    plainDefinition: "A transparent timeline of your personal mission activity, decisions, and outcomes.",
    whyItMatters: "It provides a clear audit trail of exactly what VELO has prepared and performed on your behalf.",
    userCanDo: "Review your mission history, see step-by-step decision logs for your goals, and audit staged work.",
    moduleId: "mission-monitor",
    category: "history",
    riskLevel: "low",
    workflowTrigger: "activity_review",
    safetyBoundary: "This view is filtered to your own data; global system logs and other users' activities are strictly blocked."
  },
  {
    id: "autopilot-history",
    term: "Autopilot History",
    aliases: ["chat history", "session history", "dialogue history"],
    plainDefinition: "A record of your previous conversations and mission planning sessions with the Command Officer.",
    whyItMatters: "It allows you to revisit past decisions and resume mission planning without losing context.",
    userCanDo: "Browse previous sessions, resume old conversations, and review system greetings.",
    moduleId: "autopilot",
    category: "history",
    riskLevel: "low",
    workflowTrigger: "activity_review",
    safetyBoundary: "History is strictly scoped to your user account and cannot be seen by other pilots."
  },
  {
    id: "email-identity",
    term: "Email Identity",
    aliases: ["inbox setup", "sending profile", "display name", "email settings"],
    plainDefinition: "Configuration for how you appear in outbound transmissions, including your name and signature.",
    whyItMatters: "It ensures that staged drafts are ready for your manual review with all personal branding in place.",
    userCanDo: "Set your display name, sending label, and email signature for future outreach.",
    moduleId: "comms-deck",
    category: "profile",
    riskLevel: "low",
    workflowTrigger: "profile_setup",
    safetyBoundary: "Email identity settings only affect staged drafts; no live sending is enabled automatically."
  },
  {
    id: "notification-logs",
    term: "Notification Logs",
    aliases: ["alerts", "comms logs", "signal history"],
    plainDefinition: "A detailed log of all communication-related events and system alerts.",
    whyItMatters: "It helps you track exactly when drafts were staged or when templates were updated.",
    userCanDo: "Review recent system alerts and communication status changes in the Comms Deck.",
    moduleId: "comms-deck",
    category: "history",
    riskLevel: "low",
    workflowTrigger: "activity_review",
    safetyBoundary: "Logs provide an audit trail of system behavior without exposing private message content."
  },
  {
    id: "credential-labels",
    term: "Credential Labels",
    aliases: ["vault entry", "secure placeholder", "api label"],
    plainDefinition: "Secure placeholders in the vault that identify your platform access keys without showing the raw secret.",
    whyItMatters: "They allow you to manage which platforms are connected while keeping sensitive values encrypted.",
    userCanDo: "Add labels for API keys, passwords, and access tokens in the Secure Core vault.",
    moduleId: "secure-core",
    category: "onboarding",
    riskLevel: "high",
    workflowTrigger: "vault_setup",
    safetyBoundary: "Labels are public identifiers; the actual secret is only decrypted when needed for a mission."
  },
  {
    id: "identity-documents",
    term: "Identity Documents",
    aliases: ["id upload", "verification assets", "passport", "id card"],
    plainDefinition: "Securely uploaded documents used to verify your identity on various work platforms.",
    whyItMatters: "They provide proof of identity for 'Digital Clone' verification without risky public exposure.",
    userCanDo: "Upload PDFs or images of your identification to the Secure Core documents area.",
    moduleId: "secure-core",
    category: "profile",
    riskLevel: "high",
    workflowTrigger: "profile_setup",
    safetyBoundary: "Uploaded documents are encrypted and only used for authorized platform verification."
  },
  {
    id: "mission-loop",
    term: "Mission Loop",
    aliases: ["active loop", "automation sequence", "recurring mission"],
    plainDefinition: "A multi-step automation sequence that continues until a goal is achieved.",
    whyItMatters: "It allows for long-term objectives like lead generation to run in the background.",
    userCanDo: "Set a goal like 'Find 10 leads,' and watch Autopilot cycle through research and drafting.",
    moduleId: "autopilot",
    category: "learning",
    riskLevel: "medium",
    workflowTrigger: "mission_planning",
    safetyBoundary: "Each 'loop' cycle still routes its final outputs through the Review Center."
  },
  {
    id: "google-prep-helper",
    term: "Google Prep Helper",
    aliases: ["google connect", "account prep", "signup helper"],
    plainDefinition: "A specialized helper that uses your Google profile to prepare signup plans for new platforms.",
    whyItMatters: "It drastically reduces the time spent manually typing out profile details for every new platform you join.",
    userCanDo: "Connect Google, generate preparation plans for missing platforms, and sync approved metadata to your vault.",
    moduleId: "google-prep",
    category: "onboarding",
    riskLevel: "low",
    workflowTrigger: "onboarding_setup",
    safetyBoundary: "The helper only prepares plans for your review; it never submits forms or stores passwords automatically."
  },
  {
    id: "friction-handling",
    term: "Friction Handling",
    aliases: ["captcha", "sms verify", "verification", "pause-and-resume"],
    plainDefinition: "A safe workflow for handling platform hurdles like CAPTCHAs, SMS codes, or email checks.",
    whyItMatters: "It allows your local runner to pause safely and let you handle sensitive verification steps manually.",
    userCanDo: "See exactly why a job paused, get instructions for manual action, and resume once handled.",
    moduleId: "action-engine",
    category: "safety",
    riskLevel: "medium",
    workflowTrigger: "friction_event",
    safetyBoundary: "VELO never intercepts SMS or solves CAPTCHAs; it only coordinates your manual intervention."
  },
  {
    id: "intl-platforms",
    term: "International Platforms",
    aliases: ["europe platforms", "asia platforms", "global gigs", "clickworker", "utest", "prolific"],
    plainDefinition: "Support for major gig and freelance platforms across Europe, Asia, and globally.",
    whyItMatters: "Expands your reach to platforms like Clickworker, Testbirds, uTest, and Prolific with specialized readiness checks.",
    userCanDo: "Prepare credentials and identity documents specifically for international platform requirements.",
    moduleId: "secure-core",
    category: "onboarding",
    riskLevel: "medium",
    workflowTrigger: "platform_onboarding",
    safetyBoundary: "Platform-specific terms and regional regulations are respected; local execution is mandatory."
  }
];

export const INTERNATIONAL_PLATFORMS = [
  { id: "clickworker", name: "Clickworker", region: "Europe", friction: ["captcha", "email"] },
  { id: "testbirds", name: "Testbirds", region: "Europe", friction: ["email", "identity"] },
  { id: "utest", name: "uTest", region: "Global", friction: ["sms", "email", "identity"] },
  { id: "prolific", name: "Prolific", region: "UK/Europe", friction: ["identity", "manual_review"] },
  { id: "test-io", name: "Test IO", region: "Europe", friction: ["email", "manual_review"] },
  { id: "appen", name: "Appen", region: "Global", friction: ["sms", "email", "identity"] },
  { id: "telus-ai", name: "TELUS AI", region: "Global", friction: ["email", "identity"] },
  { id: "oneforma", name: "OneForma", region: "Global", friction: ["sms", "email", "identity"] },
  { id: "toloka", name: "Toloka", region: "Global", friction: ["identity", "sms", "manual_review"] },
  { id: "microworkers", name: "Microworkers", region: "Global", friction: ["manual_review", "sms"] },
  { id: "superteam-earn", name: "Superteam Earn", region: "Asia/Web3", friction: ["wallet_auth", "manual_review"] }
];

export function findPlatformKnowledge(query: string): PlatformKnowledgeEntry | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const exactTerm = PLATFORM_KNOWLEDGE_ENTRIES.find(e => e.term.toLowerCase() === q);
  if (exactTerm) return exactTerm;

  const exactAlias = PLATFORM_KNOWLEDGE_ENTRIES.find(e => 
    e.aliases.some(a => a.toLowerCase() === q)
  );
  if (exactAlias) return exactAlias;

  interface Candidate {
    entry: PlatformKnowledgeEntry;
    matchLength: number;
  }

  const candidates: Candidate[] = [];

  for (const entry of PLATFORM_KNOWLEDGE_ENTRIES) {
    const term = entry.term.toLowerCase();
    if (q.includes(term) || term.includes(q)) {
      candidates.push({ entry, matchLength: term.length });
    }
    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      if (a.length >= 4 && (q.includes(a) || a.includes(q))) {
        candidates.push({ entry, matchLength: a.length });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.matchLength - a.matchLength);
    return candidates[0].entry;
  }

  return null;
}

export function getPlatformKnowledgeById(id: string): PlatformKnowledgeEntry | null {
  return PLATFORM_KNOWLEDGE_ENTRIES.find(e => e.id === id) || null;
}

export function buildPlatformKnowledgeAnswer(entry: PlatformKnowledgeEntry): string {
  let answer = `**${entry.term}**: ${entry.plainDefinition}\n\n`;
  answer += `**Why it matters**: ${entry.whyItMatters}\n`;
  answer += `**What you can do**: ${entry.userCanDo}\n\n`;
  answer += `**Safety Boundary**: ${entry.safetyBoundary}`;
  
  if (entry.moduleId) {
    answer += `\n\nTo visit this module, you can ask: "Open ${entry.term}".`;
  }
  
  return answer;
}

export function getPlatformKnowledgeForModule(moduleId: string): PlatformKnowledgeEntry[] {
  return PLATFORM_KNOWLEDGE_ENTRIES.filter(e => e.moduleId === moduleId);
}

export function listPlatformTerms(): string[] {
  return PLATFORM_KNOWLEDGE_ENTRIES.map(e => e.term);
}
