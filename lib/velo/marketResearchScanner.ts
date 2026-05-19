import { AutopilotProfile, User } from "@/entities";
import { brainLibrary, BrainSkill, BrainWorkflow } from "./veloBrainLibrary";
import { INCOME_DOMAINS } from "./incomeKnowledge";
import { OPPORTUNITY_LANES } from "./opportunitySourceIntelligence";
import { invokeLLM } from "@/integrations/core";
import { runVeloResearchBrief } from "./researchEngine";
import { createSafeActionLog } from "./scannerNormalization";

export interface MarketResearchResult {
  query: string;
  profileSkills: string[];
  matchedLanes: { lane: string; confidence: number; reason: string }[];
  newSkillsDiscovered: { name: string; category: string; description: string }[];
  newWorkflowsSuggested: { name: string; type: string; description: string; steps: string[] }[];
  topRecommendations: string[];
}

// ─── Profile Analysis ──────────────────────────────────────────────────────────

async function analyzeProfile(profile: AutopilotProfile): Promise<{
  skills: string[];
  interests: string[];
  experienceLevel: string;
}> {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const background = profile.background || '';
  const tone = profile.tone || '';
  const preferences = Array.isArray(profile.preferences) ? profile.preferences : [];
  
  // Extract interests from preferences and background
  const allText = `${background} ${tone} ${preferences.join(' ')}`.toLowerCase();
  const interests: string[] = [];
  
  const interestKeywords = {
    ai: ["ai", "artificial intelligence", "machine learning", "llm", "chatbot"],
    design: ["design", "graphic", "ui", "ux", "creative"],
    writing: ["writing", "content", "copy", "blog", "author"],
    development: ["code", "programming", "software", "web", "app"],
    business: ["business", "marketing", "sales", "startup", "entrepreneur"],
    data: ["data", "analytics", "research", "analysis", "statistics"]
  };
  
  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some(k => allText.includes(k))) {
      interests.push(interest);
    }
  }
  
  const experienceLevel = skills.length > 5 ? "advanced" : skills.length > 2 ? "intermediate" : "beginner";
  
  return { skills, interests, experienceLevel };
}

// ─── Lane Matching ─────────────────────────────────────────────────────────────

function matchProfileToLanes(profileAnalysis: { skills: string[]; interests: string[] }): { lane: string; confidence: number; reason: string }[] {
  const results: { lane: string; confidence: number; reason: string }[] = [];
  const allUserTerms = [...profileAnalysis.skills, ...profileAnalysis.interests].map(t => t.toLowerCase());
  
  for (const lane of OPPORTUNITY_LANES) {
    let matchCount = 0;
    const reasons: string[] = [];
    
    // Keyword matching
    for (const keyword of lane.keywords) {
      if (allUserTerms.some(t => keyword.includes(t) || t.includes(keyword))) {
        matchCount += 2;
        reasons.push(keyword);
      }
    }
    
    // Requirement matching  
    for (const req of lane.requirements) {
      if (allUserTerms.some(t => req.toLowerCase().includes(t))) {
        matchCount += 1;
        reasons.push(req);
      }
    }
    
    if (matchCount > 0) {
      const confidence = Math.min(Math.round((matchCount / (lane.keywords.length * 2 + lane.requirements.length)) * 100), 95);
      results.push({
        lane: lane.label,
        confidence,
        reason: reasons.slice(0, 3).join(', ')
      });
    }
  }

  // Always include some baseline recommendations
  if (results.length < 2) {
    for (const lane of OPPORTUNITY_LANES.slice(0, 3)) {
      if (!results.find(r => r.lane === lane.label)) {
        results.push({ lane: lane.label, confidence: 30, reason: "Entry-level opportunity lane - low barrier" });
      }
    }
  }
  
  return results.sort((a, b) => b.confidence - a.confidence);
}

// ─── Scanner ───────────────────────────────────────────────────────────────────

