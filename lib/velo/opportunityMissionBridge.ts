







import { GalaxyOpportunityFeed, AutopilotMission, AutopilotActionLog, User } from "@/entities";
import { initializeSequentialMission } from "./sequentialMissionEngine";
import { runMissionPreflight, formatPreflightMetadata } from "./preflightReadiness";
import { calculateOpportunityReadiness, summarizeReadinessForMetadata } from "./missionReadiness";
import { findRecommendedPlaybooks } from "./workflowPlaybooks";
import { normalizeLaneId } from "./opportunitySourceIntelligence";
import { scoreOpportunityWithProfitability, normalizeProfitCategory, getProfitabilityPriorities } from "./profitabilityLearning";
import { recordLaneActivity } from "./autopilotLaneActivity";

/**
 * Evaluates if an opportunity should be bridged into a staged mission.
 */
export function shouldStageOpportunityMission(opportunity: any): boolean {
  // Guard
  if (!opportunity || !opportunity.id) return false;

  // Confidence threshold
  if ((opportunity.confidence_score || 0) < 0.7) return false;
  
  // Risk threshold
  if (opportunity.risk_level === 'high' || opportunity.risk_level === 'critical') return false;

  // Status check - only bridge review-ready items
  if (opportunity.routing_status !== 'needs_review') return false;

  // Duplicate check (to be called by the parent)
  return true;
}

/**
 * Creates a staged AutopilotMission from a high-confidence opportunity.
 */
