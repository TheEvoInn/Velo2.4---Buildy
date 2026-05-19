
import { 
  VeloWorkflowTemplate, 
  GalaxyLearningSignal, 
  AutopilotMission, 
  AutopilotActionLog,
  VeloContentArchiveItem
} from "@/entities";
import { scoreOpportunityWithProfitability } from "./profitabilityLearning";
import { ArchiveContentType } from "./contentArchive";

/**
 * Redacts potential secrets, keys, and tokens from text.
 */
function redactSecrets(text: string): string {
  if (!text) return "";
  
  const secretPatterns = [
    /(api[_-]?key[:=]\s*)[^\s,}"']+/gi,
    /(secret[:=]\s*)[^\s,}"']+/gi,
    /(token[:=]\s*)[^\s,}"']+/gi,
    /(password[:=]\s*)[^\s,}"']+/gi,
    /(bearer\s+)[^\s,}"']+/gi,
    /(private[_-]?key[:=]\s*)[^\s,}"']+/gi
  ];

  let sanitized = text;
  secretPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "$1[REDACTED]");
  });

  // Also redact long strings that look like hex/base64 keys (32+ chars)
  sanitized = sanitized.replace(/[a-zA-Z0-9+/=]{32,}/g, (match) => {
    if (match.includes('/') || match.includes(' ') || match.length < 32) return match;
    return "[REDACTED_KEY]";
  });

  return sanitized;
}

export interface LearningOutcomeInput {
  department: string;
  workflow_type: string;
  workflow_name: string;
  trigger_context?: string;
  steps: any[];
  required_inputs?: string[];
  outcome_label: 'success' | 'failure' | 'inaccurate' | 'helpful';
  success_score: number; // 0-1
  notes?: string;
  metadata?: any;
  opportunity_id?: string;
  mission_id?: string;
}

/**
 * Sanitizes data for the learning loop, removing secrets and tokens.
 */
export function sanitizeLearningData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return redactSecrets(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLearningData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Redact specific keys if they look sensitive
      const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'apikey', 'private_key', 
        'passphrase', 'access_token', 'refresh_token', 'client_secret', 
        'session', 'cookie', 'bearer', 'auth'
      ];
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLearningData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Records a learning outcome from a successful or failed action.
 */
