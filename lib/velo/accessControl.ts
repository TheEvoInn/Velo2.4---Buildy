











import { User } from "@/entities";

export type UserRole = "public" | "user" | "admin";
export type ViewAsMode = "admin" | "user" | "visitor";

export interface AccessContext {
  user: any | null;
  profile: any | null;
  role: UserRole;
  isBeta: boolean;
  isMarketingMember: boolean;
  isInvitedMember: boolean;
  onboardingComplete: boolean;
  viewAs?: ViewAsMode;
}

/**
 * Checks if the current effective role is admin (including preview mode).
 */
export function isEffectiveAdmin(ctx: AccessContext): boolean {
  return ctx.role === "admin";
}

/**
 * Gets the current preview mode from session storage.
 */
export function getViewAsMode(): ViewAsMode {
  const mode = sessionStorage.getItem("velo_view_as") as ViewAsMode;
  if (mode === "admin" || mode === "user" || mode === "visitor") return mode;
  return "admin";
}

/**
 * Sets the preview mode in session storage.
 */
export function setViewAsMode(mode: ViewAsMode) {
  sessionStorage.setItem("velo_view_as", mode);
  // Dispatch a custom event to notify components
  window.dispatchEvent(new Event("velo_view_as_changed"));
}

/**
 * Clears the preview mode.
 */
export function clearViewAsMode() {
  sessionStorage.removeItem("velo_view_as");
  window.dispatchEvent(new Event("velo_view_as_changed"));
}

/**
 * Determines if the signed-in user is a real platform admin.
 */
export function isRealAdmin(user: any | null, profile: any | null): boolean {
  if (!user) return false;

  let onboardingMeta: any = {};
  if (profile?.onboarding_metadata) {
    try {
      onboardingMeta = typeof profile.onboarding_metadata === 'string' 
        ? JSON.parse(profile.onboarding_metadata) 
        : profile.onboarding_metadata;
    } catch (e) {}
  }

  const platformAdmin = user.role === "administrator" || user.role === "admin" || user.role === "owner";
  const profileAdmin = profile?.role === "captain_admin" || profile?.role === "admin" || profile?.role === "system_admin" || profile?.role === "owner";
  const metadataAdmin = profile?.metadata?.accessRole === "admin" || profile?.metadata?.isAdmin === true;
  const invitationAdmin = onboardingMeta?.invitation_context?.invited_role === "admin";
  
  return platformAdmin || profileAdmin || metadataAdmin || invitationAdmin;
}

/**
 * Determines the current user's role and onboarding status.
 * @param user The platform user object from superdevClient.auth
 * @param profile The AutopilotProfile record
 * @param isMarketingMember Whether the user has a valid marketing purchase
 * @param isInvitedMember Whether the user has a valid platform invitation
 */
export function getAccessContext(
  user: any | null, 
  profile: any | null, 
  isMarketingMember: boolean = false,
  isInvitedMember: boolean = false
): AccessContext {
  if (!user) {
    return { user: null, profile: null, role: "public", isBeta: false, isMarketingMember: false, isInvitedMember: false, onboardingComplete: false, viewAs: "visitor" };
  }

  const realIsAdmin = isRealAdmin(user, profile);
  const viewAs = getViewAsMode();

  // If the user is a real admin, apply the viewAs override
  if (realIsAdmin && viewAs === "visitor") {
    return { user: null, profile: null, role: "public", isBeta: false, isMarketingMember: false, isInvitedMember: false, onboardingComplete: false, viewAs: "visitor" };
  }

  // Parse onboarding metadata if present to check for invitation-based roles
  let onboardingMeta: any = {};
  if (profile?.onboarding_metadata) {
    try {
      onboardingMeta = typeof profile.onboarding_metadata === 'string' 
        ? JSON.parse(profile.onboarding_metadata) 
        : profile.onboarding_metadata;
    } catch (e) {
      // Silent fail
    }
  }

  // Admin check: 
  // 1. Platform role
  // 2. Specific profile role
  // 3. Metadata flags (from profile.metadata)
  // 4. Invitation context from onboarding_metadata
  const isAdmin = realIsAdmin && viewAs === "admin";
  const role: UserRole = isAdmin ? "admin" : "user";

  // Beta check: 
  // 1. Profile metadata isBeta
  // 2. Onboarding metadata isBeta
  // 3. Invitation role is in beta/test whitelist
  const betaRoles = ["beta", "tester", "member", "local_operator", "observer"];
  const invitedRole = onboardingMeta?.invitation_context?.invited_role;
  const isBeta = profile?.metadata?.isBeta === true || 
                 onboardingMeta?.isBeta === true || 
                 (invitedRole && betaRoles.includes(invitedRole) && !isAdmin);
  
  // Onboarding check:
  // 1. Profile status is active
  // 2. Metadata launchComplete/onboardingComplete is true
  // 3. Current step is marked as complete
  // 4. Onboarding complete flag in onboarding_metadata
  const statusActive = profile?.status === "active";
  const metadataComplete = profile?.metadata?.launchComplete === true || profile?.metadata?.onboardingComplete === true || profile?.metadata?.currentStep === "complete";
  const onboardingMetaComplete = onboardingMeta?.onboardingComplete === true;
  
  // Stricter onboarding check for non-admins to prevent bypass
  // Beta users get a pass for "seeing" the pages but should still be encouraged to finish
  const onboardingComplete = isAdmin 
    ? (statusActive || metadataComplete || onboardingMetaComplete) 
    : (metadataComplete || onboardingMetaComplete);

  return { 
    user, 
    profile, 
    role, 
    isBeta, 
    isMarketingMember, 
    isInvitedMember,
    onboardingComplete, 
    viewAs: realIsAdmin ? viewAs : undefined 
  };
}

