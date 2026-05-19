import {
  AutopilotMission,
  AutopilotActionLog,
  GalaxyLearningSignal,
  GalaxyOpportunityFeed,
  FreelanceEarning,
  FreelanceTask,
  VeloWalletTransaction,
  VeloWorkflowTemplate,
  VeloProfitabilityInsight,
  AutopilotProfile,
  User
} from "@/entities";
import { invokeLLM } from "@/integrations/core";
import { createSafeActionLog } from "./scannerNormalization";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DepartmentLearning {
  department: string;
  missionsCompleted: number;
  missionsFailed: number;
  totalEarned: number;
  totalMinutes: number;
  hourlyRate: number;
  avgConfidenceScore: number;
  topSource: string;
  topWorkflowType: string;
  bestRiskLevel: string;
  winRate: number; // %
}

export interface LearningReport {
  departments: DepartmentLearning[];
  overall: {
    totalCompleted: number;
    totalFailed: number;
    totalEarned: number;
    totalMinutes: number;
    overallHourlyRate: number;
    overallWinRate: number;
  };
  topRecommendation: string;
  secondaryRecommendations: string[];
  summaryText: string;
}

// ─── Intent Detection ──────────────────────────────────────────────────────────

const LEARNING_KEYWORDS = [
  "what have i learned", "what have we learned", "learning report",
  "what's working", "what is working", "what's working best",
  "strategy review", "strategic review", "what should i focus on",
  "where should i focus", "autopilot learn", "analyze my results",
  "what pays best", "best department", "learning summary",
  "what are my stats", "win rate", "performance review"
];

export function detectLearningIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return LEARNING_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Data Gathering ────────────────────────────────────────────────────────────

async function gatherMissions(email: string) {
  // Use "executed" or "approved" for completed, "failed" for failed
  const missions = await AutopilotMission.query()
    .sort("-resolved_at")
    .exec()
    .catch(() => []);
  return missions || [];
}

async function gatherEarnings(email: string) {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  if (!ownerEmail) return { freelanceEarnings: [], walletTxns: [] };
  
  // Try FreelanceEarning first (has email field)
  const freelanceEarnings = await FreelanceEarning.query()
    .where("owner_email", ownerEmail)
    .exec()
    .catch(() => []);

  // Also check wallet transactions
  const walletTxns = await VeloWalletTransaction.query()
    .where("owner_email", ownerEmail)
    .where("status", "cleared")
    .exec()
    .catch(() => []);

  return { freelanceEarnings: freelanceEarnings || [], walletTxns: walletTxns || [] };
}

async function gatherLearningSignals() {
  // Signals are currently cross-user/global context in this schema
  const signals = await GalaxyLearningSignal.query()
    .sort("-captured_at")
    .exec()
    .catch(() => []);
  return signals || [];
}

async function gatherProfitabilityInsights(email: string) {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;
  if (!ownerEmail) return [];

  const insights = await VeloProfitabilityInsight.query()
    .where("owner_email", ownerEmail)
    .sort("-calculated_at")
    .exec()
    .catch(() => []);
  return insights || [];
}

// ─── Analysis ──────────────────────────────────────────────────────────────────