export async function recordLearningOutcome(input: LearningOutcomeInput): Promise<boolean> {
  try {
    const sanitizedInput = sanitizeLearningData(input);
    
    // 1. Manage VeloWorkflowTemplate
    const templates = await VeloWorkflowTemplate.list();
    const existing = templates.find(t => 
      t.department === sanitizedInput.department && 
      (t.name === sanitizedInput.workflow_name || (sanitizedInput.trigger_context && t.trigger_context === sanitizedInput.trigger_context))
    );

    if (sanitizedInput.outcome_label === 'success') {
      if (existing) {
        const learnedFromIds = existing.metadata?.learned_from_ids || [];
        const isDuplicate = sanitizedInput.mission_id && learnedFromIds.includes(sanitizedInput.mission_id);
        
        const currentCount = existing.success_count || 0;
        const currentAvgQuality = existing.metadata?.average_quality_score || 0;
        const newQuality = sanitizedInput.metadata?.quality_score || 100;
        const newCount = isDuplicate ? currentCount : currentCount + 1;
        const newAvgQuality = isDuplicate ? currentAvgQuality : ((currentAvgQuality * currentCount) + newQuality) / newCount;

        await VeloWorkflowTemplate.update(existing.id, {
          success_count: newCount,
          last_used_at: new Date().toISOString(),
          steps: sanitizedInput.steps.length > 0 ? sanitizedInput.steps : existing.steps,
          notes: sanitizedInput.notes || existing.notes,
          status: "active",
          metadata: {
            ...existing.metadata,
            ...sanitizedInput.metadata,
            average_quality_score: Math.round(newAvgQuality),
            last_outcome_label: sanitizedInput.outcome_label,
            learned_from_ids: Array.from(new Set([...learnedFromIds, sanitizedInput.mission_id].filter(Boolean)))
          }
        });
      } else {
        await VeloWorkflowTemplate.create({
          name: sanitizedInput.workflow_name,
          department: sanitizedInput.department,
          workflow_type: sanitizedInput.workflow_type,
          trigger_context: sanitizedInput.trigger_context || sanitizedInput.workflow_name,
          steps: sanitizedInput.steps,
          success_count: 1,
          last_used_at: new Date().toISOString(),
          status: "active",
          notes: sanitizedInput.notes || "Learned from successful mission.",
          metadata: {
            ...sanitizedInput.metadata,
            average_quality_score: sanitizedInput.metadata?.quality_score || 100,
            last_outcome_label: sanitizedInput.outcome_label,
            learned_from_ids: sanitizedInput.mission_id ? [sanitizedInput.mission_id] : []
          }
        });
      }
    }

    // 2. Create GalaxyLearningSignal (only if ID is present)
    if (sanitizedInput.opportunity_id || sanitizedInput.mission_id) {
      await GalaxyLearningSignal.create({
        opportunity_feed_id: sanitizedInput.opportunity_id,
        department: sanitizedInput.department,
        signal_type: sanitizedInput.outcome_label === 'success' ? 'positive' : 'negative',
        outcome_label: sanitizedInput.outcome_label.charAt(0).toUpperCase() + sanitizedInput.outcome_label.slice(1),
        success_score: sanitizedInput.success_score,
        notes: sanitizedInput.notes,
        captured_at: new Date().toISOString(),
        metadata: {
          mission_id: sanitizedInput.mission_id,
          workflow_type: sanitizedInput.workflow_type,
          quality_score: sanitizedInput.metadata?.quality_score
        }
      });
    }

    // 3. Log the learning capture
    await AutopilotActionLog.create({
      department: sanitizedInput.department,
      action_type: "LEARNING_OUTCOME_CAPTURED",
      status: "success",
      summary: `Captured ${sanitizedInput.outcome_label} signal: ${sanitizedInput.workflow_name}`,
      details: `Opportunity: ${sanitizedInput.opportunity_id || 'N/A'}, Mission: ${sanitizedInput.mission_id || 'N/A'}`
    });

    return true;
  } catch (error) {
    console.error("Failed to record learning outcome:", error);
    return false;
  }
}

/**
 * Refreshes or creates a workflow template based on a user's stated goal or preference.
 * This helps sync Autopilot's internal logic with the latest user focus.
 */
