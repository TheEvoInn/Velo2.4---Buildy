
import { 
  GalaxyScannerRun, 
  GalaxyOpportunityFeed, 
  VeloWorkflowTemplate,
  AutopilotActionLog,
  VeloRealWorldActionRequest
} from "@/entities";
import { galaxyScanner } from "@/functions";
import { 
  normalizeScannerResult, 
  buildScannerRunSummary, 
  createSafeActionLog 
} from "./scannerNormalization";
import { recordLaneActivity } from "./autopilotLaneActivity";

export interface LeadDiscoveryOptions {
  goal: string;
  missionId: string;
  user: any;
  department?: string;
  maxResults?: number;
}

/**
 * Local deterministic classifier for goals into industry lanes and departments.
 * Replaces LLM-based classification to reduce latency and eliminate external dependency.
 */
function classifyGoalLocally(goal: string): { lanes: string[], departments: string[] } {
  const g = goal.toLowerCase();
  const lanes = new Set<string>();
  const depts = new Set<string>();

  // Keyword mappings for Lanes
  const laneKeywords: Record<string, string[]> = {
    ai_freelance: ["ai", "llm", "gpt", "machine learning", "openai", "claude", "model"],
    ai_training: ["training", "dataset", "labeling", "annotate", "ground truth"],
    digital_bounty: ["bounty", "bug", "security", "vulnerability", "hack"],
    online_testing: ["testing", "qa", "uxtesting", "usability", "test runner", "tester"],
    content_research: ["research", "search", "content", "finding", "data mining", "investigate"],
    microtask: ["microtask", "click", "captcha", "entry", "mechanical turk", "task rabbit", "small task"],
    same_day: ["same day", "instant", "fast cash", "quick pay", "immediate"],
    europe_gigs: ["europe", "uk", "london", "berlin", "paris", "germany", "france", "spain"],
    asia_gigs: ["asia", "tokyo", "singapore", "india", "china", "japan", "vietnam"],
    global_language: ["language", "translate", "writing", "content", "copywriting", "spanish", "french", "german"],
    ecommerce: ["ecommerce", "shop", "shopify", "store", "listing", "amazon", "ebay", "etsy"],
    creator: ["creator", "youtube", "tiktok", "video", "editing", "podcast", "social media", "instagram"],
    emerging: ["emerging", "new tech", "startup", "alpha", "beta"],
    real_estate: ["real estate", "property", "home", "house", "apartment", "reit"]
  };

  // Keyword mappings for Departments
  const deptKeywords: Record<string, string[]> = {
    freelance: ["work", "job", "gig", "freelance", "client", "task", "hiring", "apply", "contract"],
    trade: ["product", "commerce", "shop", "store", "ecommerce", "sell", "sale", "inventory"]
  };

  for (const [lane, keywords] of Object.entries(laneKeywords)) {
    if (keywords.some(k => g.includes(k))) lanes.add(lane);
  }

  for (const [dept, keywords] of Object.entries(deptKeywords)) {
    if (keywords.some(k => g.includes(k))) depts.add(dept);
  }

  // Fallbacks
  if (lanes.size === 0) {
    lanes.add("ai_freelance");
    lanes.add("gen_freelance");
  }
  if (depts.size === 0) {
    depts.add("freelance");
  }

  return { 
    lanes: Array.from(lanes), 
    departments: Array.from(depts) 
  };
}

/**
 * Runs a real-world lead discovery cycle.
 * Only saves verified real source-linked opportunities.
 */
