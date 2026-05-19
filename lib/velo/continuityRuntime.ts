


















import { invokeLLM } from "@/integrations/core";
import { 
  AutopilotFallbackEvent, 
  AutopilotActionLog,
  VeloBridgeDevice,
  User
} from "@/entities";

export type ContinuityMode = "free_first" | "performance" | "hybrid" | "cost_optimized" | "manual_only";

/**
 * Determines if a task requires high-performance cloud AI for quality results.
 */
export function isTaskComplex(request: ContinuityTaskRequest): boolean {
  const workflow = request.workflow_name.toLowerCase();
  const prompt = request.prompt.toLowerCase();
  
  // High complexity markers
  const keywords = [
    "resume", "proposal", "strategy", "reasoning", "analysis", "plan", 
    "executive summary", "narrative", "critique", "optimize", "synthesis",
    "outreach", "follow-up", "followup", "client message", "intro"
  ];
  
  if (keywords.some(k => workflow.includes(k) || prompt.includes(k))) return true;
  if (request.response_json_schema) return true;
  if (prompt.length > 1000) return true;
  
  return false;
}


// ─────────────────────────────────────────────────────────────────────────────
// Cloud Degradation Management
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY_CLOUD_FAILURES = "velo_runtime_cloud_failures";
const CLOUD_FAILURE_THRESHOLD = 3;

/**
 * Detects if an error message likely indicates credit exhaustion or rate limiting.
 */
export function detectCloudExhaustion(error: string): boolean {
  const lower = error.toLowerCase();
  const markers = ["quota", "credits", "exhausted", "rate limit", "429", "402", "503", "insufficient"];
  return markers.some(m => lower.includes(m));
}

/**
 * Gets the current count of consecutive cloud failures.
 */
export function getCloudFailureCount(): number {
  return parseInt(localStorage.getItem(LS_KEY_CLOUD_FAILURES) || "0", 10);
}

/**
 * Increments the cloud failure counter.
 */
export function incrementCloudFailureCount() {
  const count = getCloudFailureCount() + 1;
  localStorage.setItem(LS_KEY_CLOUD_FAILURES, count.toString());
}

/**
 * Resets the cloud failure counter on success.
 */
export function resetCloudFailureCount() {
  localStorage.setItem(LS_KEY_CLOUD_FAILURES, "0");
}

/**
 * Checks if the cloud tier should be considered degraded.
 */
export function isCloudDegraded(): boolean {
  return getCloudFailureCount() >= CLOUD_FAILURE_THRESHOLD;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ContinuityTaskRequest {
  prompt: string;
  department: string;
  workflow_name: string;
  response_json_schema?: any;
  related_record_id?: string;
  system_prompt?: string;
  is_readiness_test?: boolean;
}

export type RuntimeTier = "local_embedded" | "public_source_engine" | "free_api_cloud" | "template_playbook";

export interface RuntimeTierStatus {
  tier: RuntimeTier;
  label: string;
  available: boolean;
  active: boolean;
  detail: string;
  priority: "Primary" | "Secondary" | "Tertiary" | "Fallback";
}

export interface ContinuityRuntimeState {
  activeTier: RuntimeTier;
  tiers: RuntimeTierStatus[];
  mode: ContinuityMode;
  lastChecked: string;
  recommendations: string[];
}

/**
 * Connector health check probes - moved to runtime to avoid circular dependency
 */
export async function probeRuntimeLocalConnector(type: 'ollama' | 'lm_studio' | 'local_ai'): Promise<{ connected: boolean; models: string[]; error?: string }> {
  let url = '';
  if (type === 'ollama') url = 'http://localhost:11434/api/tags';
  else if (type === 'lm_studio') url = 'http://localhost:1234/v1/models';
  else if (type === 'local_ai') url = 'http://localhost:8080/v1/models';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal,
      mode: 'cors' 
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const models = type === 'ollama' 
        ? (data.models || []).map((m: any) => m.name)
        : (data.data || []).map((m: any) => m.id);
      return { connected: true, models };
    }
    return { connected: false, models: [], error: `The local helper is open, but it needs attention before VELO can use it. Make sure ${type === 'ollama' ? 'Ollama' : 'the service'} is configured to allow connections.` };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { connected: false, models: [], error: "The connection timed out. Try opening the local app again." };
    }
    // Likely a CORS or Network error (connection refused)
    const name = type === 'ollama' ? 'Ollama' : (type === 'lm_studio' ? 'LM Studio' : 'LocalAI');
    let error = `Could not find ${name} running on this computer.`;
    if (type === 'ollama') {
      error += " Make sure Ollama is running and OLLAMA_ORIGINS is set to allow connections (set OLLAMA_ORIGINS=*).";
    }
    return { connected: false, models: [], error };
  }
}

