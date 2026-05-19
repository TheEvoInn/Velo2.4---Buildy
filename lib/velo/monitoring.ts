











import { buildExecutionReadinessSnapshot } from "./executionReadiness";

export interface MonitoringItem {
  id: string;
  type: 'scanner' | 'workflow' | 'approval' | 'opportunity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  department: string;
  status: string;
  timestamp: string;
  suggestedAction: string;
  navigationId: string;
  relatedId?: string;
  metadata?: any;
}

export interface MonitoringSnapshot {
  health: {
    scanners: number; // 0-100 score
    workflows: number; // 0-100 score
    approvals: number; // pending count
    opportunities: number; // total count
  };
  attentionQueue: MonitoringItem[];
  scannerHealth: {
    failedRuns: any[];
    degradedSources: any[];
  };
  workflowFailures: {
    failedMissions: any[];
    actionFailures: any[];
    fallbackEvents: any[];
  };
  pendingApprovals: {
    missions: any[];
    stagedPlatforms: any[];
  };
  executionReadiness: {
    emergencyStop: boolean;
    dryRunCount: number;
    pendingExecutionApprovals: number;
    connectorWarnings: number;
    overallStatus: string;
  };
  fallbackReadiness: {
    overallStatus: string;
    localConnectors: number;
    manualCoverage: number;
    recentFallbacks: number;
  };
  opportunityAlerts: {
    total: number;
    byDepartment: Record<string, number>;
    recent: any[];
  };
}

export function buildMonitoringSnapshot(records: {
  scannerRuns: any[];
  scannerSources: any[];
  missions: any[];
  actionLogs: any[];
  fallbackEvents: any[];
  platforms: any[];
  connectors: any[];
  rules: any[];
  opportunities: {
    galaxy: any[];
    freelance: any[];
    trade: any[];
  };
}, continuitySnapshot?: any): MonitoringSnapshot {
  const scannerHealth = summarizeScannerHealth(records.scannerRuns, records.scannerSources);
  const workflowFailures = summarizeWorkflowFailures(records.missions, records.actionLogs, records.fallbackEvents);
  const pendingApprovals = summarizePendingApprovals(records.missions, records.platforms);
  const opportunityAlerts = summarizeOpportunityAlerts(records.opportunities);
  const executionReadiness = buildExecutionReadinessSnapshot({
    connectors: records.connectors || [],
    permissions: [], // Permissions are inside the records if we pass them, but for now focus on rules/logs/missions
    rules: records.rules || [],
    actionLogs: records.actionLogs || [],
    missions: records.missions || []
  });

  // Calculate scores
  const scannerScore = Math.max(0, 100 - (scannerHealth.failedRuns.length * 20) - (scannerHealth.degradedSources.length * 10));
  const workflowScore = Math.max(0, 100 - (workflowFailures.failedMissions.length * 15) - (workflowFailures.actionFailures.length * 5) - (workflowFailures.fallbackEvents.length * 10));

  const snapshot: MonitoringSnapshot = {
    health: {
      scanners: scannerScore,
      workflows: workflowScore,
      approvals: pendingApprovals.missions.length + pendingApprovals.stagedPlatforms.length,
      opportunities: opportunityAlerts.total
    },
    attentionQueue: [],
    scannerHealth,
    workflowFailures,
    pendingApprovals,
    opportunityAlerts,
    executionReadiness: {
      emergencyStop: executionReadiness.emergency_stop,
      dryRunCount: executionReadiness.dry_run_count,
      pendingExecutionApprovals: executionReadiness.pending_execution_approvals,
      connectorWarnings: executionReadiness.connector_warnings,
      overallStatus: executionReadiness.overall_status
    },
    fallbackReadiness: {
      overallStatus: continuitySnapshot?.overall_status || 'unknown',
      localConnectors: (continuitySnapshot?.local_readiness?.ollama?.connected ? 1 : 0) + (continuitySnapshot?.local_readiness?.lm_studio?.connected ? 1 : 0),
      manualCoverage: continuitySnapshot?.manual_coverage || 0,
      recentFallbacks: records.fallbackEvents.length
    }
  };

  snapshot.attentionQueue = rankAttentionItems(snapshot);

  return snapshot;
}

function summarizeScannerHealth(runs: any[], sources: any[]) {
  const recentRuns = runs.slice(0, 20);
  const failedRuns = recentRuns.filter(r => r.status === 'failed');
  const degradedSources = sources.filter(s => s.status === 'degraded' || s.status === 'disabled' || s.status === 'testing');

  return { failedRuns, degradedSources };
}

function summarizeWorkflowFailures(missions: any[], logs: any[], fallbacks: any[]) {
  const failedMissions = missions.filter(m => m.status === 'failed' || m.status === 'paused_friction');
  const actionFailures = logs.filter(l => l.status === 'failure' || l.status === 'blocked');
  const activeFallbacks = fallbacks.filter(f => f.status === 'occurred');

  return { failedMissions, actionFailures, fallbackEvents: activeFallbacks };
}

