import { 
  VeloProfitabilityInsight,
  VeloWalletTransaction,
  AutopilotActionLog,
  GalaxyLearningSignal,
  AutopilotMission,
  User
} from "@/entities";
import { calculateProfitabilityInsights } from "./profitabilityLearning";
import { walletEngine } from "./walletEngine";

// ─── Intent Detection ──────────────────────────────────────────────────────────

const PERFORMANCE_KEYWORDS = [
  "how am i doing", "how are we doing", "performance update", "performance report",
  "show performance", "check performance", "what's working", "what is working",
  "most profitable", "best performing", "highest roi", "highest earning",
  "where should i focus", "what should i focus", "strategic recommendation",
  "how much have i earned", "total earnings", "lifetime earnings",
  "monthly earnings", "weekly earnings", "my stats", "my numbers",
  "profitability", "income report", "earning report",
  "what's making money", "what is making money", "what makes money",
  "autopilot performance", "automation performance"
];

const KEYWORD_PATTERNS = PERFORMANCE_KEYWORDS.map(kw => ({
  pattern: new RegExp(kw.replace(/\s+/g, "\\s+"), "i"),
  keyword: kw
}));

export function detectPerformanceIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORD_PATTERNS.some(({ pattern }) => pattern.test(lower));
}

// ─── Performance Snapshot ──────────────────────────────────────────────────────

export interface PerformanceSnapshot {
  bestCategory: { name: string; netProfit: number; roiScore: number; hourlyProfit: number } | null;
  totalEarnings: number;
  totalNetProfit: number;
  totalTransactions: number;
  completedTransactions: number;
  activeOpportunities: number;
  activeMissions: number;
  autopilotEfficiency: number; // % of transactions involving autopilot
  insights: any[];
  generatedAt: string;
}