/**
 * Returns the current status of all runtime tiers.
 */
export async function getContinuityRuntimeState(mode: ContinuityMode): Promise<ContinuityRuntimeState> {
  // 1. Local/Embedded Free Model (Tier 1)
  const [ollama, lmStudio, localAi] = await Promise.all([
    probeRuntimeLocalConnector('ollama'),
    probeRuntimeLocalConnector('lm_studio'),
    probeRuntimeLocalConnector('local_ai')
  ]);
  
  // Also check if user has a verified bridge device with local AI capability
  let bridgeLocalAiAvailable = false;
  try {
    const me = await User.me().catch(() => null);
    if (me) {
      const bridgeDevices = await VeloBridgeDevice.query()
        .where("status", "verified")
        .where("owner_email", me.email)
        .exec()
        .catch(() => []);
      bridgeLocalAiAvailable = bridgeDevices.some((d: any) => 
        (d.capabilities || []).includes("local_ai") && d.heartbeat_status === "online"
      );
    }
  } catch (e) { /* ignore */ }

  const localAvailable = ollama.connected || lmStudio.connected || localAi.connected || bridgeLocalAiAvailable;

  // 2. Public-source / department engines (Tier 2)
  const engineAvailable = true; 

  // 3. Free API / Cloud AI (Tier 3)
  const cloudDegraded = isCloudDegraded();
  const cloudAvailable = mode !== "manual_only" && !cloudDegraded;

  // 4. Template Playbook (Tier 4)
  const templateAvailable = true;

  // Determine primary active tier based on mode
  let activeTier: RuntimeTier = "template_playbook";
  
  if (mode === "performance") {
    activeTier = cloudAvailable ? "free_api_cloud" : "template_playbook";
  } else if (mode === "hybrid") {
    activeTier = cloudAvailable ? "free_api_cloud" : (localAvailable ? "local_embedded" : "public_source_engine");
  } else if (mode === "cost_optimized") {
    // For cost optimized, we check if it's a test or simple status check to show Tier 1/2 as active
    activeTier = localAvailable ? "local_embedded" : "public_source_engine";
  } else if (mode === "free_first") {
    if (localAvailable) activeTier = "local_embedded";
    else activeTier = "public_source_engine";
  } else {
    activeTier = "template_playbook";
  }

  const tiers: RuntimeTierStatus[] = [
    {
      tier: "local_embedded",
      label: "Tier 1: Local/Embedded Free Model",
      available: localAvailable,
      active: activeTier === "local_embedded",
      detail: localAvailable ? (bridgeLocalAiAvailable ? "Connected via Bridge · Full Privacy · Zero Cost" : "Connected · Full Privacy · Zero Cost") : "No private helper connected yet. Link your computer to use local AI.",
      priority: "Primary"
    },
    {
      tier: "public_source_engine",
      label: "Tier 2: Open-Source Public Engine",
      available: engineAvailable,
      active: activeTier === "public_source_engine",
      detail: "Active · Deterministic Scanners · Signal Processing",
      priority: "Secondary"
    },
    {
      tier: "free_api_cloud",
      label: "Tier 3: Free API / Cloud AI",
      available: mode !== "manual_only",
      active: activeTier === "free_api_cloud",
      detail: cloudDegraded ? "Degraded · Credit exhaustion or rate limit detected · Falling back" : (cloudAvailable ? "Online · Buildy Cloud Path · Tier 3 High-Performance AI" : "Service suspended or manual mode active"),
      priority: "Tertiary"
    },
    {
      tier: "template_playbook",
      label: "Tier 4: Offline Template Playbook",
      available: templateAvailable,
      active: activeTier === "template_playbook",
      detail: "Always Active · Deterministic Recovery · Playbook Logic",
      priority: "Fallback"
    }
  ];

  const recommendations = [];
  if (!localAvailable) recommendations.push("Connect Ollama, LM Studio, or LocalAI for private local reasoning.");
  if (cloudDegraded) recommendations.push("Cloud Tier is degraded. Check provider credits or wait for rate limit reset.");
  if (mode === "manual_only") recommendations.push("System in Manual Mode. Switch to Free-First for automation.");

  return {
    activeTier,
    tiers,
    mode,
    lastChecked: new Date().toISOString(),
    recommendations
  };
}

