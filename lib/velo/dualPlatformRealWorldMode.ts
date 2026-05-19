









import { VeloAdminSetting } from "@/entities";

export type RealWorldModeOutcome = 'buildy_active' | 'buildy_queue_for_ubuntu' | 'requires_human_approval';

export interface RealWorldModeSettings {
  buildyRealWorldMode: 'enabled' | 'disabled';
  ubuntuFullAutonomy: 'enabled' | 'disabled' | 'pending_host_attestation';
}

export const BUILDY_ACTIVE_CATEGORIES = [
  'onboarding',
  'account_updates',
  'autopilot_chat',
  'workflow_creation',
  'content_generation_internal',
  'opportunity_research',
  'platform_discovery',
  'lead_discovery',
  'prospect_research',
  'admin_settings',
  'notifications_internal',
  'diagnostics',
  'database_writes',
  'member_invitations',
  'email_sending',
  'crm_updates',
  'event_logging',
  'ai_logic_execution',
  'file_upload_internal',
  'api_calls_internal',
  'draft_content',
  'prepare_outreach',
  'product_research',
  'design_generation',
  'mockup_generation',
  'store_creation',
  'marketing_creation'
];

export const UBUNTU_QUEUED_CATEGORIES = [
  'browser_automation',
  'credential_login',
  'session_cookie_use',
  'platform_onboarding_external',
  'form_submission_external',
  'publishing_external',
  'application_submission_external',
  'deliverable_upload_external',
  'trading_execution',
  'money_movement',
  'protected_site_scraping',
  'client_messaging_external'
];

export const HIGH_RISK_APPROVAL_CATEGORIES = [
  'money_movement',
  'trading_execution',
  'credential_use',
  'client_messaging_external',
  'application_submission_external',
  'publishing_external',
  'file_upload_external',
  'user_review',
  'strategic_review',
  'submission_review'
];

/**
 * Gets the current dual-platform mode settings from the database
 */
export async function getRealWorldModeSettings(): Promise<RealWorldModeSettings> {
  try {
    const settings = await VeloAdminSetting.list();
    
    const buildyMode = settings.find(s => s.category === 'REAL_WORLD_MODE' && s.key === 'buildy_real_world_mode');
    const ubuntuMode = settings.find(s => s.category === 'REAL_WORLD_MODE' && s.key === 'ubuntu_full_autonomy');
    
    return {
      buildyRealWorldMode: (buildyMode?.value as 'enabled' | 'disabled') || 'enabled',
      ubuntuFullAutonomy: (ubuntuMode?.value as 'enabled' | 'disabled' | 'pending_host_attestation') || 'disabled'
    };
  } catch (error) {
    console.error("[VELO] Failed to fetch real-world mode settings:", error);
    return {
      buildyRealWorldMode: 'enabled',
      ubuntuFullAutonomy: 'disabled'
    };
  }
}

/**
 * Evaluates the outcome for a specific action category based on current settings
 */
export function evaluateActionOutcome(category: string, settings: RealWorldModeSettings): RealWorldModeOutcome {
  // 1. High risk always requires approval regardless of mode
  if (HIGH_RISK_APPROVAL_CATEGORIES.includes(category)) {
    return 'requires_human_approval';
  }

  // 2. Check if it's a Buildy-supported action
  if (BUILDY_ACTIVE_CATEGORIES.includes(category)) {
    return settings.buildyRealWorldMode === 'enabled' ? 'buildy_active' : 'requires_human_approval';
  }

  // 3. Default to Ubuntu queuing for everything else
  return 'buildy_queue_for_ubuntu';
}

/**
 * Updates a real-world mode setting
 */
export async function updateRealWorldModeSetting(
  key: 'buildy_real_world_mode' | 'ubuntu_full_autonomy',
  value: string,
  userEmail: string
) {
  const existing = (await VeloAdminSetting.list()).find(s => s.category === 'REAL_WORLD_MODE' && s.key === key);
  
  if (existing) {
    return await VeloAdminSetting.update(existing.id, {
      value,
      updated_by_email: userEmail,
      updated_at_label: new Date().toLocaleString()
    });
  } else {
    return await VeloAdminSetting.create({
      category: 'REAL_WORLD_MODE',
      key,
      value,
      status: 'active',
      updated_by_email: userEmail,
      updated_at_label: new Date().toLocaleString()
    });
  }
}

/**
 * Returns a matrix of all action types and their current routing
 */
export function getDualPlatformActionMatrix(settings: RealWorldModeSettings) {
  const matrix: Record<string, RealWorldModeOutcome> = {};
  
  [...BUILDY_ACTIVE_CATEGORIES, ...UBUNTU_QUEUED_CATEGORIES].forEach(cat => {
    matrix[cat] = evaluateActionOutcome(cat, settings);
  });
  
  return matrix;
}

export function buildRealWorldModeSummary(settings: RealWorldModeSettings) {
  return {
    buildy: {
      status: settings.buildyRealWorldMode === 'enabled' ? 'ACTIVE' : 'OFF',
      label: "Buildy Real-World Mode",
      capabilities: "Internal preparation, content drafting, outreach prep, live email sending, CRM updates, and logic execution."
    },
    ubuntu: {
      status: settings.ubuntuFullAutonomy === 'enabled' ? 'ACTIVE' : (settings.ubuntuFullAutonomy === 'pending_host_attestation' ? 'PENDING' : 'DISABLED'),
      label: "Full Autonomy (Ubuntu)",
      capabilities: "External browser automation, credential sessions, publishing, and financial execution."
    },
    routing: "Buildy prepares and queues host-restricted work; Ubuntu executes only when Full Autonomy is enabled."
  };
}