export async function getPerformanceSnapshot(email?: string): Promise<PerformanceSnapshot | null> {
  const me = await User.me().catch(() => null);
  const ownerEmail = email || me?.email;
  if (!ownerEmail) return null;

  try {
    // 1. Get profitability insights
    const existingInsights = await VeloProfitabilityInsight.query()
      .where("owner_email", ownerEmail)
      .sort("-calculated_at")
      .exec()
      .catch(() => []);

    // If no recent insights (within last hour), calculate fresh
    let insights = existingInsights;
    const newestInsight = existingInsights[0];
    const isStale = !newestInsight || 
      (new Date().getTime() - new Date(newestInsight.calculated_at).getTime()) > 3600000;
    
    if (isStale) {
      insights = await calculateProfitabilityInsights(ownerEmail);
      insights = insights || [];
    }

    // 2. Get transaction stats
    const transactions = await VeloWalletTransaction.query()
      .where("owner_email", ownerEmail)
      .exec()
      .catch(() => []);

    let totalEarnings = 0;
    let totalNetProfit = 0;
    let completedCount = 0;
    let autopilotCount = 0;

    for (const tx of transactions) {
      const amount = walletEngine.normalizeMoney(tx.amount);
      const isLoss = ['refund', 'chargeback', 'trading_loss', 'reversed', 'correction_loss'].includes(tx.transaction_type);
      const isCompleted = ['cleared', 'paid', 'completed'].includes(tx.status || "") && amount > 0;
      
      if (isLoss) {
        totalNetProfit -= amount;
      } else {
        totalEarnings += amount;
        totalNetProfit += amount;
      }
      if (isCompleted) completedCount++;
      if (tx.autopilot_involved || tx.generated_by_autopilot) autopilotCount++;
    }

    // 3. Active opportunities and missions
    const [activeMissions] = await Promise.all([
      AutopilotMission.query()
        .where("status", "active")
        .exec().catch(() => [])
    ]);

    // 4. Find best category
    let bestCategory: PerformanceSnapshot['bestCategory'] = null;
    let highestRoi = -1;

    if (insights && insights.length > 0) {
      for (const ins of insights) {
        const roi = ins.roi_score || 0;
        if (roi > highestRoi) {
          highestRoi = roi;
          bestCategory = {
            name: ins.category_label || ins.category_key || 'Unknown',
            netProfit: ins.net_profit || 0,
            roiScore: roi,
            hourlyProfit: ins.hourly_profit || 0
          };
        }
      }
    }

    const autopilotEfficiency = transactions.length > 0 
      ? Math.round((autopilotCount / transactions.length) * 100) 
      : 0;

    return {
      bestCategory,
      totalEarnings,
      totalNetProfit,
      totalTransactions: transactions.length,
      completedTransactions: completedCount,
      activeOpportunities: Math.min(5, activeMissions?.length || 0), // Cap display
      activeMissions: activeMissions?.length || 0,
      autopilotEfficiency,
      insights: insights || [],
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("[PerformanceIntelligence] Snapshot error:", error);
    return null;
  }
}

// ─── Strategic Recommendations ─────────────────────────────────────────────────

export async function getStrategicRecommendations(email?: string): Promise<string[]> {
  const snapshot = await getPerformanceSnapshot(email);
  if (!snapshot) return ["I don't have enough data yet to make strategic recommendations. Complete a few transactions and try again."];

  const recommendations: string[] = [];

  // 1. Best category recommendation
  if (snapshot.bestCategory && snapshot.bestCategory.roiScore > 30) {
    recommendations.push(
      `**Double down on ${snapshot.bestCategory.name}** — it's your highest ROI category at $${snapshot.bestCategory.netProfit.toFixed(2)} net profit (${snapshot.bestCategory.roiScore}/100 ROI). Consider increasing your time and resources here.`
    );
  } else if (snapshot.bestCategory) {
    recommendations.push(
      `**Build up ${snapshot.bestCategory.name}** — it's currently your strongest category but has room to grow. Focus on scaling this lane.`
    );
  }

  // 2. Low profit categories to deprioritize
  if (snapshot.insights && snapshot.insights.length > 1) {
    const lowPerformers = snapshot.insights
      .filter((i: any) => (i.roi_score || 0) < 25 && (i.transaction_count || 0) > 3)
      .slice(0, 2);

    for (const lp of lowPerformers) {
      recommendations.push(
        `**Consider deprioritizing ${lp.category_label || lp.category_key}** — ${lp.transaction_count} transactions with only ${lp.roi_score || 0}/100 ROI. Your time may be better spent elsewhere.`
      );
    }
  }

  // 3. Autopilot efficiency
  if (snapshot.autopilotEfficiency < 20 && snapshot.totalTransactions > 5) {
    recommendations.push(
      `**Increase Autopilot usage** — only ${snapshot.autopilotEfficiency}% of your transactions involve the Autopilot. Let me handle more so you can scale faster. Try saying "autopilot on" or "automate this."`
    );
  } else if (snapshot.autopilotEfficiency > 50) {
    recommendations.push(
      `**Great Autopilot utilization** — ${snapshot.autopilotEfficiency}% of transactions are automated. Continue letting the Autopilot run your income cycles.`
    );
  }

  // 4. Diversification or focus
  const activeCount = (snapshot.insights || []).filter((i: any) => (i.net_profit || 0) > 0).length;
  if (activeCount <= 1 && snapshot.totalTransactions > 3) {
    recommendations.push(
      `**Diversify your income lanes** — you're only generating profit in one category. Consider adding a second income stream by saying "scan for new opportunities."`
    );
  }

  // 5. General guidance based on data volume
  if (snapshot.totalTransactions < 5) {
    recommendations.push(
      `**Generate more activity** — with only ${snapshot.totalTransactions} transactions, I need more data to give precise recommendations. Start scanning for opportunities or turn on Autopilot.`
    );
  }

  // Ensure at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      `**Keep building momentum** — you're on the right track. Continue executing and I'll surface more targeted recommendations as your data grows.`
    );
  }

  return recommendations;
}

// ─── Learning Signals Summary ──────────────────────────────────────────────────

export async function getLearningSignalsSummary(email?: string): Promise<string> {
  const me = await User.me().catch(() => null);
  const ownerEmail = email || me?.email;
  if (!ownerEmail) return "No learning data available yet.";

  try {
    const signals = await GalaxyLearningSignal.query()
      .sort("-captured_at")
      .exec()
      .catch(() => []);

    if (signals.length === 0) return "No learning signals recorded yet. The system will learn as you complete more work.";

    const recent = signals.slice(0, 20);
    const positiveCount = recent.filter((s: any) => (s.success_score || 0) > 50).length;
    const signalRate = recent.length > 0 ? Math.round((positiveCount / recent.length) * 100) : 0;

    const categories = new Map<string, number>();
    for (const s of recent) {
      const key = s.department || 'Unknown';
      categories.set(key, (categories.get(key) || 0) + 1);
    }

    let summary = `**Learning System Status**\n\n`;
    summary += `📊 ${recent.length} signals recorded | ${signalRate}% positive outcomes\n\n`;
    summary += `**Activity by department:**\n`;

    const sortedCategories = [...categories.entries()].sort((a, b) => b[1] - a[1]);
    for (const [dept, count] of sortedCategories) {
      summary += `- **${dept}**: ${count} learning signals\n`;
    }

    return summary;
  } catch {
    return "Could not retrieve learning data. Try again.";
  }
}

