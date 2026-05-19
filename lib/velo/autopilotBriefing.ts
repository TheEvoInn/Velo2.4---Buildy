import {
  AutopilotMission,
  AutopilotActionLog,
  GalaxyOpportunityFeed,
  FreelanceEarning,
  VeloWalletTransaction,
  VeloProfitabilityInsight,
  AutopilotProfile,
  User
} from "@/entities";
import { getPendingInboundOpportunities } from "./autopilotInbound";
import { analyzeLearningLoop } from "./autopilotLearning";
import { createSafeActionLog } from "./scannerNormalization";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BriefingMission {
  id: string;
  title: string;
  department: string;
  status: string;
  risk_level: string;
  currentStep: string;
  created_at: string;
}

export interface BriefingSnapshot {
  timestamp: string;
  autopilotEnabled: boolean;
  // Inbound
  pendingOpportunities: number;
  highConfidenceOpportunities: number;
  topOpportunity: string | null;
  lastScanTime: string | null;
  // Active missions
  activeMissions: BriefingMission[];
  completedRecent: number;
  failedRecent: number;
  // Earnings
  recentEarnings: number; // last 7 days
  lifetimeEarnings: number;
  // Strategy
  topDepartment: string | null;
  topHourlyRate: number;
  winRate: number;
  topRecommendation: string;
  // Status
  needsSetup: string[]; // blockers like "no profile", "no sources"
}

// ─── Data Gatherers ────────────────────────────────────────────────────────────

async function getActiveMissions(): Promise<BriefingMission[]> {
  const missions = await AutopilotMission.query()
    .where("status", "in_progress")
    .sort("-created_at")
    .exec()
    .catch(() => []);

  return (missions || []).slice(0, 5).map((m: any) => ({
    id: m.id,
    title: m.title || "Untitled Mission",
    department: m.source_department || m.department || "General",
    status: m.status,
    risk_level: m.risk_level || "low",
    currentStep: m.current_step_index != null ? `Step ${m.current_step_index + 1}/${m.total_steps || '?'}` : "Staged",
    created_at: m.created_at
  }));
}

async function getRecentEarnings(email: string): Promise<{ recent: number; lifetime: number }> {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  if (!ownerEmail) return { recent: 0, lifetime: 0 };

  let lifetime = 0;
  let recent = 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Freelance earnings
  try {
    const freelanceEarnings = await FreelanceEarning.query()
      .where("owner_email", ownerEmail)
      .where("status", "paid")
      .exec()
      .catch(() => []);
    for (const e of freelanceEarnings || []) {
      const amt = Number(e.amount) || 0;
      lifetime += amt;
      if (e.paid_at && e.paid_at > sevenDaysAgo) recent += amt;
    }
  } catch {}

  // Wallet transactions
  try {
    const walletTxns = await VeloWalletTransaction.query()
      .where("owner_email", ownerEmail)
      .where("status", "cleared")
      .exec()
      .catch(() => []);
    for (const tx of walletTxns || []) {
      const amt = Number(tx.amount) || 0;
      lifetime += amt;
      if (tx.cleared_at && tx.cleared_at > sevenDaysAgo) recent += amt;
    }
  } catch {}

  // Also check profitability insights for a more accurate lifetime
  try {
    const insights = await VeloProfitabilityInsight.query()
      .where("owner_email", ownerEmail)
      .exec()
      .catch(() => []);
    if (insights && insights.length > 0) {
      const insightTotal = insights.reduce((sum: number, i: any) => sum + (Number(i.total_earned) || 0), 0);
      if (insightTotal > lifetime) lifetime = insightTotal;
    }
  } catch {}

  return { recent, lifetime };
}

async function getLastScanTime(): Promise<string | null> {
  const lastCycle = await AutopilotActionLog.query()
    .where("department", "Autopilot")
    .where("action_type", "inbound_cycle")
    .sort("-created_at")
    .exec()
    .catch(() => []);
  return lastCycle && lastCycle.length > 0 ? lastCycle[0].created_at : null;
}

