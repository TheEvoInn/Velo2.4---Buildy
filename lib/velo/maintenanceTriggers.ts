



import { VeloAdminSetting, User, VeloDevopsCommand } from "@/entities";
import { logAdminAction } from "./devopsCommand";
import { MaintenancePlaybook, MAINTENANCE_PLAYBOOKS } from "./maintenanceScripts";

export interface MaintenanceTrigger {
  id: string;
  playbookId: string;
  label: string;
  signalSource: string;
  conditionLabel: string;
  thresholdValue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cooldownMinutes: number;
  requiresHumanApproval: boolean;
  ubuntuBehavior: string;
  blockedOnBuildyReason: string;
}

export const DEFAULT_MAINTENANCE_TRIGGERS: MaintenanceTrigger[] = [
  {
    id: 'trigger_disk_90',
    playbookId: 'disk_space_emergency',
    label: 'Critical Disk Usage',
    signalSource: 'OS Metrics / Filesystem',
    conditionLabel: 'Usage > 90%',
    thresholdValue: '90',
    severity: 'CRITICAL',
    cooldownMinutes: 60,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Immediate triage and log vacuuming',
    blockedOnBuildyReason: 'Requires root filesystem access'
  },
  {
    id: 'trigger_log_growth',
    playbookId: 'log_growth_containment',
    label: 'Rapid Log Folder Growth',
    signalSource: 'Systemd Journald',
    conditionLabel: 'Folder > 2GB',
    thresholdValue: '2000',
    severity: 'MEDIUM',
    cooldownMinutes: 240,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Autonomous journal vacuuming',
    blockedOnBuildyReason: 'Requires journalctl access'
  },
  {
    id: 'trigger_memory_85',
    playbookId: 'memory_pressure_triage',
    label: 'High Memory Pressure',
    signalSource: 'OS Metrics / RAM',
    conditionLabel: 'RAM Usage > 85%',
    thresholdValue: '85',
    severity: 'HIGH',
    cooldownMinutes: 30,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Cache drop and non-essential service restart',
    blockedOnBuildyReason: 'Requires sysctl and process control'
  },
  {
    id: 'trigger_cpu_spike',
    playbookId: 'cpu_spike_investigation',
    label: 'Sustained CPU Spike',
    signalSource: 'OS Metrics / Load',
    conditionLabel: 'Load > CPU Count for 5m',
    thresholdValue: '5',
    severity: 'HIGH',
    cooldownMinutes: 15,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Process priority adjustment (renice)',
    blockedOnBuildyReason: 'Requires priority management'
  },
  {
    id: 'trigger_service_failed',
    playbookId: 'failed_service_restart',
    label: 'Critical Service Failure',
    signalSource: 'Systemd Status',
    conditionLabel: 'Status == "failed"',
    thresholdValue: 'failed',
    severity: 'CRITICAL',
    cooldownMinutes: 10,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Automatic service restart with backoff',
    blockedOnBuildyReason: 'Requires systemctl access'
  },
  {
    id: 'trigger_db_backup_stale',
    playbookId: 'db_backup_verification',
    label: 'Stale Database Backup',
    signalSource: 'Backup Cron / FS',
    conditionLabel: 'Last backup > 24h',
    thresholdValue: '24',
    severity: 'MEDIUM',
    cooldownMinutes: 720,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Immediate backup run and sync',
    blockedOnBuildyReason: 'Requires pg_dump and file system access'
  },
  {
    id: 'trigger_ssl_expiry',
    playbookId: 'ssl_cert_renewal_check',
    label: 'SSL Near Expiry',
    signalSource: 'Certbot / OpenSSL',
    conditionLabel: 'Expires in < 14 days',
    thresholdValue: '14',
    severity: 'HIGH',
    cooldownMinutes: 1440,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Automatic certbot renewal',
    blockedOnBuildyReason: 'Requires SSL management'
  },
  {
    id: 'trigger_firewall_audit',
    playbookId: 'firewall_port_review',
    label: 'Firewall Policy Drift',
    signalSource: 'UFW Status Audit',
    conditionLabel: 'Unknown open ports detected',
    thresholdValue: 'drift',
    severity: 'MEDIUM',
    cooldownMinutes: 1440,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Policy enforcement and port closure',
    blockedOnBuildyReason: 'Requires ufw management'
  },
  {
    id: 'trigger_security_vuln',
    playbookId: 'package_update_safety',
    label: 'Security Updates Available',
    signalSource: 'APT Vulnerability Scan',
    conditionLabel: 'Critical updates > 0',
    thresholdValue: '0',
    severity: 'LOW',
    cooldownMinutes: 1440,
    requiresHumanApproval: true,
    ubuntuBehavior: 'System update and patch application',
    blockedOnBuildyReason: 'Requires apt-get access'
  },
  {
    id: 'trigger_deploy_stuck',
    playbookId: 'stuck_deployment_rollback',
    label: 'Deployment Hang Detected',
    signalSource: 'Deployment Watchdog',
    conditionLabel: 'Duration > 15m',
    thresholdValue: '15',
    severity: 'HIGH',
    cooldownMinutes: 30,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Automated rollback to last stable release',
    blockedOnBuildyReason: 'Requires release management and symlink control'
  },
  {
    id: 'trigger_queue_backlog',
    playbookId: 'worker_queue_check',
    label: 'Worker Queue Backlog',
    signalSource: 'Redis / BullMQ',
    conditionLabel: 'Pending > 1000',
    thresholdValue: '1000',
    severity: 'MEDIUM',
    cooldownMinutes: 60,
    requiresHumanApproval: true,
    ubuntuBehavior: 'Worker scaling and restart',
    blockedOnBuildyReason: 'Requires Redis interaction'
  },
  {
    id: 'trigger_ai_unresponsive',
    playbookId: 'local_ai_health_check',
    label: 'Local AI Unresponsive',
    signalSource: 'Ollama API',
    conditionLabel: 'Response time > 5s',
    thresholdValue: '5',
    severity: 'MEDIUM',
    cooldownMinutes: 20,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Service restart and model reload',
    blockedOnBuildyReason: 'Requires local AI provider access'
  },
  {
    id: 'trigger_web_502',
    playbookId: 'web_server_health_check',
    label: 'Web Server Gateway Error',
    signalSource: 'Nginx Error Logs',
    conditionLabel: '502 Count > 10/min',
    thresholdValue: '10',
    severity: 'MEDIUM',
    cooldownMinutes: 10,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Nginx reload and worker health check',
    blockedOnBuildyReason: 'Requires web server service control'
  },
  {
    id: 'trigger_db_integrity',
    playbookId: 'db_restore_dry_run',
    label: 'Backup Integrity Risk',
    signalSource: 'Backup Audit Service',
    conditionLabel: 'Weekly verify failed',
    thresholdValue: 'fail',
    severity: 'HIGH',
    cooldownMinutes: 10080,
    requiresHumanApproval: true,
    ubuntuBehavior: 'System restore dry-run and verification',
    blockedOnBuildyReason: 'Requires database utility and direct host access'
  },
  {
    id: 'trigger_connectivity_drop',
    playbookId: 'offline_fallback_drill',
    label: 'Cloud Connectivity Loss',
    signalSource: 'Network Watchdog',
    conditionLabel: 'Packet loss > 50%',
    thresholdValue: '50',
    severity: 'MEDIUM',
    cooldownMinutes: 120,
    requiresHumanApproval: false,
    ubuntuBehavior: 'Switch to local fallback mode',
    blockedOnBuildyReason: 'Requires networking control and system toggles'
  }
];

