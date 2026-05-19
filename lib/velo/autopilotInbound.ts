import {
  GalaxyOpportunityFeed,
  AutopilotMission,
  AutopilotActionLog,
  GalaxyScannerRun,
  GalaxyScannerSource,
  VeloWorkflowTemplate,
  AutopilotProfile,
  User,
  AutopilotPermission
} from "@/entities";
import { 
  runAutopilotLeadDiscovery,
  LeadDiscoveryOptions
} from "./autopilotLeadDiscovery";
import { buildOpportunityGoalContext, detectOpportunityGoalLane, normalizeLaneId } from "./opportunitySourceIntelligence";
import { stageMissionFromOpportunity } from "./opportunityMissionBridge";
import { createSafeActionLog } from "./scannerNormalization";
import { recordLaneActivity } from "./autopilotLaneActivity";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InboundOpportunity {
  id: string;
  title: string;
  summary: string;
  department: string;
  confidence_score: number;
  risk_level: string;
  payout_text: string;
  source_name: string;
  routed: boolean; // already has a mission?
  mission_id?: string;
}

export interface InboundCycleResult {
  scanned: boolean;
  opportunitiesFound: number;
  highQualityCount: number; // confidence >= 70
  routedCount: number; // auto-created missions
  newOpportunities: InboundOpportunity[];
  error?: string;
}

// ─── Intent Detection ──────────────────────────────────────────────────────────

const INBOUND_KEYWORDS = [
  "check for opportunities", "any new opportunities", "what did you find",
  "scan for", "look for work", "find income", "discover opportunities",
  "autopilot scan", "run a scan", "inbound scan", "passive income scan",
  "what's available", "what is available", "new leads", "any leads",
  "check scanner", "run scanner", "search for gigs", "search for jobs",
  "find gigs", "find jobs", "opportunity scan", "income scan"
];

const INBOUND_PATTERNS = INBOUND_KEYWORDS.map(kw => ({
  pattern: new RegExp(kw.replace(/\s+/g, "\\s+"), "i"),
  keyword: kw
}));

export function detectInboundIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return INBOUND_PATTERNS.some(({ pattern }) => pattern.test(lower));
}

// ─── Core: Run Inbound Cycle ───────────────────────────────────────────────────