/**
 * Routes a task through the most appropriate runtime tier, cycling through fallbacks.
 */
export async function routeContinuityRuntimeTask(request: ContinuityTaskRequest, options: { mode: ContinuityMode }): Promise<any> {
  const state = await getContinuityRuntimeState(options.mode);
  const { mode } = state;
  const cloudDegraded = isCloudDegraded();
  const complex = isTaskComplex(request);
  const attemptedTiers = new Set<RuntimeTier>();

  // Internal runner to ensure each tier is only attempted once per task
  async function runTier(tier: RuntimeTier): Promise<any> {
    if (attemptedTiers.has(tier)) return null;
    attemptedTiers.add(tier);

    if (tier === "free_api_cloud") {
      if (cloudDegraded) return null;
      return attemptCloudTier(request);
    }
    if (tier === "local_embedded") {
      return attemptLocalTier(request);
    }
    if (tier === "public_source_engine") {
      return attemptPublicTier(request);
    }
    return null;
  }

  // 1. Performance Mode: Cloud First, then standard waterfall
  if (mode === "performance") {
    const cloudRes = await runTier("free_api_cloud");
    if (cloudRes) return cloudRes;
  }

  // 2. Hybrid Mode: Cloud First (if healthy), then Local/Public Waterfall
  if (mode === "hybrid") {
    if (!cloudDegraded) {
      const cloudRes = await runTier("free_api_cloud");
      if (cloudRes) return cloudRes;
    }
    // Continue to waterfall if cloud failed or is degraded
  }

  // 3. Cost Optimized: Local/Public for simple tasks, Cloud for complex (if healthy)
  if (mode === "cost_optimized") {
    if (!complex) {
      const localRes = await runTier("local_embedded");
      if (localRes) return localRes;
      const publicRes = await runTier("public_source_engine");
      if (publicRes) return publicRes;
    } else {
      const cloudRes = await runTier("free_api_cloud");
      if (cloudRes) return cloudRes;
    }
  }

  // 4. Default Waterfall (Free First or Fallback from above)
  // We cycle through remaining available tiers in order of "freeness"
  const localRes = await runTier("local_embedded");
  if (localRes) return localRes;
  
  const publicRes = await runTier("public_source_engine");
  if (publicRes) return publicRes;

  const cloudRes = await runTier("free_api_cloud");
  if (cloudRes) return cloudRes;

  // 5. Final Tier 4: Template Playbook Fallback (Always deterministic)
  const fallbackContent = generateTemplateFallback(request);
  return {
    content: fallbackContent,
    metadata: {
      runtime_tier: "template_playbook",
      is_fallback: true,
      fallback_reason: "Primary Tiers Exhausted or Manual/Degraded Mode"
    }
  };
}

