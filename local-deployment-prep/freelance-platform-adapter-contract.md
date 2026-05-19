# Ubuntu Freelance Platform Adapter Contract v1

## Status: DORMANT ON BUILDY

This contract defines the local adapter interface for freelance platform integrations within the VELO autonomy layer. It governs job discovery, application submission, client communication, and contract management.

## Provider Targets
- **Upwork**: Approved APIs and user-authorized marketplace review.
- **Fiverr**: Official marketplace and order management portals.
- **Freelancer.com**: Bidding marketplace and project portals.
- **Contra / Toptal**: Profile-first marketplaces and high-end matching.
- **LinkedIn Services**: Job search and service request integration following platform rules.
- **Private Portals**: User-authorized client project management systems.

## Dependency Contracts
- `ubuntu_browser_automation_v1`: For all platform navigation and form interaction.
- `ubuntu_email_v1`: For email-based notifications and client messaging fallbacks.

## Capability Matrix
- **platform_profile_sync**: Bidirectional synchronization of profile data, availability, and stats.
- **opportunity_discovery**: Approved-source syncing or user-authorized review of visible opportunities where platform rules allow.
- **job_detail_extraction**: Allowed job-detail parsing from approved sources or user-authorized pages.
- **fit_scoring_context_sync**: Mapping job details to Clone Bay profile strengths for evaluation.
- **application_draft_prepare**: AI-assisted drafting of proposals and cover letters in-situ.
- **application_submission_request**: Controlled submission of applications following admin review.
- **proposal_attachment_mapping**: Secure mapping of portfolio assets to platform upload selectors.
- **client_message_sync**: Inbound/outbound message synchronization for active threads.
- **client_reply_draft**: Staging of client replies for human or high-trust autopilot review.
- **contract_status_sync**: Tracking of active contracts, milestones, and payment schedules.
- **deliverable_upload_request**: Automated submission of work assets to platform delivery portals.
- **milestone_invoice_sync**: Monitoring of invoice status and payment clearance.
- **dispute_or_policy_escalation**: Automated detection of platform policy violations or client disputes.
- **human_review_checkpoint**: Mandatory handoff for MFA, captcha, or complex policy decisions.
- **rate_limit_guard**: Respect provider rate limits and platform automation policies.
- **platform_compliance_guard**: Enforcement of Terms of Service (no unauthorized scraping, no bypassing protections).
- **black_box_audit**: Immutable logging of every platform interaction.

## Local Adapter Function Contracts
```typescript
// Core platform interaction signatures for local Ubuntu implementation
freelance_adapter.verifyPlatformProfile(platformProfileRef, credentialRef);
freelance_adapter.syncOpportunities(platformRef, searchPolicy, safetyContext);
freelance_adapter.extractJobDetail(opportunityRef, extractionPolicy);
freelance_adapter.prepareApplicationDraft(applicationPacket, profileRef, safetyContext);
freelance_adapter.requestApplicationSubmission(applicationId, submissionPolicy);
freelance_adapter.syncClientMessages(platformRef, cursor, safetyContext);
freelance_adapter.prepareClientReply(threadRef, replyDraft, safetyContext);
freelance_adapter.requestDeliverableUpload(jobRef, deliverableRef, safetyContext);
freelance_adapter.syncContractStatus(platformRef, cursor);
freelance_adapter.pauseForHuman(reviewReason, evidenceRef);
freelance_adapter.recordOutcome(platformActionRef, outcomeStatus);
```

## Credential & Session Requirements
- **Encrypted Session Reference**: Browser session data (cookies, local storage) stored in local Secure Core.
- **Clone Bay Linkage**: Direct mapping to a verified professional profile and portfolio assets.
- **Payout Redaction**: Banking and payout data is referenced by label only; raw credentials never touch the execution engine.
- **MFA Handoff**: Local runtime must support human-in-the-loop for 2FA/Captcha triggers.

## Safety Core Gates
1. **Explicit Trigger**: No platform action without a user request or an approved Autopilot workflow trigger.
2. **Domain Policy Check**: Validation against platform-specific automation policies.
3. **Application Review**: Proposals must be staged and reviewed before external submission.
4. **Attachment Verification**: Assets must be checked for sensitivity before upload.
5. **Policy Compliance**: Requests and actions must stay within documented provider limits and platform policies.
6. **Black Box Entry**: Log created BEFORE the action starts, with state updates at every checkpoint.

## Failure Handling
- **Session Expiry**: Immediate halt and request for human re-authentication.
- **Layout Change**: Detection of extraction failure triggers an "Adapter Update Required" event.
- **Platform Checkpoint**: Automated pause if rate limits or provider protection checkpoints are detected.
- **Dispute Detection**: Immediate escalation to Command Bridge if a client initiates a dispute.

## Compliance
- **No Bypass**: VELO must not bypass captcha, MFA, access controls, paywalls, account restrictions, rate limits, anti-abuse systems, or platform rules.
- **Human Handoff**: Security challenges must be resolved by a human operator.
- **No Terms Violation**: Adapters must operate within the legal and technical boundaries of each platform.
- **Privacy**: No PII or sensitive client data is logged outside the local Black Box.
