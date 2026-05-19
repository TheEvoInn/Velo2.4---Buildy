
import { AutopilotProfile } from "@/entities";
import { buildOnboardingSyncPayload } from "./onboardingSync";

/**
 * List of fields that are safe to update via the Autopilot chat.
 * These are generally public or non-sensitive professional details.
 */
export const SAFE_PROFILE_FIELDS = [
  "public_name",
  "role",
  "background",
  "skills",
  "tone",
  "preferences",
  "boundaries",
  "autopilot_brief",
  "service_description",
  "product_focus",
  "profile_summary"
];

/**
 * List of keywords that indicate sensitive data that should NOT be saved via chat.
 */
export const SENSITIVE_KEYWORDS = [
  "password", "login", "credential", "payout", "bank", "card", "ssn", "tax", "identity", 
  "document", "address", "phone", "email", "secret", "key", "seed", "wallet", "private"
];

/**
 * Detects if a user's message is an intent to update their profile.
 */
export function detectProfileUpdateIntent(input: string): boolean {
  const normalized = input.toLowerCase();
  const updateKeywords = [
    "update my profile", 
    "change my profile", 
    "set my role", 
    "add to my skills", 
    "my skills are", 
    "my background is", 
    "my name is", 
    "set my name",
    "my tone is",
    "my preferences are",
    "my boundaries are",
    "set my background"
  ];
  return updateKeywords.some(kw => normalized.includes(kw));
}

/**
 * Parses a natural language request into a safe profile patch.
 */
export function parseProfilePatch(input: string): { 
  patch: Record<string, any>, 
  summary: string, 
  sensitiveBlocked: string[] 
} {
  const normalized = input.toLowerCase();
  const patch: Record<string, any> = {};
  const sensitiveBlocked: string[] = [];
  const summaryParts: string[] = [];

  // Simple heuristic parsing for safe fields
  
  // Public Name
  if (normalized.includes("my name is") || normalized.includes("set my name to")) {
    const match = input.match(/(?:my name is|set my name to) ([\w\s.-]+)/i);
    if (match && match[1]) {
      patch.public_name = match[1].trim();
      summaryParts.push(`Set Public Name to "${patch.public_name}"`);
    }
  }

  // Role
  if (normalized.includes("my role is") || normalized.includes("set my role to")) {
    const match = input.match(/(?:my role is|set my role to) ([\w\s.-]+)/i);
    if (match && match[1]) {
      patch.role = match[1].trim();
      summaryParts.push(`Set Professional Role to "${patch.role}"`);
    }
  }

  // Skills
  if (normalized.includes("add") && normalized.includes("to my skills")) {
    const match = input.match(/add ([\w\s,.-]+) to my skills/i);
    if (match && match[1]) {
      const newSkills = match[1].split(/,/).map(s => s.trim()).filter(s => s.length > 0);
      if (newSkills.length > 0) {
        patch._add_skills = newSkills; // Marker for handling in the component
        summaryParts.push(`Add skills: ${newSkills.join(", ")}`);
      }
    }
  } else if (normalized.includes("my skills are")) {
    const match = input.match(/my skills are ([\w\s,.-]+)/i);
    if (match && match[1]) {
      const skills = match[1].split(/,/).map(s => s.trim()).filter(s => s.length > 0);
      if (skills.length > 0) {
        patch.skills = skills;
        summaryParts.push(`Set skills to: ${skills.join(", ")}`);
      }
    }
  }

  // Tone
  if (normalized.includes("my tone is") || normalized.includes("set my tone to")) {
    const tone = input.split(/(?:my tone is|set my tone to)/i)[1]?.trim();
    if (tone) {
      patch.tone = tone;
      summaryParts.push(`Update Tone of Voice`);
    }
  }

  // Preferences
  if (normalized.includes("my preferences are") || normalized.includes("set my preferences to")) {
    const prefs = input.split(/(?:my preferences are|set my preferences to)/i)[1]?.trim();
    if (prefs) {
      patch.preferences = prefs;
      summaryParts.push(`Update Preferences`);
    }
  }

  // Boundaries
  if (normalized.includes("my boundaries are") || normalized.includes("set my boundaries to")) {
    const bounds = input.split(/(?:my boundaries are|set my boundaries to)/i)[1]?.trim();
    if (bounds) {
      patch.boundaries = bounds;
      summaryParts.push(`Update Safety Boundaries`);
    }
  }

  // Background/Bio
  if (normalized.includes("my background is") || normalized.includes("set my background to")) {
    const bio = input.split(/(?:my background is|set my background to)/i)[1]?.trim();
    if (bio) {
      patch.background = bio;
      summaryParts.push(`Update Career Narrative`);
    }
  }

  // Service Description
  if (normalized.includes("my service description is") || normalized.includes("set my service description to")) {
    const desc = input.split(/(?:my service description is|set my service description to)/i)[1]?.trim();
    if (desc) {
      patch.service_description = desc;
      summaryParts.push(`Update Service Catalog Details`);
    }
  }

  // Check for sensitive keywords in the whole input
  SENSITIVE_KEYWORDS.forEach(kw => {
    if (normalized.includes(kw)) {
      sensitiveBlocked.push(kw);
    }
  });

  return {
    patch,
    summary: summaryParts.join(", "),
    sensitiveBlocked
  };
}