export async function getTriggerSettings() {
  try {
    return await VeloAdminSetting.list();
  } catch (err) {
    console.error("[VELO] Failed to list trigger settings:", err);
    return [];
  }
}

export function mergeTriggerWithSettings(trigger: MaintenanceTrigger, settings: VeloAdminSetting[]) {
  const setting = settings.find(s => s.category === 'MAINTENANCE_TRIGGER_RULES' && s.key === trigger.id);
  if (!setting) return { ...trigger, enabled: false, status: 'idle', reviewNotes: '' };
  
  try {
    const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
    return {
      ...trigger,
      enabled: value?.enabled || false,
      status: value?.status || 'idle',
      thresholdValue: value?.thresholdValue || trigger.thresholdValue,
      cooldownMinutes: value?.cooldownMinutes || trigger.cooldownMinutes,
      requiresHumanApproval: value?.requiresHumanApproval ?? trigger.requiresHumanApproval,
      reviewNotes: value?.reviewNotes || ''
    };
  } catch (e) {
    console.error(`[VELO] Failed to parse trigger setting for ${trigger.id}`, e);
    return { ...trigger, enabled: false, status: 'idle', reviewNotes: '' };
  }
}

export async function stageTriggerMatchedRequest(trigger: MaintenanceTrigger, user: any, sampleSignal?: string) {
  try {
    const playbook = MAINTENANCE_PLAYBOOKS.find(p => p.id === trigger.playbookId);
    if (!playbook) throw new Error("Playbook not found");

    const commandText = `AUTOMATED_TRIGGER_MATCH: ${trigger.label} -> ${playbook.title}`;
    
    const newCommand = await VeloDevopsCommand.create({
      command_text: commandText,
      command_type: 'DIAGNOSTIC',
      requested_by_email: 'Autopilot (Staged)',
      requested_by_user_id: 'autopilot',
      status: "staged",
      execution_mode: "buildy_staged",
      risk_level: playbook.riskLevel,
      generated_plan: [
        `[STAGED AUTOMATION] Trigger: ${trigger.label}`,
        `[SIGNAL] ${trigger.signalSource} matched condition: ${trigger.conditionLabel}`,
        `[PLAYBOOK] ${playbook.title}`,
        `[SIMULATED SIGNAL] ${sampleSignal || 'N/A'}`,
        `[ACTION] This would execute: ${playbook.proposedCommands.join(' && ')}`,
        `[APPROVAL] ${trigger.requiresHumanApproval ? 'Required' : 'Automatic (Staged)'}`
      ].join("\n"),
      validation_summary: "Trigger Match Simulated: PASS. Staged review created.",
      ubuntu_activation_notes: `Automation blocked until Ubuntu migration. Trigger logic is active in staged mode only.`
    });

    await logAdminAction(user, "TRIGGER_MATCH_SIMULATED", `Simulated trigger for ${trigger.id}`, 'DEVOPS');
    return newCommand;
  } catch (err) {
    console.error("[VELO] Failed to stage trigger match:", err);
    throw err;
  }
}

export async function updateTriggerSetting(triggerId: string, updates: any, user: any) {
  try {
    const settings = await VeloAdminSetting.list();
    const existing = settings.find(s => s.category === 'MAINTENANCE_TRIGGER_RULES' && s.key === triggerId);
    
    const newValue = JSON.stringify(updates);
    
    if (existing) {
      await VeloAdminSetting.update(existing.id, {
        value: newValue,
        updated_by_email: user.email,
        updated_at_label: new Date().toLocaleString()
      });
    } else {
      await VeloAdminSetting.create({
        category: 'MAINTENANCE_TRIGGER_RULES',
        key: triggerId,
        value: newValue,
        status: 'active',
        updated_by_email: user.email,
        updated_at_label: new Date().toLocaleString()
      });
    }
    
    await logAdminAction(user, "TRIGGER_RULE_UPDATE", `Updated trigger rule ${triggerId}`, 'SYSTEM');
  } catch (err) {
    console.error("[VELO] Failed to update trigger setting:", err);
    throw err;
  }
}