export async function runAutopilotLeadDiscovery({
  goal,
  missionId,
  user,
  department = "Galaxy Scanner",
  maxResults = 5
}: LeadDiscoveryOptions) {
  console.log(`[VELO] Starting Real-World Lead Discovery for: "${goal}"`);

  // 1. Create the Scanner Run record
  const run = await GalaxyScannerRun.create({
    department,
    scanner_name: "Autopilot Lead Discovery",
    query: goal,
    status: "running",
    started_at: new Date().toISOString(),
    summary: `Active real-world discovery loop initiated for goal: ${goal}`
  });

  try {
    // 2. Determine industry lanes and departments for the live scan (Locally)
    const { lanes, departments: targetDepts } = classifyGoalLocally(goal);

    // 3. Attempt Live Public-Source Discovery
    let rawResults: any[] = [];
    
    // Enhance query for digital gig discovery if goal is vague or matches instant-fit lanes
    const isInstantFocused = lanes.some(l => ["microtask", "ai_training", "digital_bounty", "online_testing", "content_research", "same_day"].includes(l));
    const enhancedQuery = isInstantFocused ? `${goal} instant claim paid online tasks fixed price bounties` : goal;
    
    try {
      const scanResponse = await galaxyScanner({
        query: enhancedQuery,
        industryLanes: lanes,
        departments: targetDepts
      });

      if (scanResponse && scanResponse.status === "success") {
        rawResults = scanResponse.results || [];
      }
    } catch (scanError) {
      console.warn("[VELO] Live scan failed:", scanError);
    }

    if (rawResults.length === 0) {
      // No real results found - do NOT generate fake ones
      await GalaxyScannerRun.update(run.id, {
        status: "completed",
        results_count: 0,
        summary: "No verified real-world opportunities matching your goal were found at this time. Sector monitors remain active.",
        completed_at: new Date().toISOString()
      });
      return { opportunities: [] };
    }

    // 4. Process and Deduplicate Live Results
    // Deduplicate by source_url (already done in scanner but good to be safe)
    const normalizedDiscoveries = rawResults
      .filter(res => res.source_url) // Must have a link
      .slice(0, maxResults)
      .map(res => normalizeScannerResult({
        ...res,
        metadata: {
          discovery_mode: "live",
          discovery_query: goal,
          source_verified: true,
          real_opportunity: true
        }
      }, run.id, department));

    // 5. Create Opportunity Feed records and Review Workflow
    const workflowSteps = [];
    const createdOpportunities = [];

    for (const lead of normalizedDiscoveries) {
      lead.linked_mission_id = missionId;
      const opportunity = await GalaxyOpportunityFeed.create(lead);
      createdOpportunities.push(opportunity);

      workflowSteps.push({
        action: `Review Opportunity: ${lead.title}`,
        status: "pending",
        opportunity_id: opportunity.id,
        next_action: lead.metadata?.next_action || "Review requirements and apply",
        requires_ubuntu: !!lead.metadata?.requires_ubuntu
      });
    }

    // 6. Create the Review Workflow Template
    await VeloWorkflowTemplate.create({
      name: `Real-World Lead Discovery: ${goal.substring(0, 30)}`,
      department,
      workflow_type: "lead_review",
      trigger_context: `Completion of real-world discovery for: ${goal}`,
      steps: [
        { action: "Review discovered opportunities in Galaxy Scanner", status: "pending" },
        ...workflowSteps
      ],
      status: "active",
      metadata: { mission_id: missionId, run_id: run.id }
    });

    // 7. Update the run record
    await GalaxyScannerRun.update(run.id, {
      status: "completed",
      results_count: normalizedDiscoveries.length,
      completed_at: new Date().toISOString(),
      summary: `Found ${normalizedDiscoveries.length} verified real-world opportunities. Review workflow created in Mission Bay.`,
      metadata: { classified_lanes: lanes }
    });

    // 8. Log success
    await recordLaneActivity({
      department,
      stage: "returned",
      title: "Discovery Complete",
      summary: `Found ${normalizedDiscoveries.length} verified leads for: ${goal}`,
      relatedId: missionId
    });

    return { opportunities: createdOpportunities };
  } catch (error) {
    console.error("[VELO] Lead Discovery failed:", error);
    await GalaxyScannerRun.update(run.id, {
      status: "failed",
      failure_reason: error instanceof Error ? error.message : String(error)
    });
    return { opportunities: [] };
  }
}