export async function analyzeLearningLoop(email: string): Promise<LearningReport> {
  const user = await User.me().catch(() => null);
  const ownerEmail = email || user?.email;

  try {
    const [missions, earnings, signals, insights] = await Promise.all([
      gatherMissions(ownerEmail),
      gatherEarnings(ownerEmail),
      gatherLearningSignals(),
      gatherProfitabilityInsights(ownerEmail)
    ]);

    const { freelanceEarnings, walletTxns } = earnings;

    // Build department stats
    const deptMap = new Map<string, {
      completed: number;
      failed: number;
      totalEarned: number;
      totalMinutes: number;
      confidenceScores: number[];
      sources: Map<string, number>;
      workflowTypes: Map<string, number>;
      riskLevels: Map<string, number>;
    }>();

    // Process missions (filter by ownership manually if not already filtered)
    for (const m of missions || []) {
      if (!m) continue;
      
      // Ownership check
      const isOwner = m.owner_user_id === user?.id || m.created_by === ownerEmail;
      if (!isOwner && user?.id && m.owner_user_id) continue;

      const dept = m.source_department || m.department || "General";
      
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { completed: 0, failed: 0, totalEarned: 0, totalMinutes: 0, confidenceScores: [], sources: new Map(), workflowTypes: new Map(), riskLevels: new Map() });
      }
      const d = deptMap.get(dept)!;
      
      if (m.status === "executed" || m.status === "approved") {
        d.completed++;
      } else if (m.status === "failed") {
        d.failed++;
      } else {
        continue;
      }

      // Extract metadata
      const meta = m.metadata || {};
      if (meta.confidence_score) d.confidenceScores.push(Number(meta.confidence_score));
      if (meta.source_name) d.sources.set(meta.source_name, (d.sources.get(meta.source_name) || 0) + 1);
      if (meta.workflow_type) d.workflowTypes.set(meta.workflow_type, (d.workflowTypes.get(meta.workflow_type) || 0) + 1);
      if (m.risk_level) d.riskLevels.set(m.risk_level, (d.riskLevels.get(m.risk_level) || 0) + 1);

      // Estimate minutes from mission duration
      if (m.created_at && m.resolved_at) {
        const diffMs = new Date(m.resolved_at).getTime() - new Date(m.created_at).getTime();
        const diffMin = Math.round(diffMs / 60000);
        if (diffMin > 2 && diffMin < 480) d.totalMinutes += diffMin;
      } else if (meta.actual_minutes) {
        d.totalMinutes += Number(meta.actual_minutes);
      }
    }

    // Cross-reference earnings with departments
    const allEarnings = [
      ...(freelanceEarnings || []).map((e: any) => ({
        amount: e.amount || 0,
        source_department: e.source_department || "Freelance Station",
        status: e.status
      })),
      ...(walletTxns || []).map((tx: any) => ({
        amount: tx.amount || 0,
        source_department: tx.source_department || tx.category || "General",
        status: tx.status
      }))
    ];

    for (const e of allEarnings) {
      if (e.status !== "paid" && e.status !== "cleared") continue;
      const dept = e.source_department;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { completed: 0, failed: 0, totalEarned: 0, totalMinutes: 0, confidenceScores: [], sources: new Map(), workflowTypes: new Map(), riskLevels: new Map() });
      }
      deptMap.get(dept)!.totalEarned += Number(e.amount) || 0;
    }

    // Add profitability insights data
    for (const insight of insights || []) {
      if (!insight || !insight.source_department) continue;
      const dept = insight.source_department;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { completed: 0, failed: 0, totalEarned: 0, totalMinutes: 0, confidenceScores: [], sources: new Map(), workflowTypes: new Map(), riskLevels: new Map() });
      }
      const d = deptMap.get(dept)!;
      if (insight.total_minutes) d.totalMinutes = Math.max(d.totalMinutes, insight.total_minutes);
      if (insight.total_earned) d.totalEarned = Math.max(d.totalEarned, insight.total_earned);
      if (insight.completed_count) d.completed = Math.max(d.completed, insight.completed_count);
    }

    // Build department learnings
    const departments: DepartmentLearning[] = [];

    for (const [dept, d] of deptMap.entries()) {
      if (d.completed === 0 && d.failed === 0) continue;

      const total = d.completed + d.failed;
      const winRate = total > 0 ? Math.round((d.completed / total) * 100) : 0;
      const avgConfidence = d.confidenceScores.length > 0
        ? Math.round(d.confidenceScores.reduce((a, b) => a + b, 0) / d.confidenceScores.length)
        : 0;
      const hourlyRate = d.totalMinutes > 0 ? Math.round((d.totalEarned / d.totalMinutes) * 60) : 0;

      // Find top source
      let topSource = "—";
      let topSourceCount = 0;
      for (const [src, count] of d.sources.entries()) {
        if (count > topSourceCount) { topSource = src; topSourceCount = count; }
      }

      // Find top workflow type
      let topWorkflowType = "—";
      let topWFCount = 0;
      for (const [wf, count] of d.workflowTypes.entries()) {
        if (count > topWFCount) { topWorkflowType = wf; topWFCount = count; }
      }

      // Find best risk level
      let bestRiskLevel = "low";
      let bestRiskWinRate = -1;
      for (const [risk, count] of d.riskLevels.entries()) {
        const riskSuccesses = missions?.filter(m => 
          (m.source_department === dept || m.department === dept) && 
          m.risk_level === risk && 
          (m.status === "executed" || m.status === "approved")
        ).length || 0;
        const riskRate = count > 0 ? riskSuccesses / count : 0;
        if (riskRate > bestRiskWinRate) { bestRiskWinRate = riskRate; bestRiskLevel = risk; }
      }

      departments.push({
        department: dept,
        missionsCompleted: d.completed,
        missionsFailed: d.failed,
        totalEarned: d.totalEarned,
        totalMinutes: d.totalMinutes,
        hourlyRate,
        avgConfidenceScore: avgConfidence,
        topSource,
        topWorkflowType,
        bestRiskLevel,
        winRate
      });
    }

    // Sort by earnings descending
    departments.sort((a, b) => b.totalEarned - a.totalEarned);

    // Overall stats
    const totalCompleted = departments.reduce((sum, d) => sum + d.missionsCompleted, 0);
    const totalFailed = departments.reduce((sum, d) => sum + d.missionsFailed, 0);
    const totalEarned = departments.reduce((sum, d) => sum + d.totalEarned, 0);
    const totalMinutes = departments.reduce((sum, d) => sum + d.totalMinutes, 0);
    const overallHourlyRate = totalMinutes > 0 ? Math.round((totalEarned / totalMinutes) * 60) : 0;
    const overallWinRate = (totalCompleted + totalFailed) > 0
      ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
      : 0;

    // Generate actionable recommendations
    const recommendations = generateRecommendations(departments, totalCompleted, signals || []);

    // Build summary text
    const summaryText = buildSummaryText(departments, totalCompleted, totalEarned, overallHourlyRate);

    const report: LearningReport = {
      departments,
      overall: {
        totalCompleted,
        totalFailed,
        totalEarned,
        totalMinutes,
        overallHourlyRate,
        overallWinRate
      },
      topRecommendation: recommendations[0] || "Keep exploring — more data improves recommendations.",
      secondaryRecommendations: recommendations.slice(1, 3),
      summaryText
    };

    // Log the learning analysis
    await createSafeActionLog({
      department: "Autopilot",
      action_type: "learning_analysis",
      status: "success",
      summary: `Learning analysis: ${departments.length} departments, ${totalCompleted} completed, $${totalEarned.toFixed(2)} earned`,
      details: JSON.stringify({
        departments: departments.length,
        completed: totalCompleted,
        earned: totalEarned,
        hourlyRate: overallHourlyRate,
        topRec: recommendations[0]
      })
    });

    return report;
  } catch (error: any) {
    console.error("[AutopilotLearning] Analysis failed:", error);
    return {
      departments: [],
      overall: { totalCompleted: 0, totalFailed: 0, totalEarned: 0, totalMinutes: 0, overallHourlyRate: 0, overallWinRate: 0 },
      topRecommendation: "Unable to analyze — not enough data yet.",
      secondaryRecommendations: [],
      summaryText: "Not enough mission data to generate a learning report. Complete a few missions first."
    };
  }
}