async function attemptLocalTier(request: ContinuityTaskRequest): Promise<any> {
  // We no longer guard by localhost hostname because users running VELO on superdev.run 
  // can still access their local AI via 'localhost' fetch if they have OLLAMA_ORIGINS=* set.
  // The browser naturally routes 'localhost' to the user's machine, and CORS handles the rest.

  try {
    const [ollama, lmStudio, localAi] = await Promise.all([
      probeRuntimeLocalConnector('ollama'),
      probeRuntimeLocalConnector('lm_studio'),
      probeRuntimeLocalConnector('local_ai')
    ]);
    
    // Try Ollama first
    if (ollama.connected && ollama.models.length > 0) {
      const model = ollama.models.includes('llama3') ? 'llama3' : (ollama.models.includes('mistral') ? 'mistral' : ollama.models[0]);
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: `${request.system_prompt || ""}\n\n${request.prompt}`,
          stream: false,
          format: request.response_json_schema ? 'json' : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.response;
        if (request.response_json_schema) {
          try { content = typeof content === 'string' ? JSON.parse(content) : content; } catch (e) { /* keep as is */ }
        }
        return {
          content,
          metadata: { 
            runtime_tier: "local_embedded", 
            model: `ollama:${model}`, 
            is_fallback: false 
          }
        };
      }
    }

    // Try LM Studio
    if (lmStudio.connected && lmStudio.models.length > 0) {
      const model = lmStudio.models[0];
      
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: request.system_prompt || "You are a specialized VELO Autonomous Agent." },
            { role: "user", content: request.prompt }
          ],
          temperature: 0.7,
          response_format: request.response_json_schema ? { type: "json_object" } : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content;
        if (request.response_json_schema) {
          try { content = typeof content === 'string' ? JSON.parse(content) : content; } catch (e) { /* keep as is */ }
        }
        return {
          content,
          metadata: { 
            runtime_tier: "local_embedded", 
            model: `lm_studio:${model}`, 
            is_fallback: false 
          }
        };
      }
    }

    // Try LocalAI
    if (localAi.connected && localAi.models.length > 0) {
      const model = localAi.models[0];
      
      const response = await fetch('http://localhost:8080/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: request.system_prompt || "You are a specialized VELO Autonomous Agent." },
            { role: "user", content: request.prompt }
          ],
          temperature: 0.7,
          response_format: request.response_json_schema ? { type: "json_object" } : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content;
        if (request.response_json_schema) {
          try { content = typeof content === 'string' ? JSON.parse(content) : content; } catch (e) { /* keep as is */ }
        }
        return {
          content,
          metadata: { 
            runtime_tier: "local_embedded", 
            model: `local_ai:${model}`, 
            is_fallback: false 
          }
        };
      }
    }
  } catch (err) {
    // Silent fail for local, but log it as a fallback event if it was reachable but failed execution
    await logRuntimeFallback(request, "local_embedded", "public_source_engine", "Local Execution Failed", String(err));
  }
  return null;
}

async function attemptPublicTier(request: ContinuityTaskRequest): Promise<any> {
  const content = generateTemplateFallback(request);
  if (content && typeof content === 'object' && !request.prompt.toLowerCase().includes("reasoning")) {
    return {
      content,
      metadata: {
        runtime_tier: "public_source_engine",
        is_fallback: true
      }
    };
  }
  return null;
}

async function attemptCloudTier(request: ContinuityTaskRequest): Promise<any> {
  try {
    const response = await invokeLLM({
      prompt: request.prompt,
      system_prompt: request.system_prompt || "You are a specialized VELO Autonomous Agent.",
      response_json_schema: request.response_json_schema
    });
    
    resetCloudFailureCount();
    
    return { 
      content: response, 
      metadata: { 
        runtime_tier: "free_api_cloud", 
        is_fallback: false 
      } 
    };
  } catch (error) {
    const errStr = String(error);
    const isExhausted = detectCloudExhaustion(errStr);
    
    if (isExhausted) {
      incrementCloudFailureCount();
    }
    
    await logRuntimeFallback(
      request, 
      "free_api_cloud", 
      "template_playbook", 
      isExhausted ? "Credit Exhausted / Rate Limit" : "Tier 3 Unavailable", 
      errStr
    );
    return null;
  }
}


/**
 * Generates a deterministic template fallback for common tasks.
 */
