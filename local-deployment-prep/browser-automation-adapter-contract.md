# Ubuntu Browser Automation Adapter Contract v1.0.0

This contract defines the interface and safety requirements for VELO's browser automation, form filling, and platform onboarding capabilities when running on a local Ubuntu host.

## 1. Runtime Targets
The local host must provide one or more of the following browser runtimes:
- **Chromium / Chrome**: Playwright or Puppeteer compatible.
- **Firefox**: Playwright compatible.
- **WebKit**: Playwright compatible.
- **Isolated Compliance Browser Profile**: Isolated browser context for respectful, rule-compliant interactions.
- **Remote Debugging Session**: Ability to attach to an existing browser instance.

## 2. Handoff Lifecycle
1. **Queued Request**: Buildy staging area identifies an action requiring browser control.
2. **Handoff Packet**: VELO prepares a safe JSON packet containing the objective, allowed domain, and expected steps.
3. **Local Approval**: The runner prompts the local user for explicit permission to launch the browser step.
4. **Local Browser Step**: The runner executes the step locally using the target runtime.
5. **Friction Pause**: If a CAPTCHA or MFA is encountered, the runner pauses for human intervention.
6. **Evidence Report**: The runner captures sanitized screenshots and log summaries as evidence.
7. **Autopilot Review**: VELO receives the evidence and determines the next Autopilot mission step.

## 3. Local Adapter Interface (Signatures)
The local Ubuntu adapter must implement the following function signatures:
- `browser_adapter.verifyRuntime(runtimeProfile)`: Ensures the requested browser is installed and configured.
- `browser_adapter.launchSession(profileRef, safetyContext)`: Starts a new session with specific safety rules.
- `browser_adapter.restoreSession(sessionRef, credentialRef)`: Reconstitutes an existing authenticated session.
- `browser_adapter.navigate(sessionId, url, safetyContext)`: Navigates to a target URL within safety boundaries.
- `browser_adapter.fillForm(sessionId, formMap, safetyContext)`: Fills form fields based on provided data map.
- `browser_adapter.uploadFile(sessionId, selector, fileRef)`: Uploads a file from the local asset vault.
- `browser_adapter.extractPageData(sessionId, extractionMap)`: Extracts structured data from the current page.
- `browser_adapter.captureEvidence(sessionId, evidencePolicy)`: Takes a screenshot or captures the DOM state.
- `browser_adapter.pauseForHuman(sessionId, reason)`: Suspends execution and notifies the user.
- `browser_adapter.closeSession(sessionId, auditContext)`: Safely terminates the browser and logs the final state.

## 4. Safety Core Requirements
- **Explicit Trigger**: No browser action occurs without a user request or pre-approved mission trigger.
- **Domain Policy**: Actions are restricted to a whitelist of allowed platforms and domains.
- **Isolation**: Each account/session must operate in a completely isolated browser context.
- **No Sensitive Logging**: Passwords, raw cookies, and sensitive PII are never recorded in plain text logs.
- **Human Handoff**: Captchas and MFA are never bypassed; they must trigger a human handoff.
- **Platform Rules**: VELO must not bypass captcha, MFA, access controls, paywalls, account restrictions, rate limits, or platform rules.
- **Evidence Management**: Screenshots must be filtered to prevent accidental capture of sensitive background data.
- **Audit Consistency**: Every interaction must be timestamped and linked to a specific mission ID in the Black Box.

## 5. Preflight Validation (Buildy Mode)
VELO performs the following checks before a browser handoff is prepared:
1. **Script Validation**: Ensures automation steps are syntactically correct and follow allowed patterns.
2. **Vault Check**: Verifies that required session cookies or credentials exist in the Secure Vault (for local injection).
3. **Platform Check**: Confirms the target domain is not blocked by current safety policies.
4. **Asset Check**: Ensures all required files for upload are available in the local vault.

## 6. Status: Ready for Local Handoff
This contract is active for **local runner handoff**. Buildy prepares the safe action packet and waits for local runner pickup. Real browser execution remains gated by local runner approval.