// ─── Recommendation Engine ─────────────────────────────────────────────────────

function generateRecommendations(
  departments: DepartmentLearning[],
  totalCompleted: number,
  signals: any[]
): string[] {
  const recs: string[] = [];

  if (totalCompleted === 0) {
    recs.push("Complete your first few missions to unlock learning-based strategy recommendations.");
    return recs;
  }

  if (totalCompleted < 3) {
    recs.push("You're just getting started. Complete 5+ missions for deeper insights into what works best.");
    return recs;
  }

  // Find highest hourly rate department
  if (departments.length > 0) {
    const bestDept = departments[0]; // sorted by earnings
    if (bestDept.hourlyRate > 0 && bestDept.winRate >= 50) {
      recs.push(`Focus on **${bestDept.department}** — it earns $${bestDept.hourlyRate}/hr with a ${bestDept.winRate}% win rate.`);
    }

    // Find department with highest win rate (different from highest earner)
    const highestWinRate = [...departments].sort((a, b) => b.winRate - a.winRate)[0];
    if (highestWinRate && highestWinRate.department !== bestDept?.department && highestWinRate.winRate >= 70) {
      recs.push(`**${highestWinRate.department}** has the highest success rate (${highestWinRate.winRate}%) — consider routing more opportunities there.`);
    }
  }

  // Check for negative signal patterns
  const negativeSignals = signals.filter((s: any) => 
    s.signal_type === "negative" || s.outcome_label === "Failure"
  );
  if (negativeSignals.length > 0) {
    const negDepts = Array.from(new Set(negativeSignals.map((s: any) => s.department))).filter(Boolean);
    if (negDepts.length > 0) {
      recs.push(`Review opportunities from: ${negDepts.join(", ")} — past signals show lower success rates.`);
    }
  }

  // If all departments have low win rates
  const lowWinDepts = departments.filter(d => d.winRate < 40 && d.missionsCompleted >= 3);
  if (lowWinDepts.length > 0) {
    recs.push(`Consider lowering risk on: ${lowWinDepts.map(d => d.department).join(", ")} — stick to **low** and **medium** risk opportunities.`);
  }

  // If no clear winner yet, recommend diversification
  if (recs.length === 0) {
    recs.push("Diversify across departments — more data leads to clearer recommendations.");
  }

  return recs;
}

