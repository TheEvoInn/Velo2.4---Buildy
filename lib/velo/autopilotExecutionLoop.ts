import { 
  AutopilotMission, 
  AutopilotActionLog, 
  VeloRealWorldActionRequest, 
  VeloWorkflowTemplate,
  VeloContentAsset,
  GalaxyScannerRun,
  GalaxyOpportunityFeed,
  PodDesign,
  PodProduct,
  StoreSetting,
  DropshippingProductCandidate
} from "@/entities";
import { invokeLLM } from "@/integrations/core";
import { 
  researchPodNiches, 
  generatePodDesigns, 
  createProductMockup, 
  getRecommendedProducts 
} from "./printOnDemand";
import { 
  getRealWorldModeSettings, 
  evaluateActionOutcome, 
  BUILDY_ACTIVE_CATEGORIES,
  UBUNTU_QUEUED_CATEGORIES 
} from "./dualPlatformRealWorldMode";
import { runAutopilotLeadDiscovery } from "./autopilotLeadDiscovery";
import { runMissionPreflight, formatPreflightMetadata } from "./preflightReadiness";
import { routeContinuityRuntimeTask } from "./continuityRuntime";
import { getContinuityMode } from "./continuity";
import { createSafeActionLog } from "./scannerNormalization";
import { 
  initializeSequentialMission, 
  completeCurrentMissionStep, 
  failCurrentMissionStep,
  getSequentialMissionState,
  approveOrAdvanceMissionStep,
  isInternalStep
} from "./sequentialMissionEngine";
import { generateContentAsset } from "./contentEngine";
import { detectGoalLane, getGoalPermissionContext, isSafeInternalAction, isUserDecisionAction } from "./goalPermissionContext";
import { buildOpportunityGoalContext, detectOpportunityGoalLane, normalizeLaneId } from "./opportunitySourceIntelligence";
import { recordLearningOutcome, getGoalWorkflowTemplateMatches } from "./learningLoop";
import { buildProfitLearningContextForGoal, getProfitabilityContextPayload } from "./profitabilityLearning";
import { getArchiveContextForAutopilot } from "./contentArchive";
import { recordLaneActivity } from "./autopilotLaneActivity";
import { AutopilotProfile } from "@/entities";

