# VELO AI Dropshipping Engine Integration

This document outlines the architecture and integration of the VELO AI Dropshipping Engine, an additive extension of the Commerce Hub.

## Core Principles
1. **Additive**: Enhances existing Commerce Hub/Trade Bay systems without replacing them.
2. **Free-First**: Prioritizes free data sources, organic marketing, and staged actions.
3. **Approval-Gated**: External actions (publishing, payment, ordering) require explicit administrator approval.
4. **Data-Driven**: Uses internal entities for research, planning, and profit tracking.

## Entities Schema
- `DropshippingCommerceProfile`: Stores user business preferences and safety settings.
- `DropshippingProductCandidate`: Tracks AI-researched product opportunities.
- `DropshippingOfferBlueprint`: Strategic marketing and pricing blueprints for candidates.
- `DropshippingSalesPageDraft`: Staged sales page content (Max 1 physical, 1 digital active).
- `DropshippingMarketingPlan`: Organic marketing and ad-copy planning.
- `DropshippingFulfillmentPlan`: Logic for order handling and supplier linkage.
- `DropshippingProfitPlan`: Performance tracking and AI learning signals.

## Phase 1 Implementation
- **Staging Only**: All products and pages are created as drafts/staged records. No live publishing occurs.
- **Preference-Based Research**: Initial candidates are generated via preference-aligned templates for manual review. No live demand signals or external supplier APIs are used in Phase 1.
- **Manual Control**: Automation switches are visible but disabled until Phase 2.
- **UI Integration**: Compact cockpit added to the Trade Bay "Dropshipping Engine" tab.

## Phase 2 Implementation (Sales Page Readiness)
- **Review Packets**: Drafts can now generate internal "readiness packets" containing headlines, benefits, offer stacks, and checklists.
- **Metadata Storage**: Packet data is stored in the `metadata.review_packet` field of the `DropshippingSalesPageDraft` entity.
- **Checklist Logic**: Includes status tracking for copy review, offer accuracy, pricing, payment readiness, and supplier connection.
- **Safety Labels**: Explicitly marks drafts as "Manual Setup Required" for payments and fulfillment to prevent premature automation expectations.
- **Internal Only**: These packets remain internal drafts; no checkout activation, CMS dependency, or live publishing occurs.

## Phase 3 Implementation (Autopilot Review Flow)
- **Review Missions**: Preparing a page packet now creates an `AutopilotMission` of type `DROPSHIPPING_PAGE_REVIEW`.
- **Action Bridge Integration**: These missions appear in the "Action Bridge" (Review Center) with custom "Approve Strategy" labels and commerce-specific summaries.
- **Timeline Milestones**: Dropshipping review decisions are now visible as "needs_decision" items in the Autopilot timeline, correctly labeled under the "Trade Bay" department.
- **Deduplication**: Logic implemented to update existing pending missions for a specific draft rather than flooding the queue with duplicate requests.
- **Strictly Staged**: Approval of these missions remains an internal strategic sign-off; it does not trigger live publishing, ad spend, or supplier orders in this phase.

## Phase 4 Implementation (Organic Profit Tests & Learning)
- **Organic Test Planner**: Approved page strategies can now generate organic traffic experiment plans (`createOrganicProfitTestPlan`).
- **Free-First Testing**: Plans focus on free channels (TikTok, IG Reels, FB Groups) with 7-day checklists and manual metric tracking. No ad spend or live payments.
- **Autopilot Learning Loop**: Completion of tests triggers `captureDropshippingLearningSignal`, which records `recordLearningOutcome` entries for Autopilot to learn niche/product/channel success patterns.
- **Content Archiving**: Generated plans and outcome summaries are automatically saved to the `VeloContentArchiveItem` entity for long-term reference and reuse.
- **Audit Logging**: All test creation and learning capture events are logged in `AutopilotActionLog`.