function buildSummaryText(
  departments: DepartmentLearning[],
  totalCompleted: number,
  totalEarned: number,
  hourlyRate: number
): string {
  if (totalCompleted === 0) {
    return "Your Autopilot hasn't completed any missions yet, so there's nothing to learn from. Get started by saying \"autopilot scan\" and completing a few opportunities.";
  }

  let text = `Across **${totalCompleted} completed missions**, the Autopilot has earned **$${totalEarned.toFixed(2)}**`;
  if (hourlyRate > 0) text += ` at an average of **$${hourlyRate}/hr**`;
  text += `.`;

  if (departments.length > 0) {
    const best = departments[0];
    text += `\n\nStrongest department: **${best.department}** (${best.missionsCompleted} completed, $${best.totalEarned.toFixed(2)} earned${best.hourlyRate > 0 ? `, $${best.hourlyRate}/hr` : ''}).`;
  }

  return text;
}

// ─── Chat Handler ──────────────────────────────────────────────────────────────

export async function handleLearningCommand(
  text: string,
  userEmail: string
): Promise<{ type: string; message: string }> {
  try {
    const report = await analyzeLearningLoop(userEmail);

    if (report.departments.length === 0 && report.overall.totalCompleted === 0) {
      return {
        type: "learning_empty",
        message: `## 🧠 Autopilot Learning Report\n\n${report.summaryText}\n\n**Next step**: Say "autopilot scan" to find opportunities, then complete missions to start building your learning profile.`
      };
    }

    // Build the full report
    let msg = `## 🧠 Autopilot Learning Report\n\n`;
    msg += `### Overall\n`;
    msg += `| Metric | Value |\n`;
    msg += `|--------|-------|\n`;
    msg += `| Completed Missions | ${report.overall.totalCompleted} |\n`;
    msg += `| Failed Missions | ${report.overall.totalFailed} |\n`;
    msg += `| Win Rate | ${report.overall.overallWinRate}% |\n`;
    msg += `| Total Earned | $${report.overall.totalEarned.toFixed(2)} |\n`;
    if (report.overall.overallHourlyRate > 0) {
      msg += `| Avg Hourly Rate | $${report.overall.overallHourlyRate}/hr |\n`;
    } else {
      msg += `| Avg Hourly Rate | — |\n`;
    }
    msg += `\n`;

    if (report.departments.length > 0) {
      msg += `### Department Breakdown\n\n`;
      msg += `| Department | Done | Failed | Earned | $/hr | Win Rate | Top Source | Risk |\n`;
      msg += `|------------|------|--------|--------|------|----------|------------|------|\n`;

      for (const d of report.departments.slice(0, 6)) {
        const dept = d.department.length > 18 ? d.department.substring(0, 15) + '...' : d.department;
        msg += `| ${dept} | ${d.missionsCompleted} | ${d.missionsFailed} | $${d.totalEarned.toFixed(0)} | ${d.hourlyRate || '—'} | ${d.winRate}% | ${d.topSource} | ${d.bestRiskLevel} |\n`;
      }
      msg += `\n`;
    }

    msg += `### Recommendations\n\n`;
    msg += `1. **${report.topRecommendation}**\n`;
    for (let i = 0; i < report.secondaryRecommendations.length; i++) {
      msg += `${i + 2}. ${report.secondaryRecommendations[i]}\n`;
    }

    msg += `\n${report.summaryText}`;

    return { type: "learning_report", message: msg };
  } catch (error: any) {
    console.error("[AutopilotLearning] Command error:", error);
    return {
      type: "learning_error",
      message: "I had trouble analyzing your learning data. Try again in a moment."
    };
  }
}
