
import { 
  GalaxyOpportunityFeed, 
  VeloContentAsset, 
  AutopilotMission, 
  VeloRealWorldActionRequest, 
  AutopilotActionLog, 
  AutopilotProfile, 
  User 
} from "@/entities";
import { generateContentAsset } from "./contentEngine";
import { findScopedProfile } from "./accessControl";
import { initializeSequentialMission } from "./sequentialMissionEngine";
import { normalizeLanguageLabel } from "./opportunityTranslation";
import { findRecommendedPlaybooks } from "./workflowPlaybooks";
import { calculateOpportunityReadiness, summarizeReadinessForMetadata } from "./missionReadiness";
import { normalizeLaneId } from "./opportunitySourceIntelligence";

export interface GigPacketResult {
  missionId?: string;
  assetIds: string[];
  requiresUbuntu: boolean;
  summary: string;
}

/**
 * Prepares a comprehensive work packet for a high-fit digital gig.
 * Generates draft deliverables, claim checklists, and stages missions.
 */
export async function prepareGigWorkPacket(opportunity: any): Promise<GigPacketResult | null> {
  if (!opportunity || !opportunity.id) return null;

  // 1. Context Loading & Readiness Check
  const [currentUser, profiles] = await Promise.all([
    User.me().catch(() => null),
    AutopilotProfile.list().catch(() => [])
  ]);

  if (!currentUser) return null;
  const profile = findScopedProfile(currentUser, profiles);
  const readiness = await calculateOpportunityReadiness(opportunity);
  const readinessMeta = summarizeReadinessForMetadata(readiness);

  // 1.5. Playbook Recommendation
  const laneId = normalizeLaneId(opportunity.opportunity_type || opportunity.lane_id || "");
  const recommendedPlaybooks = findRecommendedPlaybooks({ 
    platform: opportunity.source_name,
    workType: laneId
  });
  
  // Prioritize end-to-end packets if available
  const playbook = recommendedPlaybooks.find(p => p.id.includes('packet')) || (recommendedPlaybooks.length > 0 ? recommendedPlaybooks[0] : null);

  // 2. Duplicate Check
  const existingAssetIds = opportunity.metadata?.prepared_asset_ids || [];
  if (existingAssetIds.length > 0) {
    // Check if assets still exist
    const checkAssets = await VeloContentAsset.list("-created_at", 100);
    const validAssets = checkAssets.filter(a => existingAssetIds.includes(a.id));
    
    if (validAssets.length >= 2) {
      return {
        missionId: opportunity.metadata?.prepared_mission_id,
        assetIds: validAssets.map(a => a.id),
        requiresUbuntu: !!(opportunity.metadata?.requires_ubuntu || opportunity.requires_ubuntu),
        summary: "Gig packet already prepared. Reviewing existing assets."
      };
    }
  }

  // 3. Task-Specific Constraints
  const extraConstraints: string[] = [];

  if (laneId === 'ai_training') {
    extraConstraints.push(
      "Include qualification checklist: verify instructions, guidelines, and tone requirements.",
      "Add RLHF best practices: unbiased, helpful, and factually accurate guidance.",
      "Guideline extraction: summarize key rubrics for quality labeling.",
      "Remind: use the specific workspace provided by the platform (e.g. Outlier/Appen dashboard)."
    );
  } else if (laneId === 'online_testing') {
    extraConstraints.push(
      "Device/Browser check: confirm target OS and version match requirements.",
      "Testing Scenario: outline steps for reproducing common bug patterns or usability flows.",
      "Bug report template: draft a technical report with steps, expected vs actual results.",
      "Evidence Reminder: note requirements for screen recording or console log capture."
    );
  } else if (laneId === 'microtasks') {
    extraConstraints.push(
      "Speed check: verify estimated completion time vs average platform rates.",
      "Eligibility: confirm country/region restrictions and account standing.",
      "Fast-claim checklist: generate rapid steps for claiming and reserving the task."
    );
  }

  // 4. Generate Content Asset Data (dry run/prep)
  const assetTypes = ["deliverable", "claim_checklist", "delivery_message"] as const;
  const preparedAssetData: any[] = [];
  
  const m = opportunity.metadata || {};
  const clientLanguage = normalizeLanguageLabel(m.source_language_label || m.source_language || "English");
  const isForeign = clientLanguage.toLowerCase() !== "english";

  for (const type of assetTypes) {
    try {
      const genRes = await generateContentAsset({
        profile,
        opportunity,
        requested_asset_type: type,
        target_department: opportunity.department || "freelance",
        intended_next_action: type === "claim_checklist" ? "local_claim" : "review_packet",
        client_facing_language: clientLanguage,
        internal_guidance_language: "English",
        additional_constraints: extraConstraints
      });
      preparedAssetData.push({ type, genRes });
    } catch (err) {
      console.error(`[GIG_PREP] Failed to generate ${type}:`, err);
    }
  }

  if (preparedAssetData.length === 0) {
    throw new Error("Failed to generate any assets for gig packet.");
  }

  // 5. Mission Staging (Create First)
  const requiresUbuntu = !!(opportunity.metadata?.requires_ubuntu || opportunity.requires_ubuntu || opportunity.metadata?.claim_or_submission_requires_ubuntu);
  
  const laneLabel = opportunity.opportunity_type?.replace(/_/g, ' ') || "task";
  const missionTitle = readiness.status === 'ready' 
    ? `Ready: ${laneLabel} packet for ${opportunity.title}`
    : `Review Prepared Gig: ${opportunity.title}`;

  const mission = await AutopilotMission.create({
    title: missionTitle,
    source_department: "Galaxy Scanner",
    mission_type: "GIG_PREPARATION",
    risk_level: opportunity.risk_level || "low",
    details: `Work packet prepared for ${opportunity.opportunity_type || 'digital gig'}. ${opportunity.payout_text ? `Value: ${opportunity.payout_text}. ` : ''}Review the draft deliverable and claim checklist before final submission. Readiness: ${readiness.readiness_label}.`,
    status: "pending",
    trigger_source_id: opportunity.id,
    metadata: {
      opportunity_id: opportunity.id,
      payout_text: opportunity.payout_text,
      estimated_time: opportunity.estimated_time,
      requirements: opportunity.requirements,
      steps: opportunity.steps,
      skill_level: opportunity.skill_level,
      autopilot_compatibility: opportunity.autopilot_compatibility,
      requires_ubuntu: requiresUbuntu,
      packet_prepared_at: new Date().toISOString(),
      recommended_playbook_id: playbook?.id,
      recommended_playbook_name: playbook?.name,
      ready_mission: readiness.status === 'ready',
      ...readinessMeta
    }
  });

  // 6. Create Content Assets (Now with Mission ID)
  const assetIds: string[] = [];
  for (const item of preparedAssetData) {
    const { type, genRes } = item;
    const asset = await VeloContentAsset.create({
      asset_type: type,
      title: genRes.title,
      body: genRes.body,
      tone: genRes.tone,
      status: "ready",
      quality_score: genRes.quality_score,
      strengths: genRes.strengths,
      improvement_notes: genRes.improvement_notes,
      source_context_summary: genRes.source_context_summary,
      metadata: {
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        source_name: opportunity.source_name,
        prepared_mission_id: mission.id,
        checklist: genRes.completion_checklist,
        revision_prompts: genRes.revision_prompts,
        is_gig_packet: true,
        source_scanner: "galaxy",
        packet_type: type === "deliverable" ? "Draft Work" : type === "claim_checklist" ? "Checklist" : "Delivery Note",
        client_facing_language: clientLanguage,
        is_foreign_source: isForeign,
        internal_guidance_language: "English",
        review_warning: isForeign ? `This client-facing asset is generated in ${clientLanguage}. Please verify accuracy against the original source.` : undefined,
        ...readinessMeta
      }
    });
    assetIds.push(asset.id);
  }

  // 7. Update Mission with Asset IDs
  await AutopilotMission.update(mission.id, {
    metadata: {
      ...mission.metadata,
      prepared_asset_ids: assetIds
    }
  });

  const steps = [
    {
      id: "review_fit",
      label: "Review Fit & Requirements",
      department: opportunity.department || "freelance",
      action_type: "OPPORTUNITY_REVIEW",
      mode: "review_required",
      summary: `Analyze why Buildy flagged this as ${readiness.status === 'ready' ? 'Ready' : 'High-Fit'} and verify requirements. Readiness: ${readiness.readiness_label}.`
    },
    {
      id: "review_packet",
      label: "Review Prepared Packet",
      department: opportunity.department || "freelance",
      action_type: "CONTENT_REVIEW",
      mode: "review_required",
      summary: `Review ${assetIds.length} generated assets: Work Plan, Claim Checklist, and Delivery Note.`
    }
  ];

  if (requiresUbuntu) {
    steps.push({
      id: "claim_and_submit",
      label: "Local Claim Review Packet",
      department: opportunity.department || "freelance",
      action_type: "EXTERNAL_ACTION",
      mode: "queued_for_ubuntu",
      summary: playbook 
        ? `Review playbook: ${playbook.name}. Prepare a reviewed packet for local/manual claim and submission after your approval.` 
        : "Prepare a reviewed packet for local/manual claim and submission after your approval."
    });

    // Create a real-world action request for the local computer
    await VeloRealWorldActionRequest.create({
      title: `Claim & Submit Gig: ${opportunity.title}`,
      department: opportunity.department || "freelance",
      action_type: "GIG_CLAIM_AND_SUBMISSION",
      explicit_user_request_summary: `Claim and submit work for ${opportunity.title} on ${opportunity.source_name || 'external platform'}. Buildy has already prepared the deliverables and claim checklist.`,
      risk_level: opportunity.risk_level || "medium",
      requested_by_email: currentUser.email,
      requested_by_user_id: currentUser.id,
      safety_validation_status: "pending",
      permission_status: "pending",
      credential_scope_status: "pending",
      connector_status: "pending",
      execution_mode: "queued_for_ubuntu",
      required_approval_summary: "Manual claim and submission on local computer required.",
      provider_notes: "Gig packet prepared on Buildy; waiting for local/Ubuntu execution.",
      related_mission_id: mission.id,
      metadata: {
        opportunity_id: opportunity.id,
        mission_id: mission.id,
        asset_ids: assetIds,
        claim_url: opportunity.source_url || opportunity.url,
        source_name: opportunity.source_name,
        gig_packet_prepared_on_buildy: true,
        recommended_playbook_id: playbook?.id,
        recommended_playbook_name: playbook?.name,
        ...readinessMeta
      }
    });
  } else {
    steps.push({
      id: "manual_completion",
      label: "Manual Completion",
      department: opportunity.department || "freelance",
      action_type: "MANUAL_ACTION",
      mode: "review_required",
      summary: "Finish the final steps manually to complete this gig."
    });
  }

  await initializeSequentialMission(mission.id, steps);

  // 8. Update Opportunity
  await GalaxyOpportunityFeed.update(opportunity.id, {
    routing_status: "packet_prepared",
    metadata: {
      ...(opportunity.metadata || {}),
      ...readinessMeta,
      gig_packet_prepared: true,
      prepared_asset_ids: assetIds,
      prepared_mission_id: mission.id,
      claim_or_submission_requires_ubuntu: requiresUbuntu,
      next_action: steps[0].label,
      prepared_at: new Date().toISOString(),
      playbook_recommended: !!playbook
    }
  });

  // 9. Logging
  await AutopilotActionLog.create({
    department: "Galaxy Scanner",
    action_type: "GIG_PACKET_PREPARED",
    status: "success",
    summary: `Prepared work packet for gig: ${opportunity.title}`,
    details: `Generated ${assetIds.length} assets and staged mission ${mission.id.slice(0, 8)}. Readiness: ${readiness.readiness_label}. Local computer: ${requiresUbuntu ? 'Required' : 'Optional'}.`,
    related_id: opportunity.id
  });

  return {
    missionId: mission.id,
    assetIds,
    requiresUbuntu,
    summary: `Buildy prepared the draft and checklist. ${playbook ? `Recommended playbook: ${playbook.name}. ` : ''}Readiness: ${readiness.readiness_label}.`
  };
}
