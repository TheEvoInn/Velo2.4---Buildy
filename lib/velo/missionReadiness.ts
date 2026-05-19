
import { 
  AutopilotProfile, 
  VeloPlatformProfile, 
  VeloConnectorProfile, 
  SecureVaultItem, 
  User 
} from "@/entities";
import { findScopedProfile } from "./accessControl";
import { normalizeLaneId } from "./opportunitySourceIntelligence";

export type ReadinessStatus = "ready" | "needs_profile" | "needs_account" | "needs_review" | "blocked_by_preferences" | "internal_brief";

export interface ReadinessResult {
  status: ReadinessStatus;
  score: number;
  strengths: string[];
  blockers: string[];
  warnings: string[];
  missing_inputs: string[];
  next_best_action: string;
  readiness_label: string;
  skill_match_score: number;
  match_breakdown: string[];
}

/**
 * Compact summary for metadata storage.
 */
export function summarizeReadinessForMetadata(result: ReadinessResult) {
  return {
    readiness_status: result.status,
    readiness_score: result.score,
    readiness_label: result.readiness_label,
    readiness_blockers: result.blockers,
    readiness_warnings: result.warnings,
    readiness_strengths: result.strengths,
    missing_inputs: result.missing_inputs,
    next_best_action: result.next_best_action,
    skill_match_score: result.skill_match_score,
    match_breakdown: result.match_breakdown
  };
}