export async function runInboundCycle(
  email?: string, 
  options?: { maxResults?: number; department?: string }
): Promise<InboundCycleResult> {
  const me = await User.me().catch(() => null);
  const ownerEmail = email || me?.email;
  const ownerUserId = me?.id;
  
  if (!ownerEmail || !ownerUserId) {
    return { scanned: false, opportunitiesFound: 0, highQualityCount: 0, routedCount: 0, newOpportunities: [], error: "No user found" };
  }

  try {
    // 1. Get the user's profile for lane/department context
    const profile = await AutopilotProfile.query()
      .where("owner_email", ownerEmail)
      .exec()
      .catch(() => []);
    const userProfile = profile?.[0];

    if (!profile || profile.length === 0) {
      return { scanned: false, opportunitiesFound: 0, highQualityCount: 0, routedCount: 0, newOpportunities: [], error: "No profile found — complete your profile first." };
    }

    // 2. Check if autopilot is enabled
    if (!userProfile.autopilot_enabled) {
      return { scanned: false, opportunitiesFound: 0, highQualityCount: 0, routedCount: 0, newOpportunities: [], error: "Autopilot is not enabled. Say 'autopilot on' to activate." };
    }

    // 3. Get active scanner sources
    const sources = await GalaxyScannerSource.query()
      .where("status", "active")
      .exec()
      .catch(() => []);

    if (sources.length === 0) {
      return { scanned: false, opportunitiesFound: 0, highQualityCount: 0, routedCount: 0, newOpportunities: [], error: "No active scanner sources configured. Set up scanner sources first." };
    }

    // 4. Read profile preferences for targeting
    let onboardingMeta: any = {};
    try {
      onboardingMeta = typeof userProfile.onboarding_metadata === 'string'
        ? JSON.parse(userProfile.onboarding_metadata)
        : (userProfile.onboarding_metadata || {});
    } catch (e) { onboardingMeta = {}; }

    const sectors = onboardingMeta.incomeSectors || onboardingMeta.selectedDepts || onboardingMeta.sectors || [];
    const skills = Array.isArray(userProfile.skills) ? userProfile.skills : [];

    // 5. Run lead discovery across departments
    const targetDepts = options?.department 
      ? [options.department]
      : (sectors.length > 0 ? sectors : ["Galaxy Scanner", "Freelance Station", "Commerce Hub"]);

    let allOpportunities: InboundOpportunity[] = [];
    let rawOpps: any[] = [];
    
    for (const dept of targetDepts) {
      const discoveryResult = await runAutopilotLeadDiscovery({
        goal: `Find high-quality income opportunities for ${userProfile.public_name || 'user'} with skills in ${skills.join(', ')}`,
        missionId: `inbound-${Date.now()}-${dept}`,
        user: {
          id: ownerUserId,
          email: ownerEmail,
          profile: userProfile,
          skills,
          sectors,
          onboarding_metadata: onboardingMeta,
          autopilot_profile: userProfile
        },
        department: dept,
        maxResults: options?.maxResults || 15
      }) as any;

      if (discoveryResult?.opportunities && discoveryResult.opportunities.length > 0) {
        for (const opp of discoveryResult.opportunities) {
          if (!opp || !opp.id) continue;
          rawOpps.push(opp);
          allOpportunities.push({
            id: opp.id,
            title: opp.title || 'Untitled Opportunity',
            summary: opp.summary || '',
            department: opp.department || dept,
            confidence_score: Math.round((opp.confidence_score || 0) * 100),
            risk_level: opp.risk_level || 'low',
            payout_text: opp.payout_text || '',
            source_name: opp.source_name || 'Galaxy Scanner',
            routed: false
          });
        }
      }
    }

    // 6. Sort by confidence
    allOpportunities.sort((a, b) => b.confidence_score - a.confidence_score);

    // 7. Auto-route high quality opportunities to missions
    const HIGH_QUALITY_THRESHOLD = 70;
    const highQuality = allOpportunities.filter(o => o.confidence_score >= HIGH_QUALITY_THRESHOLD);
    let routedCount = 0;

    for (const opp of highQuality.slice(0, 5)) { // Max 5 auto-routed per cycle
      try {
        // Check if already has a mission
        const existingMission = await AutopilotMission.query()
          .where("trigger_source_id", opp.id)
          .exec()
          .catch(() => []);

        if (existingMission && existingMission.length > 0) {
          opp.routed = true;
          opp.mission_id = existingMission[0].id;
          routedCount++;
          continue;
        }

        // Create a mission from this opportunity using the bridge
        const rawOpp = rawOpps.find(r => r.id === opp.id);
        if (rawOpp) {
          const mission = await stageMissionFromOpportunity(rawOpp);
          if (mission?.id) {
            opp.routed = true;
            opp.mission_id = mission.id;
            routedCount++;
          }
        }
      } catch (err) {
        console.error(`[InboundAutopilot] Failed to route opportunity ${opp.id}:`, err);
      }
    }

    // 8. Log the cycle
    await createSafeActionLog({
      department: "Autopilot",
      action_type: "inbound_cycle",
      status: "completed",
      summary: `Inbound cycle complete: ${allOpportunities.length} found, ${routedCount} routed to missions.`,
      details: JSON.stringify({
        total_found: allOpportunities.length,
        high_quality: highQuality.length,
        routed: routedCount
      })
    }, ownerEmail);

    // 9. Record lane activity
    await recordLaneActivity({
      department: "Autopilot",
      stage: "returned",
      title: "Inbound Cycle Complete",
      summary: `Found ${allOpportunities.length} opportunities, routed ${routedCount} to missions`,
      riskLevel: "low"
    });

    return {
      scanned: true,
      opportunitiesFound: allOpportunities.length,
      highQualityCount: highQuality.length,
      routedCount,
      newOpportunities: allOpportunities.slice(0, 15)
    };
  } catch (error: any) {
    console.error("[InboundAutopilot] Cycle error:", error);
    return {
      scanned: false,
      opportunitiesFound: 0,
      highQualityCount: 0,
      routedCount: 0,
      newOpportunities: [],
      error: error?.message || "Failed to run inbound cycle"
    };
  }
}

// ─── Get Pending Inbound Opportunities ─────────────────────────────────────────

