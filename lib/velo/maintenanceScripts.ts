
import { VeloDevopsCommand } from "@/entities";
import { logAdminAction } from "./devopsCommand";

export interface MaintenancePlaybook {
  id: string;
  title: string;
  category: 'STORAGE' | 'MEMORY' | 'CPU' | 'NETWORK' | 'DATABASE' | 'SECURITY' | 'DEPLOYMENT' | 'WORKERS' | 'AI' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  executionMode: 'DORMANT_TEMPLATE' | 'ACTIVE_LOCAL' | 'STAGED_REVIEW';
  issueSymptoms: string[];
  detectionSignals: string[];
  preflightChecks: string[];
  dryRunCommands: string[];
  proposedCommands: string[];
  rollbackPlan: string;
  manualFallbackSteps: string[];
  requiredUbuntuChecklistIds: string[];
  blockedOnBuildyReason: string;
}

export const MAINTENANCE_PLAYBOOKS: MaintenancePlaybook[] = [
  {
    id: 'disk_space_emergency',
    title: 'Disk Space Emergency Triage',
    category: 'STORAGE',
    severity: 'CRITICAL',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Database write failures',
      'Log recording failures',
      'System-wide "No space left on device" errors'
    ],
    detectionSignals: [
      'df -h / | grep "100%"',
      'du -sh /var/log | grep "[0-9]G"'
    ],
    preflightChecks: [
      'Check which partitions are full',
      'Identify largest log files',
      'Verify backup status'
    ],
    dryRunCommands: [
      'find /var/log -type f -name "*.log" -size +100M -exec ls -lh {} \\;',
      'du -ah / | sort -rh | head -n 20'
    ],
    proposedCommands: [
      'journalctl --vacuum-time=1d',
      'find /var/log -type f -name "*.log.1" -delete',
      'apt-get clean'
    ],
    rollbackPlan: 'Logs deleted are non-recoverable. Ensure journald retention policies are updated after triage.',
    manualFallbackSteps: [
      'Manually delete archived logs',
      'Resize block storage via cloud provider console',
      'Move large assets to object storage'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host', 'local_file_write_adapter'],
    blockedOnBuildyReason: 'Requires direct file system access and root-level clean commands.'
  },
  {
    id: 'log_growth_containment',
    title: 'Log Growth Containment',
    category: 'STORAGE',
    severity: 'MEDIUM',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Slower system responsiveness',
      'Unexpected storage consumption'
    ],
    detectionSignals: [
      'journalctl --disk-usage',
      'ls -lS /var/log | head'
    ],
    preflightChecks: [
      'Review logrotate configuration',
      'Check journald.conf max usage settings'
    ],
    dryRunCommands: [
      'journalctl --vacuum-size=500M --dry-run'
    ],
    proposedCommands: [
      'journalctl --vacuum-size=1G',
      'systemctl restart logrotate'
    ],
    rollbackPlan: 'Increase retention settings in /etc/systemd/journald.conf if too much history was lost.',
    manualFallbackSteps: [
      'Compress old logs manually',
      'Adjust application log levels (debug -> info)'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host', 'black_box_local_logging'],
    blockedOnBuildyReason: 'Requires modification of system-level logging services.'
  },
  {
    id: 'memory_pressure_triage',
    title: 'Memory Pressure Triage',
    category: 'MEMORY',
    severity: 'HIGH',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'OOM Killer activity in dmesg',
      'Application swaps excessively',
      'Worker processes crashing'
    ],
    detectionSignals: [
      'free -m | grep "Mem:"',
      'dmesg | grep -i "oom"'
    ],
    preflightChecks: [
      'Identify processes consuming most RSS',
      'Check swap usage'
    ],
    dryRunCommands: [
      'ps aux --sort=-%mem | head -n 10'
    ],
    proposedCommands: [
      'systemctl restart velo-worker',
      'echo 3 > /proc/sys/vm/drop_caches'
    ],
    rollbackPlan: 'Processes will restart. If pressure continues, vertical scaling is required.',
    manualFallbackSteps: [
      'Stop non-essential background services',
      'Increase swap file size'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires process management and sysctl access.'
  },
  {
    id: 'cpu_spike_investigation',
    title: 'CPU Spike Investigation',
    category: 'CPU',
    severity: 'HIGH',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'High request latency',
      'Dashboard timeouts',
      'Load average > CPU count'
    ],
    detectionSignals: [
      'uptime',
      'top -b -n 1 | head -n 20'
    ],
    preflightChecks: [
      'Identify high CPU threads',
      'Check for runaway background jobs'
    ],
    dryRunCommands: [
      'mpstat 1 5',
      'pidstat -u 1 5'
    ],
    proposedCommands: [
      'renice +10 -p $(pgrep -f "heavy-job")',
      'systemctl reload nginx'
    ],
    rollbackPlan: 'Renice back to 0 if performance degrades further.',
    manualFallbackSteps: [
      'Kill runaway PID manually',
      'Scale horizontally if load is legitimate traffic'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires process priority adjustment and system monitoring tools.'
  },
  {
    id: 'failed_service_restart',
    title: 'Failed Service Restart Workflow',
    category: 'DEPLOYMENT',
    severity: 'CRITICAL',
    riskLevel: 'HIGH',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Service status: "failed"',
      'Connection refused on specific ports',
      'Partial system outage'
    ],
    detectionSignals: [
      'systemctl is-active velo-api',
      'netstat -tulpn | grep 3000'
    ],
    preflightChecks: [
      'Read failed service logs',
      'Check for configuration syntax errors'
    ],
    dryRunCommands: [
      'systemd-analyze verify velo-api.service'
    ],
    proposedCommands: [
      'systemctl daemon-reload',
      'systemctl restart velo-api',
      'systemctl enable velo-api'
    ],
    rollbackPlan: 'Check journalctl -u velo-api for boot errors. Revert configuration if restart fails.',
    manualFallbackSteps: [
      'Start service in foreground for debugging',
      'Revert to previous stable deployment'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host', 'local_file_write_adapter'],
    blockedOnBuildyReason: 'Requires systemd interaction and root-level service control.'
  },
  {
    id: 'db_backup_verification',
    title: 'Database Backup Verification',
    category: 'DATABASE',
    severity: 'MEDIUM',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Old backup timestamps',
      'Missing daily dump files'
    ],
    detectionSignals: [
      'find /backups -mtime -1 -name "*.sql.gz"',
      'du -sh /backups/*.sql.gz'
    ],
    preflightChecks: [
      'Verify backup script cron job',
      'Check storage availability on backup target'
    ],
    dryRunCommands: [
      'pg_dump --schema-only velo_db > /tmp/test_dump.sql'
    ],
    proposedCommands: [
      'bash /usr/local/bin/velo-backup.sh',
      'aws s3 sync /backups s3://velo-backups/'
    ],
    rollbackPlan: 'Verify local backup integrity before syncing to cloud.',
    manualFallbackSteps: [
      'Run manual pg_dump',
      'Transfer dump file via SCP'
    ],
    requiredUbuntuChecklistIds: ['local_database_restore'],
    blockedOnBuildyReason: 'Requires database utility access and file system interaction.'
  },
  {
    id: 'ssl_cert_renewal_check',
    title: 'SSL Certificate Renewal Check',
    category: 'SECURITY',
    severity: 'HIGH',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Browser "Not Secure" warnings',
      'Expired certificate errors in logs'
    ],
    detectionSignals: [
      'certbot certificates',
      'openssl x509 -enddate -noout -in /etc/letsencrypt/live/domain/fullchain.pem'
    ],
    preflightChecks: [
      'Check port 80/443 availability',
      'Verify DNS propagation'
    ],
    dryRunCommands: [
      'certbot renew --dry-run'
    ],
    proposedCommands: [
      'certbot renew',
      'systemctl reload nginx'
    ],
    rollbackPlan: 'Check Let\'s Encrypt logs for rate limits or challenge failures.',
    manualFallbackSteps: [
      'Manual certificate install via cloud panel',
      'Temporary bypass for internal traffic'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires certbot and web server configuration access.'
  },
  {
    id: 'firewall_port_review',
    title: 'Firewall / Open Port Review',
    category: 'SECURITY',
    severity: 'MEDIUM',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Unauthorized access attempts',
      'Exposed internal services'
    ],
    detectionSignals: [
      'ufw status verbose',
      'nmap -sT -O localhost'
    ],
    preflightChecks: [
      'List all listening ports',
      'Identify established external connections'
    ],
    dryRunCommands: [
      'ufw status'
    ],
    proposedCommands: [
      'ufw deny 3306',
      'ufw allow from 192.168.1.0/24 to any port 22'
    ],
    rollbackPlan: 'Ensure SSH port 22 remains open to avoid lockout.',
    manualFallbackSteps: [
      'Use VPS cloud console to reset firewall',
      'Stop listener service if port cannot be blocked'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires ufw/iptables management.'
  },
  {
    id: 'package_update_safety',
    title: 'Package Update Safety Check',
    category: 'SECURITY',
    severity: 'LOW',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Security vulnerabilities in system packages',
      'Outdated library warnings'
    ],
    detectionSignals: [
      'apt list --upgradable',
      'unattended-upgrade --dry-run'
    ],
    preflightChecks: [
      'Create system snapshot/backup',
      'Check for breaking changes in upstream repos'
    ],
    dryRunCommands: [
      'apt-get upgrade -s'
    ],
    proposedCommands: [
      'apt-get update',
      'apt-get upgrade -y'
    ],
    rollbackPlan: 'Revert to pre-update snapshot if system stability is compromised.',
    manualFallbackSteps: [
      'Individual package rollback',
      'Full system restore from snapshot'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host', 'final_cutover_authorization'],
    blockedOnBuildyReason: 'Requires apt-get package manager access.'
  },
  {
    id: 'stuck_deployment_rollback',
    title: 'Stuck Deployment Rollback',
    category: 'DEPLOYMENT',
    severity: 'HIGH',
    riskLevel: 'HIGH',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Deployment hung for > 10 mins',
      'Half-updated source code',
      'Missing build assets'
    ],
    detectionSignals: [
      'ls -la /var/www/velo/current',
      'grep "error" /var/log/deploy.log'
    ],
    preflightChecks: [
      'Identify last stable build ID',
      'Check for database migration locks'
    ],
    dryRunCommands: [
      'ls -la /var/www/velo/releases'
    ],
    proposedCommands: [
      'ln -sfn /var/www/velo/releases/stable /var/www/velo/current',
      'systemctl restart velo-api'
    ],
    rollbackPlan: 'Point symbolic link back if rollback fails. Check file permissions.',
    manualFallbackSteps: [
      'Manual git checkout of stable tag',
      'Overwrite current directory with backup'
    ],
    requiredUbuntuChecklistIds: ['local_file_write_adapter', 'local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires symlink manipulation and file system write access.'
  },
  {
    id: 'worker_queue_check',
    title: 'Background Worker Queue Check',
    category: 'WORKERS',
    severity: 'MEDIUM',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Delayed email notifications',
      'Slow data sync tasks',
      'Backlog of pending missions'
    ],
    detectionSignals: [
      'redis-cli llen velo_queue',
      'ps aux | grep "worker.js" | grep -v grep'
    ],
    preflightChecks: [
      'Check Redis/RabbitMQ health',
      'Verify worker process count'
    ],
    dryRunCommands: [
      'redis-cli info stats'
    ],
    proposedCommands: [
      'systemctl restart velo-worker',
      'pm2 scale velo-worker +2'
    ],
    rollbackPlan: 'Monitor CPU/Memory after scaling workers.',
    manualFallbackSteps: [
      'Clear dead letters from queue',
      'Increase worker concurrency in config'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires process scaling and Redis interaction.'
  },
  {
    id: 'local_ai_health_check',
    title: 'Local AI Service Health Check',
    category: 'AI',
    severity: 'MEDIUM',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Local LLM inference timeouts',
      'Model loading errors',
      'High GPU VRAM consumption'
    ],
    detectionSignals: [
      'ollama list',
      'nvidia-smi',
      'curl localhost:11434/api/tags'
    ],
    preflightChecks: [
      'Check VRAM availability',
      'Verify model file integrity'
    ],
    dryRunCommands: [
      'ollama run llama3 "Hi" --verbose'
    ],
    proposedCommands: [
      'systemctl restart ollama',
      'ollama pull llama3'
    ],
    rollbackPlan: 'Switch back to Cloud LLM fallback if local service remains unstable.',
    manualFallbackSteps: [
      'Stop other GPU-heavy processes',
      'Downgrade to smaller model (e.g. 7b -> 3b)'
    ],
    requiredUbuntuChecklistIds: ['local_ai_provider'],
    blockedOnBuildyReason: 'Requires local GPU/CPU execution context and Ollama API.'
  },
  {
    id: 'web_server_health_check',
    title: 'Web Server Health Check',
    category: 'NETWORK',
    severity: 'MEDIUM',
    riskLevel: 'LOW',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Occasional 502 Bad Gateway errors',
      'Slow request termination',
      'Nginx worker process crashes'
    ],
    detectionSignals: [
      'nginx -t',
      'tail -n 50 /var/log/nginx/error.log',
      'systemctl status nginx'
    ],
    preflightChecks: [
      'Verify nginx configuration syntax',
      'Check if upstream application is responding'
    ],
    dryRunCommands: [
      'nginx -t',
      'curl -I localhost'
    ],
    proposedCommands: [
      'systemctl reload nginx',
      'systemctl restart nginx'
    ],
    rollbackPlan: 'Revert any recent changes to /etc/nginx/sites-available/ if reload fails.',
    manualFallbackSteps: [
      'Check file permissions for web root',
      'Verify port 80/443 aren\'t blocked by other processes'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires Nginx service management and config access.'
  },
  {
    id: 'db_restore_dry_run',
    title: 'Database Restore Dry-Run',
    category: 'DATABASE',
    severity: 'HIGH',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Data integrity concerns',
      'Requirement to verify backup recoverability'
    ],
    detectionSignals: [
      'ls -l /backups/latest.sql.gz'
    ],
    preflightChecks: [
      'Create temporary staging database',
      'Verify available disk space for restore'
    ],
    dryRunCommands: [
      'gunzip -c /backups/latest.sql.gz | head -n 100'
    ],
    proposedCommands: [
      'dropdb --if-exists velo_staging',
      'createdb velo_staging',
      'gunzip -c /backups/latest.sql.gz | psql velo_staging'
    ],
    rollbackPlan: 'Delete the staging database to free up space. No impact on production.',
    manualFallbackSteps: [
      'Manually restore schema first to check for compatibility',
      'Verify table counts after restore'
    ],
    requiredUbuntuChecklistIds: ['local_database_restore', 'local_ubuntu_host'],
    blockedOnBuildyReason: 'Requires direct PostgreSQL utility access and significant disk I/O.'
  },
  {
    id: 'offline_fallback_drill',
    title: 'Offline Fallback Drill',
    category: 'SYSTEM',
    severity: 'MEDIUM',
    riskLevel: 'MEDIUM',
    executionMode: 'DORMANT_TEMPLATE',
    issueSymptoms: [
      'Cloud API latency spikes',
      'Intermittent internet connectivity on local host'
    ],
    detectionSignals: [
      'ping -c 3 8.8.8.8',
      'curl -m 5 https://api.openai.com/v1/models'
    ],
    preflightChecks: [
      'Verify Local AI is loaded and responsive',
      'Check local cache status for essential data'
    ],
    dryRunCommands: [
      'curl -I localhost:11434'
    ],
    proposedCommands: [
      'systemctl start velo-offline-mode',
      'iptables -A OUTPUT -p tcp --dport 443 -j REJECT'
    ],
    rollbackPlan: 'Stop offline mode service and flush iptables rules.',
    manualFallbackSteps: [
      'Manually switch application toggle to "Offline"',
      'Monitor local database for write accumulation'
    ],
    requiredUbuntuChecklistIds: ['local_ubuntu_host', 'local_ai_provider'],
    blockedOnBuildyReason: 'Requires networking/iptables control and local service toggles.'
  }
];

