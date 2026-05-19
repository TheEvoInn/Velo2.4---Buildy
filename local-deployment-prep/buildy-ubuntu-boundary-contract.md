# Buildy ↔ Ubuntu Security Boundary Contract
## Dormant Integration Logic & Strict Security Boundaries

This document defines the strict security boundaries between the active **Buildy** production environment and the dormant **Ubuntu** layer. These rules ensure that sensitive data remains protected and that high-risk actions are only executed in the correct environment after verified activation.

---

### 1. Production Boundary: Buildy Active, Ubuntu Dormant

- **Buildy (Cloud)**: The active production environment. It handles all safe, supported, and cloud-native workflows.
- **Ubuntu (Local Host)**: Remains strictly **dormant**. No connection, deployment, or execution is permitted until a verified administrator activates the host using the manual activation phrase.

### 2. Allowed on Buildy Now (Active)

The following categories of actions are permitted on Buildy today:
- **Onboarding & Profiles**: Internal platform setup and user profile management.
- **AI Guidance**: Autopilot chat, intent parsing, and content drafting.
- **Safe Research**: Market data gathering via public, safe-to-call internal APIs.
- **Admin Diagnostics**: Health monitoring and readiness tracking.
- **Platform Native Comms**: Built-in CRM, events, and email integrations (`contacts()`, `events()`, `sendEmail()`).

### 3. Ubuntu-Only Dormant Actions (Blocked)

The following high-risk categories are permanently blocked on Buildy and queued for Ubuntu later:
- **Browser Automation**: Any headless browser control (Playwright/Puppeteer) or UI-based site interaction.
- **Credential-Based Login**: Authenticating into external portals using stored passwords or session data.
- **External Submissions**: Filling forms or submitting applications to third-party platforms.
- **Financial Execution**: Trading, money movement, and brokerage actions.
- **Protected Scraping**: Gathering data from sites that require authentication.

### 4. Data That Must NEVER Cross the Boundary

The following data types are trapped in the cloud vault or local HSM and must never cross the boundary in job packets, logs, or UI:
- **Raw Passwords**: Plaintext or reversible hashes.
- **OAuth Refresh Tokens**: Long-lived tokens for persistent access.
- **Session Cookies**: Serialized browser session fragments.
- **Decrypted Vault Values**: Any secret in its unencrypted state.
- **Private Keys**: RSA/ECC keys or seed phrases.
- **Identity Documents**: Images or data from passports, IDs, or financial statements.

### 5. Safe Integration Packet Contract

Job packets sent from Buildy to Ubuntu (once active) must use references only. Secrets are resolved locally by the runner using alias maps.

**Allowed Packet Fields:**
- `mission_id`: Reference to the triggering mission record.
- `request_id`: Unique identifier for the execution request.
- `action_category`: e.g., `BROWSER_AUTOMATION`, `FINANCIAL_TRADE`.
- `risk_level`: Calculated risk score (1-10).
- `connector_ref_id`: Reference to the connector configuration.
- `credential_alias`: Alias name used to fetch the secret locally (never the secret itself).
- `approval_nonce`: Cryptographic proof of admin approval.
- `redacted_summary`: Human-readable summary of the intended outcome.

**Reference-Only Credential Policy:**
- Buildy stores and transmits only credential aliases and metadata (e.g., `PLATFORM_API_KEY`).
- The local runner resolves aliases to actual secrets from its own environment or encrypted local vault.
- The runner reports only presence status, scope checks, and timestamps. Secret values are never included in reports.
- Upload of secrets to Buildy is permanently disabled (`allowSecretUpload: false`).

### 6. Required Activation Gates

Ubuntu execution is only possible after:
1. **User Intent**: Verified user request or mission trigger.
2. **Admin Approval**: Explicit approval for high-risk categories.
3. **Safety Core Pass**: Automated validation of the action against safety rules.
4. **Host Attestation**: Physical verification of the Ubuntu host identity.
5. **Local Vault Readiness**: Local encrypted vault availability confirmed by the runner (values remain local).
6. **Black Box Logging**: Active local telemetry recording.
7. **Emergency Halt**: Verified kill-switch connectivity.
8. **No-Secret Boundary**: Runner confirms it will never transmit secrets.
9. **Rollback Acknowledged**: Failover-to-cloud plan is confirmed.
10. **Activation Phrase**: Manual entry of "Enable Full Autonomy (Ubuntu Only)".

### 7. Final Handshake Preflight (Runner Side)

Before the runner reports readiness for host attestation, it must verify:
- **Protocol Version Check**: Runner and cloud protocol versions match.
- **Runner Identity / Fingerprint**: Device fingerprint is stable and verified.
- **No-Secret Boundary Acknowledgement**: Runner explicitly confirms the no-transmit policy.
- **Emergency Halt Acknowledgement**: Runner confirms it can stop on command.
- **Local Audit Log Readiness**: Local log volume is writable and recording.
- **Rollback Acknowledgement**: Runner confirms cloud-only reversion capability.

### 8. Non-Activation Statement

**THIS DOCUMENT DOES NOT ACTIVATE UBUNTU.** This is a read-only boundary contract designed to enforce security during the dormant preparation phase.