export async function runMarketResearchScan(email: string): Promise<MarketResearchResult> {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  if (!ownerEmail) throw new Error("User not found");
  
  // 1. Get user profile
  const profiles = await AutopilotProfile.query()
    .where("owner_email", ownerEmail)
    .exec()
    .catch(() => []);
  
  if (!profiles || profiles.length === 0) {
    // No profile — return generic recommendations
    return {
      query: "market_research_scan",
      profileSkills: [],
      matchedLanes: OPPORTUNITY_LANES.slice(0, 4).map(l => ({
        lane: l.label,
        confidence: 40,
        reason: "Entry-level lane — no profile required"
      })),
      newSkillsDiscovered: [],
      newWorkflowsSuggested: [],
      topRecommendations: [
        "Complete your profile first for personalized recommendations",
        "Start with AI Training & Evaluation — lowest barrier to entry"
      ]
    };
  }
  
  const profile = profiles[0];
  const analysis = await analyzeProfile(profile);
  
  // 2. Match profile to opportunity lanes
  const matchedLanes = matchProfileToLanes(analysis);
  
  // 3. Run research briefs for top matches
  let researchFindings = "";
  try {
    const topLane = matchedLanes[0];
    if (topLane) {
      const research = await runVeloResearchBrief({
        query: `best platforms for ${topLane.lane} income opportunities ${new Date().getFullYear()}`,
        lane: "Market Research",
        workflowName: "Market Scan"
      }).catch(() => null);
      if (research?.findings) {
        researchFindings = research.findings;
      }
    }
  } catch (e) {
    console.error("[MarketResearch] Research brief failed:", e);
  }
  
  // 4. Discover new skills the user could learn
  const newSkillsDiscovered: { name: string; category: string; description: string }[] = [];
  const topLanes = matchedLanes.slice(0, 3);
  
  for (const lane of topLanes) {
    const opportunityLane = OPPORTUNITY_LANES.find(l => l.label === lane.lane);
    if (opportunityLane) {
      // Find skills from this lane the user doesn't already have
      const laneSkills = opportunityLane.requirements.filter(req => 
        !analysis.skills.some(s => s.toLowerCase().includes(req.toLowerCase()))
      );
      for (const skill of laneSkills) {
        if (!newSkillsDiscovered.find(s => s.name === skill)) {
          newSkillsDiscovered.push({
            name: skill,
            category: lane.lane,
            description: `Required for ${lane.lane} — ${opportunityLane.description}`
          });
        }
      }
    }
  }
  
  // 5. Generate workflow suggestions
  const newWorkflowsSuggested: { name: string; type: string; description: string; steps: string[] }[] = [];
  for (const lane of topLanes.slice(0, 2)) {
    if (lane.confidence >= 40) {
      newWorkflowsSuggested.push({
        name: `${lane.lane} — Quick Start`,
        type: lane.lane.toLowerCase().replace(/\s+/g, '_'),
        description: `Step-by-step workflow to start earning with ${lane.lane}`,
        steps: [
          `Create accounts on the recommended platforms for ${lane.lane}`,
          `Complete profile verification requirements`,
          `Browse available ${lane.lane.toLowerCase()} opportunities`,
          `Apply/claim matching tasks`,
          `Complete and submit deliverables`,
          `Track earnings and optimize approach`
        ]
      });
    }
  }
  
  // 6. Build recommendations
  const topRecommendations: string[] = [];
  
  if (matchedLanes.length > 0) {
    const top = matchedLanes[0];
    topRecommendations.push(`Start with **${top.lane}** — ${top.confidence}% match based on your profile (${top.reason})`);
  }
  
  if (matchedLanes.length > 1) {
    const second = matchedLanes[1];
    topRecommendations.push(`Secondary focus: **${second.lane}** (${second.confidence}% match)`);
  }
  
  if (newSkillsDiscovered.length > 0) {
    topRecommendations.push(`Learn: ${newSkillsDiscovered.slice(0, 3).map(s => s.name).join(', ')} — these unlock higher-paying opportunities`);
  }
  
  // 7. Register discoveries in Brain Library
  for (const skill of newSkillsDiscovered) {
    brainLibrary.registerSkill({
      name: skill.name,
      category: skill.category,
      description: skill.description,
      department: "General",
      platforms: [],
      autopilotReady: false,
      incomePotential: "medium",
      source: "researched"
    });
  }
  
  for (const wf of newWorkflowsSuggested) {
    brainLibrary.registerWorkflow({
      name: wf.name,
      type: wf.type,
      description: wf.description,
      department: "Autopilot",
      steps: wf.steps,
      required_inputs: [],
      successRate: 0,
      source: "researched"
    });
  }
  
  // 8. Log
  await createSafeActionLog({
    department: "Autopilot",
    action_type: "market_research_scan",
    status: "completed",
    summary: `Market scan: ${matchedLanes.length} lanes matched, ${newSkillsDiscovered.length} skills, ${newWorkflowsSuggested.length} workflows`,
    details: { matchedLanes: matchedLanes.map(l => l.lane), newSkillsCount: newSkillsDiscovered.length }
  }, ownerEmail);
  
  return {
    query: "market_research_scan",
    profileSkills: analysis.skills,
    matchedLanes,
    newSkillsDiscovered,
    newWorkflowsSuggested,
    topRecommendations
  };
}

// ─── Formatter ─────────────────────────────────────────────────────────────────

export function formatMarketResearch(result: MarketResearchResult): string {
  let msg = `## 🔬 Market Research Scan\n\n`;
  
  if (result.profileSkills.length === 0) {
    msg += `⚡ **No profile found.** Complete your profile for a personalized market scan.\n\n`;
  } else {
    msg += `**Your Skills**: ${result.profileSkills.join(', ')}\n\n`;
  }
  
  if (result.matchedLanes.length > 0) {
    msg += `### Matched Income Lanes\n\n`;
    msg += `| Lane | Match | Key Match |\n`;
    msg += `|------|-------|-----------|\n`;
    for (const lane of result.matchedLanes.slice(0, 5)) {
      msg += `| ${lane.lane} | ${lane.confidence}% | ${lane.reason} |\n`;
    }
    msg += `\n`;
  }
  
  if (result.newSkillsDiscovered.length > 0) {
    msg += `### New Skills to Learn\n`;
    for (const skill of result.newSkillsDiscovered.slice(0, 5)) {
      msg += `- **${skill.name}** — ${skill.description}\n`;
    }
    msg += `\n`;
  }
  
  if (result.newWorkflowsSuggested.length > 0) {
    msg += `### Suggested Workflows\n`;
    for (const wf of result.newWorkflowsSuggested) {
      msg += `- **${wf.name}**: ${wf.steps.length} steps (${wf.steps[0]} → ${wf.steps[wf.steps.length - 1]})\n`;
    }
    msg += `\n`;
  }
  
  msg += `### Recommendations\n`;
  for (let i = 0; i < result.topRecommendations.length; i++) {
    msg += `${i + 1}. ${result.topRecommendations[i]}\n`;
  }
  
  return msg;
}

// ─── Command Routing ──────────────────────────────────────────────────────────

export function detectMarketResearchIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return ["market research", "market scan", "scan market", "research market", 
          "what should i do to make money", "income scan", "profile scan",
          "analyze my profile", "match me to opportunities"].some(k => lower.includes(k));
}

export async function handleMarketResearchCommand(text: string, email: string): Promise<{ type: string; message: string }> {
  const result = await runMarketResearchScan(email);
  return { type: "market_research", message: formatMarketResearch(result) };
}
