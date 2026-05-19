import { 
  getOrCreateCommerceProfile,
  generateProductCandidates,
  generateOfferBlueprint,
  generateTwoSalesPageDrafts,
  generateMarketingPlan,
  createFulfillmentPlan,
  generateProfitPlan,
  getDropshippingCommerceMemory,
  generateDropshippingNextMove,
} from "@/lib/velo/dropshippingEngine";
import { 
  DropshippingProductCandidate,
  DropshippingOfferBlueprint,
  DropshippingSalesPageDraft,
  DropshippingProfitPlan,
  DropshippingCommerceProfile as CommerceProfileEntity,
  DropshippingMarketingPlan,
  DropshippingFulfillmentPlan
} from "@/entities";

export interface CommerceResult {
  type: 'product_discovery' | 'offer_creation' | 'sales_page' | 'marketing_plan' | 
        'fulfillment' | 'profit_plan' | 'commerce_memory' | 'next_move' | 
        'full_launch' | 'general';
  message: string;
  data?: any;
  progress?: string[];
}

const COMMERCE_KEYWORDS = {
  product_discovery: [
    "find product", "discover product", "product idea", "find profitable",
    "product research", "scan for product", "what to sell", "winning product",
    "dropshipping product", "ecommerce product", "product niche"
  ],
  offer_creation: [
    "create offer", "build offer", "offer blueprint", "pricing strategy",
    "positioning"
  ],
  sales_page: [
    "sales page", "landing page", "product page", "draft page", "store page"
  ],
  marketing_plan: [
    "marketing plan", "promote", "ad copy", "social media plan", 
    "content plan", "organic marketing"
  ],
  fulfillment: [
    "fulfillment", "shipping", "supplier", "delivery"
  ],
  profit_plan: [
    "profit plan", "profit estimate", "margin", "pricing", "revenue estimate"
  ],
  commerce_memory: [
    "commerce status", "commerce overview", "what's happening in commerce",
    "commerce dashboard", "show my products", "my products",
    "commerce summary", "what do i have"
  ],
  next_move: [
    "what's next", "next step", "what should i do next", "recommend",
    "commerce recommendation"
  ],
  full_launch: [
    "launch product", "full launch", "start selling", "go live",
    "set up store", "build store", "create store"
  ]
};

function detectCommerceIntent(text: string): { type: string; confidence: number } {
  const t = text.toLowerCase();
  
  // Commerce memory / status check
  if (COMMERCE_KEYWORDS.commerce_memory.some(k => t.includes(k))) {
    return { type: 'commerce_memory', confidence: 0.9 };
  }
  
  // Next move
  if (COMMERCE_KEYWORDS.next_move.some(k => t.includes(k)) && 
      (t.includes("commerce") || t.includes("product") || t.includes("dropship") || t.includes("store"))) {
    return { type: 'next_move', confidence: 0.9 };
  }
  
  // Full launch
  if (COMMERCE_KEYWORDS.full_launch.some(k => t.includes(k))) {
    return { type: 'full_launch', confidence: 0.85 };
  }
  
  // Product discovery
  if (COMMERCE_KEYWORDS.product_discovery.some(k => t.includes(k))) {
    return { type: 'product_discovery', confidence: 0.85 };
  }
  
  // Sales page
  if (COMMERCE_KEYWORDS.sales_page.some(k => t.includes(k))) {
    return { type: 'sales_page', confidence: 0.8 };
  }
  
  // Marketing plan
  if (COMMERCE_KEYWORDS.marketing_plan.some(k => t.includes(k))) {
    return { type: 'marketing_plan', confidence: 0.8 };
  }
  
  // Offer creation
  if (COMMERCE_KEYWORDS.offer_creation.some(k => t.includes(k))) {
    return { type: 'offer_creation', confidence: 0.7 };
  }
  
  // Fulfillment
  if (COMMERCE_KEYWORDS.fulfillment.some(k => t.includes(k))) {
    return { type: 'fulfillment', confidence: 0.7 };
  }
  
  // Profit plan
  if (COMMERCE_KEYWORDS.profit_plan.some(k => t.includes(k))) {
    return { type: 'profit_plan', confidence: 0.7 };
  }
  
  return { type: 'general', confidence: 0 };
}