export async function stageMissionFromOpportunity(opportunity: any): Promise<any> {
  // 1. Strict ID and duplicate check
  if (!opportunity.id) {
    console.warn("[BRIDGE] Cannot stage mission for opportunity without ID");
    return null;
  }

  // Check metadata first (most reliable link)
  if (opportunity.metadata?.staged_mission_id) {
    const existingMission = await AutopilotMission.get(opportunity.metadata.staged_mission_id).catch(() => null);
    if (existingMission) return existingMission;
  }

  const existing = await AutopilotMission.list("-created_at", 100);
  const duplicate = existing.find(m => 
    m.trigger_source_id === opportunity.id || 
    m.metadata?.opportunity_id === opportunity.id ||
    m.metadata?.trigger_source_id === opportunity.id
  );
  if (duplicate) return duplicate;

  // 1.2 Readiness Evaluation
  const readiness = await calculateOpportunityReadiness(opportunity);
  const readinessMeta = summarizeReadinessForMetadata(readiness);

  // Store match quality on the opportunity record
  if (opportunity.id && readiness.skill_match_score !== undefined) {
    GalaxyOpportunityFeed.update(opportunity.id, {
      skill_match_score: readiness.skill_match_score,
      match_breakdown: readiness.match_breakdown || []
    }).catch(() => {});
  }

  // 1.3 Context & Preflight
  const currentUser = await User.me().catch(() => ({ email: 'system@velo.ai' }));
  const preflightReport = await runMissionPreflight({
    goal: opportunity.summary || opportunity.title,
    department: opportunity.department,
    mission_type: "OPPORTUNITY_BRIDGE",
    risk_level: opportunity.risk_level
  }, currentUser);

  // 1.4 Profitability Context
  const profitBoost = await scoreOpportunityWithProfitability(opportunity);
  const catKey = normalizeProfitCategory(opportunity.opportunity_type || opportunity.lane_id, opportunity.department, opportunity.summary || opportunity.title);
  const userInsights = await getProfitabilityPriorities(currentUser.email);
  const insight = userInsights.find(i => i.category_key === catKey);

  // 1.8 Recommended Playbook Lookup
  const lane = normalizeLaneId(opportunity.opportunity_type || opportunity.lane_id || opportunity.metadata?.industry_lane || "");
  const playbooks = findRecommendedPlaybooks({
    platform: opportunity.platform_name || opportunity.source_name,
    workType: lane
  });
  const bestPlaybook = playbooks[0];

  // 2. Define steps based on department
  let steps: any[] = [];
  
  if (preflightReport.overall_status === 'blocked') {
    steps.push({
      id: "resolve_preflight",
      label: "Resolve Preflight Blockers",
      department: "Command Officer",
      action_type: "PREFLIGHT_RESOLUTION",
      mode: "review_required",
      summary: `Address ${preflightReport.blockers.length} critical blockers before this mission can proceed.`
    });
  }

  steps.push({
    id: "review_opp",
    label: "Review Work Details",
    department: opportunity.department,
    action_type: "OPPORTUNITY_REVIEW",
    mode: "review_required",
    summary: `Check the requirements and payout for this ${opportunity.opportunity_type} task from ${opportunity.source_name}.`
  });

  if (opportunity.department === 'freelance') {
    const m = opportunity.metadata || {};
    const isDigitalGig = !m.is_traditional_job && (m.online_completion_fit === 'high' || m.instant_claim_fit === 'high');

    if (isDigitalGig) {
      // Add setup checks if needed
      if (!opportunity.metadata?.payout_verified || opportunity.identity_verification_required || opportunity.account_creation_required || readiness.status !== 'ready') {
        steps.push({
          id: "setup_check",
          label: "Discovery Setup Check",
          department: "freelance",
          action_type: "REQUIREMENT_VALIDATION",
          mode: "review_required",
          summary: `Verify requirements: ${[
            readiness.status === 'needs_account' ? "account setup" : null,
            readiness.status === 'needs_review' && readiness.readiness_label.includes('ID') ? "ID verification" : null,
            !opportunity.metadata?.payout_verified ? "confirm payout status" : null,
            opportunity.identity_verification_required ? "ID verification needed" : null,
            opportunity.account_creation_required ? "account creation needed" : null
          ].filter(Boolean).join(", ") || "review blockers"}.`
        });
      }

      steps.push({
        id: "prepare_gig",
        label: "Draft Submission",
        department: "freelance",
        action_type: "GIG_PREPARATION_INTERNAL",
        mode: "buildy_active",
        summary: bestPlaybook 
          ? `Draft your ${bestPlaybook.name} work, prepare a checklist, and write submission notes.`
          : "Draft your work, prepare a checklist, and write submission notes for this online task.",
        details: {
          requires_manual_completion: true,
          manual_instructions: "After approval, VELO will generate your content. You will need to copy this content and submit it on the target platform manually."
        }
      });
      steps.push({
        id: "local_execution",
        label: "Claim & Complete (Local)",
        department: "freelance",
        action_type: "EXTERNAL_ACTION",
        mode: "queued_for_ubuntu",
        summary: "Use the local computer to claim the task and submit prepared deliverables.",
        details: {
          manual_instructions: `1. Open the source URL: ${opportunity.source_url}\n2. Claim the task immediately.\n3. Copy the prepared deliverables from your Work Archive.\n4. Paste and submit on the target site.`
        }
      });
    } else {
      steps.push({
        id: "draft_proposal",
        label: "Draft Application",
        department: "freelance",
        action_type: "CONTENT_GENERATION_INTERNAL",
        mode: "buildy_active",
        summary: "Generate a tailored proposal for this freelance job."
      });
      steps.push({
        id: "manual_submit",
        label: "Manual Submission",
        department: "freelance",
        action_type: "EXTERNAL_SUBMISSION",
        mode: "queued_for_ubuntu",
        summary: "The platform runner must safely submit the final proposal to the target site."
      });
    }
  } else if (opportunity.department === 'trade') {
    steps.push({
      id: "draft_listing",
      label: "Draft Listing",
      department: "trade",
      action_type: "CONTENT_GENERATION_INTERNAL",
      mode: "buildy_active",
      summary: "Prepare product description and marketing assets."
    });
    steps.push({
      id: "approve_launch",
      label: "Launch Review",
      department: "trade",
      action_type: "STAGING_APPROVAL",
      mode: "review_required",
      summary: "Review final assets before manual platform launch."
    });
  } else {
    // Default fallback steps
    steps.push({
      id: "draft_plan",
      label: "Draft Action Plan",
      department: opportunity.department,
      action_type: "PLANNING_INTERNAL",
      mode: "buildy_active",
      summary: "Generate a structured plan for pursuing this opportunity."
    });
    steps.push({
      id: "final_review",
      label: "Final Review",
      department: "Command Officer",
      action_type: "COMMAND_APPROVAL",
      mode: "review_required",
      summary: "Approve the generated plan for local execution."
    });
  }

  // 3. Create the mission
  const laneLabel = opportunity.opportunity_type?.replace(/_/g, ' ') || "task";
  const missionTitle = readiness.status === 'ready' 
    ? `Draft: ${laneLabel} for ${opportunity.title}`
    : `Review: ${opportunity.title}`;

  const mission = await AutopilotMission.create({
    title: missionTitle,
    source_department: "Galaxy Scanner",
    mission_type: "OPPORTUNITY_BRIDGE",
    risk_level: opportunity.risk_level,
    details: `Actionable discovery from ${opportunity.source_name}. ${opportunity.payout_text ? `Payout: ${opportunity.payout_text}. ` : ''}${opportunity.estimated_time ? `Estimated time: ${opportunity.estimated_time}. ` : ''}Requirements: ${opportunity.requirements || 'None listed'}. Goal: ${opportunity.summary}`,
    status: "pending",
    trigger_source_id: opportunity.id,
    metadata: {
      opportunity_id: opportunity.id,
      trigger_source_id: opportunity.id,
      source_name: opportunity.source_name,
      confidence_score: opportunity.confidence_score,
      payout_text: opportunity.payout_text,
      estimated_time: opportunity.estimated_time,
      skill_level: opportunity.skill_level,
      requirements: opportunity.requirements,
      steps: opportunity.steps,
      source_url: opportunity.source_url,
      bridge_status: "mission_staged",
      bridged_at: new Date().toISOString(),
      ready_mission: readiness.status === 'ready',
      recommended_playbook_id: bestPlaybook?.id,
      recommended_playbook_name: bestPlaybook?.name,
      recommended_playbook_mode: bestPlaybook?.safe_execution_mode,
      profitability_category_key: catKey,
      profitability_boost: profitBoost,
      profitability_priority: insight?.autopilot_priority || "normal",
      historical_hourly_profit: insight?.hourly_profit,
      historical_roi_score: insight?.roi_score,
      profitability_confidence: insight?.confidence,
      profitability_recommendation: insight?.recommendation,
      ...readinessMeta,
      // Carry forward fit metadata for review clarity
      online_completion_fit: opportunity.metadata?.online_completion_fit,
      instant_claim_fit: opportunity.metadata?.instant_claim_fit,
      autopilot_compatibility: opportunity.autopilot_compatibility || opportunity.metadata?.autopilot_completion_fit,
      is_traditional_job: !!opportunity.metadata?.is_traditional_job,
      requires_ubuntu: !!(opportunity.metadata?.requires_ubuntu || opportunity.requires_ubuntu),
      identity_verification_required: opportunity.identity_verification_required,
      account_creation_required: opportunity.account_creation_required,
      // Carry forward translation metadata
      source_language_label: opportunity.metadata?.source_language_label || opportunity.source_language,
      source_language: opportunity.metadata?.source_language || opportunity.source_language,
      translation_status: opportunity.metadata?.translation_status,
      translated_title: opportunity.metadata?.translated_title,
      translated_summary: opportunity.metadata?.translated_summary,
      translated_limitations: opportunity.metadata?.translated_limitations,
      translated_at: opportunity.metadata?.translated_at,
      translation_notes: opportunity.metadata?.translation_notes,
      ...formatPreflightMetadata(preflightReport)
    }
  });

  // 4. Initialize sequential steps
  await initializeSequentialMission(mission.id, steps);

  // 5. Update opportunity status
  await GalaxyOpportunityFeed.update(opportunity.id, {
    routing_status: "mission_staged",
    metadata: {
      ...(opportunity.metadata || {}),
      ...readinessMeta,
      staged_mission_id: mission.id,
      bridge_status: "mission_staged",
      next_action: steps[0].label,
      bridged_at: new Date().toISOString()
    }
  });

  // 6. Log success
  await recordLaneActivity({
    department: opportunity.department || "Command Officer",
    stage: preflightReport.overall_status === 'blocked' ? 'blocked' : 'needs_decision',
    title: `Prepared: ${opportunity.title}`,
    summary: `Staged a ${opportunity.opportunity_type || 'discovery'} mission for your review.`,
    details: `Staged a ${steps.length}-step mission for confidence score ${Math.round((opportunity.confidence_score || 0.5) * 100)}%. Readiness: ${readiness.readiness_label} (Score: ${readiness.score})`,
    relatedId: mission.id,
    riskLevel: opportunity.risk_level
  });

  return mission;
}

/**
 * Batches top candidates for bridging.
 * Prioritizes online digital gigs over traditional jobs.
 */
export async function stageTopOpportunityMissions(opportunities: any[], limit: number = 3) {
  const getScore = (op: any) => {
    let score = (op.confidence_score || 0) * 10;
    const m = op.metadata || {};
    if (m.online_completion_fit === 'high') score += 5;
    if (m.instant_claim_fit === 'high') score += 5;
    if (m.is_traditional_job) score -= 8;
    if (m.requires_ubuntu || op.requires_ubuntu) score -= 5;
    return score;
  };

  const candidates = opportunities
    .filter(shouldStageOpportunityMission)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, limit);

  const results = [];
  for (const candidate of candidates) {
    try {
      const mission = await stageMissionFromOpportunity(candidate);
      if (mission && mission.id) {
        results.push(mission);
      }
    } catch (err) {
      console.error(`Failed to bridge opportunity ${candidate.id}:`, err);
    }
  }
  return results;
}