export async function upsertGoalWorkflowTemplate(params: {
  goal: string;
  department: string;
  lane_id?: string;
  source_keywords?: string[];
  user_email: string;
}): Promise<boolean> {
  try {
    const { goal, department, lane_id, source_keywords, user_email } = params;
    
    // Create a deterministic name for the template
    const templateName = lane_id 
      ? `Goal Preference: ${lane_id.replace(/_/g, ' ').toUpperCase()}`
      : `Custom Goal: ${goal.substring(0, 30)}...`;

    const triggerContext = lane_id || goal.toLowerCase().substring(0, 50);

    const templates = await VeloWorkflowTemplate.list();
    const existing = templates.find(t => 
      t.department === department && 
      t.workflow_type === "GOAL_EXECUTION" &&
      (t.name === templateName || t.trigger_context === triggerContext)
    );

    const safetyBoundaries = {
      staged_only: true,
      no_live_submission: true,
      no_credential_use: true,
      no_live_messaging: true,
      no_money_movement: true
    };

    const metadata = {
      lane_id,
      source_keywords,
      updated_by_chat: true,
      user_intent: goal,
      last_updated_at: new Date().toISOString(),
      safety_boundaries: safetyBoundaries
    };

    const steps = [
      { label: "Goal Synchronization", action_type: "MISSION_PLANNING", mode: "buildy_active" },
      { label: "Source Intelligence Scan", action_type: "OPPORTUNITY_RESEARCH", mode: "buildy_active" },
      { label: "Profile Alignment", action_type: "PROFILE_MATCHING", mode: "buildy_active" },
      { label: "Draft Generation", action_type: "CONTENT_GENERATION", mode: "buildy_active" },
      { label: "Final Review Gate", action_type: "SUBMISSION_REVIEW", mode: "review_required" }
    ];

    const requiredInputs = [
      "profile_skills",
      "source_link",
      "platform_account_status",
      "payout_preference",
      "identity_constraints"
    ];

    if (existing) {
      await VeloWorkflowTemplate.update(existing.id, {
        notes: `Updated focus via chat: "${goal}"`,
        steps: steps, 
        required_inputs: requiredInputs,
        metadata: {
          ...existing.metadata,
          ...metadata
        }
      });
    } else {
      await VeloWorkflowTemplate.create({
        name: templateName,
        department,
        workflow_type: "GOAL_EXECUTION",
        trigger_context: triggerContext,
        steps,
        required_inputs: requiredInputs,
        status: "active",
        safe_execution_mode: "staged_packet",
        notes: `Initial template created from user goal: "${goal}"`,
        metadata
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to upsert goal workflow template:", error);
    return false;
  }
}

/**
 * Captures learning from a sequential mission completion.
 */
export async function captureSequentialMissionLearning(missionId: string): Promise<boolean> {
  try {
    const mission = await AutopilotMission.get(missionId);
    if (!mission) return false;

    const isComplete = mission.status === 'executed' || mission.metadata?.sequential?.step_status === 'Complete';
    if (!isComplete) return false;
    
    // Avoid double learning
    if (mission.metadata?.learning_captured_at) return true;

    const steps = mission.metadata?.sequential?.steps || [];
    if (steps.length === 0) return false;

    // Extract safe quality signals if present
    const qualityScore = mission.metadata?.content_quality?.score || mission.metadata?.quality_score || 100;

    const outcome = await recordLearningOutcome({
      department: mission.source_department,
      workflow_type: mission.mission_type,
      workflow_name: mission.title,
      steps: steps.map((s: any) => ({ label: s.label, action: s.action_type, mode: s.mode })),
      outcome_label: 'success',
      success_score: 1.0,
      mission_id: missionId,
      opportunity_id: mission.trigger_source_id,
      metadata: {
        total_steps: steps.length,
        sequential: true,
        quality_score: qualityScore
      }
    });

    if (outcome) {
      await AutopilotMission.update(missionId, {
        metadata: {
          ...mission.metadata,
          learning_captured_at: new Date().toISOString()
        }
      });
    }

    return outcome;
  } catch (error) {
    console.error("Sequential learning capture failed:", error);
    return false;
  }
}

/**
 * Gets template matches for a specific goal or opportunity context.
 */
export async function getGoalWorkflowTemplateMatches(params: { 
  lane_id?: string; 
  goal?: string; 
  department?: string;
  source_keywords?: string[];
}) {
  try {
    const { lane_id, goal, department, source_keywords } = params;
    const templates = await VeloWorkflowTemplate.list("-success_count");
    
    return templates.filter(t => {
      if (t.status !== 'active') return false;
      if (department && t.department !== department) return false;
      
      // Match by lane_id
      if (lane_id && t.metadata?.lane_id === lane_id) return true;
      
      // Match by trigger context
      if (lane_id && t.trigger_context === lane_id) return true;
      
      // Match by source keywords
      if (source_keywords && source_keywords.length > 0 && t.metadata?.source_keywords) {
        if (source_keywords.some(k => t.metadata.source_keywords.includes(k))) return true;
      }
      
      // Match by goal text
      if (goal) {
        const lowGoal = goal.toLowerCase();
        if (t.name.toLowerCase().includes(lowGoal) || t.trigger_context?.toLowerCase().includes(lowGoal)) return true;
      }
      
      return false;
    }).slice(0, 3);
  } catch (error) {
    console.error("Failed to match workflow templates:", error);
    return [];
  }
}

/**
 * Gets template recommendations based on context.
 */
export async function getTemplateRecommendations(context: { department?: string; workflow_type?: string }) {
  try {
    const templates = await VeloWorkflowTemplate.list("-success_count");
    return templates.filter(t => 
      t.status === 'active' && 
      (!context.department || t.department === context.department) &&
      (!context.workflow_type || t.workflow_type === context.workflow_type)
    ).slice(0, 5);
  } catch (error) {
    console.error("Failed to get recommendations:", error);
    return [];
  }
}

/**
 * Scores an opportunity using learned signals.
 */
export async function scoreOpportunityWithLearning(opportunity: any): Promise<number> {
  try {
    const [signals, templates] = await Promise.all([
      GalaxyLearningSignal.list(),
      VeloWorkflowTemplate.list()
    ]);

    let boost = 0;

    // Check for matching successful templates
    const matchingTemplate = templates.find(t => 
      t.status === 'active' && 
      t.department === opportunity.department &&
      (opportunity.title?.toLowerCase().includes(t.name.toLowerCase()) || 
       (Array.isArray(opportunity.tags) && opportunity.tags.some((tag: string) => t.name.toLowerCase().includes(tag.toLowerCase()))))
    );
    if (matchingTemplate) {
      boost += Math.min(15, (matchingTemplate.success_count || 0) * 2);
    }

    // Check for positive signals in the same department
    const deptSignals = signals.filter(s => s.department === opportunity.department);
    const positiveSignals = deptSignals.filter(s => s.signal_type === 'positive').length;
    const negativeSignals = deptSignals.filter(s => s.signal_type === 'negative').length;

    boost += Math.min(10, positiveSignals);
    boost -= Math.min(10, negativeSignals);

    // Apply profitability boost
    const profitBoost = await scoreOpportunityWithProfitability(opportunity);
    boost += profitBoost;

    return boost;
  } catch (error) {
    console.error("Opportunity scoring learning failed:", error);
    return 0;
  }
}

/**
 * Records a learning signal specifically for the content archive (reuse, generation quality).
 */
export async function recordContentArchiveLearningSignal(params: {
  userEmail: string;
  itemId?: string;
  contentType: string;
  signalType: 'reuse' | 'quality_score' | 'revision_request' | 'pack_creation';
  qualityScore?: number;
  metadata?: any;
}) {
  try {
    const { userEmail, itemId, contentType, signalType, qualityScore, metadata } = params;

    // Only record significant signals
    if (signalType === 'quality_score' && (qualityScore || 0) < 70) return;

    await GalaxyLearningSignal.create({
      department: "Command Officer",
      signal_type: signalType === 'quality_score' && (qualityScore || 0) >= 80 ? 'positive' : 'positive', // Content signals are generally positive additions to knowledge
      outcome_label: signalType.charAt(0).toUpperCase() + signalType.slice(1).replace('_', ' '),
      success_score: qualityScore ? qualityScore / 100 : 1.0,
      captured_at: new Date().toISOString(),
      metadata: sanitizeLearningData({
        ...metadata,
        user_email: userEmail,
        item_id: itemId,
        content_type: contentType,
        signal_origin: "content_archive"
      })
    });

    // Also update workflow template if this is a high quality or reused item
    if ((signalType === 'reuse' || (signalType === 'quality_score' && (qualityScore || 0) >= 85)) && itemId) {
      const item = await VeloContentArchiveItem.get(itemId);
      if (item && item.workflow_name) {
        await recordLearningOutcome({
          department: item.source_department || "Command Officer",
          workflow_type: "CONTENT_GENERATION",
          workflow_name: item.workflow_name,
          steps: [], // Keep existing steps
          outcome_label: 'success',
          success_score: (qualityScore || item.quality_score || 85) / 100,
          notes: `Learned from content ${signalType}: ${item.title}`,
          metadata: {
            content_item_id: itemId,
            content_type: contentType,
            reuse_count: item.reuse_count
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to record content archive learning signal:", error);
  }
}

/**
 * Maps requested asset types to archive content types.
 */
function mapAssetToArchiveType(assetType: string): ArchiveContentType {
  const lowType = assetType.toLowerCase();
  
  if (lowType.includes('proposal') || lowType.includes('template') || lowType.includes('bio') || lowType.includes('faq') || lowType.includes('code_help')) {
    return 'template';
  }
  if (lowType.includes('message') || lowType.includes('intro') || lowType.includes('outreach') || lowType.includes('delivery') || lowType.includes('launch')) {
    return 'email';
  }
  if (lowType.includes('social') || lowType.includes('caption') || lowType.includes('script') || lowType.includes('post')) {
    return 'social_post';
  }
  if (lowType.includes('product_listing')) {
    return 'product_description';
  }
  if (lowType.includes('service_listing') || lowType.includes('portfolio') || lowType.includes('sales')) {
    return 'sales_copy';
  }
  if (lowType.includes('research')) {
    return 'research_summary';
  }
  if (lowType.includes('checklist') || lowType.includes('workflow')) {
    return 'workflow_output';
  }
  if (lowType.includes('deliverable')) {
    return 'autopilot_deliverable';
  }
  if (lowType.includes('prompt') || lowType.includes('image') || lowType.includes('graphic')) {
    return 'graphic';
  }
  if (lowType.includes('report') || lowType.includes('brief') || lowType.includes('editing')) {
    return 'report';
  }
  
  return 'other';
}

/**
 * Gets a compact summary of content-related learning for the user.
 */
export async function getContentLearningSummary(userEmail: string) {
  try {
    const signals = await GalaxyLearningSignal.list("-captured_at", 100).catch(() => []);
    const userSignals = signals.filter(s => s.metadata?.user_email === userEmail && s.metadata?.signal_origin === "content_archive");

    if (userSignals.length === 0) return null;

    const reuses = userSignals.filter(s => s.outcome_label === "Reuse").length;
    const highQuality = userSignals.filter(s => s.outcome_label === "Quality score").length;
    
    // Group by content type
    const typeCounts: Record<string, number> = {};
    userSignals.forEach(s => {
      const t = s.metadata?.content_type || "other";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "n/a";

    return {
      total_signals: userSignals.length,
      reuse_count: reuses,
      high_quality_count: highQuality,
      top_learned_type: topType,
      recent_focus: userSignals[0]?.outcome_label || "Initial learning"
    };
  } catch (error) {
    return null;
  }
}

/**
 * Builds compact guidance for the content engine based on past successful patterns.
 */
export async function buildContentLearningGuidance(userEmail: string, requestedAssetType?: string, packType?: string) {
  try {
    // 1. Load items for the user
    const items = await VeloContentArchiveItem.query()
      .where("owner_email", userEmail)
      .exec()
      .catch(() => []);

    if (items.length === 0) return "";

    const mappedType = requestedAssetType ? mapAssetToArchiveType(requestedAssetType) : null;

    // 2. Look for high-quality items (quality_score >= 85)
    // Filter and sort in memory as .gte() may be unsupported and we want to be safe
    let highQualityItems = items.filter(item => (item.quality_score || 0) >= 85);
    
    if (mappedType) {
      const typeSpecific = highQualityItems.filter(item => item.content_type === mappedType);
      if (typeSpecific.length > 0) {
        highQualityItems = typeSpecific;
      }
    }
    
    // Sort by quality score descending and take top 3
    highQualityItems.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
    const topHighQuality = highQualityItems.slice(0, 3);

    if (topHighQuality.length > 0) {
      let guidance = "\nLEARNED QUALITY PATTERNS (Based on your highest-scoring drafts):\n";
      topHighQuality.forEach(item => {
        guidance += `- Successful ${item.content_type} pattern identified: "${item.title}". Mimic its strengths (e.g. ${Array.isArray(item.tags) ? item.tags.slice(0, 2).join(', ') : 'clarity'}).\n`;
      });
      return guidance;
    }

    // 3. Fallback to top reused items (where reuse_count > 0)
    let reusedItems = items.filter(item => (item.reuse_count || 0) > 0);
    
    if (mappedType) {
      const typeSpecific = reusedItems.filter(item => item.content_type === mappedType);
      if (typeSpecific.length > 0) {
        reusedItems = typeSpecific;
      }
    }

    reusedItems.sort((a, b) => (b.reuse_count || 0) - (a.reuse_count || 0));
    const topReused = reusedItems.slice(0, 2);
    
    if (topReused.length > 0) {
      let guidance = "\nLEARNED PREFERENCES (Based on your most reused drafts):\n";
      topReused.forEach(item => {
        guidance += `- For ${item.content_type}, you prefer the style and structure found in "${item.title}".\n`;
      });
      return guidance;
    }
    
    return "";
  } catch (error) {
    console.error("[VELO] Learning guidance build failed:", error);
    return "";
  }
}