export async function handleCommerceCommand(
  text: string,
  userEmail: string,
  userId: string
): Promise<CommerceResult> {
  const intent = detectCommerceIntent(text);
  
  if (intent.type === 'general') {
    return { type: 'general', message: '' };
  }

  try {
    // Always ensure commerce profile exists
    await getOrCreateCommerceProfile(userId, userEmail);
    const profiles = await CommerceProfileEntity.filter({ owner_user_id: userId });
    const profile = profiles[0];
    
    if (!profile) {
      return { type: 'general', message: "I couldn't set up your commerce profile. Try again or head to Trade Bay to configure it manually." };
    }

    switch (intent.type) {
      case 'product_discovery': {
        const candidates = await generateProductCandidates(profile);
        if (!candidates || candidates.length === 0) {
          return {
            type: 'product_discovery',
            message: "I searched for product ideas but didn't find strong matches. Try specifying a niche like 'fitness wearables' or 'home office gadgets'."
          };
        }
        const topThree = candidates.slice(0, 3);
        return {
          type: 'product_discovery',
          message: `### 🔍 Product Discovery Complete\n\nI found **${candidates.length}** product candidates for you. Here are the top matches:\n\n${topThree.map((c, i) => 
            `**${i + 1}. ${c.title}** — Score: ${c.score}/100\n   • Type: ${c.candidate_type} | Niche: ${c.niche}\n   • Estimated cost: $${c.estimated_cost} | Suggested price: $${c.suggested_price}\n   • ${c.summary}`
          ).join('\n\n')}\n\nWant me to create an offer for any of these? Just say "create offer for #1".`,
          data: { candidates: topThree, total: candidates.length }
        };
      }

      case 'offer_creation': {
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" }, "-created_at", 1);
        if (candidates.length === 0) {
          return {
            type: 'offer_creation',
            message: "No product candidates found. Let me find some first — say 'find me products' and I'll discover some ideas."
          };
        }
        const candidate = candidates[0];
        const offer = await generateOfferBlueprint(candidate);
        return {
          type: 'offer_creation',
          message: `### 📦 Offer Created\n\n**${offer.headline}**\n\n• Positioning: ${offer.positioning}\n• Price: ${offer.pricing_notes}\n• Bonuses: ${offer.bonuses}\n• Guarantee: ${offer.guarantee_notes}\n• Upsells: ${offer.upsells}\n\nWant a sales page for this offer? Say "draft a sales page".`
        };
      }

      case 'sales_page': {
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" }, "-created_at", 1);
        if (candidates.length === 0) {
          return {
            type: 'sales_page',
            message: "No product candidates ready. Start with 'find me products' first."
          };
        }
        const offers = await DropshippingOfferBlueprint.filter({ owner_user_id: userId }, "-created_at", 1);
        if (offers.length === 0) {
          return {
            type: 'sales_page',
            message: "No offer blueprint yet. Say 'create an offer' first and I'll build one from your products."
          };
        }
        const draft = await generateTwoSalesPageDrafts(candidates[0], offers[0]);
        return {
          type: 'sales_page',
          message: `### 📄 Sales Page Drafted\n\n**${draft.title}** is now staged and ready for review.\n\n• Slug: /${draft.slug_suggestion}\n• Hero: "${draft.hero_copy}"\n• Status: ${draft.status} | Publish: ${draft.publish_status}\n\nHead to **Trade Bay > Commerce Lanes** to preview and publish it. Want me to build a marketing plan next?`
        };
      }

      case 'marketing_plan': {
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" }, "-created_at", 1);
        if (candidates.length === 0) {
          return {
            type: 'marketing_plan',
            message: "No product candidates yet. Say 'find me products' to get started."
          };
        }
        const offers = await DropshippingOfferBlueprint.filter({ owner_user_id: userId }, "-created_at", 1);
        if (offers.length === 0) {
          return { type: 'marketing_plan', message: "Create an offer first — say 'create an offer'." };
        }
        const plan = await generateMarketingPlan(candidates[0], offers[0]);
        return {
          type: 'marketing_plan',
          message: `### 📣 Marketing Plan Ready\n\nStrategy: Organic-only (TikTok, Instagram Reels, Community)\n\n**Ready-to-post captions:**\n${plan.metadata?.ready_to_post_assets?.captions?.slice(0, 2).map((c: string) => `• "${c}"`).join('\n')}\n\n**Shot list:** ${plan.metadata?.ready_to_post_assets?.shot_list?.slice(0, 3).join(', ')}\n\nAll assets are saved in your commerce dashboard. Ready for the next step? Say 'what's next'.`
        };
      }

      case 'fulfillment': {
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" }, "-created_at", 1);
        if (candidates.length === 0) {
          return { type: 'fulfillment', message: "No products to fulfill. Discover products first." };
        }
        const plan = await createFulfillmentPlan(candidates[0]);
        return {
          type: 'fulfillment',
          message: `### 🚚 Fulfillment Plan Created\n\n• Mode: ${plan.fulfillment_mode}\n• Status: ${plan.status}\n\nReview fulfillment details in Trade Bay.`
        };
      }

      case 'profit_plan': {
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" }, "-created_at", 1);
        if (candidates.length === 0) {
          return { type: 'profit_plan', message: "Discover products first — say 'find me products'." };
        }
        const drafts = await DropshippingSalesPageDraft.filter({ owner_user_id: userId, status: "active" }, "-created_at", 1);
        if (drafts.length === 0) {
          return { type: 'profit_plan', message: "Need a sales page first. Say 'draft a sales page'." };
        }
        const plan = await generateProfitPlan(candidates[0], drafts[0]);
        return {
          type: 'profit_plan',
          message: `### 💰 Profit Plan\n\n• Revenue estimate: $${plan.revenue_estimate}\n• Cost estimate: $${plan.cost_estimate}\n• Net profit estimate: $${plan.profit_estimate}\n• Confidence: ${plan.confidence}\n\n${plan.next_test_recommendation || ''}`
        };
      }

      case 'commerce_memory': {
        const memory = await getDropshippingCommerceMemory(userEmail);
        
        const candidates = await DropshippingProductCandidate.filter({ owner_user_id: userId });
        const offers = await DropshippingOfferBlueprint.filter({ owner_user_id: userId });
        const drafts = await DropshippingSalesPageDraft.filter({ owner_user_id: userId });
        const plans = await DropshippingMarketingPlan.filter({ owner_user_id: userId });
        const fulfillment = await DropshippingFulfillmentPlan.filter({ owner_user_id: userId });
        const profits = await DropshippingProfitPlan.filter({ owner_user_id: userId });

        const parts = [];
        if (candidates.length) parts.push(`**Products:** ${candidates.length} candidates`);
        if (offers.length) parts.push(`**Offers:** ${offers.length} blueprints`);
        if (drafts.length) parts.push(`**Sales Pages:** ${drafts.length} staged`);
        if (plans.length) parts.push(`**Marketing Plans:** ${plans.length} ready`);
        if (fulfillment.length) parts.push(`**Fulfillment:** ${fulfillment.length} plans`);
        if (profits.length) parts.push(`**Profit Plans:** ${profits.length} tracked`);
        
        const lastProfitPlan = profits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const nextMove = lastProfitPlan ? await generateDropshippingNextMove(lastProfitPlan.id, userEmail) : null;
        
        return {
          type: 'commerce_memory',
          message: `### 🏪 Commerce Overview\n\n${parts.join('\n') || 'Your commerce hub is empty. Say "find me products" to start discovering opportunities.'}\n\n${memory ? `**Pattern:** ${memory.strongestLearnedPattern}` : ''}\n\n**Next recommended move:** ${nextMove?.metadata?.next_move_recommendation?.label || 'Start with product discovery!'}`
        };
      }

      case 'next_move': {
        const plans = await DropshippingProfitPlan.filter({ owner_email: userEmail }, "-created_at", 1);
        if (plans.length === 0) {
          return {
            type: 'next_move',
            message: "No active plans to calculate the next move. Start by finding products!"
          };
        }
        const plan = await generateDropshippingNextMove(plans[0].id, userEmail);
        const recommendation = plan.metadata?.next_move_recommendation;
        
        return {
          type: 'next_move',
          message: `### 🧭 Recommended Next Move\n\n**${recommendation?.label || 'Continue testing'}**\n\n${recommendation?.reason || 'Build your commerce pipeline to get more specific recommendations.'}\n\nNext Action: ${recommendation?.next_action || 'Scan for more products.'}`
        };
      }

      case 'full_launch': {
        const progress: string[] = [];
        
        progress.push("🔍 Scanning for products...");
        const candidates = await generateProductCandidates(profile);
        if (!candidates || candidates.length === 0) {
          return { type: 'full_launch', message: "Product discovery came up empty. Try a specific niche." };
        }
        progress.push(`✅ Found ${candidates.length} product candidates`);
        
        const bestCandidate = candidates[0];
        progress.push(`📦 Creating offer for "${bestCandidate.title}"...`);
        
        const offer = await generateOfferBlueprint(bestCandidate);
        progress.push(`✅ Offer created: ${offer.headline}`);
        
        progress.push("📄 Drafting sales page...");
        const draft = await generateTwoSalesPageDrafts(bestCandidate, offer);
        progress.push(`✅ Sales page staged`);
        
        progress.push("📣 Building marketing plan...");
        const marketing = await generateMarketingPlan(bestCandidate, offer);
        progress.push(`✅ Marketing assets ready`);
        
        progress.push("💰 Calculating profit estimates...");
        const profit = await generateProfitPlan(bestCandidate, draft);
        progress.push(`✅ Profit: $${profit.profit_estimate} estimated`);
        
        return {
          type: 'full_launch',
          message: `### 🚀 Full Launch Complete!\n\n${progress.join('\n')}\n\n**Your product is ready:**\n• **${bestCandidate.title}** — ${bestCandidate.niche}\n• Price: $${bestCandidate.suggested_price} | Cost: $${bestCandidate.estimated_cost}\n• Profit estimate: $${profit.profit_estimate}\n• Sales page: Staged in Trade Bay\n\nHead to **Trade Bay** to review and publish.`,
          progress
        };
      }

      default:
        return { type: 'general', message: '' };
    }
  } catch (error) {
    console.error("[CommerceAutopilot] Error:", error);
    return {
      type: 'general',
      message: "I hit a snag with your commerce request. You can head to Trade Bay to work on it manually, or try again with more specifics."
    };
  }
}