## Phase 5 Implementation (Next-Move Recommendations)
- **Data-Driven Suggestions**: Autopilot now analyzes `DropshippingProfitPlan` outcomes (visits, signals, conversion rates) to generate `generateDropshippingNextMove` recommendations.
- **Strategic Pivots**: Recommendations include "Refine & Stage Launch Revision", "Narrow Niche & Double Down", or "Pivot Product" based on signal strength.
- **Confidence & Reasoning**: Each recommendation includes a confidence score, a clear reason, the next action step, and a safety boundary reminder.
- **Recommendation Missions**: Generating a next-move creates an `AutopilotMission` of type `DROPSHIPPING_RECOMMENDATION_REVIEW` for the user to approve in the Action Bridge.
- **Staged & Safe**: All recommended next moves stay within the manual/free-first safety boundaries. No live publishing or payments are activated.

## Phase 6 Implementation (Learning-Weighted Ranking)
- **Prior Outcome Analysis**: The research engine now uses `calculateDropshippingLearningBoost` to scan past `DropshippingProfitPlan` results before ranking new products.
- **Success Pattern Matching**: Product candidates that match niches or types where previous organic tests were successful (high conversion or engagement) receive a modest ranking boost.
- **Explainable AI**: Each candidate includes metadata explaining the ranking reason, similar past signal count, and a recommended organic test channel based on what worked before.
- **Early-State Fallback**: Users without test history receive standard preference-based rankings with a clear "no prior learning yet" status indicator.
- **Modest Adjustments**: Boosts are calibrated to inform future suggestions without guaranteeing success, maintaining the "staged test" philosophy.

## Phase 7 Implementation (Commerce Memory Dashboard)
- **Learning Aggregation**: Added `getDropshippingCommerceMemory` to summarize patterns across products, niches, and channels.
- **Outcome Visualization**: Compact dashboard panel showing signal distribution (Positive/Neutral/Weak).
- **Pattern Recognition**: Autopilot identifies the strongest learned niche/channel combinations based on prior test outcomes.
- **Next-Move Guidance**: Surfaces the current safest recommendation trend based on the latest test data.
- **Empty State Design**: Encourages initial organic tests when no history exists.
- **Safe Context**: Read-only summary used for decision support; maintains strictly staged, manual, and free-first boundaries.

## Phase 8 Implementation (Ready-to-Post Marketing Assets)
- **Ready-to-Post Visibility**: Staged launch cards in the Dropshipping Engine now display compact ready-to-post marketing assets (captions, video hooks, checklists) from `DropshippingMarketingPlan` metadata.
- **Copy Full Pack**: Added a "Copy Full Pack" button that compiles all available marketing assets (captions, hooks, checklists, blurbs) into a single plain-text bundle for quick manual posting.
- **Member-Focused Marketing**: Assets are specifically prepared for the member's own products, offers, or services. VELO remains invite/paid-only and separate from these business assets.
- **Manual Organic Channels**: UI wording updated to "Manual organic channels only" to clarify that no automated public sales or "free" VELO access is provided.
- **Content Arsenal Expansion**: Added new member marketing asset types (Social Caption, Video Script, Community Post, Launch Message) to the shared library.
- **No Live Automation**: Confirmed no auto-posting, ad spend, or live external submission occurs. All assets must be reviewed and posted manually.

## Future Activation Checklist
- [ ] Enable Supplier API linkage (CJDropshipping, EPROLO, etc.) via Credential Vault.
- [ ] Connect Sales Page Drafts to the Velo Page Builder for live deployment.
- [ ] Link Payment Connectors (Stripe/PayPal) to Drafts.
- [ ] Activate Paid Ad generation for Meta/TikTok (requires API keys).
- [ ] Enable Automated Fulfillment loop with approval overrides.

## Security & Ethics
- No scraping of 3rd party sites.
- No auto-submission of forms.
- All actions logged in `AutopilotActionLog`.
- No paid services used without explicit user consent and credentials.
