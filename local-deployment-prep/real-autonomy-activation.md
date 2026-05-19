# VELO Dual-Platform Real-World Mode Architecture

This document outlines the architecture for VELO's dual-platform operating model. VELO is a fully active real-world operator on Buildy for all supported capabilities, while preparing restricted host-locked execution for Ubuntu.

## 1. Dual-Platform Operating Model
VELO operates in two concurrent modes depending on the execution environment and action risk profile.

### Buildy Real-World Mode (Active)
VELO is a live, functional platform on Buildy for all internal and platform-supported operations.
- **Active Operations**: Onboarding, profile management, active beta missions, and database writes are live.
- **Onboarding & Profile Sync**: Completion triggers a safe Autopilot profile sync. This enriches the profile with an AI-generated instruction brief, summary, mission suggestions, selected sectors, preferences, and safety boundaries—feeding downstream content generation and research systems without introducing external execution, credential use, or financial risk. User-authored briefs and summaries are preserved during post-onboarding updates unless forced by the pilot or blank.
- **Autonomous Intelligence**: Autopilot chat, research through supported APIs, and AI content generation are fully functional.
- **Communications**: Real email sending, CRM updates, and event logging are active.
- **Administrative Control**: User invitations, permission management, and system setting updates are operational.
- **Diagnostics**: Real-time readiness checks and health monitoring are active.

### Full Autonomy (Ubuntu Dormant)
Capabilities that require local host access, browser automation, or direct session handling are prepared as dormant workflows.
- **Host-Restricted**: Actions like browser automation, credential-based external login, and local file system writes.
- **Activation Gate**: Full autonomy is locked until an admin manually enables it.
- **Execution Queue**: Workflows are recorded as "Queued for Ubuntu" and remain inert until activation.

## 2. Activation Governance (The Final Cutover)
Ubuntu autonomy is governed by a strict 12-step activation sequence and the manual admin switch.

### Activation Sequence & Dry-Run Validation
1. **Secret Readiness**: Reference-only policy verified.
2. **Dry-Runs & Evidence**: 
    - **Export/Restore**: Verified local DB restoration evidence.
    - **Provider Adapters**: Mock handshake proof recorded.
    - **Browser Handoff**: Local session initialization report reviewed.
3. **Evidence Review**: All required categories must have a 'Passed' status packet before the activation switch is armed.
4. **System Checks**: 
    - **Local Logging**: Filesystem write evidence.
    - **Emergency Halt**: Simulated kill-switch event.
5. **Safety Contracts**: Rollback plan acknowledged and rehearsed.
6. **Final Cutover**: Host Attestation and Parallel Validation passed.
7. **Authorization**: MFA confirmation and manual activation phrase.

### Reference-Only Credential Policy
- Buildy stores and transmits only credential aliases (e.g., `PLATFORM_API_KEY`).
- The local runner resolves aliases to actual values from its own environment or encrypted local vault.
- Secret values are never included in job packets, logs, reports, or UI.
- Upload of secrets to Buildy is permanently disabled.

## 3. The 12 Real Execution Pathways
In Dual-Platform mode, these engines either execute on Buildy or remain dormant for Ubuntu.

| Engine | Buildy State | Ubuntu State |
|--------|--------------|--------------|
| 1. Browser Automation | INACTIVE | DORMANT |
| 2. Form Filling | INACTIVE | DORMANT |
| 3. Platform Onboarding | INACTIVE | DORMANT |
| 4. API Action | ACTIVE (Scoped) | DORMANT (Host-Locked) |
| 5. Messaging | ACTIVE (Internal) | DORMANT (Ext. DMs) |
| 6. Publishing | INACTIVE | DORMANT |
| 7. Trading & Market | INACTIVE | DORMANT |
| 8. Money Movement | INACTIVE | DORMANT |
| 9. Credential Action | ACTIVE (Vault Aliases) | DORMANT (Local Rotation) |
| 10. Workflow Execution | ACTIVE | DORMANT (Local) |
| 11. Local Migration | INACTIVE | DORMANT |
| 12. Connector Activation | ACTIVE | DORMANT (Host) |

## 4. Optimization Recommendations
Before activation, the following optimizations are prioritized:
- **Performance**: Cache readiness summaries to reduce dashboard noise.
- **Safety**: Implement regex-based secret redaction in all runner reporting.
- **UX**: Transition to an Autopilot-first interface for regular pilots.
- **Operations**: Establish a weekly rollback rehearsal schedule.

## 5. Allowed States
- **Buildy Active**: Production environment running on Buildy (Current).
- **Ubuntu Prepared**: All files and scripts staged on Ubuntu but inactive.
- **Ubuntu Armed**: Safety gates passed, waiting for final activation.
- **Ubuntu Active**: Full autonomy enabled; Ubuntu-locked actions executing.
- **Emergency Halted**: All Ubuntu execution stopped immediately.
- **Rollback Required**: Reverting to Buildy-only mode.

## 7. Wave Notes
- **Wave: Autopilot Control Consolidation**: Centralized setup and workflow guidance through the Autopilot Control Center. Regular users see simplified outcome-based language in the Dashboard, Officer, and Connection Hub. Advanced diagnostics and technical configuration remain accessible to administrators. Security boundaries (no live external action without approval, permission before moving money, review of high-risk actions) are strictly preserved and explicitly stated in the UI.
- **Wave: Regular-User View Hardening**: Hardened regular-user Autopilot setup view to remove internal jargon (neural, uplink, runtime, tier, Ubuntu, host, adapter, executor, dry-run, evidence packet, command bridge, connector mode) and separate admin diagnostics from user guidance. Safety guardrails are now explicitly displayed as everyday rules.
- **Wave: Content Capability Expansion (Wave 1)**: Expanded VELO AI content generation around deliverable-ready writing/editing packs. The Work Archive now supports richer asset types, quality scoring, and automated checklists. Improved reuse logic allows the AI to reference previous drafts with higher precision while maintaining strict manual-review/draft-only safety boundaries.
- **Wave: Self-Learning Quality Loop**: Integrated a safe content-learning loop that captures high-quality patterns and reuse signals from the Work Archive. This data provides compact intelligence guidance to future draft generation, allowing the system to naturally align with user style and successful past performance without external execution or data leaks.

- **Wave: Connection & Setup Simplification**: Simplified connection and setup language for regular users, removing technical jargon (bridge, runner, handshake, registry) and replacing it with clear, outcome-based guidance. Buildy Cloud is highlighted as ready by default, with desktop tools presented as optional helpers. Safety rules are explicitly stated as everyday guardrails, while admin diagnostics remain preserved for administrators.

## 8. Black Box Logging
Every action attempts to write to a local "Black Box" log. If this log is unreachable or unwritable, Ubuntu autonomy is automatically suspended.
