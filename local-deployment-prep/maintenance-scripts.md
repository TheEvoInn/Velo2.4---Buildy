

# VELO Ubuntu Maintenance Script Library

This library contains staged Autopilot playbooks designed to resolve common server issues once VELO is migrated to a local Ubuntu host.

## Current Status: STAGED (Dormant)

While hosted on Buildy, these scripts are **read-only templates**. They cannot be executed, and any "staging" action only creates a record for future review. No shell commands, file modifications, or system changes are performed on the Buildy environment.

## Categories & Playbooks

### 1. STORAGE
- **Disk Space Emergency Triage**: Cleans journal logs and temporary files when disk usage hits critical levels.
- **Log Growth Containment**: Adjusts log retention policies and vacuums system logs.

### 2. MEMORY
- **Memory Pressure Triage**: Identifies memory-heavy processes, clears caches, and restarts worker services to prevent OOM (Out Of Memory) crashes.

### 3. CPU
- **CPU Spike Investigation**: Monitors load average and adjusts process priorities (renice) for non-critical background jobs.

### 4. DEPLOYMENT
- **Failed Service Restart**: Handles systemd daemon reloads and service restarts for the VELO API and workers.
- **Stuck Deployment Rollback**: Reverts symbolic links to the last stable release directory.

### 5. DATABASE
- **Database Backup Verification**: Ensures daily pg_dumps are generated and synced to off-site storage.
- **Database Restore Dry-Run**: Verifies backup integrity by performing a non-destructive restore to a temporary staging database.

### 6. SECURITY
- **SSL Certificate Renewal**: Monitors Let's Encrypt certificates and triggers certbot renewal.
- **Firewall / Port Review**: Audits open ports using UFW and ensures SSH remains restricted to authorized IPs.
- **Package Update Safety Check**: Performs dry-runs of `apt-get upgrade` to identify security vulnerabilities.

### 7. WORKERS
- **Background Worker Queue Check**: Monitors Redis queue depth and scales worker concurrency based on backlog.

### 8. AI
- **Local AI Health Check**: Verifies the status of Ollama/Local vLLM services and GPU VRAM availability.

### 9. NETWORK & SYSTEM
- **Web Server Health Check**: Monitors Nginx status, validates configuration syntax, and reloads/restarts the web server.
- **Offline Fallback Drill**: Simulates internet connectivity loss to verify application behavior in offline-first mode.

## Activation Requirements

Before these scripts can transition from `DORMANT_TEMPLATE` to `ACTIVE_LOCAL` mode, the following requirements must be met:

1.  **Ubuntu Host**: The application must be migrated to a dedicated Ubuntu server.
2.  **Local Operator Role**: A user must be assigned the "Local Operator" role to authorize execution.
3.  **Checklist Completion**: The "Ubuntu Activation Checklist" must be 100% complete and verified.
4.  **Rollback Plan**: A verified full-system rollback/snapshot plan must be in place.
5.  **Black Box Logging**: Local logging via the Black Box system must be active to record every command executed.
6.  **Explicit Admin Authorization**: Each individual playbook must be marked as "Reviewed" in the library.

## Autopilot Usage Pattern (Future)

Once activated, the Autopilot follows this strict execution loop:

1.  **Detection**: Monitors system signals (df, free, top, journalctl).
2.  **Identification**: Matches signals against defined detection signals in the playbook.
3.  **Preflight**: Runs dry-run commands to confirm the issue and check safety.
4.  **Action**: Executes proposed commands with appropriate risk escalation.
5.  **Validation**: Confirms symptoms have cleared via secondary checks.
6.  **Rollback**: If validation fails or new issues arise, executes the predefined rollback plan immediately.

## Admin Guardrails

- **Review Gate**: Playbooks are locked by default until reviewed.
- **Blocking**: Admins can "Block" specific playbooks to prevent any autonomous execution.
- **Staging**: Current Buildy behavior is limited to staging review requests for audit purposes.

## Automation & Triggers (Phase 7D)

VELO now includes an expanded automation trigger layer with default rules for all 15 maintenance playbooks. These rules define when the Autopilot should autonomously initiate a playbook.

### Editable Trigger Rules
Admins can now customize the following trigger parameters via the **Command Bridge**:
- **Enabled/Disabled**: Toggle whether the Autopilot should monitor this specific signal.
- **Threshold Value**: Adjust the numeric or string threshold for trigger matching (e.g., Disk % or Request count).
- **Cooldown Period**: Set a wait time between trigger executions to prevent runaway loops.
- **Approval Requirement**: Toggle whether the action requires explicit admin authorization even after a signal match.
- **Status (Reviewed/Blocked)**: Mark rules for readiness or explicit exclusion.
- **Review Notes**: Document reasoning or specific environment requirements for the rule.

### Trigger Lifecycle
1. **Signal Detection**: Autopilot monitors local host signals (CPU, Memory, Disk, Service Status).
2. **Rule Match**: Signal breaches a defined threshold (e.g., Disk > 90%).
3. **Preflight Check**: Autopilot runs non-destructive checks to confirm the state.
4. **Approval Gate**: If `requiresHumanApproval` is true, a notification is sent to the Command Bridge. If false, it proceeds autonomously (Ubuntu mode only).
5. **Execution**: Playbook commands are executed locally.
6. **Logging**: All steps, signals, and results are logged to the Black Box.

### Manual DevOps Controls
Admins can manually trigger any playbook from the **DevOps Command Deck**. This provides a human-in-the-loop mechanism to resolve issues that haven't hit trigger thresholds or to verify system readiness.

**Note**: On Buildy, both automated matches and manual triggers only create **Staged Review Requests** in the DevOps queue. Editing these rules changes **future Ubuntu behavior** only.
