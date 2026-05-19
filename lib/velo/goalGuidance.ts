
import { AutopilotProfile } from "@/entities";
import { INCOME_DOMAINS } from "./incomeKnowledge";

export type GuidedGoalIntent = 
  | "quick_income"
  | "freelance_clients"
  | "product_research"
  | "content_outreach"
  | "profile_readiness"
  | "general_growth";

export interface GuidedGoalSession {
  intent: GuidedGoalIntent;
  originalPrompt: string;
  step: "clarification" | "recommendation";
  options?: string[];
  recommendation?: GuidedGoalRecommendation;
}

export interface GuidedGoalRecommendation {
  label: string;
  reason: string;
  actionType: "mission" | "income_plan" | "navigation";
  targetId?: string;
  goal: string;
}

/**
 * Detects if a user prompt is a vague, goal-seeking request that needs guidance.
 */
export function detectGuidedGoalIntent(input: string): GuidedGoalIntent | null {
  const cmd = input.toLowerCase();
  
  const quickIncomeKeywords = ["make money", "earn", "cash", "quick win", "start today", "income now", "fast profit", "get paid"];
  const freelanceKeywords = ["get clients", "find work", "freelance", "gig", "job", "hiring", "contracts"];
  const productKeywords = ["sell products", "dropshipping", "ecommerce", "inventory", "shop", "store"];
  const contentKeywords = ["grow audience", "post content", "outreach", "get leads", "prospecting"];
  const setupKeywords = ["help me start", "how to use", "setup", "onboarding", "get ready", "profile", "what now", "next step", "what should i do"];
  
  if (quickIncomeKeywords.some(k => cmd.includes(k))) return "quick_income";
  if (freelanceKeywords.some(k => cmd.includes(k))) return "freelance_clients";
  if (productKeywords.some(k => cmd.includes(k))) return "product_research";
  if (contentKeywords.some(k => cmd.includes(k))) return "content_outreach";
  if (setupKeywords.some(k => cmd.includes(k))) return "profile_readiness";
  
  if (cmd.includes("help") || cmd.includes("grow") || cmd.includes("start")) {
    return "general_growth";
  }
  
  return null;
}

/**
 * Builds a focused follow-up question based on the detected intent.
 */
export function buildGoalClarifyingQuestion(intent: GuidedGoalIntent, profile?: AutopilotProfile) {
  switch (intent) {
    case "quick_income":
      return {
        question: "I can help you find immediate income opportunities. Should we focus on verified microtask sprints, high-speed AI training tasks, or look for a quick-win testing gig? (Recommended: AI Training Tasks)",
        options: ["AI Training Tasks", "Microtask Sprint", "Testing Gigs"]
      };
    case "freelance_clients":
      return {
        question: "Finding clients is my specialty. Should I scan for specialized AI freelance projects, research-heavy content gigs, or focus on major platforms for general matching? (Recommended: AI Freelance Projects)",
        options: ["AI Freelance Projects", "Content & Research Gigs", "General Platform Scan"]
      };
    case "product_research":
      return {
        question: "Let's launch your commerce mission. Should I look for trending products for a Commerce Hub dropshipping store or research digital products you can launch with minimal overhead? (Recommended: Digital Product Ideas)",
        options: ["Digital Product Ideas", "Trending Products"]
      };
    case "content_outreach":
      return {
        question: "Let's build your presence. Should we focus on creating a content plan to attract an audience or a direct outreach sequence to contact potential leads? (Recommended: Content Plan)",
        options: ["Content Plan", "Direct Outreach"]
      };
    case "profile_readiness":
      return {
        question: "Getting your station ready is the first step. Should we walk through your profile setup or verify your station capabilities for active missions? (Recommended: Profile Setup)",
        options: ["Profile Setup", "Station Verification"]
      };
    default:
      return {
        question: "I'm ready to help you grow. Should we focus on identifying new income paths or preparing your profile for active work? (Recommended: Income Paths)",
        options: ["Income Paths", "Profile Prep"]
      };
  }
}

/**
 * Resolves a user's reply to a clarifying question into a specific recommendation.
 */