function summarizePendingApprovals(missions: any[], platforms: any[]) {
  const pendingMissions = missions.filter(m => m.status === 'pending' || m.status === 'approved' || m.status === 'in_progress');
  const stagedPlatforms = platforms.filter(p => p.onboarding_status === 'pending_approval' || p.connection_status === 'staged');

  return { missions: pendingMissions, stagedPlatforms };
}

function summarizeOpportunityAlerts(opps: any) {
  const allOpps = [
    ...(opps.galaxy || []).map((o: any) => ({ ...o, dept: 'Galaxy' })),
    ...(opps.freelance || []).map((o: any) => ({ ...o, dept: 'Freelance' })),
    ...(opps.trade || []).map((o: any) => ({ ...o, dept: 'Trade' }))
  ].filter(o => o.routing_status === 'mission_staged');

  const byDepartment: Record<string, number> = {
    Galaxy: (opps.galaxy || []).filter((o: any) => o.routing_status === 'mission_staged').length,
    Freelance: (opps.freelance || []).filter((o: any) => o.routing_status === 'mission_staged').length,
    Trade: (opps.trade || []).filter((o: any) => o.routing_status === 'mission_staged').length
  };

  return {
    total: allOpps.length,
    byDepartment,
    recent: allOpps.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10)
  };
}

function rankAttentionItems(snapshot: MonitoringSnapshot): MonitoringItem[] {
  const items: MonitoringItem[] = [];

  // 1. Workflow Failures (Highest Priority)
  snapshot.workflowFailures.failedMissions.forEach(m => {
    items.push({
      id: `fail-mission-${m.id}`,
      type: 'workflow',
      severity: m.risk_level === 'high' ? 'high' : 'medium',
      title: `Mission Failed: ${m.title}`,
      summary: `Workflow stalled in ${m.source_department}. Action required to resume or cancel.`,
      department: m.source_department,
      status: 'failed',
      timestamp: m.updated_at || m.created_at,
      suggestedAction: 'Review mission logs and retry or cancel.',
      navigationId: 'action-engine',
      relatedId: m.id,
      metadata: {
        current_step_index: m.current_step_index,
        total_steps: m.total_steps,
        next_action: m.next_action,
        ...m.metadata
      }
    });
  });

  // 2. Pending Approvals (Medium-High)
  snapshot.pendingApprovals.missions.forEach(m => {
    items.push({
      id: `pending-mission-${m.id}`,
      type: 'approval',
      severity: m.risk_level === 'high' ? 'high' : 'medium',
      title: `Approval Required: ${m.title}`,
      summary: `Staged mission in ${m.source_department} waiting for command authorization.`,
      department: m.source_department,
      status: 'pending',
      timestamp: m.created_at,
      suggestedAction: 'Authorize mission for execution.',
      navigationId: 'action-engine',
      relatedId: m.id,
      metadata: {
        current_step_index: m.current_step_index,
        total_steps: m.total_steps,
        next_action: m.next_action,
        ...m.metadata
      }
    });
  });

  // 3. Scanner Failures (Medium)
  snapshot.scannerHealth.failedRuns.forEach(r => {
    items.push({
      id: `fail-run-${r.id}`,
      type: 'scanner',
      severity: 'medium',
      title: `Scanner Error: ${r.scanner_name}`,
      summary: `Galaxy Scanner routine failed in ${r.department}. Reason: ${r.failure_reason || 'Unknown error'}`,
      department: r.department,
      status: 'failed',
      timestamp: r.completed_at || r.started_at,
      suggestedAction: 'Check source health and rerun scan.',
      navigationId: 'galaxy-scanner',
      relatedId: r.id
    });
  });

  // 4. Fallback Events (Medium)
  snapshot.workflowFailures.fallbackEvents.forEach(f => {
    items.push({
      id: `fallback-${f.id}`,
      type: 'workflow',
      severity: f.severity || 'low',
      title: `Fallback Triggered: ${f.workflow_name}`,
      summary: `${f.primary_provider} failed. System switched to ${f.fallback_provider} for ${f.department}.`,
      department: f.department,
      status: 'fallback',
      timestamp: f.occurred_at,
      suggestedAction: 'Verify fallback output and provider status.',
      navigationId: 'continuity-core',
      relatedId: f.id
    });
  });

  // 5. Degraded Sources (Low-Medium)
  snapshot.scannerHealth.degradedSources.forEach(s => {
    items.push({
      id: `degraded-source-${s.id}`,
      type: 'scanner',
      severity: 'low',
      title: `Source Degraded: ${s.name}`,
      summary: `Scanner source for ${s.department} is currently ${s.status}.`,
      department: s.department,
      status: s.status,
      timestamp: s.last_checked_at || s.updated_at,
      suggestedAction: 'Update source configuration or re-test connection.',
      navigationId: 'galaxy-scanner',
      relatedId: s.id
    });
  });

  return items.sort((a, b) => {
    const severityMap = { high: 3, medium: 2, low: 1 };
    if (severityMap[a.severity] !== severityMap[b.severity]) {
      return severityMap[b.severity] - severityMap[a.severity];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
