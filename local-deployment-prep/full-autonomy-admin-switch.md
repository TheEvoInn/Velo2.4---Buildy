# Full Autonomy Admin Switch
# Locked Manual Activation Sequence

This specification defines the multi-step manual activation sequence for "Enable Full Autonomy (Ubuntu Only)".

## Hard-Block Rules
1. **Host Attestation**: The switch logic is physically decoupled from Buildy production. It requires a local Ubuntu host to provide a cryptographic attestation of identity. Buildy cannot self-attest.
2. **Environment Lock**: Any attempt to toggle the switch setting via database edits or API calls without a verified host attestation will be rejected by the Safety Core.
3. **Exact Phrase**: The final activation gate requires the exact phrase `Enable Full Autonomy (Ubuntu Only)` to be typed manually.

## Manual Activation Sequence (Final Readiness Center)
The sequence must be completed in exact order. On Buildy, steps marked [BLOCKED] are non-executable.

| Step | Label | Requirement | Buildy Status |
|------|-------|-------------|---------------|
| 1 | Reference-Only Policy | Confirm no secrets are transmitted to cloud. | **PASSED** |
| 2 | Local Runner Presence | Acknowledge verified local runner heartbeat. | **PASSED** |
| 3 | Export/Restore Dry-Run | Verify data migration pathway is writable. | **PENDING** |
| 4 | Provider Adapter Dry-Run | Verify API connectors can resolve local secrets. | **PENDING** |
| 5 | Browser Handoff Dry-Run | Verify local browser automation adapter link. | **PENDING** |
| 6 | Local Logging Verification | Confirm Black Box immutable log is writable. | **PENDING** |
| 7 | Emergency Halt Test | Simulated hardware/software kill-switch event. | **PENDING** |
| 8 | Rollback Plan Signed | Acknowledgement of failover-to-cloud contract. | **READY** |
| 9 | Host Attestation | Cryptographic hardware/HSM fingerprint verification. | **BLOCKED** |
| 10 | Parallel Validation | Compare cloud results vs local dry-run results. | **BLOCKED** |
| 11 | Admin MFA Verification | Biometric or multi-factor session confirmation. | **READY** |
| 12 | Exact Phrase Match | Manual typing of the activation phrase. | **LOCKED** |

## Reference-Only Credential Policy
During the activation sequence, Buildy never receives secret values. The runner uses a local alias map to verify credential presence:
- Buildy knows only aliases (e.g., `PLATFORM_API_KEY`).
- The runner resolves aliases to actual values locally.
- Reports include only presence status, scope checks, and timestamps.
- Upload of secrets to Buildy is permanently disabled.

## Behaviors Upon Activation (Future Ubuntu Only)
1. **Engine Unlock**: Queued actions for Browser Automation, Form Filling, etc., are moved to the active processing queue.
2. **Credential Injection**: The local vault is authorized to inject secrets into the host-locked engines using local alias resolution.
3. **Black Box Start**: The immutable audit trail begins recording every host-level action.
4. **UI Notification**: A persistent indicator appears in the dashboard: **"UBUNTU AUTONOMY ACTIVE"**.

## Reversal & Rollback
Activation of the switch triggers an automatic "Handshake Period". If the local host fails to maintain a heartbeat or if the Emergency Halt is triggered, the system immediately reverts to Buildy-only mode and requires a full manual re-activation.