// ─── Main Chat Handler ─────────────────────────────────────────────────────────

export async function handlePerformanceCommand(
  text: string,
  userEmail: string
): Promise<{ type: string; message: string }> {
  const lower = text.toLowerCase();

  try {
    // Route based on intent
    if (lower.includes("focus") || lower.includes("recommend") || lower.includes("strategic")) {
      const recommendations = await getStrategicRecommendations(userEmail);
      const recText = recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n\n");
      return {
        type: "strategic",
        message: `## 🎯 Strategic Recommendations\n\n${recText}\n\n*Based on your current performance data and learning signals.*`
      };
    }

    if (lower.includes("how much") || lower.includes("earnings") || lower.includes("earned") || lower.includes("income")) {
      const snapshot = await getPerformanceSnapshot(userEmail);
      if (!snapshot) return { type: "error", message: "I couldn't pull your earnings data right now. Try again." };

      const msg = [
        `## 💰 Earnings Summary`,
        ``,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| **Total Earnings** | $${snapshot.totalEarnings.toFixed(2)} |`,
        `| **Net Profit** | $${snapshot.totalNetProfit.toFixed(2)} |`,
        `| **Completed Transactions** | ${snapshot.completedTransactions} |`,
        `| **Total Transactions** | ${snapshot.totalTransactions} |`,
        ``,
        snapshot.bestCategory ? `💎 **Top Earner**: ${snapshot.bestCategory.name} ($${snapshot.bestCategory.netProfit.toFixed(2)}, ROI: ${snapshot.bestCategory.roiScore}/100)` : '',
        ``
      ].filter(Boolean).join("\n");

      return { type: "earnings", message: msg };
    }

    // Default: full performance snapshot
    const snapshot = await getPerformanceSnapshot(userEmail);
    if (!snapshot) return { type: "error", message: "I couldn't gather your performance data. Make sure you've completed some transactions first." };

    let msg = `## 📊 Performance Dashboard\n\n`;

    // Quick stats
    msg += `| Metric | Value |\n`;
    msg += `|--------|-------|\n`;
    msg += `| **Net Profit** | $${snapshot.totalNetProfit.toFixed(2)} |\n`;
    msg += `| **Total Earnings** | $${snapshot.totalEarnings.toFixed(2)} |\n`;
    msg += `| **Transactions** | ${snapshot.totalTransactions} (${snapshot.completedTransactions} completed) |\n`;
    msg += `| **Active Missions** | ${snapshot.activeMissions} |\n`;
    msg += `| **Autopilot Usage** | ${snapshot.autopilotEfficiency}% |\n`;
    msg += `\n`;

    // Best category
    if (snapshot.bestCategory) {
      msg += `### 🏆 Best Performing Category\n`;
      msg += `**${snapshot.bestCategory.name}** — $${snapshot.bestCategory.netProfit.toFixed(2)} net profit at $${snapshot.bestCategory.hourlyProfit.toFixed(2)}/hr (ROI: ${snapshot.bestCategory.roiScore}/100)\n\n`;
    }

    // Category breakdown
    if (snapshot.insights && snapshot.insights.length > 0) {
      msg += `### 📈 Category Breakdown\n\n`;
      msg += `| Category | Net Profit | ROI | Hourly | Transactions |\n`;
      msg += `|----------|------------|-----|--------|-------------|\n`;

      const sorted = [...snapshot.insights]
        .sort((a: any, b: any) => (b.net_profit || 0) - (a.net_profit || 0))
        .slice(0, 8);

      for (const ins of sorted) {
        const label = ins.category_label || ins.category_key || 'Unknown';
        const profit = (ins.net_profit || 0).toFixed(2);
        const roi = ins.roi_score || 0;
        const hourly = (ins.hourly_profit || 0).toFixed(2);
        const count = ins.transaction_count || 0;
        msg += `| ${label} | $${profit} | ${roi}/100 | $${hourly} | ${count} |\n`;
      }
      msg += `\n`;
    }

    // Learning signals summary
    msg += `### 🧠 Learning System\n`;
    const learningSummary = await getLearningSignalsSummary(userEmail);
    msg += learningSummary + `\n\n`;

    msg += `*Full performance dashboard available in Market Deck.*`;

    return { type: "performance", message: msg };
  } catch (error) {
    console.error("[PerformanceIntelligence] Command error:", error);
    return {
      type: "error",
      message: "I ran into an issue analyzing your performance data. You can check the full dashboard in Market Deck, or try asking a more specific question."
    };
  }
}
