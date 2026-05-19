
import { calculateProfileReadiness } from "./profileReadiness";
import { generateFirstMissionSuggestion } from "./onboardingMissionSuggestions";
import { normalizeProfilePayload } from "./accessControl";

/**
 * Safely parses the onboarding metadata from a profile record.
 */
export function parseOnboardingMeta(profile: any) {
  if (!profile?.onboarding_metadata) return {};
  try {
    return typeof profile.onboarding_metadata === 'string'
      ? JSON.parse(profile.onboarding_metadata)
      : profile.onboarding_metadata;
  } catch (e) {
    return {};
  }
}

/**
 * Synthesizes a structured Autopilot brief from profile fields.
 */
export function buildAutopilotBrief(profile: any, meta: any) {
  const name = profile.public_name || "Pilot";
  const role = profile.role || "Specialist";
  const bg = profile.background || "No background data provided.";
  const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : (profile.skills || "General Expertise");
  const tone = profile.tone || "Professional";
  const sectors = meta.selectedDepts || [];
  
  return `Target Identity: ${name} (${role}). 
Background: ${bg}
Core Skills: ${skills}
Communication Protocol: ${tone} tone.
Selected Operational Sectors: ${sectors.join(", ") || "General Scouting"}.
Primary Directive: Research and draft high-match opportunities for manual review. No external execution authorized without explicit confirmation.`;
}

/**
 * Creates a compact profile summary for downstream content matching.
 */
export function buildProfileSummary(profile: any, meta: any) {
  const role = profile.role || "Pilot";
  const sectors = meta.selectedDepts || [];
  const skills = Array.isArray(profile.skills) ? profile.skills.slice(0, 3).join(", ") : "";
  
  const sectorList = sectors.length > 0 ? `focused on ${sectors.join(" and ")}` : "conducting general operations";
  const skillList = skills ? `. Expertise includes ${skills}` : "";
  
  return `${role} ${sectorList}${skillList}. Authorized for supervised mission research.`;
}

/**
 * Provides safe operational preferences based on selected sectors.
 */
export function buildDefaultPreferences(profile: any, meta: any) {
  if (profile.preferences && profile.preferences.trim().length > 10) return profile.preferences;
  
  const sectors = meta.selectedDepts || [];
  let prefs = "Prioritize high-impact, low-risk opportunities. ";
  
  if (sectors.includes('freelance')) prefs += "Focus on gig platforms for remote work. ";
  if (sectors.includes('trade')) prefs += "Focus on digital product commerce and passive asset launches. ";
  if (sectors.includes('market')) prefs += "Prioritize market signal analysis for major indices. ";
  if (sectors.includes('crypto')) prefs += "Monitor top 100 assets and emerging L2 ecosystems for yield or utility. ";
  
  return prefs.trim();
}

/**
 * Provides safety-aware boundaries for AI operations.
 */
export function buildDefaultBoundaries(profile: any, meta: any) {
  if (profile.boundaries && profile.boundaries.trim().length > 10) return profile.boundaries;
  
  return `1. No external posting or messaging without manual approval.
2. No financial transactions or trading without explicit confirmation.
3. No credential use outside of the Security Vault.
4. All AI-generated drafts must be reviewed before use.
5. No outbound communication to clients or leads without pilot review.`;
}

/**
 * Fills in missing sector-specific focus fields.
 */
export function buildSectorFocusFields(profile: any, meta: any) {
  const updates: any = {};
  const sectors = meta.selectedDepts || [];
  
  // Only set if field is empty or very short
  if (sectors.includes('freelance') && (!profile.service_description || profile.service_description.length < 20)) {
    updates.service_description = `Professional ${profile.role || 'freelance'} services focusing on ${Array.isArray(profile.skills) ? profile.skills.join(', ') : 'core expertise'}. Specializing in delivering high-quality mission outcomes tailored to the client's background.`;
  }
  
  if (sectors.includes('trade') && (!profile.product_focus || profile.product_focus.length < 20)) {
    updates.product_focus = `Digital products and high-margin assets aligned with ${profile.role || 'industry'} standards, leveraging skills in ${Array.isArray(profile.skills) ? profile.skills[0] || 'niche research' : 'niche research'}.`;
  }
  
  return updates;
}

/**
 * Main orchestrator for syncing onboarding data into the Autopilot profile.
 * Ensures the profile is enriched with summaries, briefs, and safety defaults.
 */
export function buildOnboardingSyncPayload(
  profile: any, 
  user: any, 
  options: { isFinal?: boolean; forceRegenerateBrief?: boolean } = {}
) {
  const meta = parseOnboardingMeta(profile);
  
  // Enrich fields — prioritize keeping existing user-entered values if substantial
  // unless forceRegenerateBrief is true or it's the final launch.
  const hasSubstantialBrief = profile.autopilot_brief && profile.autopilot_brief.trim().length > 100;
  const hasSubstantialSummary = profile.profile_summary && profile.profile_summary.trim().length > 40;
  
  const shouldRegenerateBrief = options.forceRegenerateBrief || options.isFinal || !hasSubstantialBrief;
  const shouldRegenerateSummary = options.forceRegenerateBrief || options.isFinal || !hasSubstantialSummary;

  const updates: any = {
    preferences: buildDefaultPreferences(profile, meta),
    boundaries: buildDefaultBoundaries(profile, meta),
    ...buildSectorFocusFields(profile, meta)
  };

  if (shouldRegenerateBrief) {
    updates.autopilot_brief = buildAutopilotBrief(profile, meta);
    updates.last_brief_generated_at = new Date().toISOString();
  }
  
  if (shouldRegenerateSummary) {
    updates.profile_summary = buildProfileSummary(profile, meta);
  }
  
  // Merge updates into profile for score calculation and payload assembly
  const enrichedProfile = { ...profile, ...updates };
  const { score } = calculateProfileReadiness(enrichedProfile);
  
  const syncMeta = {
    ...meta,
    onboardingComplete: options.isFinal ? true : meta.onboardingComplete,
    launchTimestamp: options.isFinal ? (meta.launchTimestamp || new Date().toISOString()) : meta.launchTimestamp,
    profileSyncVersion: "1.3", // Incremented for new markers
    profileSyncedAt: new Date().toISOString(),
    autopilotBriefGeneratedFromOnboarding: shouldRegenerateBrief && options.isFinal,
    syncTargets: [
      "autopilot_brief", 
      "profile_summary", 
      "content_briefs", 
      "mission_suggestions", 
      "readiness", 
      "review_guidance"
    ],
    // Ensure critical context is preserved
    selectedDepts: meta.selectedDepts || [],
    paymentChoices: meta.paymentChoices || {},
    invitation_context: meta.invitation_context || null,
    owner_email: meta.owner_email || profile.owner_email || user?.email,
    user_email: meta.user_email || profile.user_email || user?.email,
    user_id: meta.user_id || profile.user_id || user?.id
  };
  
  if (options.isFinal) {
    syncMeta.firstMissionSuggestion = generateFirstMissionSuggestion(enrichedProfile);
    syncMeta.firstMissionStatus = "suggested";
    syncMeta.firstMissionSuggestedAt = new Date().toISOString();
  }
  
  const finalProfile = {
    ...enrichedProfile,
    onboarding_metadata: JSON.stringify(syncMeta),
    completeness_score: score,
    status: options.isFinal ? "active" : enrichedProfile.status
  };
  
  return normalizeProfilePayload(finalProfile, user);
}