export function getMaintenancePlaybooks() {
  return MAINTENANCE_PLAYBOOKS;
}

export function filterMaintenancePlaybooks(query: string, category?: string) {
  return MAINTENANCE_PLAYBOOKS.filter(p => {
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase()) || 
                        p.issueSymptoms.some(s => s.toLowerCase().includes(query.toLowerCase()));
    const matchesCategory = !category || p.category === category;
    return matchesQuery && matchesCategory;
  });
}

export function getMaintenanceCategories() {
  return Array.from(new Set(MAINTENANCE_PLAYBOOKS.map(p => p.category)));
}

export async function stageMaintenanceRequest(playbook: MaintenancePlaybook, user: any) {
  try {
    const commandText = `MAINTENANCE_PLAYBOOK_STAGED: ${playbook.title}`;
    
    const newCommand = await VeloDevopsCommand.create({
      command_text: commandText,
      command_type: 'DIAGNOSTIC',
      requested_by_email: user.email,
      requested_by_user_id: user.id,
      status: "staged",
      execution_mode: "buildy_staged",
      risk_level: playbook.riskLevel,
      generated_plan: [
        `[STAGED TEMPLATE] Target Playbook: ${playbook.title}`,
        `[NOTICE] This action is dormant on Buildy and will not execute shell commands.`,
        `[MODE] ${playbook.executionMode}`,
        `Risk: ${playbook.riskLevel}`,
        `Template Commands: ${playbook.proposedCommands.join(' && ')}`,
        `Preflight: ${playbook.preflightChecks.join(', ')}`,
        `Rollback Strategy: ${playbook.rollbackPlan}`
      ].join("\n"),
      validation_summary: "Simulated pre-flight validation: PASS (Staged only. No real environment validation performed.)",
      ubuntu_activation_notes: `Awaiting Ubuntu activation checklist completion: ${playbook.requiredUbuntuChecklistIds.join(', ')}. Action is currently write-protected.`
    });

    await logAdminAction(user, "MAINTENANCE_STAGED", `Staged maintenance playbook review: ${playbook.id}`, 'DEVOPS');
    return newCommand;
  } catch (err) {
    console.error("[VELO] Failed to stage maintenance request:", err);
    throw err;
  }
}