export function resolveGuidedGoalFromReply(session: GuidedGoalSession, reply: string): GuidedGoalRecommendation {
  const r = reply.toLowerCase();
  const intent = session.intent;
  
  // Quick Income resolution
  if (intent === "quick_income") {
    if (r.includes("ai training") || r.includes("rlhf") || r.includes("evaluation")) {
      return {
        label: "AI Training & Evaluation Sprint",
        reason: "AI training is currently one of the most consistent paths for quick income. I'll scan for verified RLHF and alignment tasks.",
        actionType: "mission",
        goal: "Find and prepare for AI training and evaluation tasks with verified payouts."
      };
    }
    if (r.includes("testing") || r.includes("qa")) {
      return {
        label: "Online Testing Opportunity Discovery",
        reason: "Website and app testing gigs provide steady, low-barrier income. I'll scan for open QA cycles that match your devices.",
        actionType: "mission",
        goal: "Discover open website and app testing cycles on verified QA platforms."
      };
    }
    if (r.includes("microtask") || r.includes("sprint")) {
      return {
        label: "Income Discovery Sprint",
        reason: "You're looking for focused opportunities. This path researches low-barrier tasks that help you get started quickly.",
        actionType: "income_plan",
        targetId: "same_day_profit",
        goal: "Research potential profit sprints using microtask platforms."
      };
    }
    return {
      label: "AI Training Opportunity Discovery",
      reason: "Researching verified AI training tasks is a great way to leverage your analytical skills for immediate income.",
      actionType: "mission",
      goal: "Find high-match AI training and evaluation tasks with verified payout status."
    };
  }
  
  // Freelance Clients resolution
  if (intent === "freelance_clients") {
    if (r.includes("ai freelance") || r.includes("automation")) {
      return {
        label: "AI Automation Client Scan",
        reason: "AI implementation and automation projects are high-demand. I'll look for clients needing chatbot or workflow help.",
        actionType: "mission",
        goal: "Find and draft outreach for clients seeking AI automation or chatbot development."
      };
    }
    if (r.includes("content") || r.includes("research")) {
      return {
        label: "Strategic Research & Content Scan",
        reason: "High-quality research and summarization work is always in demand. I'll scan for research-heavy content gigs.",
        actionType: "mission",
        goal: "Discover specialized research and technical content gigs on premium platforms."
      };
    }
    if (r.includes("platform") || r.includes("scan")) {
      return {
        label: "Multi-Platform Client Scan",
        reason: "Scanning platforms like Upwork and Fiverr will give us the broadest range of immediate client needs.",
        actionType: "mission",
        goal: "Discover freelance client opportunities across all major platforms."
      };
    }
    return {
      label: "Specialized AI Freelance Scan",
      reason: "Focusing on AI-driven projects helps differentiate your profile in the freelance market.",
      actionType: "mission",
      goal: "Discover high-value AI freelance projects and draft tailored proposals."
    };
  }
  
  // Product Research resolution
  if (intent === "product_research") {
    if (r.includes("trending") || r.includes("ecommerce")) {
      return {
        label: "Trending E-commerce Research",
        reason: "Identifying what's already selling well minimizes your risk when starting a store.",
        actionType: "income_plan",
        targetId: "ecommerce",
        goal: "Research winning e-commerce products and supplier options."
      };
    }
    return {
      label: "Digital Product Strategy",
      reason: "Digital products have high margins and can be automated more easily than physical goods.",
      actionType: "income_plan",
      targetId: "passive_income",
      goal: "Develop a strategy for a high-value digital product or course."
    };
  }
  
  // Fallback / General resolution
  return {
    label: "Strategic Goal Planning",
    reason: "A clear mission plan is the best way to ensure consistent progress.",
    actionType: "mission",
    goal: session.originalPrompt || "Help me grow my income and digital presence."
  };
}

/**
 * Formats a recommendation into a user-friendly response.
 */
export function formatGuidedGoalRecommendation(rec: GuidedGoalRecommendation): string {
  return `I recommend we start with: **${rec.label}**. \n\n${rec.reason} \n\nI've prepared a mission plan to **${rec.goal.toLowerCase()}** for your review. Shall I begin the mission?`;
}