function getTimeAgo(isoString: string | null): string {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.round(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

async function checkSetupStatus(email: string): Promise<string[]> {
  const needsSetup: string[] = [];
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  if (!ownerEmail) return needsSetup;

  // Check profile
  const profiles = await AutopilotProfile.query()
    .where("owner_email", ownerEmail)
    .exec()
    .catch(() => []);
  if (!profiles || profiles.length === 0) {
    needsSetup.push("Complete your profile");
  }

  // Check autopilot enabled
  if (profiles && profiles.length > 0 && !profiles[0].autopilot_enabled) {
    needsSetup.push("Autopilot is off — say 'autopilot on'");
  }

  return needsSetup;
}

// ─── Briefing Builder ──────────────────────────────────────────────────────────

export async function buildDailyBriefing(email?: string): Promise<BriefingSnapshot> {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  const timestamp = new Date().toISOString();

  if (!ownerEmail) {
    return {
      timestamp,
      autopilotEnabled: false,
      pendingOpportunities: 0,
      highConfidenceOpportunities: 0,
      topOpportunity: null,
      lastScanTime: null,
      activeMissions: [],
      completedRecent: 0,
      failedRecent: 0,
      recentEarnings: 0,
      lifetimeEarnings: 0,
      topDepartment: null,
      topHourlyRate: 0,
      winRate: 0,
      topRecommendation: "Sign in to get your briefing.",
      needsSetup: ["Sign in required"]
    };
  }

  try {
    // Run all data gathering in parallel
    const [
      pending,
      activeMissions,
      earnings,
      lastScan,
      setupIssues,
      completedRecent,
      failedRecent
    ] = await Promise.all([
      getPendingInboundOpportunities(ownerEmail),
      getActiveMissions(),
      getRecentEarnings(ownerEmail),
      getLastScanTime(),
      checkSetupStatus(ownerEmail),
      AutopilotMission.query()
        .where("status", "completed")
        .sort("-resolved_at")
        .exec()
        .catch(() => []),
      AutopilotMission.query()
        .where("status", "failed")
        .sort("-resolved_at")
        .exec()
        .catch(() => [])
    ]);

    // Count recent completions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const completedCount = (completedRecent || []).filter((m: any) => m.resolved_at && m.resolved_at > sevenDaysAgo).length;
    const failedCount = (failedRecent || []).filter((m: any) => m.resolved_at && m.resolved_at > sevenDaysAgo).length;

    // Learning insights for strategy
    let topDepartment: string | null = null;
    let topHourlyRate = 0;
    let winRate = 0;
    let topRecommendation = "";

    const totalMissions = (completedRecent || []).length + (failedRecent || []).length;
    if (totalMissions > 0) {
      // Quick learning analysis
      const learning = await analyzeLearningLoop(ownerEmail).catch(() => null);
      if (learning) {
        topDepartment = learning.departments.length > 0 ? learning.departments[0].department : null;
        topHourlyRate = learning.overall.overallHourlyRate;
        winRate = learning.overall.overallWinRate;
        topRecommendation = learning.topRecommendation || "Complete more missions for better insights.";
      }
    } else {
      topRecommendation = "Start your first mission. Say 'autopilot scan' to find opportunities.";
    }

    const highConfidence = pending.filter(o => o.confidence_score >= 70);

    // Log the briefing
    await createSafeActionLog({
      department: "Autopilot",
      action_type: "daily_briefing",
      status: "success",
      summary: `Briefing: ${pending.length} pending, ${activeMissions.length} active, ${earnings.recent.toFixed(2)} recent earnings`,
      details: JSON.stringify({
        pending: pending.length,
        highConfidence: highConfidence.length,
        active: activeMissions.length,
        recentEarnings: earnings.recent,
        setupIssues
      })
    });

    return {
      timestamp,
      autopilotEnabled: true,
      pendingOpportunities: pending.length,
      highConfidenceOpportunities: highConfidence.length,
      topOpportunity: pending.length > 0 ? pending[0].title : null,
      lastScanTime: lastScan,
      activeMissions,
      completedRecent: completedCount,
      failedRecent: failedCount,
      recentEarnings: earnings.recent,
      lifetimeEarnings: earnings.lifetime,
      topDepartment,
      topHourlyRate,
      winRate,
      topRecommendation,
      needsSetup: setupIssues
    };
  } catch (error: any) {
    console.error("[AutopilotBriefing] Failed:", error);
    return {
      timestamp,
      autopilotEnabled: false,
      pendingOpportunities: 0,
      highConfidenceOpportunities: 0,
      topOpportunity: null,
      lastScanTime: null,
      activeMissions: [],
      completedRecent: 0,
      failedRecent: 0,
      recentEarnings: 0,
      lifetimeEarnings: 0,
      topDepartment: null,
      topHourlyRate: 0,
      winRate: 0,
      topRecommendation: "Briefing unavailable — try again.",
      needsSetup: []
    };
  }
}

// ─── Formatting ────────────────────────────────────────────────────────────────

export function formatBriefing(snapshot: BriefingSnapshot): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  let msg = `## ⚡ Command Officer Briefing\n`;
  msg += `*${dateStr} — ${timeStr}*\n\n`;

  // ─── Setup issues ───
  if (snapshot.needsSetup.length > 0) {
    msg += `### ⚠️ Action Needed\n`;
    for (const issue of snapshot.needsSetup) {
      msg += `- ${issue}\n`;
    }
    msg += `\n`;
  }

  // ─── Active Missions ───
  if (snapshot.activeMissions.length > 0) {
    msg += `### 🎯 Active Missions\n\n`;
    msg += `| Mission | Department | Status | Risk | Progress |\n`;
    msg += `|---------|------------|--------|------|----------|\n`;
    for (const m of snapshot.activeMissions) {
      const title = (m.title || 'Untitled').length > 30 ? m.title.substring(0, 27) + '...' : m.title;
      const dept = m.department.length > 15 ? m.department.substring(0, 12) + '...' : m.department;
      msg += `| ${title} | ${dept} | ${m.status} | ${m.risk_level} | ${m.currentStep} |\n`;
    }
    msg += `\n`;
  }

  // ─── Inbound Opportunities ───
  if (snapshot.pendingOpportunities > 0) {
    msg += `### 📡 Inbound\n`;
    msg += `**${snapshot.pendingOpportunities}** pending opportunit${snapshot.pendingOpportunities > 1 ? 'ies' : 'y'} | **${snapshot.highConfidenceOpportunities}** high-confidence (≥70%)\n`;
    if (snapshot.topOpportunity) {
      msg += `Top pick: **${snapshot.topOpportunity}**\n`;
    }
    msg += `Last scan: ${snapshot.lastScanTime ? getTimeAgo(snapshot.lastScanTime) : 'never'}\n\n`;
  } else {
    msg += `### 📡 Inbound\n`;
    msg += `No pending opportunities. Last scan: ${snapshot.lastScanTime ? getTimeAgo(snapshot.lastScanTime) : 'never'}\n`;
    msg += `Say "**autopilot scan**" to find new opportunities.\n\n`;
  }

  // ─── Earnings ───
  msg += `### 💰 Earnings\n`;
  msg += `| Period | Amount |\n`;
  msg += `|--------|--------|\n`;
  msg += `| Last 7 days | $${snapshot.recentEarnings.toFixed(2)} |\n`;
  msg += `| Lifetime | $${snapshot.lifetimeEarnings.toFixed(2)} |\n`;
  msg += `\n`;

  // ─── Mission Stats ───
  msg += `### 📊 This Week\n`;
  msg += `| Metric | Value |\n`;
  msg += `|--------|-------|\n`;
  msg += `| Completed | ${snapshot.completedRecent} |\n`;
  msg += `| Failed | ${snapshot.failedRecent} |\n`;

  if (snapshot.topDepartment) {
    msg += `| Top Dept | ${snapshot.topDepartment} |\n`;
  }
  if (snapshot.topHourlyRate > 0) {
    msg += `| Avg Rate | $${snapshot.topHourlyRate}/hr |\n`;
  }
  if (snapshot.winRate > 0) {
    msg += `| Win Rate | ${snapshot.winRate}% |\n`;
  }
  msg += `\n`;

  // ─── Strategic Recommendation ───
  msg += `### 🧠 Strategy\n`;
  msg += `${snapshot.topRecommendation}\n\n`;

  // ─── Quick Commands ───
  msg += `---\n`;
  msg += `**Quick commands**: \`autopilot scan\` · \`review my missions\` · \`what's working best?\` · \`buyer inbox\``;

  return msg;
}

// ─── Intent Detection ──────────────────────────────────────────────────────────

const BRIEFING_KEYWORDS = [
  "briefing", "status report", "morning report", "daily report",
  "daily briefing", "situation report", "what's the status",
  "what is the status", "command briefing", "officer report",
  "status update", "give me a report", "what's going on",
  "overview", "dashboard summary"
];

export function detectBriefingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return BRIEFING_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Chat Handler ──────────────────────────────────────────────────────────────

export async function handleBriefingCommand(
  text: string,
  userEmail: string
): Promise<{ type: string; message: string }> {
  try {
    const snapshot = await buildDailyBriefing(userEmail);

    // Log
    await createSafeActionLog({
      department: "Autopilot",
      action_type: "briefing_requested",
      status: "success",
      summary: `User requested briefing`,
      details: JSON.stringify({})
    });

    return {
      type: "briefing",
      message: formatBriefing(snapshot)
    };
  } catch (error: any) {
    console.error("[Briefing] Error:", error);
    return {
      type: "briefing_error",
      message: "⚡ **Briefing unavailable** — I'm having trouble gathering the report. Try again in a moment."
    };
  }
}