/**
 * Checks if the user just completed onboarding within the last hour.
 */
export function isOnboardingJustFinished(profile: any): boolean {
  if (!profile?.onboarding_metadata) return false;
  try {
    const meta = typeof profile.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata) 
      : profile.onboarding_metadata;
    
    if (!meta?.onboardingComplete || !meta?.launchTimestamp) return false;
    
    const launchTime = new Date(meta.launchTimestamp).getTime();
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;
    
    return (now - launchTime) < oneHour;
  } catch (e) {
    return false;
  }
}

/**
 * Check if the current context has permission to enter the Command Center / Mission Control.
 */
export function canEnterCommandCenter(ctx: AccessContext): boolean {
  return ctx.role === "admin" || ctx.isBeta || ctx.isMarketingMember || ctx.isInvitedMember;
}

/**
 * Check if the user is an admin or beta tester.
 */
export function isBetaOrAdmin(ctx: AccessContext): boolean {
  return ctx.role === "admin" || ctx.isBeta;
}

/**
 * Check if a user requires the onboarding sequence before entering the main deck.
 * Signed-in non-admin users require onboarding if not already complete.
 */
export function requiresOnboarding(ctx: AccessContext): boolean {
  if (!ctx.user || ctx.role === 'admin') return false;
  return !ctx.onboardingComplete;
}

/**
 * Check if a specific module is sensitive and requires admin access.
 * Non-admin beta users should be able to access standard hubs and monitors.
 */
export function isSensitiveModule(moduleId: string): boolean {
  const sensitiveModules = [
    "command-bridge",
    "black-box",
    "raw-scanner-sources",
    "devops-deck",
    "admin-settings",
    "ubuntu-activation"
  ];
  return sensitiveModules.includes(moduleId);
}

/**
 * Helper to check if the current user can view a sensitive area.
 */
export function canViewSensitiveArea(ctx: AccessContext): boolean {
  return ctx.role === "admin";
}

/**
 * Check if a specific module is essential for regular users in an Autopilot-first experience.
 * This limits the noise for non-admin users to core areas.
 */
export function isEssentialModule(moduleId: string): boolean {
  const essentialModules = [
    "dashboard",
    "autopilot",
    "wallet",
    "action-engine",
    "clone-bay",
    "content-archive",
    "galaxy-scanner",
    "freelance-station",
    "trade-bay",
    "market-deck",
    "mission-monitor",
    "continuity-core",
    "docking-control",
    "google-prep"
  ];
  return essentialModules.includes(moduleId);
}

/**
 * Filter menu items based on the current access context.
 */
export function filterMenuItems(sections: any[], ctx: AccessContext) {
  if (ctx.role === "public") {
    // Public users see nothing in the sidebar
    return [];
  }

  const isAdmin = ctx.role === "admin";

  return sections.map(section => ({
    ...section,
    items: section.items.filter((item: any) => {
      // If it's a sensitive module, only admins see it
      if (isSensitiveModule(item.id)) {
        return isAdmin;
      }
      
      // If the user is not an admin, they only see essential modules
      if (!isAdmin && !isEssentialModule(item.id)) {
        return false;
      }

      return true;
    })
  })).filter(section => section.items.length > 0);
}

/**
 * Helper to check if a specific area should be hidden or redacted.
 */
export function shouldHideSensitiveData(ctx: AccessContext): boolean {
  return ctx.role !== "admin";
}

/**
 * Returns a human-readable label for a role.
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'captain_admin':
    case 'system_admin':
    case 'admin': return 'Administrator';
    case 'member': return 'Station Member';
    case 'observer': return 'Observer';
    case 'local_operator': return 'Local Operator (Future)';
    default: return role;
  }
}

/**
 * Checks if the current role is authorized for a specific risk level on Buildy.
 */