/** Extracts meaningful words from text, filtering short words and common stopwords */
function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "the", "and", "for", "with", "you", "this", "that", "from", "your", 
    "will", "have", "has", "are", "was", "were", "not", "but", "all", 
    "can", "our", "its", "about", "also", "each", "more", "some", "than",
    "into", "over", "just", "most", "other", "been", "being", "very"
  ]);
  return text.split(/[\s,;.()\[\]{}|/\\"':!?@#$%^&*+=<>-]+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 3 && !stopwords.has(w));
}

export interface ReadinessContext {
  currentUser: any;
  profile: any;
  platforms: any[];
  connectors: any[];
  vaultItems: any[];
}

/**
 * Fetches all context needed for readiness evaluation.
 */
export async function fetchReadinessContext(): Promise<ReadinessContext | null> {
  const [currentUser, profiles, platforms, connectors, vaultItems] = await Promise.all([
    User.me().catch(() => null),
    AutopilotProfile.list().catch(() => []),
    VeloPlatformProfile.list().catch(() => []),
    VeloConnectorProfile.list().catch(() => []),
    SecureVaultItem.list().catch(() => [])
  ]);

  if (!currentUser) return null;

  const profile = findScopedProfile(currentUser, profiles);
  return {
    currentUser,
    profile,
    platforms,
    connectors,
    vaultItems
  };
}

/**
 * Synchronous version of readiness evaluation using pre-fetched context.
 */
export function evaluateReadiness(opportunity: any, context: ReadinessContext | null): ReadinessResult {
  const result: ReadinessResult = {
    status: "ready",
    score: 100,
    strengths: [],
    blockers: [],
    warnings: [],
    missing_inputs: [],
    next_best_action: "Review prepared packet",
    readiness_label: "Ready",
    skill_match_score: 0,
    match_breakdown: []
  };

  if (!opportunity) return { ...result, status: "needs_review", score: 0, readiness_label: "Needs Review" };

  // 0. Internal Research Brief Check (Highest Priority Guard)
  const m = opportunity.metadata || {};
  const isInternal = 
    m.internal_research_brief === true || 
    m.not_a_public_listing === true || 
    m.real_opportunity === false || 
    opportunity.department === 'research' ||
    (!opportunity.source_url && opportunity.source_name?.toLowerCase().includes('velo'));

  if (isInternal) {
    return { 
      ...result, 
      status: "internal_brief", 
      score: 50, 
      readiness_label: "Internal Brief", 
      next_best_action: "Review research details" 
    };
  }

  if (!context || !context.currentUser) {
    return { ...result, status: "needs_review", score: 0, next_best_action: "Login required", readiness_label: "Auth Required" };
  }

  const { currentUser, profile, platforms, connectors, vaultItems } = context;

  if (!profile) {
    return { ...result, status: "needs_profile", score: 20, next_best_action: "Complete pilot profile", readiness_label: "Needs Profile" };
  }

  // Filter vault items to current user (safe reference only)
  const userVaultItems = vaultItems.filter(v => v.created_by === currentUser.email);

  // 2. Skill & Profile Match
  const requirements = (opportunity.requirements || "").toLowerCase();
  const title = (opportunity.title || "").toLowerCase();
  const summary = (opportunity.summary || "").toLowerCase();
  const oppType = (opportunity.opportunity_type || "").toLowerCase();
  const reqList = Array.isArray(m.requirements_list) ? m.requirements_list.join(" ").toLowerCase() : "";
  
  const searchContext = `${requirements} ${title} ${summary} ${oppType} ${reqList}`;
  
  // Normalize pilot skills (handle both array and legacy string)
  const pilotSkills: string[] = Array.isArray(profile.skills) 
    ? profile.skills.map((s: string) => s.toLowerCase().trim()).filter(s => s.length > 1)
    : (typeof profile.skills === 'string' && profile.skills.trim())
      ? profile.skills.split(",").map((s: string) => s.toLowerCase().trim()).filter(s => s.length > 1)
      : [];
  
  const profileSummary = (profile.profile_summary || "").toLowerCase();
  const serviceDesc = (profile.service_description || "").toLowerCase();
  const productFocus = (profile.product_focus || "").toLowerCase();
  const autopilotBrief = (profile.autopilot_brief || "").toLowerCase();
  const role = (profile.role || "").toLowerCase();
  
  // --- 2a. Percentage-based skill matching ---
  const skillMatches = pilotSkills.filter((s: string) => s.length > 2 && searchContext.includes(s));
  const skillMatchPct = pilotSkills.length > 0 
    ? Math.round((skillMatches.length / pilotSkills.length) * 100)
    : 0;
  
  if (skillMatchPct >= 50) {
    result.strengths.push(`Strong skill match: ${skillMatches.length}/${pilotSkills.length} (${skillMatchPct}%)`);
    result.score += 10;
  } else if (skillMatchPct >= 25) {
    result.strengths.push(`Partial skill match: ${skillMatches.length}/${pilotSkills.length} (${skillMatchPct}%)`);
    result.score += 5;
  } else if (skillMatches.length > 0) {
    result.strengths.push(`Limited skill overlap: ${skillMatches.slice(0, 3).join(", ")}`);
  } else {
    result.warnings.push("No direct skill match detected");
    result.score -= 10;
  }
  
  // --- 2b. Service description word overlap ---
  const serviceKeywords = extractKeywords(serviceDesc);
  const matchedServiceWords = serviceKeywords.filter(w => searchContext.includes(w));
  const serviceMatchPct = serviceKeywords.length > 0
    ? Math.round((matchedServiceWords.length / serviceKeywords.length) * 100)
    : 0;
  
  if (serviceMatchPct >= 40) {
    result.strengths.push(`Service alignment: ${matchedServiceWords.length}/${serviceKeywords.length} keywords matched`);
    result.score += 8;
  } else if (matchedServiceWords.length > 0) {
    result.strengths.push(`Partial service alignment (${matchedServiceWords.length} keywords)`);
    result.score += 3;
  }
  
  // --- 2c. Product focus relevance ---
  const focusKeywords = extractKeywords(productFocus);
  const matchedFocusWords = focusKeywords.filter(w => searchContext.includes(w));
  if (matchedFocusWords.length >= 3) {
    result.strengths.push(`Product focus aligned: ${matchedFocusWords.slice(0, 4).join(", ")}`);
    result.score += 5;
  }
  
  // --- 2d. Autopilot brief contextual relevance ---
  const briefKeywords = extractKeywords(autopilotBrief);
  const matchedBriefWords = briefKeywords.filter(w => searchContext.includes(w));
  if (matchedBriefWords.length >= 3) {
    result.strengths.push(`Strategic alignment: ${matchedBriefWords.length} goals/keywords matched`);
    result.score += 5;
  }

  // --- Compute consolidated skill_match_score from match dimensions ---
  const matchItems: string[] = [];
  let matchPoints = 0;
  let matchMax = 0;

  // Skill match
  if (pilotSkills.length > 0) {
    matchMax += 100;
    matchPoints += skillMatchPct;
    if (skillMatches.length > 0) {
      matchItems.push(`${skillMatches.length}/${pilotSkills.length} skills (${skillMatchPct}%) — ${skillMatches.slice(0, 4).join(', ')}`);
    }
  }

  // Service alignment
  if (serviceKeywords.length > 0) {
    matchMax += 100;
    matchPoints += serviceMatchPct;
    if (matchedServiceWords.length > 0) {
      matchItems.push(`Service: ${matchedServiceWords.length}/${serviceKeywords.length} keywords — ${matchedServiceWords.slice(0, 4).join(', ')}`);
    }
  }

  // Product focus
  if (focusKeywords.length > 0) {
    matchMax += 100;
    const focusPct = Math.round((matchedFocusWords.length / focusKeywords.length) * 100);
    matchPoints += focusPct;
    if (matchedFocusWords.length >= 3) {
      matchItems.push(`Product: ${matchedFocusWords.length}/${focusKeywords.length} terms — ${matchedFocusWords.slice(0, 4).join(', ')}`);
    }
  }

  // Strategic brief
  if (briefKeywords.length > 0) {
    matchMax += 100;
    const briefPct = Math.round((matchedBriefWords.length / briefKeywords.length) * 100);
    matchPoints += briefPct;
    if (matchedBriefWords.length >= 3) {
      matchItems.push(`Strategy: ${matchedBriefWords.length}/${briefKeywords.length} goals`);
    }
  }

  result.skill_match_score = matchMax > 0 ? Math.round(matchPoints / (matchMax / 100)) : 0;
  result.match_breakdown = matchItems;

  const pilotContext = `${pilotSkills.join(" ")} ${profileSummary} ${serviceDesc} ${productFocus} ${autopilotBrief} ${role}`;

  // 3. Account Readiness (Refined Platform Matching)
  const sourceName = (opportunity.source_name || "").toLowerCase();
  const platformName = (opportunity.platform_name || sourceName).toLowerCase();
  
  const aliases: Record<string, string[]> = {
    "ai_training": ["outlier", "dataannotation", "appen", "telus", "remotasks", "invisible"],
    "online_testing": ["usertesting", "utest", "testio", "trymata", "userlytics", "applause"],
    "microtasks": ["clickworker", "amazon mechanical turk", "mturk", "uhrs", "prolific", "cloudresearch"],
    "ai_freelance": ["upwork", "fiverr", "toptal", "freelancer", "guru", "codementor"],
    "content_research": ["medium", "substack", "ghost", "newsletter", "research panel"],
    "global_language": ["gengo", "unbabel", "textmaster", "blend", "language line"],
    "freelance": ["upwork", "fiverr", "toptal", "freelancer", "guru"],
    "testing": ["usertesting", "utest", "testio", "trymata", "userlytics", "applause"],
    "microtask": ["clickworker", "amazon mechanical turk", "mturk", "uhrs", "prolific", "cloudresearch"]
  };

  const lane = normalizeLaneId(opportunity.opportunity_type || opportunity.lane_id || opportunity.metadata?.industry_lane || "");
  const relevantAliases = aliases[lane] || [];
  
  // Build platform mention terms starting with known identifiers
  const platformMentionTerms: string[] = [
    platformName, 
    sourceName,
    m.source_name?.toLowerCase(),
    m.platform_name?.toLowerCase(),
    opportunity.target_customer_or_asset?.toLowerCase()
  ].filter(Boolean);

  // Only include lane aliases if they are explicitly mentioned in the listing context
  const sourceUrlLower = (opportunity.source_url || "").toLowerCase();
  const metadataDesc = (m.description || "").toLowerCase();
  
  relevantAliases.forEach(alias => {
    const a = alias.toLowerCase();
    if (
      searchContext.includes(a) || 
      sourceName.includes(a) || 
      sourceUrlLower.includes(a) ||
      metadataDesc.includes(a)
    ) {
      if (!platformMentionTerms.includes(a)) {
        platformMentionTerms.push(a);
      }
    }
  });

  const searchTerms = Array.from(new Set(platformMentionTerms));

  // 2.2 Lane-Specific Skill Matching
  const laneSkills: Record<string, string[]> = {
    "ai_training": ["writing", "analysis", "annotation", "evaluation", "research", "prompt", "ai", "data", "english", "qa", "rlhf", "labeling"],
    "online_testing": ["qa", "testing", "bug", "browser", "device", "usability", "feedback", "mobile", "web", "quality assurance", "test cycle"],
    "microtasks": ["data entry", "categorization", "transcription", "survey", "speed", "accuracy", "moderation"]
  };

  const laneSpecificTerms = laneSkills[lane] || [];
  const matchedLaneSkills = laneSpecificTerms.filter(s => pilotContext.includes(s) && searchContext.includes(s));

  if (matchedLaneSkills.length > 0) {
    result.strengths.push(`Lane-specific match: ${matchedLaneSkills.slice(0, 3).join(", ")}`);
    result.score += 10;
  }

  const safeStatuses = ['connected', 'active', 'ready', 'staged', 'approved'];
  const safeLower = (s: any) => (s || "").toString().toLowerCase();

  const isConnected = searchTerms.length > 0 && (
    platforms.some(p => {
      const name = safeLower(p.name);
      const status = safeLower(p.connection_status);
      return searchTerms.some(t => name.includes(t)) && 
        safeStatuses.includes(status) && 
        p.created_by === currentUser.email;
    }) || connectors.some(c => {
      const provider = safeLower(c.provider_type);
      const status = safeLower(c.status);
      return searchTerms.some(t => provider.includes(t)) && 
        safeStatuses.includes(status) && 
        c.created_by === currentUser.email;
    }) || userVaultItems.some(v => {
      const label = safeLower(v.label);
      const category = safeLower(v.category);
      const username = safeLower(v.username_hint);
      return searchTerms.some(t => label.includes(t) || category.includes(t) || username.includes(t));
    })
  );

  if (isConnected) {
    result.strengths.push(`Saved account reference found for ${opportunity.source_name || "platform"}`);
    result.strengths.push(`Platform account ready: ${opportunity.source_name}`);
  } else if (opportunity.account_creation_required) {
    result.blockers.push(`${opportunity.source_name} account creation required`);
    result.status = "needs_account";
    result.score -= 30;
    result.next_best_action = `Setup ${opportunity.source_name} account`;
    result.readiness_label = "Needs Account";
  } else {
    // Determine if we should show a specific warning or a generic one
    if (searchTerms.length > 0) {
      result.warnings.push(`No saved credentials for ${opportunity.source_name}`);
    } else {
      result.warnings.push("Platform account not confirmed for this specific source");
    }
    result.score -= 5;
  }

  // 4. Identity & Flags
  if (opportunity.identity_verification_required) {
    const hasIdentityInVault = userVaultItems.some(v => {
      const cat = safeLower(v.category);
      const lbl = safeLower(v.label);
      return cat === 'identity' || 
        lbl.includes('identity') ||
        lbl.includes('passport') ||
        lbl.includes('driver license');
    });
    if (!hasIdentityInVault) {
      result.blockers.push("Identity verification assets missing from vault");
      if (result.status !== "needs_account") result.status = "needs_review";
      result.score -= 20;
      result.next_best_action = "Upload ID to Secure Vault";
      result.readiness_label = "Needs ID";
    } else {
      result.strengths.push("Identity assets staged in Vault");
    }
  }

  // 5. Payout Clarity & Preferences
  const payoutText = (opportunity.payout_text || "").toLowerCase();
  const hasNoPayout = !opportunity.payout_text || payoutText.includes("not listed") || payoutText.includes("unknown");

  let prefs: any = {};
  try {
    const meta = typeof profile.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata) 
      : profile.onboarding_metadata;
    prefs = meta?.opportunity_preferences || meta?.opportunityPreferences || {};
  } catch (e) {}

  if (hasNoPayout) {
    if (prefs.verified_payout_only) {
      result.status = "blocked_by_preferences";
      result.blockers.push("Preferences: Verified payout required");
      result.readiness_label = "Blocked by Prefs";
    } else {
      result.warnings.push("Payout not listed by source");
      result.score -= 10;
    }
  } else {
    result.strengths.push(`Payout identified: ${opportunity.payout_text}`);
  }

  if (prefs.avoid_id_verification && opportunity.identity_verification_required) {
    result.status = "blocked_by_preferences";
    result.blockers.push("Preferences: Avoiding ID verification");
    result.readiness_label = "Blocked by Prefs";
  }

  // 6. Final status adjustments
  if (result.blockers.length > 0 && (result.status === "ready" || result.status === "needs_review")) {
    if (result.blockers.some(b => b.includes("account"))) result.status = "needs_account";
    else if (result.blockers.some(b => b.includes("Preferences"))) result.status = "blocked_by_preferences";
    else result.status = "needs_review";
  }

  if (result.status === "ready") {
    result.score = Math.max(result.score, 80);
    result.readiness_label = "Ready";
  }

  result.score = Math.min(100, Math.max(0, result.score));

  return result;
}

/**
 * Evaluates a real opportunity against the current user's profile and connected accounts.
 */
export async function calculateOpportunityReadiness(opportunity: any): Promise<ReadinessResult> {
  const context = await fetchReadinessContext();
  return evaluateReadiness(opportunity, context);
}