export interface AutopilotStep {
  title: string;
  category: string;
  description: string;
  department: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

export interface AutopilotExecutionResult {
  missionId: string;
  completedSteps: string[];
  queuedSteps: string[];
  summary: string;
}

/**
 * Main execution loop for the Autopilot Command Officer.
 * Converts a high-level goal into real actions (Buildy-active) or requests (Ubuntu-queued).
 */
export async function runActiveAutopilotGoal(
  goal: string, 
  user: any
): Promise<AutopilotExecutionResult> {
  console.log(`[VELO] Initiating active loop for goal: "${goal}"`);

  // 1. Check for duplicate pending missions with the same goal
  const existingMissions = await AutopilotMission.query()
    .where("created_by", user.email)
    .where("status", "pending")
    .exec().catch(() => []);
  
  const duplicate = existingMissions.find(m => m.metadata?.goal === goal && m.mission_type === "AUTOPILOT_GOAL_EXECUTION");
  if (duplicate) {
    console.log(`[VELO] Mission for goal already exists and is pending: ${duplicate.id}`);
    return {
      missionId: duplicate.id,
      completedSteps: [],
      queuedSteps: [],
      summary: "A mission for this exact goal is already pending review in your Review Center."
    };
  }

  const lowGoal = goal.toLowerCase();

  // Handle Payment Connector Setup Requests
  if (lowGoal.includes("stripe") || lowGoal.includes("paypal") || lowGoal.includes("sync wallet") || (lowGoal.includes("connect") && lowGoal.includes("payment"))) {
    return {
      missionId: "payment-setup-redirect",
      completedSteps: [],
      queuedSteps: [],
      summary: "I've identified a request for payment connector setup. Please head to the Connection Hub to authorize your Stripe or PayPal account. This ensures VELO uses your own credentials for secure, read-only sync."
    };
  }

  const isSafeSimulation = lowGoal.includes("simulat") || lowGoal.includes("risk-first") || lowGoal.includes("observation") || lowGoal.includes("passive income") || lowGoal.includes("intelligence");
  const baseRisk = isSafeSimulation ? "low" : "medium";

  // Goal Lane Detection
  const lane = detectGoalLane({ title: goal, details: goal, mission_type: "AUTOPILOT_GOAL_EXECUTION" });
  const optContext = buildOpportunityGoalContext(goal);
  const normalizedLaneId = optContext?.lane ? normalizeLaneId(optContext.lane) : null;

  // Retrieve relevant workflow templates from previous chat goal-syncs or successful missions
  const matchedTemplates = await getGoalWorkflowTemplateMatches({
    lane_id: normalizedLaneId || undefined,
    goal: goal,
    source_keywords: optContext?.keywords
  });

  // Wave 3: Profitability Learning Context
  const profitPayload = await getProfitabilityContextPayload(user.email);
  const profitContext = await buildProfitLearningContextForGoal(goal, user.email);

  // Wave 4: Archive Context
  const archiveContext = await getArchiveContextForAutopilot(user.email, goal);

  // 1. Preflight Readiness Check
  const preflightReport = await runMissionPreflight({
    goal,
    department: "Command Officer",
    mission_type: "AUTOPILOT_GOAL_EXECUTION",
    risk_level: baseRisk
  }, user);

  // 2. Create the initial mission record
  const mission = await AutopilotMission.create({
    title: `Goal: ${goal.length > 40 ? goal.substring(0, 37) + "..." : goal}`,
    source_department: "Command Officer",
    mission_type: "AUTOPILOT_GOAL_EXECUTION",
    risk_level: baseRisk,
    status: preflightReport.overall_status === 'blocked' ? "pending" : "approved", 
    details: `Active autopilot loop triggered for: ${goal}`,
    metadata: { 
      goal,
      goal_lane: lane,
      opportunity_context: optContext,
      owner_email: user.email,
      user_id: user.id,
      autopilot_stage: preflightReport.overall_status === 'blocked' ? 'blocked' : 'searching',
      user_facing_summary: preflightReport.overall_status === 'blocked' ? preflightReport.summary : "I'm identifying the best steps to achieve your goal.",
      source: lowGoal.includes("onboarding") ? "onboarding_first_mission" : undefined,
      safety_mode: isSafeSimulation ? "simulation_only" : undefined,
      matched_workflow_templates: matchedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        department: t.department,
        workflow_type: t.workflow_type,
        trigger_context: t.trigger_context,
        lane_id: t.metadata?.lane_id || t.lane_id,
        steps: Array.isArray(t.steps) ? t.steps.map((s: any) => ({ label: s.label || s.title, mode: s.mode })) : []
      })),
      workflow_template_context_used: matchedTemplates.length > 0,
      profit_learning_context_used: profitPayload.hasData,
      profitability_priorities: profitPayload.top,
      profitability_context_summary: profitPayload.summary,
      ...formatPreflightMetadata(preflightReport)
    }
  });

  await recordLaneActivity({
    department: lane || "Command Officer",
    stage: "searching",
    title: "Mission Started",
    summary: `Autopilot initiated: ${goal}`,
    relatedId: mission.id,
    riskLevel: baseRisk
  });

  if (preflightReport.overall_status === 'blocked') {
    await AutopilotActionLog.create({
      department: "Command Officer",
      action_type: "PREFLIGHT_BLOCKED",
      status: "blocked",
      summary: `Mission blocked by preflight: ${goal}`,
      details: preflightReport.blockers.map(b => b.label).join(", "),
      related_id: mission.id
    });

    return {
      missionId: mission.id,
      completedSteps: [],
      queuedSteps: [],
      summary: preflightReport.summary
    };
  }

  // 3. Plan the mission using Continuity Runtime
  let plannedSteps: AutopilotStep[] = [];
  try {
    const templateContext = matchedTemplates.length > 0 
      ? `\nRelevant Workflow Templates (Reference these steps and constraints):
      ${matchedTemplates.map(t => {
        const stepsText = Array.isArray(t.steps) 
          ? t.steps.map((s: any) => `${s.label || s.title} (${s.mode || 'auto'})`).join(", ") 
          : "No predefined steps";
        return `- Template: ${t.name}\n  Steps: ${stepsText}\n  Constraints: ${JSON.stringify(t.metadata?.safety_boundaries || {})}`;
      }).join("\n")}`
      : "";

    const planningResponse = await routeContinuityRuntimeTask({
      prompt: `Act as the VELO Command Officer. Break down the following user goal into 4-7 logical execution steps.
      
      User Goal: "${goal}"
      ${profitContext ? `\nHistorical Profit Context (Prioritize high ROI lanes):\n${profitContext}\n` : ""}
      ${archiveContext ? `\nUser Content Archive Context (Reuse or improve previous work):\n${archiveContext}\n` : ""}
      ${optContext ? `
      Opportunity Context:
      - Focus Lane: ${optContext.label || "General Opportunity"}
      - Suggested Platforms: ${(optContext.target_platforms || []).join(", ")}
      - Likely Requirements: ${(optContext.requirements || []).join(", ")}
      - Account Needs: ${(optContext.account_needs || []).join(", ")}
      - Preferences: ${JSON.stringify(optContext.preferences || {})}
      ` : ""}
      ${templateContext}
      
      Available Categories:
      Buildy-active (execute now): onboarding, account_updates, autopilot_chat, workflow_creation, content_generation_internal, opportunity_research, platform_discovery, lead_discovery, prospect_research, admin_settings, notifications_internal, diagnostics, database_writes, member_invitations, email_sending, crm_updates, event_logging, ai_logic_execution, file_upload_internal, api_calls_internal, draft_content, prepare_outreach, product_research, design_generation, mockup_generation, store_creation, marketing_creation
      Ubuntu-queued (request for later): ${UBUNTU_QUEUED_CATEGORIES.join(", ")}
      
      For each step, provide:
      - title: A short action-oriented title
      - category: One of the categories listed above
      - description: What this step accomplishes
      - department: The likely department (e.g., Freelance Station, Commerce Hub, Galaxy Scanner)
      - risk_level: low, medium, high, or critical
      
      Return the steps as a JSON array of objects. Do not include any other text.`,
      department: "Command Officer",
      workflow_name: "Autopilot Mission Planning",
      response_json_schema: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                department: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] }
              },
              required: ["title", "category", "description", "department", "risk_level"]
            }
          }
        },
        required: ["steps"]
      }
    }, { mode: getContinuityMode() });

    if (planningResponse && typeof planningResponse === 'object' && planningResponse.content?.steps) {
      plannedSteps = planningResponse.content.steps;
    } else {
      throw new Error("Invalid runtime response format for planning");
    }
  } catch (error) {
    console.error("[VELO] Runtime Planning failed. Using direct deterministic fallback.", error);
    
    const lowGoal = goal.toLowerCase();
    const laneId = normalizedLaneId || "";

    // Profit-aware broad fallback
    const topCategory = profitPayload.top[0]?.category_key;
    const isBroadGoal = lowGoal.includes("income") || lowGoal.includes("work") || lowGoal.includes("money") || lowGoal.includes("profit") || lowGoal.includes("earn");
    
    if (isBroadGoal && !laneId && topCategory) {
      if (topCategory === "ai_training") {
        plannedSteps = [
          { title: "AI Lane Discovery", category: "opportunity_research", description: "Scanning high-ROI AI training sources.", department: "Galaxy Scanner", risk_level: "low" },
          { title: "Task Alignment", category: "opportunity_research", description: "Matching profile for top AI evaluation tasks.", department: "Command Officer", risk_level: "low" },
          { title: "Application Staging", category: "content_generation_internal", description: "Preparing AI training application packet.", department: "Freelance Station", risk_level: "low" },
          { title: "Strategic Approval", category: "strategic_review", description: "Final review of the AI training plan.", department: "Command Officer", risk_level: "low" }
        ];
      } else if (topCategory === "online_testing") {
        plannedSteps = [
          { title: "Testing Cycle Discovery", category: "opportunity_research", description: "Scanning for high-ROI website and QA testing cycles.", department: "Galaxy Scanner", risk_level: "low" },
          { title: "Station Readiness", category: "diagnostics", description: "Verifying local station matches testing requirements.", department: "Command Officer", risk_level: "low" },
          { title: "Bug Draft Preparation", category: "content_generation_internal", description: "Drafting usability feedback and bug report templates.", department: "Freelance Station", risk_level: "low" },
          { title: "Deployment Staging", category: "submission_review", description: "Final check of the testing preparation.", department: "Command Officer", risk_level: "low" }
        ];
      } else if (topCategory === "microtasks") {
        plannedSteps = [
          { title: "Rapid Task Scan", category: "opportunity_research", description: "Finding high-speed microtasks and paid studies.", department: "Galaxy Scanner", risk_level: "low" },
          { title: "Friction Check", category: "diagnostics", description: "Analyzing account and access needs.", department: "Command Officer", risk_level: "low" },
          { title: "Claim List Generation", category: "content_generation_internal", description: "Preparing the rapid claim and completion checklist.", department: "Freelance Station", risk_level: "low" },
          { title: "Final Review", category: "submission_review", description: "Reviewing the microtask packet.", department: "Command Officer", risk_level: "low" }
        ];
      }
    }

    if (plannedSteps.length === 0) {
      if (lowGoal.includes("mixed") || lowGoal.includes("passive") || (lowGoal.includes("digital") && lowGoal.includes("trade"))) {
      plannedSteps = [
        { title: "Digital Product Ideation", category: "opportunity_research", description: "Researching high-demand digital products in Commerce Hub.", department: "Commerce Hub", risk_level: "low" },
        { title: "Asset Draft Generation", category: "content_generation_internal", description: "Drafting sales copy and assets for the new digital product.", department: "Commerce Hub", risk_level: "low" },
        { title: "Strategic Review", category: "strategic_review", description: "Reviewing the mixed income plan for final pilot approval.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "ai_training" || lowGoal.includes("ai training") || lowGoal.includes("rlhf") || lowGoal.includes("evaluation")) {
      plannedSteps = [
        { title: "Source Discovery", category: "opportunity_research", description: "Scanning verified RLHF and AI training sources for open tasks.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Skill Alignment", category: "opportunity_research", description: "Matching your profile skills with AI evaluation requirements.", department: "Command Officer", risk_level: "low" },
        { title: "Drafting Application Packet", category: "content_generation_internal", description: "Preparing a tailored application packet for AI training platforms.", department: "Freelance Station", risk_level: "low" },
        { title: "Final Review Gate", category: "strategic_review", description: "Final review of the application packet before staging.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "online_testing" || lowGoal.includes("testing") || lowGoal.includes("qa")) {
      plannedSteps = [
        { title: "Cycle Discovery", category: "opportunity_research", description: "Finding open QA and usability testing cycles on verified platforms.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Device Verification", category: "diagnostics", description: "Ensuring your station devices match the testing cycle requirements.", department: "Command Officer", risk_level: "low" },
        { title: "Drafting Bug Report Drafts", category: "content_generation_internal", description: "Preparing template bug reports and usability feedback drafts.", department: "Freelance Station", risk_level: "low" },
        { title: "Submission Staging", category: "submission_review", description: "Reviewing the testing application before final staging.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "microtasks" || lowGoal.includes("microtask") || lowGoal.includes("paid study") || lowGoal.includes("survey")) {
      plannedSteps = [
        { title: "Platform Scan", category: "opportunity_research", description: "Scanning high-speed task platforms (Clickworker, Prolific, etc.) for matched gigs.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Friction Assessment", category: "diagnostics", description: "Checking account and verification needs for the identified platforms.", department: "Command Officer", risk_level: "low" },
        { title: "Task-Fit Scoring", category: "opportunity_research", description: "Scoring open tasks based on speed, payout, and profile compatibility.", department: "Command Officer", risk_level: "low" },
        { title: "Claim Checklist Draft", category: "content_generation_internal", description: "Drafting the rapid-response checklist for claiming and completing tasks.", department: "Freelance Station", risk_level: "low" },
        { title: "Efficiency Review", category: "submission_review", description: "Final check of the micro-task preparation packet.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "content_research" || lowGoal.includes("research") || lowGoal.includes("content work")) {
      plannedSteps = [
        { title: "Source Refresh", category: "opportunity_research", description: "Scanning content and research platforms for new briefs.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Topic Extraction", category: "opportunity_research", description: "Identifying high-value topics and requirement sets from open content gigs.", department: "Command Officer", risk_level: "low" },
        { title: "Deliverable Outline", category: "content_generation_internal", description: "Generating a structured outline for the research or content deliverable.", department: "Freelance Station", risk_level: "low" },
        { title: "Draft Asset Generation", category: "content_generation_internal", description: "Drafting the initial content or research packet.", department: "Freelance Station", risk_level: "low" },
        { title: "Editorial Review", category: "submission_review", description: "Reviewing content quality and adherence to brief requirements.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "ai_freelance" || lowGoal.includes("ai freelance") || lowGoal.includes("automation gig")) {
      plannedSteps = [
        { title: "Market Scan", category: "opportunity_research", description: "Scanning Upwork/Fiverr for custom AI implementation and automation projects.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Portfolio Alignment", category: "opportunity_research", description: "Matching your profile and portfolio assets to project requirements.", department: "Freelance Station", risk_level: "low" },
        { title: "Proposal Generation", category: "content_generation_internal", description: "Drafting a tailored AI solution proposal and service packet.", department: "Freelance Station", risk_level: "low" },
        { title: "Technical Review Gate", category: "submission_review", description: "Reviewing the technical proposal and estimated timeline.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "global_language" || lowGoal.includes("translation") || lowGoal.includes("language gig")) {
      plannedSteps = [
        { title: "Language Discovery", category: "opportunity_research", description: "Scanning Gengo/Lionbridge for translation and localization tasks.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Fluency Verification Check", category: "diagnostics", description: "Verifying profile language certifications match open task requirements.", department: "Command Officer", risk_level: "low" },
        { title: "Deliverable Draft", category: "content_generation_internal", description: "Generating the initial draft for the translation or multilingual review.", department: "Freelance Station", risk_level: "low" },
        { title: "Bilingual Quality Review", category: "submission_review", description: "Staging the deliverable for a final bilingual accuracy check.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (lowGoal.includes("online") || lowGoal.includes("freelance") || lowGoal.includes("find work")) {
      plannedSteps = [
        { title: "Skill Analysis", category: "opportunity_research", description: "Analyzing your profile skills to match with current freelance opportunities.", department: "Freelance Station", risk_level: "low" },
        { title: "Opportunity Scan", category: "opportunity_research", description: "Scanning top freelance platforms for matching missions.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Proposal Drafting", category: "content_generation_internal", description: "Drafting tailored proposals for the best-fit opportunities.", department: "Freelance Station", risk_level: "low" },
        { title: "Submission Review", category: "submission_review", description: "Final review of proposals before staging for submission.", department: "Command Officer", risk_level: "low" }
      ];
    } else if (laneId === "commerce" || lowGoal.includes("pod") || lowGoal.includes("print on demand") || lowGoal.includes("dropship") || lowGoal.includes("store") || lowGoal.includes("merch") || lowGoal.includes("tshirt") || lowGoal.includes("apparel") || lowGoal.includes("sales page")) {
      plannedSteps = [
        { title: "Product Niche Research", category: "product_research", description: "Researching trending POD niches and product opportunities.", department: "Commerce Hub", risk_level: "low" },
        { title: "Design Generation", category: "design_generation", description: "Creating high-quality POD designs for your niche.", department: "Commerce Hub", risk_level: "low" },
        { title: "Mockup Creation", category: "mockup_generation", description: "Generating professional product mockups for your designs.", department: "Commerce Hub", risk_level: "low" },
        { title: "Store Setup", category: "store_creation", description: "Setting up your storefront with branding and layout.", department: "Commerce Hub", risk_level: "low" },
        { title: "Marketing Materials", category: "marketing_creation", description: "Creating social media posts to promote your products.", department: "Commerce Hub", risk_level: "low" },
        { title: "Strategic Review", category: "strategic_review", description: "Review all generated assets and store setup.", department: "Command Officer", risk_level: "low" }
      ];
    } else {
      plannedSteps = [
        { title: "Research Briefing", category: "opportunity_research", description: "Generating an Autopilot research brief related to the goal.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Workflow Playbook", category: "workflow_creation", description: "Designing the internal playbook for mission execution.", department: "Command Officer", risk_level: "low" },
        { title: "Draft Asset Generation", category: "content_generation_internal", description: "Preparing initial content drafts and assets.", department: "Freelance Station", risk_level: "low" },
        { title: "Final Strategic Review", category: "strategic_review", description: "Final review of the prepared research and drafts.", department: "Command Officer", risk_level: "low" },
        { title: "Platform Onboarding Request", category: "platform_onboarding_external", description: "Queuing onboarding for external platforms.", department: "Docking Control", risk_level: "medium" }
      ];
    }
  }
}

  // 3. Initialize the sequential engine with these steps
  const settings = await getRealWorldModeSettings();
  const sequentialSteps = plannedSteps.map((s, idx) => {
    const outcome = evaluateActionOutcome(s.category, settings);
    let mode: any = 'manual';
    if (outcome === 'buildy_active') mode = 'buildy_active';
    else if (outcome === 'requires_human_approval') mode = 'review_required';
    else if (outcome === 'buildy_queue_for_ubuntu') mode = 'queued_for_ubuntu';

    return {
      id: `step_${idx}`,
      label: s.title,
      department: s.department,
      action_type: s.category.toUpperCase(),
      mode,
      risk_level: s.risk_level,
      summary: s.description,
      description: s.description
    };
  });

  await initializeSequentialMission(mission.id, sequentialSteps);

  // 4. Process safe steps immediately
  const completedSteps: string[] = [];
  const queuedSteps: string[] = [];

  // We fetch the mission again to get the fresh state
  let currentMission = await AutopilotMission.get(mission.id);

  const profile = await AutopilotProfile.query().where("created_by", user.email).exec().then(res => res[0]);
  const isAutonomous = profile?.autopilot_enabled && profile?.autopilot_mode === 'autonomous';

  for (let i = 0; i < sequentialSteps.length; i++) {
    const step = sequentialSteps[i];
    const outcome = evaluateActionOutcome(plannedSteps[i].category, settings);
    const isUserDecision = isUserDecisionAction(plannedSteps[i].category, `${step.label} ${step.description}`);

    // Autonomous-first logic: if it's a safe internal action and user is in autonomous mode, just do it.
    const isSafeInternal = isSafeInternalAction(plannedSteps[i].category, step.risk_level, `${step.label} ${step.description}`);

    if (outcome === 'buildy_active' && (!isUserDecision || (isAutonomous && isSafeInternal))) {
      try {
        const result: any = await executeBuildyAction(plannedSteps[i], user, mission.id);
        
        await completeCurrentMissionStep(mission.id, {
          summary: `Successfully processed ${step.label}`,
          details: `${step.description} - Handled within Buildy.`,
          related_id: result?.id
        });

        await recordLaneActivity({
          department: step.department,
          stage: "drafting",
          title: `Processed: ${step.label}`,
          summary: step.description,
          relatedId: mission.id
        });

        // Update timeline metadata
        const nextStep = sequentialSteps[i+1];
        await AutopilotMission.update(mission.id, {
          metadata: {
            ...mission.metadata,
            autopilot_stage: nextStep ? (isInternalStep(nextStep.action_type) ? 'drafting' : 'queued') : 'completed',
            user_facing_summary: nextStep ? `Finished: ${step.label}. Working on: ${nextStep.label}` : `I've finished all the work for: ${goal}`,
            next_autopilot_action: nextStep?.label,
            last_executed_step: step.label,
            last_executed_at: new Date().toISOString()
          }
        });
        
        completedSteps.push(step.label);
      } catch (err) {
        await failCurrentMissionStep(mission.id, `Internal execution failed: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`[VELO] Step failed: ${step.label}`, err);
        break; // Stop execution on failure
      }
    } else {
      // Step requires external/review - stage it and stop active loop
      try {
        const isApprovalRequired = outcome === 'requires_human_approval' || isUserDecision;
        const hostReady = settings.ubuntuFullAutonomy === 'enabled' && !isUserDecision;
        
        let preparedPayload = null;
        try {
          preparedPayload = await prepareBuildyDraftForUbuntu(plannedSteps[i], goal);
        } catch (prepErr) {
          console.warn(`[VELO] Buildy preparation skipped for ${step.label}:`, prepErr);
        }

        await VeloRealWorldActionRequest.create({
          title: step.label,
          department: step.department,
          action_type: plannedSteps[i].category,
          explicit_user_request_summary: step.description,
          risk_level: plannedSteps[i].risk_level,
          requested_by_email: user.email,
          requested_by_user_id: user.id,
          safety_validation_status: isApprovalRequired ? 'needs_review' : 'passed',
          permission_status: isApprovalRequired ? 'pending' : 'approved',
          credential_scope_status: 'not_requested_on_buildy',
          connector_status: hostReady ? 'queued' : 'pending_host',
          execution_mode: isUserDecision ? 'manual' : 'queued_for_ubuntu',
          required_approval_summary: isUserDecision ? "Your final review is required before proceeding." : (isApprovalRequired ? "Human authorization required for high-risk operation." : (hostReady ? "Queued for host readiness validation." : "Queued: Awaiting Ubuntu host attestation.")),
          provider_notes: isUserDecision ? "This is a manual decision gate." : (hostReady ? "Action identified for host-restricted execution via Ubuntu adapter." : "Action identified for host-restricted execution. Awaiting Ubuntu host attestation to proceed."),
          related_mission_id: mission.id,
          metadata: {
            step_id: step.id,
            origin_goal: goal,
            buildy_prepared_payload: preparedPayload,
            preflight_status: preflightReport.overall_status,
            preflight_summary: preflightReport.summary,
            preflight_score: preflightReport.score,
            user_decision_gate: isUserDecision
          }
        });

        // Update mission timeline state to waiting or review
        await AutopilotMission.update(mission.id, {
          metadata: {
            ...mission.metadata,
            autopilot_stage: isUserDecision ? 'needs_decision' : 'waiting_external',
            user_facing_summary: isUserDecision ? `Check the Review Center: ${step.label}` : `I'm preparing the next steps: ${step.label}`,
            next_autopilot_action: step.label,
            staged_at: new Date().toISOString()
          }
        });

        await recordLaneActivity({
          department: step.department,
          stage: isUserDecision ? 'needs_decision' : 'waiting_external',
          title: isUserDecision ? `Decision Needed: ${step.label}` : `Queued: ${step.label}`,
          summary: step.description,
          relatedId: mission.id
        });

        queuedSteps.push(step.label);
        
        // We do NOT call completeCurrentMissionStep here. 
        // The step remains 'ready' in the sequential metadata until it's completed by review or local report.
      } catch (err) {
        console.error(`[VELO] External staging failed for ${step.label}:`, err);
      }
      
      // Stop the active loop after hitting the first non-Buildy-active step
      break;
    }
  }

  const finalSummary = completedSteps.length > 0 
    ? `I've started your mission and already completed ${completedSteps.length} initial ${completedSteps.length === 1 ? 'step' : 'steps'}. ${queuedSteps.length > 0 ? `I've also prepared ${queuedSteps.length} more actions for the next phase.` : 'The mission is progressing well.'}`
    : `I've mapped out the mission and staged ${queuedSteps.length} initial actions for review.`;
  
  return {
    missionId: mission.id,
    completedSteps,
    queuedSteps,
    summary: finalSummary
  };
}


/**
 * Handles real logic for Buildy-active steps using valid entity fields
 */
export async function executeBuildyAction(step: AutopilotStep, user: any, missionId: string) {
  switch (step.category) {
    case 'workflow_creation':
      const playbook = await VeloWorkflowTemplate.create({
        name: `Playbook: ${step.title}`,
        department: step.department,
        workflow_type: "AUTOPILOT_MISSION_PLAN",
        trigger_context: `Execution of goal related to ${step.title}`,
        steps: [{ action: step.description, status: "generated" }],
        status: "active",
        metadata: { mission_id: missionId }
      });
      await recordLaneActivity({
        department: step.department,
        stage: "drafting",
        title: "Playbook Generated",
        summary: `Created execution playbook for ${step.title}`,
        relatedId: missionId
      });
      return playbook;

    case 'content_generation_internal':
      // Generate real draft content using the shared Content Engine
      try {
        const assetResult = await generateContentAsset({
          requested_asset_type: "proposal_template",
          target_department: step.department,
          intended_next_action: "manual_content_review",
          audience: step.department === "Freelance Station" ? "Freelance Clients" : "Platform Users",
          tone: "professional",
          constraints: [step.description],
          mission: { id: missionId }
        });

        const asset = await VeloContentAsset.create({
          title: assetResult.title,
          target_department: step.department,
          asset_type: "proposal_template",
          body: assetResult.body,
          tone: assetResult.tone,
          status: "ready",
          quality_score: assetResult.quality_score,
          strengths: assetResult.strengths,
          improvement_notes: assetResult.improvement_notes,
          source_context_summary: assetResult.source_context_summary,
          metadata: { 
            mission_id: missionId,
            generated_by: "Autopilot Content Engine",
            description: step.description,
            checklist: assetResult.completion_checklist,
            revision_prompts: assetResult.revision_prompts,
            engine_metadata: assetResult.metadata
          }
        });

        await recordLaneActivity({
          department: step.department,
          stage: "drafting",
          title: `Drafted: ${assetResult.title}`,
          summary: `Autopilot generated a ${step.department} draft for review.`,
          relatedId: missionId
        });
        return asset;
      } catch (err) {
        console.error("[VELO] Content Engine generation failed:", err);
        // Minimal fallback if engine fails entirely
        const fallbackAsset = await VeloContentAsset.create({
          title: step.title,
          target_department: step.department,
          asset_type: "proposal_template",
          body: `Draft for: ${step.description}`,
          status: "draft",
          metadata: { mission_id: missionId, error: String(err) }
        });
        return fallbackAsset;
      }

    case 'opportunity_research':
    case 'lead_discovery':
    case 'prospect_research':
      if (step.category === 'lead_discovery' || step.category === 'prospect_research') {
        const count = await runAutopilotLeadDiscovery({
          goal: step.description,
          missionId: missionId,
          user,
          department: step.department
        });
        
        // Detailed log is already created inside runAutopilotLeadDiscovery
        return { summary: `Discovered ${count} leads for ${step.department}` };
      }

      const run = await GalaxyScannerRun.create({
        department: step.department,
        scanner_name: "Autopilot Research Brief",
        status: "completed",
        summary: `Autonomous research brief generated for: ${step.title}`,
        results_count: 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
      
      const researchResult = await generateContentAsset({
        requested_asset_type: "research_brief",
        target_department: step.department,
        intended_next_action: "strategic_review",
        audience: "Internal Strategic Team",
        tone: "analytical",
        constraints: [step.description],
        mission: { id: missionId }
      });

      const opResult = await GalaxyOpportunityFeed.create({
        run_id: run.id,
        department: step.department,
        source_name: "Autopilot Intelligence",
        title: researchResult.title || `Research Brief: ${step.title}`,
        summary: researchResult.body,
        opportunity_type: "research_brief",
        confidence_score: researchResult.quality_score / 100,
        risk_level: (step.risk_level === 'low' ? 'low' : 'medium') as 'low' | 'medium' | 'high',
        routing_status: "pending",
        authorization_status: "awaiting_review",
        linked_mission_id: missionId,
        metadata: {
          strengths: researchResult.strengths,
          improvement_notes: researchResult.improvement_notes,
          checklist: researchResult.completion_checklist,
          engine_metadata: researchResult.metadata,
          real_opportunity: false,
          source_verified: false,
          internal_research_brief: true,
          discovery_mode: "autopilot_research_brief",
          not_a_public_listing: true,
          requires_human_review: true
        }
      });
      return opResult;
      
    case 'onboarding':
    case 'account_updates':
    case 'admin_settings':
    case 'diagnostics':
      // These categories update internal state or logs
      const log = await createSafeActionLog({
        department: step.department,
        action_type: "INTERNAL_CONFIGURATION",
        status: "success",
        summary: `Environment parameters updated for ${step.title}`,
        details: `Internal configuration for ${step.title} finalized within Buildy environment.`,
        related_id: missionId
      });
      return log;

    case 'product_research': {
      // Research trending POD niches and save results
      const niches = await researchPodNiches();
      
      // Save as a research brief asset
      const asset = await VeloContentAsset.create({
        title: `POD Niche Research: ${step.title}`,
        target_department: step.department,
        asset_type: "research_brief",
        body: JSON.stringify(niches.map((n: any) => `**${n.niche}** (Score: ${n.trend_score}/100): ${n.description}\nStyle: ${n.style_suggestions}`).join('\n\n')),
        status: "ready",
        quality_score: 85,
        source_context_summary: `Autopilot POD research for: ${step.description}`,
        metadata: {
          mission_id: missionId,
          niches: niches.map((n: any) => n.niche),
          top_niche: niches[0]?.niche
        }
      });
      
      // Also create a DropshippingProductCandidate for the top niches
      for (const niche of niches.slice(0, 3)) {
        await DropshippingProductCandidate.create({
          owner_user_id: user.id,
          owner_email: user.email,
          candidate_type: "POD",
          title: niche.niche,
          niche: niche.niche,
          summary: niche.description,
          demand_signals: `Trend score: ${niche.trend_score}/100`,
          score: niche.trend_score,
          risk_level: "low",
          status: "research",
          metadata: { 
            autopilot_mission_id: missionId,
            style_suggestions: niche.style_suggestions,
            trend_score: niche.trend_score
          }
        });
      }
      
      return asset;
    }

    case 'design_generation': {
      // Get the top niche from previous research
      const candidates = await DropshippingProductCandidate.filter({ owner_user_id: user.id, status: "research" }, "-score", 1);
      const niche = candidates[0]?.niche || "Trending Apparel";
      const styleTags = (candidates[0]?.metadata as any)?.style_suggestions?.split(",").map((s: string) => s.trim()) || ["minimalist", "bold"];
      
      // Generate designs
      const designs = await generatePodDesigns(niche, styleTags, 3, user);
      
      return { 
        summary: `Generated ${designs.length} designs for ${niche}`,
        designs: designs.map(d => d.id),
        niche
      };
    }

    case 'mockup_generation': {
      // Find the latest design without products
      const designs = await PodDesign.filter({ owner_user_id: user.id }, "-created_at", 5);
      const design = designs[0];
      
      if (!design) return { summary: "No designs found to create mockups for" };
      
      const products = getRecommendedProducts(design);
      const createdProducts = [];
      
      for (const productType of products.slice(0, 3)) {
        const product = await createProductMockup(design.id, productType, user);
        createdProducts.push(product);
      }
      
      return {
        summary: `Created ${createdProducts.length} product mockups for design: ${design.title}`,
        products: createdProducts.map(p => p.id),
        design_id: design.id
      };
    }

    case 'store_creation': {
      // Set up the store with branding based on the niche
      const candidates = await DropshippingProductCandidate.filter({ owner_user_id: user.id }, "-score", 1);
      const niche = candidates[0]?.niche || "Custom Apparel";
      
      // Get or create store settings
      const existing = await StoreSetting.filter({ owner_user_id: user.id });
      let storeSettings;
      
      if (existing.length > 0) {
        storeSettings = await StoreSetting.update(existing[0].id, {
          store_name: `${niche} Collection`,
          tagline: `Premium ${niche} designs`,
          hero_headline: `Discover ${niche}`,
          hero_subtext: `Unique designs, premium quality`,
          about_text: `Welcome to our ${niche.toLowerCase()} collection. Each piece is designed with care and printed on demand.`,
          layout_style: "grid",
          card_style: "standard",
          grid_columns: 3,
          show_prices: true
        });
      } else {
        storeSettings = await StoreSetting.create({
          owner_user_id: user.id,
          owner_email: user.email,
          store_name: `${niche} Collection`,
          tagline: `Premium ${niche} designs`,
          hero_headline: `Discover ${niche}`,
          hero_subtext: `Unique designs, premium quality`,
          about_text: `Welcome to our ${niche.toLowerCase()} collection.`,
          layout_style: "grid",
          card_style: "standard",
          grid_columns: 3,
          show_prices: true,
          primary_color: "#1a1a2e",
          accent_color: "#e94560"
        });
      }
      
      return { summary: `Store set up for ${niche}`, store_id: storeSettings.id };
    }

    case 'marketing_creation': {
      // Create social post drafts for store products
      const products = await PodProduct.filter({ owner_user_id: user.id, status: "draft" }, "-created_at", 3);
      
      if (products.length === 0) {
        return { summary: "No products available for marketing" };
      }
      
      const createdPosts = [];
      for (const product of products.slice(0, 2)) {
        // Generate caption using LLM
        const captionRes = await invokeLLM({
          prompt: `Write an engaging Instagram/Facebook caption to promote this product:
          Product: ${product.title}
          Type: ${product.product_type}
          Niche: ${product.niche || "lifestyle"}
          
          Make it sound authentic and compelling. Include 3-5 relevant hashtags. Keep it under 150 words.`,
          response_json_schema: {
            type: "object",
            properties: {
              caption: { type: "string" }
            },
            required: ["caption"]
          }
        });
        
        const caption = (captionRes as any)?.caption || `Check out our new ${product.title}! #${product.niche?.replace(/\s+/g, '')} #POD #NewArrival`;
        
        const post = await VeloContentAsset.create({
          title: `Social Post: ${product.title}`,
          target_department: "Commerce Hub",
          asset_type: "social_post_draft",
          body: caption,
          file_url: product.mockup_image_url,
          status: "draft",
          platform_application_id: product.id,
          source_context_summary: `Autopilot-generated marketing for ${product.title}`,
          metadata: {
            mission_id: missionId,
            platform: "instagram",
            product_id: product.id,
            product_title: product.title,
            niche: product.niche,
            generated_by: "Autopilot Marketing Engine"
          }
        });
        
        createdPosts.push(post);
      }
      
      return { 
        summary: `Created ${createdPosts.length} social post drafts for products`, 
        posts: createdPosts.map(p => p.id) 
      };
    }

    default:
      // Other categories are logged and marked as internal success
      return { summary: `Processed internal action: ${step.title}` };
  }
}

/**
 * Prepares a draft payload on Buildy for an action that will eventually execute on Ubuntu.
 */
export async function prepareBuildyDraftForUbuntu(step: AutopilotStep, goal: string) {
  const prompt = `Act as the VELO Preparation Engine. A task is queued for host execution on Ubuntu, but Buildy must prepare the draft first.
  
  Task Objective: "${step.description}"
  Related Mission Goal: "${goal}"
  Action Category: "${step.category}"
  
  Provide a structured preparation packet with:
  1. objective: A clear summary of the final execution goal.
  2. drafted_copy: Professional copy, message, or content for the action.
  3. target_context: Notes on target platforms, personas, or context.
  4. readiness_checklist: 3-5 items to verify before execution.
  5. adapter_category: The matching Ubuntu adapter (e.g., "browser_automation", "publishing", "financial").
  
  Return the packet as JSON.`;

  const response = await invokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        objective: { type: "string" },
        drafted_copy: { type: "string" },
        target_context: { type: "string" },
        readiness_checklist: { type: "array", items: { type: "string" } },
        adapter_category: { type: "string" }
      },
      required: ["objective", "drafted_copy", "target_context", "readiness_checklist", "adapter_category"]
    }
  });

  return response;
}

/**
 * Resumes a mission after a step has been approved.
 * Processes subsequent Buildy-active steps until it hits another manual review or host requirement.
 */
export async function resumeApprovedMission(missionId: string, user: any): Promise<void> {
  console.log(`[VELO] Resuming approved mission: ${missionId}`);
  
  let mission = await AutopilotMission.get(missionId);
  if (!mission) {
    console.error(`[VELO] Cannot resume: Mission ${missionId} not found`);
    return;
  }

  await recordLaneActivity({
    department: mission.source_department || "Command Officer",
    stage: "searching",
    title: "Resuming Mission",
    summary: `Autopilot is continuing: ${mission.title}`,
    relatedId: mission.id
  });

  const state = getSequentialMissionState(mission);
  if (!state || !state.steps) {
    console.log(`[VELO] Mission ${missionId} is not sequential or missing steps metadata.`);
    return;
  }

  const settings = await getRealWorldModeSettings();
  const goal = mission.metadata?.goal || "Resume Goal";

  // Goal Lane Context
  const context = await getGoalPermissionContext(mission, user);

  // Start processing from the current step index
  // Note: the approval handler already called approveOrAdvanceMissionStep, 
  // so current_step_index should now point to the NEXT step that needs processing.
  
  for (let i = mission.current_step_index || 0; i < state.steps.length; i++) {
    const step = state.steps[i];
    
    // Safety check: don't re-process completed steps
    if (step.status === 'completed') continue;

    const outcome = evaluateActionOutcome(step.action_type.toLowerCase(), settings);
    const isUserDecision = isUserDecisionAction(step.action_type, `${step.label} ${step.description || step.summary}`);

    // Check if this step is a safe internal preparation covered by the goal lane
    const isSafePrep = isInternalStep(step) || isSafeInternalAction(step.action_type, 'low', `${step.label} ${step.description || step.summary}`);
    const isAutoApproved = isSafePrep && context.isSafePreparationAllowed && !isUserDecision;

    if ((outcome === 'buildy_active' && !isUserDecision) || (isAutoApproved && outcome === 'requires_human_approval')) {
      try {
        if (outcome === 'requires_human_approval') {
          console.log(`[VELO] Auto-authorizing safe internal step: ${step.label} for lane: ${context.goalLane}`);
        } else {
          console.log(`[VELO] Executing auto-step: ${step.label}`);
        }
        
        // Convert MissionStep back to AutopilotStep for execution
        const autopilotStep: AutopilotStep = {
          title: step.label,
          category: step.action_type.toLowerCase(),
          description: step.description || step.summary,
          department: step.department,
          risk_level: 'low' // Safely assume low for buildy_active or auto-approved prep
        };

        const result: any = await executeBuildyAction(autopilotStep, user, missionId);
        
        await completeCurrentMissionStep(missionId, {
          summary: outcome === 'requires_human_approval' ? `Auto-authorized & Processed: ${step.label}` : `Successfully processed ${step.label}`,
          details: `${step.description} - Handled as part of your ${context.goalLane} goal.`,
          related_id: result?.id
        });

        // Store output for visibility
        await AutopilotMission.update(missionId, {
          metadata: {
            ...mission.metadata,
            last_action_output: result?.summary || result?.details || result?.title || "Step processed successfully.",
            completed_step_label: step.label,
            completed_step_output: result
          }
        });
        
        // Reload mission to get updated step index
        mission = await AutopilotMission.get(missionId);
      } catch (err) {
        await failCurrentMissionStep(missionId, `Internal execution failed during resume: ${err instanceof Error ? err.message : String(err)}`);
        break; 
      }
    } else {
      // Step requires external/review - stage it and stop
      try {
        // Set mission to action_required so user knows Buildy is waiting for them
        await AutopilotMission.update(missionId, {
          status: "action_required",
          metadata: {
            ...mission.metadata,
            manual_checklist: step.manual_instructions || step.description || step.summary,
            completed_internal_until: step.label,
            autopilot_stage: 'waiting_external'
          }
        });

        const isApprovalRequired = outcome === 'requires_human_approval' || isUserDecision;
        const hostReady = settings.ubuntuFullAutonomy === 'enabled' && !isUserDecision;

        // Deduplicate: check if we already have a pending request for this specific mission + step
        const existingRequests = await VeloRealWorldActionRequest.query()
          .where("related_mission_id", missionId)
          .exec().catch(() => []);
        
        const duplicate = existingRequests.find(r => r.metadata?.step_id === step.id && (r.status === 'pending' || r.status === 'queued'));
        if (duplicate) {
          console.log(`[VELO] Step "${step.label}" (${step.id}) is already ${duplicate.status} as a real-world request. No duplicate created.`);
          break;
        }

        let preparedPayload = null;
        try {
          // Re-map to AutopilotStep for preparation
          const autopilotStep: AutopilotStep = {
            title: step.label,
            category: step.action_type.toLowerCase(),
            description: step.description || step.summary,
            department: step.department,
            risk_level: 'medium'
          };
          preparedPayload = await prepareBuildyDraftForUbuntu(autopilotStep, goal);
        } catch (prepErr) {
          console.warn(`[VELO] Buildy preparation skipped for ${step.label} during resume:`, prepErr);
        }

        await VeloRealWorldActionRequest.create({
          title: step.label,
          department: step.department,
          action_type: step.action_type.toLowerCase(),
          explicit_user_request_summary: step.description || step.summary,
          risk_level: isUserDecision ? 'high' : 'medium',
          requested_by_email: user.email,
          requested_by_user_id: user.id,
          safety_validation_status: isApprovalRequired ? 'needs_review' : 'passed',
          permission_status: isApprovalRequired ? 'pending' : 'approved',
          connector_status: hostReady ? 'queued' : 'pending_host',
          execution_mode: isUserDecision ? 'manual' : 'queued_for_ubuntu',
          required_approval_summary: isUserDecision ? "Your final review is required before proceeding." : (isApprovalRequired ? "Human authorization required for high-risk operation." : (hostReady ? "Queued for host readiness validation." : "Queued: Awaiting Ubuntu host attestation.")),
          provider_notes: isUserDecision ? "This is a manual decision gate." : (hostReady ? "Action identified for host-restricted execution via Ubuntu adapter." : "Action identified for host-restricted execution. Awaiting Ubuntu host attestation to proceed."),
          related_mission_id: missionId,
          metadata: {
            step_id: step.id,
            origin_goal: goal,
            buildy_prepared_payload: preparedPayload,
            user_decision_gate: isUserDecision
          }
        });
      } catch (err) {
        console.error(`[VELO] External staging failed during resume for ${step.label}:`, err);
      }
      
      break;
    }
  }
}
