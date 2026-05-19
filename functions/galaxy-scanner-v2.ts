/**
 * Galaxy Scanner Engine v2 - Multi-Source Opportunity Ingestion
 * Discover real-world tasks, gigs, and AI training opportunities.
 */

interface LaneConfig {
  dept: string;
  query: string;
  label: string;
  isInstant?: boolean;
}

const LANE_MAP: Record<string, LaneConfig> = {
  "ai_training": { dept: "freelance", query: "AI training data labeling RLHF evaluation alignment", label: "AI Training & Eval", isInstant: true },
  "online_testing": { dept: "freelance", query: "user testing qa feedback respondent participant", label: "Testing & QA", isInstant: true },
  "microtask": { dept: "freelance", query: "microtask gig work crowdsourcing task clicks data entry", label: "Microtasks", isInstant: true },
  "microtasks": { dept: "freelance", query: "microtask gig work crowdsourcing task clicks data entry", label: "Microtasks", isInstant: true },
  "ai_freelance": { dept: "freelance", query: "AI prompt engineering machine learning automation agent", label: "AI Freelance" },
  "content_research": { dept: "freelance", query: "content writer research deliverable technical analyst", label: "Research Work", isInstant: true },
  "global_language": { dept: "freelance", query: "translation language task multilingual interpreting gengo", label: "Language Tasks", isInstant: true },
  "gen_freelance": { dept: "freelance", query: "remote software design marketing support virtual assistant", label: "General Freelance" },
  "digital_bounty": { dept: "freelance", query: "bounty board crypto task gitcoin superteam", label: "Digital Bounties", isInstant: true },
  "same_day": { dept: "freelance", query: "same day pay quick task gig", label: "Same Day Tasks", isInstant: true },
  "europe_gigs": { dept: "freelance", query: "europe testing task germany france switzerland", label: "Europe Gigs", isInstant: true },
  "asia_gigs": { dept: "freelance", query: "asia microtask japan korea philippines india", label: "Asia Gigs", isInstant: true },
  "ai_creation": { dept: "freelance", query: "AI prompt engineering content generation writing assistant creative", label: "AI Creation", isInstant: true },
  "fast_payout_gig": { dept: "freelance", query: "quick payout fast payment same day task gig digital delivery", label: "Fast Payout", isInstant: true },
  "instant_claim": { dept: "freelance", query: "instant claim bounty board reward task verify submit", label: "Instant Claim", isInstant: true }
};

const INSTANT_KEYWORDS = ["bounty", "task", "microtask", "evaluation", "tester", "label", "annotate", "fixed price", "one-off", "quick task", "paid study", "study", "claim", "review", "qa", "bug bounty", "data task", "transcription", "survey", "research task", "content brief", "deliverable"];
const TRADITIONAL_KEYWORDS = [
  "salary", "hourly", "full-time", "part-time", "contract-to-hire", "annual pay", "monthly pay", "w2", "benefits", "recruiter", "employee", "onsite", "hybrid", "years of experience", "hiring manager", "interview", "application", "resume",
  // Physical presence / on-site work
  "on-site", "on site", "in person", "in-person", "physical location", "walk-in", "walk in",
  "driver", "delivery", "warehouse", "retail", "restaurant", "hospitality",
  "reception", "front desk", "security", "guard", "cleaning", "janitor",
  "maintenance", "repair", "installation", "construction", "labor",
  // Roles requiring human physical presence
  "personal assistant", "caregiver", "nanny", "babysitter", "tutor in person",
  "therapist", "counselor", "coach in person", "personal trainer",
  // Communication-heavy roles needing real-time human response
  "call center", "phone support", "phone calls", "inbound calls", "outbound calls",
  "live chat agent", "customer service representative", "virtual receptionist",
  // Consultant/coaching roles requiring real-time availability
  "business consultant", "management consultant", "strategy consultant",
  "career coach", "executive coach", "life coach",
  // Scheduling-dependent work
  "shift", "scheduling", "availability required", "specific hours",
  "must be available", "9 to 5", "9-5", "office hours"
];