export function generateTemplateFallback(request: ContinuityTaskRequest): any {
  const workflow = request.workflow_name.toLowerCase();
  const prompt = request.prompt;
  
  if (workflow.includes("mission") || workflow.includes("plan")) {
    return {
      steps: [
        { title: "Deterministic Research", category: "opportunity_research", description: "Reviewing known signal sources for the target goal.", department: "Galaxy Scanner", risk_level: "low" },
        { title: "Standard Playbook", category: "workflow_creation", description: "Applying a pre-validated execution template.", department: "Command Officer", risk_level: "low" },
        { title: "Drafting Guidance", category: "content_generation_internal", description: "Preparing manual drafting instructions.", department: "Freelance Station", risk_level: "low" },
        { title: "Host Readiness Check", category: "platform_onboarding_external", description: "Verifying Ubuntu host connection for external steps.", department: "Docking Control", risk_level: "medium" }
      ]
    };
  }

  if (workflow.includes("profile")) {
    const fieldMatch = prompt.match(/Field to (improve|draft): ([^\n]+)/);
    const inputMatch = prompt.match(/Current Input: "([^"]+)"/);
    const personaMatch = prompt.match(/- Public Persona: ([^\n]+)/);
    const roleMatch = prompt.match(/- Active Role: ([^\n]+)/);

    const field = fieldMatch ? fieldMatch[2].trim() : "Profile Field";
    const mode = fieldMatch ? fieldMatch[1].trim() : "improve";
    const input = (inputMatch && inputMatch[1] !== "(Empty)") ? inputMatch[1].trim() : "";
    const persona = personaMatch ? personaMatch[1].trim() : "New Pilot";
    const role = roleMatch ? roleMatch[1].trim() : "Member";

    if (mode === "draft" || !input) {
      if (field.toLowerCase().includes("skills")) {
        return `Strategic Planning, Project Coordination, ${role} Operations, Analytical Thinking, Professional Communication.`;
      }
      if (field.toLowerCase().includes("tone") || field.toLowerCase().includes("preferences")) {
        return `Professional, articulate, and direct. Prioritizing efficiency, strategic alignment, and high-impact execution.`;
      }
      return `${persona} is a dedicated ${role} focused on operational excellence and strategic growth. Committed to delivering high-quality results and developing specialized expertise within their domain.`;
    } else {
      // Improve mode: Structure the existing input without inventing facts
      return `${input}\n\n(Optimized for professional clarity via VELO Playbook)`;
    }
  }

  if (workflow.includes("proposal") || workflow.includes("draft") || workflow.includes("resume") || workflow.includes("content")) {
    if (workflow.includes("resume")) {
      const nameMatch = prompt.match(/- Name: ([^\n]+)/);
      const roleMatch = prompt.match(/- Role\/Title: ([^\n]+)/);
      const skillsMatch = prompt.match(/- Skills: ([^\n]+)/);
      
      const name = nameMatch ? nameMatch[1].trim() : "Verified Professional";
      const role = roleMatch ? roleMatch[1].trim() : "Velo Pilot";
      const skills = skillsMatch ? skillsMatch[1].trim() : "Strategic Execution, Digital Operations";

      return `# PROFESSIONAL SUMMARY\n\n${name} is a results-driven ${role} specializing in ${skills.split(',')[0]}. Expert in operational efficiency and strategic digital identity management.\n\n## CORE COMPETENCIES\n\n* ${skills.split(',').join('\n* ')}\n\n## PROFESSIONAL NARRATIVE\n\nLeveraging the Velo Digital Identity Matrix to drive high-impact results and maintain a verified professional record in the digital economy.\n\n(This draft was generated via Playbook Engine due to AI provider unavailability.)`;
    }

    if (workflow.includes("proposal")) {
      const jobMatch = prompt.match(/Job Title: ([^\n]+)/);
      const clientMatch = prompt.match(/Client: ([^\n]+)/);
      const skillsMatch = prompt.match(/Key Skills: ([^\n]+)/);
      
      const job = jobMatch ? jobMatch[1].trim() : "Project Opportunity";
      const client = clientMatch ? clientMatch[1].trim() : "Valued Client";
      const skills = skillsMatch ? skillsMatch[1].trim() : "Strategic Execution";

      return `Dear ${client},\n\nI am writing to express my strong interest in the ${job} position. Based on my expertise in ${skills}, I am confident in my ability to deliver exceptional results for this project.\n\n### My Approach\n1. Initial Consultation & Goal Alignment\n2. Strategic Planning & Resource Allocation\n3. Iterative Execution & Quality Assurance\n4. Final Delivery & Review\n\nI look forward to discussing how we can achieve your goals.\n\nBest regards,\nVerified Velo Pilot\n\n(Deterministic draft generated via VELO Playbook)`;
    }

    if (workflow.includes("follow") || workflow.includes("message")) {
      const jobMatch = prompt.match(/Job Title: ([^\n]+)/);
      const clientMatch = prompt.match(/Client: ([^\n]+)/);
      
      const job = jobMatch ? jobMatch[1].trim() : "Position";
      const client = clientMatch ? clientMatch[1].trim() : "Recipient";

      return `Hi ${client},\n\nI hope you're having a productive week. I'm following up regarding my application for the ${job} role. I am still very interested and would welcome the opportunity to discuss the next steps.\n\nBest regards,\nVerified Velo Pilot\n\n(Deterministic message generated via VELO Playbook)`;
    }

    if (workflow.includes("asset") || workflow.includes("content")) {
      return {
        assets: [
          {
            asset_type: "professional_bio",
            title: "Standard Professional Bio",
            body: "Results-oriented professional focused on operational excellence and strategic digital execution. Committed to delivering high-quality outcomes within complex digital ecosystems.",
            tone: "Professional",
            quality_score: 75,
            strengths: ["Clear", "Direct", "Professional"],
            improvement_notes: "Deterministic fallback. Review and customize for specific platform nuances."
          },
          {
            asset_type: "proposal_template",
            title: "General Proposal Framework",
            body: "Introduction: Greeting and high-level value prop.\nApproach: Step-by-step breakdown of methodology.\nTimeline: Expected phases and milestones.\nConclusion: Call to action and signature.",
            tone: "Structured",
            quality_score: 70,
            strengths: ["Comprehensive", "Organized"],
            improvement_notes: "Deterministic fallback. Use as a scaffold for manual drafting."
          }
        ]
      };
    }

    return "VELO TEMPLATE: [Professional Outline]\n\n1. Executive Summary\n2. Scope of Work\n3. Strategic Alignment\n4. Timeline & Deliverables\n5. Next Steps\n\n(This draft was generated via Playbook Engine due to AI provider unavailability.)";
  }

  if (workflow.includes("lead") || workflow.includes("review")) {
    return {
      leads: [],
      summary: "Manual review required. The lead discovery loop has transitioned to deterministic scanning.",
      count: 0
    };
  }

  return "Deterministic fallback response generated via VELO Template Engine.";
}

/**
 * Logs a runtime fallback event.
 */
export async function logRuntimeFallback(
  request: ContinuityTaskRequest,
  primaryTier: RuntimeTier,
  fallbackTier: RuntimeTier,
  reason: string,
  details: string
) {
  try {
    await AutopilotFallbackEvent.create({
      department: request.department,
      workflow_name: request.workflow_name,
      primary_provider: primaryTier,
      fallback_provider: fallbackTier,
      trigger_reason: reason,
      severity: "medium",
      status: "occurred",
      details: `Runtime Fallback: ${details}`,
      related_record_id: request.related_record_id,
      occurred_at: new Date().toISOString()
    });

    await AutopilotActionLog.create({
      department: request.department,
      action_type: "RUNTIME_FALLBACK",
      status: "success",
      summary: `Runtime routed to ${fallbackTier}`,
      details: `Primary ${primaryTier} failed. Reason: ${reason}`
    });
  } catch (err) {
    console.error("Failed to log runtime fallback:", err);
  }
}