export async function getPendingInboundOpportunities(email?: string): Promise<InboundOpportunity[]> {
  const me = await User.me().catch(() => null);
  const ownerEmail = email || me?.email;

  if (!ownerEmail) return [];

  try {
    // Find opportunities that were created by inbound cycles and are still pending review
    const opportunities = await GalaxyOpportunityFeed.query()
      .where("routing_status", "needs_review")
      .exec()
      .catch(() => []);

    const mapped: InboundOpportunity[] = (opportunities || []).slice(0, 10).map((opp: any) => ({
      id: opp.id,
      title: opp.edited_title || opp.title || 'Untitled',
      summary: opp.edited_summary || opp.summary || '',
      department: opp.department || 'Unknown',
      confidence_score: Math.round((opp.confidence_score || 0) * 100),
      risk_level: opp.risk_level || 'low',
      payout_text: opp.payout_text || '',
      source_name: opp.source_name || 'Galaxy Scanner',
      routed: opp.routing_status === 'mission_staged',
      mission_id: opp.metadata?.staged_mission_id
    }));

    return mapped.sort((a, b) => b.confidence_score - a.confidence_score);
  } catch {
    return [];
  }
}

// ─── Proactive Greeting Builder ────────────────────────────────────────────────

export async function buildProactiveGreeting(email?: string): Promise<string | null> {
  const me = await User.me().catch(() => null);
  const ownerEmail = email || me?.email;
  if (!ownerEmail) return null;

  try {
    const profile = await AutopilotProfile.query()
      .where("owner_email", ownerEmail)
      .exec()
      .catch(() => []);
    const userProfile = profile?.[0];

    if (!userProfile?.autopilot_enabled) return null;

    // Check for pending review opportunities
    const pending = await getPendingInboundOpportunities(ownerEmail);

    if (pending.length > 0) {
      const highConfidence = pending.filter(o => o.confidence_score >= 70);
      const top = pending[0];

      if (highConfidence.length > 0) {
        return `🔍 **Autopilot has found ${highConfidence.length} high-quality opportunity${highConfidence.length > 1 ? 's' : ''}** while you were away.\n\nTop pick: **${top.title}** — ${top.payout_text ? `pays ${top.payout_text} | ` : ''}${top.confidence_score}% match.\n\nJust say "**review my opportunities**" to go through them, or "**autopilot scan**" to look for more.`;
      } else if (pending.length > 0) {
        return `📡 I found ${pending.length} new opportunit${pending.length > 1 ? 'ies' : 'y'} for you. The top match is **${top.title}** (${top.confidence_score}% match).\n\nSay "**review opportunities**" to check them out.`;
      }
    }

    // Check when the last inbound cycle ran
    const lastCycle = await AutopilotActionLog.query()
      .where("department", "Autopilot")
      .where("action_type", "LANE_RETURNED")
      .sort("-created_at")
      .exec()
      .catch(() => []);

    if (!lastCycle || lastCycle.length === 0) {
      return `🔄 **Your Autopilot is active but hasn't run an inbound scan yet.**\n\nSay "**autopilot scan**" or "**check for opportunities**" and I'll search across your configured sources for income opportunities.`;
    }

    const lastCycleTime = new Date(lastCycle[0].created_at);
    const hoursSinceLast = (Date.now() - lastCycleTime.getTime()) / 3600000;

    if (hoursSinceLast > 12) {
      return `⏰ It's been ${Math.round(hoursSinceLast)} hours since your last opportunity scan.\n\nSay "**autopilot scan**" to run a fresh search — new opportunities may be available.`;
    }

    return null; // Nothing notable to report
  } catch {
    return null;
  }
}

// ─── Main Chat Handler ─────────────────────────────────────────────────────────