function cleanDescription(html: string | undefined | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

function extractRequirements(text: string | undefined | null): string[] {
  const requirements: string[] = [];
  const lowerText = (text || "").toLowerCase();
  if (lowerText.includes("english")) requirements.push("English fluency");
  if (lowerText.includes("python") || lowerText.includes("javascript") || lowerText.includes("react") || lowerText.includes("typescript")) requirements.push("Technical skills");
  if (lowerText.includes("internet") || lowerText.includes("stable connection")) requirements.push("Stable internet");
  if (lowerText.includes("id verification") || lowerText.includes("passport") || lowerText.includes("kyc")) requirements.push("Identity verification");
  if (lowerText.includes("paypal") || lowerText.includes("bank account")) requirements.push("Payment account");
  return requirements.length > 0 ? requirements : ["Refer to original post"];
}

function getOpportunityType(laneId: string, cls: any): string {
  if (laneId.startsWith("ai_training")) return "ai_training";
  if (laneId.startsWith("online_testing")) return "online_testing";
  if (laneId.startsWith("microtask") || laneId.startsWith("same_day")) return "microtask";
  if (laneId.startsWith("ai_freelance")) return "ai_freelance";
  if (laneId.startsWith("content_research")) return "content_research";
  if (laneId.startsWith("global_language")) return "global_language";
  if (laneId.startsWith("digital_bounty")) return "digital_bounty";
  return "remote_freelance";
}

function computeConfidence(cls: any, hasPayout: boolean): number {
  let score = 0.75;
  if (cls.instant_claim_fit === "high") score += 0.1;
  if (cls.autopilot_compatibility === "high") score += 0.05;
  if (hasPayout) score += 0.05;
  if (cls.skill_level === "beginner") score += 0.02;
  return Math.min(0.95, Math.round(score * 100) / 100);
}

function computeRisk(cls: any, hasPayout: boolean): string {
  if (cls.identity_verification_required) return "medium";
  if (!hasPayout && cls.is_traditional_job) return "medium";
  return "low";
}

function classifyOpportunity(title: string, description: string, laneId: string) {
  const text = (title + " " + description).toLowerCase();
  const lane = LANE_MAP[laneId];
  const isInstantLane = lane?.isInstant;
  const isTraditional = TRADITIONAL_KEYWORDS.some(k => text.includes(k));
  const isInstant = INSTANT_KEYWORDS.some(k => text.includes(k)) || isInstantLane;
  
  let skillLevel = "intermediate";
  if (text.includes("senior") || text.includes("expert") || text.includes("lead")) skillLevel = "expert";
  if (text.includes("junior") || text.includes("entry") || text.includes("no experience")) skillLevel = "beginner";
  
  let difficulty = "medium";
  if (skillLevel === "expert" || text.includes("complex") || text.includes("advanced")) difficulty = "high";
  if (skillLevel === "beginner" || isInstant || text.includes("simple")) difficulty = "low";
  
  let estTime = "variable";
  if (isInstant) estTime = "1-4 hours";
  else if (isTraditional) estTime = "long-term";
  
  const requirements = extractRequirements(text);
  const identityReq = text.includes("verify") || text.includes("id check") || text.includes("passport") || text.includes("kyc");
  
  return {
    is_traditional_job: isTraditional && !isInstant,
    instant_claim_fit: isInstant ? "high" : "medium",
    autopilot_compatibility: isInstant ? "high" : "medium",
    skill_level: skillLevel,
    difficulty_level: difficulty,
    estimated_time: estTime,
    requirements: requirements.join(", "),
    identity_verification_required: identityReq,
    account_creation_required: true,
    steps: isInstant 
      ? "1. Visit original link, 2. Create account/login, 3. Complete verification (if needed), 4. Follow source instructions to claim and submit work."
      : "1. Review full details on source site, 2. Prepare professional application/resume, 3. Submit application via source link, 4. Track status on source platform."
  };
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    let body: any = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return new Response(JSON.stringify({ status: "error", error: "Invalid JSON payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    const { 
      industryLanes = [], 
      query = "active_opportunities",
      preferenceFilters = {},
      dryRun = false
    } = body;

    const activeLanes = Array.isArray(industryLanes) ? industryLanes : [];
    if (activeLanes.length === 0 && !body.departments && !query) {
      return new Response(JSON.stringify({ status: "success", results: [], summary: "No lanes selected." }));
    }

    if (dryRun) {
      return new Response(JSON.stringify({ status: "success", summary: "Dry run successful." }));
    }

    const prefs = preferenceFilters || {};
    const results: any[] = [];
    const sourceHealth: any[] = [];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const scanUnits = activeLanes.length > 0 
      ? activeLanes.map(id => ({ id, ...LANE_MAP[id] }))
      : [{ id: "general", query: query || "", label: "General Discovery", dept: "freelance" }];

    for (const unit of scanUnits) {
      const laneLabel = unit.label;
      const laneId = unit.id;
      
      // Remote OK
      try {
        const res = await fetch("https://remoteok.com/api", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const jobs = Array.isArray(data) ? data.slice(1, 15) : [];
          
          const processedJobs = jobs.map((j: any) => {
            const cls = classifyOpportunity(j.position, j.description || "", laneId);
            const cleanDesc = cleanDescription(j.description || "");
            const hasPayout = !!j.salary_min;
            const missing: string[] = [];
            const guidance: string[] = [];
            if (!hasPayout) missing.push("payout");
            if (!cleanDesc || cleanDesc.length < 40) missing.push("detailed description");
            guidance.push("Review original source before applying");
            if (cls.account_creation_required) guidance.push("Account creation may be required");
            if (cls.identity_verification_required) guidance.push("Identity verification may be required");
            const requirements = cls.requirements ? cls.requirements.split(", ") : [];
            const steps = cls.steps ? cls.steps.split(", ") : [];
            const opportunity_type = getOpportunityType(laneId, cls);
            const confidence = computeConfidence(cls, hasPayout);
            const risk = computeRisk(cls, hasPayout);
            return {
              title: j.position,
              summary: cleanDesc.substring(0, 400),
              source_name: "Remote OK",
              source_url: j.url,
              department: "freelance",
              industry_lane: laneLabel,
              payout_text: hasPayout ? `${j.salary_min}+` : "Payout not listed by source",
              payout_min: j.salary_min || null,
              payout_max: j.salary_max || null,
              ...cls,
              is_instant_claim: cls.instant_claim_fit === "high",
              ai_compatible: cls.autopilot_compatibility === "high" || cls.autopilot_compatibility === "medium",
              opportunity_type,
              confidence_score: confidence,
              risk_level: risk,
              deadline: cls.estimated_time === "1-4 hours" ? "Ongoing" : (cls.estimated_time === "long-term" ? "Long-term" : "Ongoing"),
              metadata: { 
                payout_verified: hasPayout, 
                source_verified: true,
                real_opportunity: true, 
                instant_claim: cls.instant_claim_fit === "high",
                ai_allowed: cls.autopilot_compatibility === "high" || cls.autopilot_compatibility === "medium",
                fast_payout: hasPayout && cls.instant_claim_fit === "high",
                payout_speed: cls.instant_claim_fit === "high" ? "fast" : "standard",
                description_full: cleanDesc,
                requirements_list: requirements.length > 0 ? requirements : ["Refer to original source"],
                steps_list: steps.length > 0 ? steps : ["Visit original source", "Follow platform instructions"],
                discovered_at: new Date().toISOString(),
                duplicate_key: `remoteok-${j.id || j.url}`,
                source_keywords: body.sourceKeywords || [],
                scanner_lanes: activeLanes,
                applied_preference_filters: prefs,
                ranking_reasons: [],
                missing_setup_guidance: guidance,
                missing_data: missing
              }
            };
          });

          // Filter out traditional/physical jobs at the source
          const digitalJobs = processedJobs.filter(op => !op.is_traditional_job);
          results.push(...digitalJobs);
          sourceHealth.push({ name: `Remote OK (${laneLabel})`, status: "ok" });
        }
      } catch (e: any) {
        sourceHealth.push({ name: `Remote OK (${laneLabel})`, status: "error", error: e.message });
      }

      // Remotive
      try {
        const q = unit.query || query;
        const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const jobs = (data.jobs || []).slice(0, 10);
          
          const processedJobs = jobs.map((j: any) => {
            const cls = classifyOpportunity(j.title, j.description || "", laneId);
            const cleanDesc = cleanDescription(j.description || "");
            const hasPayout = !!(j.salary && j.salary !== "");
            const missing: string[] = [];
            const guidance: string[] = [];
            if (!hasPayout) missing.push("payout");
            if (!cleanDesc || cleanDesc.length < 40) missing.push("detailed description");
            guidance.push("Review original source before applying");
            if (cls.account_creation_required) guidance.push("Account creation may be required");
            if (cls.identity_verification_required) guidance.push("Identity verification may be required");
            const requirements = cls.requirements ? cls.requirements.split(", ") : [];
            const steps = cls.steps ? cls.steps.split(", ") : [];
            const opportunity_type = getOpportunityType(laneId, cls);
            const confidence = computeConfidence(cls, hasPayout);
            const risk = computeRisk(cls, hasPayout);
            return {
              title: j.title,
              summary: cleanDesc.substring(0, 400),
              source_name: "Remotive",
              source_url: j.url,
              department: "freelance",
              industry_lane: laneLabel,
              payout_text: hasPayout ? j.salary : "Payout not listed by source",
              payout_min: j.salary_min || null,
              payout_max: j.salary_max || null,
              ...cls,
              is_instant_claim: cls.instant_claim_fit === "high",
              ai_compatible: cls.autopilot_compatibility === "high" || cls.autopilot_compatibility === "medium",
              opportunity_type,
              confidence_score: confidence,
              risk_level: risk,
              deadline: cls.estimated_time === "1-4 hours" ? "Ongoing" : (cls.estimated_time === "long-term" ? "Long-term" : "Ongoing"),
              metadata: { 
                payout_verified: hasPayout, 
                source_verified: true,
                real_opportunity: true, 
                instant_claim: cls.instant_claim_fit === "high",
                ai_allowed: cls.autopilot_compatibility === "high" || cls.autopilot_compatibility === "medium",
                fast_payout: hasPayout && cls.instant_claim_fit === "high",
                payout_speed: cls.instant_claim_fit === "high" ? "fast" : "standard",
                description_full: cleanDesc,
                requirements_list: requirements.length > 0 ? requirements : ["Refer to original source"],
                steps_list: steps.length > 0 ? steps : ["Visit original source", "Follow platform instructions"],
                discovered_at: new Date().toISOString(),
                duplicate_key: `remotive-${j.id || j.url}`,
                source_keywords: body.sourceKeywords || [],
                scanner_lanes: activeLanes,
                applied_preference_filters: prefs,
                ranking_reasons: [],
                missing_setup_guidance: guidance,
                missing_data: missing
              }
            };
          });

          // Filter out traditional/physical jobs at the source
          const digitalJobs = processedJobs.filter(op => !op.is_traditional_job);
          results.push(...digitalJobs);
          sourceHealth.push({ name: `Remotive (${laneLabel})`, status: "ok" });
        }
      } catch (e: any) {
        sourceHealth.push({ name: `Remotive (${laneLabel})`, status: "error", error: e.message });
      }
    }

    clearTimeout(timeoutId);

    // De-duplicate
    let filtered = results.filter((v, i, a) => v.source_url && a.findIndex(t => t.source_url === v.source_url) === i);

    if (prefs.verified_payout_only) filtered = filtered.filter(o => o.metadata.payout_verified);
    if (prefs.avoid_id_verification) filtered = filtered.filter(o => !o.identity_verification_required);
    if (prefs.low_risk_only) filtered = filtered.filter(o => o.risk_level !== "high");
    if (prefs.quick_tasks_only) filtered = filtered.filter(o => o.estimated_time === "1-4 hours");

    // Ranking
    filtered.sort((a, b) => {
      let sa = 0, sb = 0;
      if (a.metadata.payout_verified) sa += 10;
      if (b.metadata.payout_verified) sb += 10;
      if (a.estimated_time === "1-4 hours") sa += 8;
      if (b.estimated_time === "1-4 hours") sb += 8;
      if (!a.identity_verification_required && prefs.avoid_id_verification) sa += 6;
      if (!b.identity_verification_required && prefs.avoid_id_verification) sb += 6;
      return sb - sa;
    });

    // Add ranking reasons
    filtered = filtered.map(op => {
      const reasons: string[] = [];
      if (op.metadata?.payout_verified) reasons.push("Verified Payout");
      if (op.estimated_time === "1-4 hours") reasons.push("Quick Task");
      if (!op.identity_verification_required) reasons.push("Low ID Friction");
      return {
        ...op,
        metadata: {
          ...op.metadata,
          ranking_reasons: reasons,
          applied_preference_filters: prefs
        }
      };
    });

    return new Response(JSON.stringify({
      status: "success",
      results: filtered,
      sourceHealth,
      summary: `Found ${filtered.length} matching opportunities.`
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", error: err.message }), { status: 500 });
  }
});
