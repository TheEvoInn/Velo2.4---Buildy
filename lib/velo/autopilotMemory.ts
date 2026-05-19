
import { AutopilotUserBrief } from "./autopilotTimeline";

/**
 * Builds a personal greeting that references the user's actual profile data.
 */
export function buildPersonalizedGreeting(profile: any, brief: AutopilotUserBrief | null): { greeting: string, actions: Array<{label: string, cmd: string}> } {
  const name = profile.public_name || profile.legal_name || "Pilot";
  const skills = Array.isArray(profile.skills) ? profile.skills.slice(0, 3) : [];
  
  let onboardingMeta: any = {};
  try {
    onboardingMeta = typeof profile.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata) 
      : (profile.onboarding_metadata || {});
  } catch (e) {
    onboardingMeta = {};
  }
  
  const sectors = onboardingMeta.incomeSectors || onboardingMeta.selectedDepts || onboardingMeta.sectors || [];
  const autopilotBrief = profile.autopilot_brief || "";
  
  let greeting = `Welcome back, Captain ${name}. `;
  
  if (skills.length > 0) {
    greeting += `Your station is configured with expertise in **${skills.join(", ")}**. `;
  }
  
  if (sectors.length > 0) {
    greeting += `Current focus sectors: **${sectors.join(", ")}**. `;
  }

  if (autopilotBrief && autopilotBrief.length > 20) {
    // Try to extract the first goal or line from the brief
    const firstLine = autopilotBrief.split('\n')[0].replace(/^- /, '').trim();
    if (firstLine.length > 10) {
      greeting += `\n\nYour active brief mentions: "${firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine}"`;
    }
  }

  // Generate Suggested Actions
  const actions: Array<{label: string, cmd: string}> = [];
  
  if (sectors.includes('freelance') || sectors.includes('gigs')) {
    const skillLabel = skills[0] ? `${skills[0]} ` : "";
    actions.push({ label: `Find ${skillLabel}work`, cmd: `Find real ${skillLabel}opportunities for me` });
  }
  
  if (sectors.includes('trade') || sectors.includes('commerce') || sectors.includes('pod')) {
    actions.push({ label: "Research products", cmd: "Help me research products to sell" });
  }

  if (autopilotBrief && autopilotBrief.toLowerCase().includes("goal")) {
    actions.push({ label: "Resume my goal", cmd: "What is the next step for my current goal?" });
  }

  // Fallbacks if list is short
  if (actions.length < 3) {
    actions.push({ label: "Scan for work", cmd: "Scan for opportunities in my industries" });
  }
  
  actions.push({ label: "Show wallet", cmd: "Show my wallet and earnings" });

  return { greeting, actions };
}

/**
 * Extracts durable facts from a user message to persist to autopilot_brief.
 * Returns a concise string representation of the fact or null.
 */
export function extractDurableFacts(userMessage: string): string | null {
  const msg = userMessage.toLowerCase().trim();
  
  // EXCLUSION LIST: Never extract facts from these commands
  const exclusionTerms = [
    "find work", "find opportunities", "scan for", "search for", "search work",
    "wallet", "earnings", "earned", "payout", "balance",
    "review center", "what needs review", "staged", "approve",
    "start a store", "set up a store", "create store",
    "help", "what should i do", "what now", "how do i start",
    "navigate to", "go to", "open "
  ];
  
  if (exclusionTerms.some(term => msg.includes(term))) {
    return null;
  }

  // GOAL PATTERNS
  const goalMatch = msg.match(/(?:i want to|i need to|my goal is to|i'm trying to|i am looking to) ([\s\S]{10,150})/i);
  if (goalMatch) {
    return `Goal: ${goalMatch[1].trim()}`;
  }

  // PREFERENCE PATTERNS
  const prefMatch = msg.match(/(?:i prefer|i like|i'm good at|i specialize in|i'm an expert in) ([\s\S]{10,150})/i);
  if (prefMatch) {
    return `Preference: ${prefMatch[1].trim()}`;
  }

  // IDENTITY PATTERNS
  const identityMatch = msg.match(/(?:i am a|i work as|i'm a) ([\s\S]{5,100})/i);
  if (identityMatch && !msg.includes("goal")) {
    return `Identity: ${identityMatch[1].trim()}`;
  }

  return null;
}