/**
 * Unified profile update. Every component should use this instead of calling
 * AutopilotProfile.update() directly. It handles:
 * - Onboarding metadata sync
 * - Completeness score recalculation
 * - Safe field sanitization
 */
export async function updateAutopilotProfile(
  profileId: string,
  patch: Record<string, any>,
  options?: { skipCompleteness?: boolean; skipSync?: boolean }
): Promise<{ success: boolean; completeness_before: number; completeness_after: number }> {
  // Fetch current profile to get baseline
  const current = await AutopilotProfile.get(profileId).catch(() => null);
  if (!current) return { success: false, completeness_before: 0, completeness_after: 0 };
  
  // Sanitize patch — ensure skills is always array
  const cleanPatch: Record<string, any> = { ...patch };
  if ('skills' in cleanPatch && typeof cleanPatch.skills === 'string') {
    cleanPatch.skills = cleanPatch.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  
  // Apply the update
  await AutopilotProfile.update(profileId, cleanPatch);
  
  const completenessBefore = current.completeness_score || 0;
  let completenessAfter = completenessBefore;
  
  if (!options?.skipCompleteness) {
    // Recalculate completeness after merge
    const updated = await AutopilotProfile.get(profileId).catch(() => null);
    if (updated) {
      completenessAfter = calculateCompleteness(updated);
      await AutopilotProfile.update(profileId, { completeness_score: completenessAfter });
    }
  }
  
  if (!options?.skipSync) {
    // Update onboarding metadata to reflect current state
    try {
      const syncPayload = buildOnboardingSyncPayload({
        ...current,
        ...cleanPatch
      }, null); // Pass null for user, it will fallback to profile fields
      
      if (syncPayload) {
        await AutopilotProfile.update(profileId, syncPayload);
      }
    } catch (e) {
      // Sync is best-effort — don't fail the whole update
      console.warn("Onboarding sync failed:", e);
    }
  }
  
  return { success: true, completeness_before: completenessBefore, completeness_after: completenessAfter };
}

/**
 * Calculate profile completeness from filled fields.
 */
function calculateCompleteness(profile: any): number {
  const coreFields = ['public_name', 'role', 'background'];
  const skillFields = ['skills'];
  const brainFields = ['service_description', 'product_focus', 'autopilot_brief', 'profile_summary'];
  const contactFields = ['email', 'phone_number', 'city', 'country'];
  const prefFields = ['tone', 'preferences', 'boundaries'];
  
  const allGroups = [coreFields, skillFields, brainFields, contactFields, prefFields];
  let totalFields = 0;
  let filledFields = 0;
  
  for (const group of allGroups) {
    for (const field of group) {
      totalFields++;
      const val = profile[field];
      if (val && (typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) ? val.length > 0 : true)) {
        filledFields++;
      }
    }
  }
  
  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
}