export async function handleInboundCommand(
  text: string,
  userEmail: string,
  user?: any
): Promise<{ type: string; message: string }> {
  const lower = text.toLowerCase();

  try {
    // Check if this is a scan request
    const isScanRequest = 
      lower.includes("scan") || 
      lower.includes("check for") || 
      lower.includes("find") || 
      lower.includes("look for") ||
      lower.includes("discover") ||
      lower.includes("search");

    if (isScanRequest) {
      // Run the inbound cycle
      const result = await runInboundCycle(userEmail);

      if (result.error) {
        return {
          type: "inbound_error",
          message: `⚠️ ${result.error}`
        };
      }

      if (result.opportunitiesFound === 0) {
        return {
          type: "inbound_empty",
          message: `🔍 **Scan Complete** — No new opportunities found this cycle.\n\nThis can happen when your sources are quiet. Try:\n- Adding more scanner sources\n- Broadening your search criteria\n- Checking back later — new opportunities appear daily`
        };
      }

      // Build results message
      let msg = `## 🔍 Inbound Scan Complete\n\n`;
      msg += `📊 **${result.opportunitiesFound}** opportunities found | **${result.highQualityCount}** high-quality (≥70%) | **${result.routedCount}** auto-routed to missions\n\n`;

      const top5 = result.newOpportunities.slice(0, 5);
      msg += `### Top Opportunities\n\n`;
      msg += `| # | Title | Match | Risk | Payout |\n`;
      msg += `|---|-------|-------|------|--------|\n`;

      for (let i = 0; i < top5.length; i++) {
        const opp = top5[i];
        const title = (opp.title || 'Untitled').length > 40 
          ? opp.title.substring(0, 37) + '...' 
          : opp.title;
        const payout = opp.payout_text || '—';
        const routed = opp.routed ? ' ✅' : '';
        msg += `| ${i + 1} | ${title}${routed} | ${opp.confidence_score}% | ${opp.risk_level} | ${payout} |\n`;
      }

      if (result.newOpportunities.length > 5) {
        msg += `\n*...and ${result.newOpportunities.length - 5} more. Review all in the Review Center.*\n`;
      }

      msg += `\nHigh-quality matches (≥70%) have been auto-routed to missions. Say "**review my missions**" to see them.`;

      return { type: "inbound_scan", message: msg };
    }

    // Check if reviewing opportunities
    if (lower.includes("review") && (lower.includes("opportunit") || lower.includes("findings"))) {
      const pending = await getPendingInboundOpportunities(userEmail);

      if (pending.length === 0) {
        return {
          type: "inbound_review_empty",
          message: "📋 **No pending opportunities to review.**\n\nAll inbound opportunities have been processed. Say \"**autopilot scan**\" to find new ones."
        };
      }

      let msg = `## 📋 Pending Opportunities for Review\n\n`;
      msg += `| # | Title | Match | Risk | Status |\n`;
      msg += `|---|-------|-------|------|--------|\n`;

      for (let i = 0; i < pending.length; i++) {
        const opp = pending[i];
        const title = (opp.title || 'Untitled').length > 35 
          ? opp.title.substring(0, 32) + '...' 
          : opp.title;
        const status = opp.routed ? 'Routed' : 'Pending';
        msg += `| ${i + 1} | ${title} | ${opp.confidence_score}% | ${opp.risk_level} | ${status} |\n`;
      }

      msg += `\nOpen the **Review Center** to approve, reject, or adjust these opportunities.`;

      return { type: "inbound_review", message: msg };
    }

    // Default: show status
    const pending = await getPendingInboundOpportunities(userEmail);
    const lastCycle = await AutopilotActionLog.query()
      .where("department", "Autopilot")
      .where("action_type", "LANE_RETURNED")
      .sort("-created_at")
      .exec()
      .catch(() => []);

    let msg = `## 📡 Inbound Autopilot Status\n\n`;

    if (lastCycle && lastCycle.length > 0) {
      const lastTime = new Date(lastCycle[0].created_at);
      const hoursAgo = Math.round((Date.now() - lastTime.getTime()) / 3600000);
      msg += `**Last scan**: ${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago\n`;
      msg += `**Last result**: ${lastCycle[0].summary || 'Completed'}\n`;
    } else {
      msg += `**Last scan**: Never run\n`;
    }

    msg += `\n**Pending review**: ${pending.length} opportunit${pending.length !== 1 ? 'ies' : 'y'}\n`;
    msg += `\nSay "**autopilot scan**" to run a new scan, or "**review opportunities**" to inspect pending items.`;

    return { type: "inbound_status", message: msg };
  } catch (error: any) {
    console.error("[InboundAutopilot] Command error:", error);
    return {
      type: "inbound_error",
      message: "I ran into an issue with the inbound scan. Try again or check your scanner sources are configured."
    };
  }
}