export function isAuthorizedForRisk(role: UserRole, risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): boolean {
  if (role === 'admin') return true;
  if (role === 'user') {
    return risk === 'LOW';
  }
  return false;
}

/**
 * Checks if an error is an expected "hiccup" like an expired session or temporary service error.
 */
export function isExpectedError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || "";
  const status = error.status;

  // 1. Session expired / Unauthorized
  if (status === 401 || message.includes("unauthorized") || message.includes("not authenticated")) {
    return true;
  }

  // 2. Service hiccups (520, 502, 503, 504)
  if ([520, 502, 503, 504].includes(status)) {
    return true;
  }

  // 3. HTML responses in messages (often 5xx errors behind a proxy like Cloudflare)
  if (message.includes("<!doctype html>") || message.includes("<html")) {
    return true;
  }

  // 4. Specific service error strings
  if (message.includes("web server is returning an unknown error") || message.includes("api request failed")) {
    return true;
  }

  return false;
}

/**
 * Returns a profile object with safe defaults for UI and logic.
 */
export function getSafeProfile(profile: any | null) {
  return {
    id: profile?.id || "temp-id",
    public_name: profile?.public_name || "Guest Pilot",
    legal_name: profile?.legal_name || "",
    email: profile?.email || "",
    phone_number: profile?.phone_number || "",
    birthday: profile?.birthday || "",
    address_line_1: profile?.address_line_1 || "",
    address_line_2: profile?.address_line_2 || "",
    city: profile?.city || "",
    state_region: profile?.state_region || "",
    postal_code: profile?.postal_code || "",
    country: profile?.country || "",
    preferred_contact_method: profile?.preferred_contact_method || "email",
    role: profile?.role || "Observer",
    background: profile?.background || "No background data provided.",
    status: profile?.status || "draft",
    completeness_score: profile?.completeness_score || 0,
    profile_summary: profile?.profile_summary || "Synthetic bio not yet generated.",
    service_description: profile?.service_description || "Freelancer service offering not yet drafted.",
    product_focus: profile?.product_focus || "E-commerce niche focus not yet identified.",
    skills: profile?.skills || [],
    safety_acknowledged: profile?.safety_acknowledged || false,
    secure_core_acknowledged: profile?.secure_core_acknowledged || false,
    ...profile
  };
}

/**
 * Safely finds the profile belonging to the current user from a list of profiles.
 * Prevents beta users from seeing the owner's profile or other users' profiles.
 */
