
# Ubuntu Adapter Contract: Email Provider Family

This document defines the technical and safety contract for the **Email Provider Family** within VELO's real-world execution layer. 

**Status:** DORMANT (Active only on verified Ubuntu hosts)

## 1. Supported Providers
The adapter is designed to interface with the following provider types:
- **SMTP-Compatible**: Generic mail servers, custom domain SMTP.
- **Gmail OAuth**: Google Cloud Platform project with Mail.Send/Read scopes.
- **Outlook/Microsoft Graph**: Azure AD app registrations.
- **Transactional APIs**: Postmark, SendGrid, Resend.

## 2. Capabilities Matrix
| Capability | Description |
|------------|-------------|
| `outbound_send` | Send new email messages via verified providers. |
| `inbound_sync` | Sync and parse incoming threads for Autopilot context. |
| `reply_to_thread` | Continue existing conversations with thread ID mapping. |
| `draft_only_mode` | Prepare messages for manual review before sending. |
| `attachment_upload` | Handle secure file attachments from media arsenal. |
| `bounce_tracking` | Record and react to delivery failures. |
| `unsubscribe_handling`| Respect suppression lists and opt-out headers. |
| `rate_limit_guard` | Prevent provider-level blocks via interval control. |

## 3. Local Adapter Contract (Local Functions)
The Ubuntu host must implement the following function signatures:
- `email_adapter.verifyProvider(profile, credentialRef)`
- `email_adapter.sendMessage(message, credentialRef, safetyContext)`
- `email_adapter.fetchInboundThreads(cursor, credentialRef)`
- `email_adapter.replyToThread(threadId, message, credentialRef, safetyContext)`
- `email_adapter.validateSuppression(recipient)`
- `email_adapter.attachFiles(files, credentialRef)`
- `email_adapter.recordDeliveryStatus(messageId)`

## 4. Credential Requirements
- **OAuth Access/Refresh Tokens**: Required for Gmail/Outlook.
- **Scoped API Keys**: Required for Postmark/SendGrid/Resend.
- **SMTP Secrets**: Host, port, username, password (stored encrypted).
- **Identity Label**: The verified "From" address label used for mapping.

## 5. Safety Core Gates
Every email operation must pass through these filters:
1. **Request Intent**: Must be an explicit user request or a mission-critical workflow.
2. **Boundary Validation**: Recipient domain/address must not be blocked or blacklisted.
3. **Identity Check**: Sender address must match a verified identity in the profile.
4. **Secure Core Isolation**: No raw credential values are logged or shown.
5. **Rate Limiting**: Checks local history to prevent spam-like patterns.
6. **Black Box Audit**: Logs the intent and status before and after execution.

## 6. Buildy Sandbox Restrictions
- No real emails are sent or received while hosted on Buildy.
- Connector activation remains in "Governance Only" mode.
- Dry-run validation is performed for configuration testing only.
