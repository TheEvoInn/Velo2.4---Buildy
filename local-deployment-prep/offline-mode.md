# Offline Mode Behavioral Specs

## Core Principles
1. **Manual-First**: In the absence of network/API access, VELO defaults to staging actions for manual review.
2. **Local Intelligence**: Uses local LLMs for processing, even without internet.
3. **Queued Execution**: External actions are queued until a secure connection is detected or authorized manually.
4. **Degraded Mode UI**: Clear indicators in Mission Control when features are restricted due to offline status.

## Feature Availability Matrix (Offline)
| Feature | Status | Note |
|---------|--------|------|
| Clone Bay | Active | Local reasoning only |
| Secure Vault | Active | Local decryption |
| Galaxy Scanner | Limited | Cached/Local sources only |
| Trade/Crypto | Limited | Cached price feeds only |
| Comms Deck | Blocked | Queued until online |
| Black Box | Active | Local logging |

## Continuous Operation
VELO remains a functional "Local Brain" even with 0% external connectivity.