export function findScopedProfile(user: any | null, profiles: any[]): any | null {
  if (!user || !Array.isArray(profiles) || profiles.length === 0) return null;

  const email = user.email?.toLowerCase();
  if (!email) return null;

  // 1. Search for the profile with the most specific match first
  for (const p of profiles) {
    const createdByMatch = p.created_by?.toLowerCase() === email;
    const ownerEmailMatch = p.owner_email?.toLowerCase() === email;
    const requestedByMatch = p.requested_by_email?.toLowerCase() === email;
    const userEmailMatch = p.user_email?.toLowerCase() === email;
    
    if (createdByMatch || ownerEmailMatch || requestedByMatch || userEmailMatch) {
      return p;
    }

    // Check metadata
    if (p.metadata?.owner_email?.toLowerCase() === email || 
        p.metadata?.user_email?.toLowerCase() === email || 
        p.metadata?.requested_by_email?.toLowerCase() === email) {
      return p;
    }

    // Check onboarding_metadata
    try {
      const meta = typeof p.onboarding_metadata === 'string' 
        ? JSON.parse(p.onboarding_metadata) 
        : p.onboarding_metadata;
      
      if (meta?.owner_email?.toLowerCase() === email || 
          meta?.user_email?.toLowerCase() === email || 
          meta?.requested_by_email?.toLowerCase() === email || 
          meta?.invitation_context?.email?.toLowerCase() === email) {
        return p;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // 2. Special case: If user is admin but has no specific profile matching their email, 
  // we DO NOT return the first profile unless it explicitly belongs to them.
  // This prevents admins from "becoming" someone else if their profile is missing,
  // and prevents beta users from seeing admin data.

  return null;
}

/**
 * Ensures a user has a draft profile if none exists.
 * Returns a template for a new profile if no match is found in the provided list.
 */
export function getDraftProfileTemplate(user: any) {
  if (!user) return null;
  const namePrefix = user.full_name || user.email?.split('@')[0] || "Pilot";
  
  return {
    public_name: namePrefix,
    legal_name: user.full_name || "",
    role: "", // Professional role should be empty for new users
    status: "draft",
    completeness_score: 0,
    onboarding_metadata: JSON.stringify({
      owner_email: user.email,
      user_email: user.email,
      currentStep: 0,
      selectedDepts: []
    })
  };
}

/**
 * Standardizes the onboarding metadata structure for a user.
 */
export function buildUserProfileOnboardingMetadata(user: any, existingMeta?: any, invitation?: any) {
  const meta = {
    ...(typeof existingMeta === 'string' ? JSON.parse(existingMeta || '{}') : (existingMeta || {})),
    owner_email: user.email,
    user_email: user.email,
    user_id: user.id,
    profileSyncVersion: "1.3"
  };

  if (invitation) {
    meta.invitation_context = {
      id: invitation.id,
      email: invitation.email,
      invited_role: invitation.role,
      invited_by: invitation.created_by
    };
  }

  return meta;
}

/**
 * Creates a blank draft profile for a specific user, ensuring no admin data leaks.
 */
export function createBlankScopedProfile(user: any, invitation?: any) {
  const namePrefix = user.full_name || user.email?.split('@')[0] || "Pilot";
  
  return {
    public_name: `${namePrefix} - Terminal`,
    legal_name: user.full_name || "",
    role: "", // Professional role should be empty for new users to fill
    email: user.email || "",
    phone_number: "",
    birthday: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state_region: "",
    postal_code: "",
    country: "",
    preferred_contact_method: "email",
    background: "",
    skills: [],
    tone: "",
    preferences: "",
    boundaries: "",
    service_description: "",
    product_focus: "",
    status: "draft",
    completeness_score: 0,
    onboarding_metadata: JSON.stringify(buildUserProfileOnboardingMetadata(user, {}, invitation)),
    safety_acknowledged: false,
    secure_core_acknowledged: false
  };
}

/**
 * Checks if a specific record is owned by the current user.
 * Supports various ownership markers common in Velo entities.
 */
export function isRecordOwnedByUser(record: any, user: any): boolean {
  if (!record || !user) return false;
  
  const email = user.email;
  
  // Direct platform fields
  if (record.created_by === email) return true;
  
  // Common custom fields
  if (record.owner_email === email) return true;
  if (record.user_email === email) return true;
  if (record.requested_by_email === email) return true;
  if (record.email === email) return true;
  
  // Metadata checks
  if (record.metadata?.owner_email === email || record.metadata?.user_email === email) return true;
  
  // Onboarding metadata checks
  try {
    const meta = typeof record.onboarding_metadata === 'string' 
      ? JSON.parse(record.onboarding_metadata) 
      : record.onboarding_metadata;
    
    if (meta?.owner_email === email || meta?.user_email === email || meta?.invitation_context?.email === email) {
      return true;
    }
  } catch (e) {
    // Ignore
  }
  
  return false;
}

/**
 * Normalizes a profile payload before sending it to the database.
 * Ensures ownership markers are preserved and metadata is correctly stringified.
 */
export function normalizeProfilePayload(profile: any, user: any) {
  if (!profile || !user) return profile;

  let meta: any = {};
  try {
    meta = typeof profile.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata || '{}') 
      : (profile.onboarding_metadata || {});
  } catch (e) {
    console.error("Failed to parse metadata for normalization:", e);
  }

  // Ensure ownership markers
  meta.owner_email = user.email;
  meta.user_email = user.email;
  meta.user_id = user.id;

  // Whitelist supported fields to avoid sending UI state or relation arrays
  const supportedFields = [
    'public_name', 'legal_name', 'role', 'background', 'skills', 'tone', 
    'preferences', 'boundaries', 'autopilot_brief', 'profile_summary',
    'service_description', 'product_focus', 'status', 'completeness_score',
    'safety_acknowledged', 'secure_core_acknowledged', 'last_brief_generated_at',
    'avatar_id', 'legal_consent_date', 'autopilot_enabled', 'autopilot_mode',
    'autopilot_cycle_status', 'autopilot_cycle_summary', 'autopilot_last_started_at',
    'email', 'phone_number', 'birthday', 'address_line_1', 'address_line_2',
    'city', 'state_region', 'postal_code', 'country', 'preferred_contact_method'
  ];

  const payload: any = {
    onboarding_metadata: JSON.stringify(meta)
  };

  for (const field of supportedFields) {
    if (profile[field] !== undefined) {
      payload[field] = profile[field];
    }
  }

  return payload;
}

/**
 * Logs a telemetry error gracefully, avoiding huge HTML dumps in the console.
 */
export function handleTelemetryError(context: string, error: any) {
  if (isExpectedError(error)) {
    // Silent or quiet log for expected hiccups
    console.info(`[VELO] Telemetry pause in ${context}: Service briefly unavailable or session expired.`);
  } else {
    // Real errors get a warning without the full payload if it's huge
    const message = error.message || String(error);
    const shortMessage = message.length > 500 ? message.substring(0, 500) + "..." : message;
    console.warn(`[VELO] Telemetry failure in ${context}:`, shortMessage);
  }
}
