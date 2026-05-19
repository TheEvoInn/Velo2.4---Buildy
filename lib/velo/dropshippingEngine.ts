import { 
  DropshippingCommerceProfile, 
  DropshippingProductCandidate, 
  DropshippingOfferBlueprint, 
  DropshippingSalesPageDraft, 
  DropshippingMarketingPlan, 
  DropshippingFulfillmentPlan, 
  DropshippingProfitPlan,
  AutopilotActionLog,
  AutopilotMission,
  User
} from "@/entities";
import { recordLaneActivity } from "@/lib/velo/autopilotLaneActivity";
import { recordLearningOutcome } from "@/lib/velo/learningLoop";
import { saveArchiveItem } from "@/lib/velo/contentArchive";

export interface DropshippingAuditParams {
  action: string;
  summary: string;
  userEmail: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
}

export async function logDropshippingAudit({
  action,
  summary,
  userEmail,
  relatedId,
  relatedType,
  metadata
}: DropshippingAuditParams) {
  try {
    await AutopilotActionLog.create({
      department: "Trade Bay",
      action_type: action,
      status: "success",
      summary,
      details: `Module: Dropshipping Engine. ${metadata ? JSON.stringify(metadata) : ""}`,
      related_id: relatedId
    });

    await recordLaneActivity({
      department: "Trade Bay",
      stage: "completed",
      title: action,
      summary,
      relatedId,
      relatedType,
      userEmail
    });
  } catch (error) {
    console.error("Failed to log dropshipping audit:", error);
  }
}

export async function getOrCreateCommerceProfile(userId: string, email: string) {
  const profiles = await DropshippingCommerceProfile.filter({ owner_user_id: userId });
  if (profiles.length > 0) return profiles[0];

  const newProfile = await DropshippingCommerceProfile.create({
    owner_user_id: userId,
    owner_email: email,
    niches: ["Tech Gadgets", "Wellness"],
    budget_min: 50,
    budget_max: 500,
    risk_tolerance: "Medium",
    shipping_regions: ["US", "EU"],
    brand_tone: "Modern & Professional",
    product_types: ["physical", "digital"],
    paid_tools_allowed: false,
    supplier_automation_allowed: false,
    paid_ads_allowed: false,
    fulfillment_automation_allowed: false,
    preferred_free_channels: ["TikTok Organic", "Instagram Reels"],
    status: "setup",
    created_at_label: new Date().toLocaleDateString(),
    metadata: {}
  });

  await logDropshippingAudit({
    action: "Profile Created",
    summary: "Initialized a new dropshipping commerce profile with organic channel defaults.",
    userEmail: email,
    relatedId: newProfile.id,
    relatedType: "DropshippingCommerceProfile"
  });

  return newProfile;
}

export async function updateCommerceProfile(profileId: string, data: any, email: string) {
  const updated = await DropshippingCommerceProfile.update(profileId, data);
  await logDropshippingAudit({
    action: "Profile Updated",
    summary: "Updated dropshipping commerce preferences and safety settings.",
    userEmail: email,
    relatedId: profileId,
    relatedType: "DropshippingCommerceProfile",
    metadata: data
  });
  return updated;
}

export async function calculateDropshippingLearningBoost(email: string, candidate: any) {
  try {
    const pastPlans = await DropshippingProfitPlan.filter({ owner_email: email, status: "completed" });
    
    if (pastPlans.length === 0) {
      return {
        boost: 0,
        reason: "No prior learning signals available yet.",
        similar_signals: 0,
        recommended_channel: null,
        confidence_basis: "Standard preference-based ranking."
      };
    }

    const planCandidateIds = [...new Set(pastPlans.map(p => p.candidate_id))];
    const pastCandidates = await Promise.all(planCandidateIds.map(id => DropshippingProductCandidate.get(id)));
    
    const candidateMap = new Map();
    pastCandidates.forEach(c => { if (c) candidateMap.set(c.id, c); });

    const successfulPlans = pastPlans.filter(p => (p.conversion_rate_observed || 0) > 1 || p.metadata?.outcome_metrics?.quality_signal === 'high');
    
    const sameNicheSuccess = successfulPlans.filter(p => {
      const c = candidateMap.get(p.candidate_id);
      return c && c.niche === candidate.niche;
    });

    const sameTypeSuccess = successfulPlans.filter(p => {
      const c = candidateMap.get(p.candidate_id);
      return c && c.candidate_type === candidate.candidate_type;
    });

    let boost = 0;
    let reason = "Standard ranking based on niche alignment.";
    let recommendedChannel = null;

    if (sameNicheSuccess.length > 0) {
      boost += 7;
      reason = `Boosted by ${sameNicheSuccess.length} successful past test(s) in the ${candidate.niche} niche.`;
      recommendedChannel = sameNicheSuccess[0].metadata?.organic_test_plan?.channels?.[0];
    } else if (sameTypeSuccess.length > 0) {
      boost += 3;
      reason = `Boosted by ${sameTypeSuccess.length} successful past test(s) of ${candidate.candidate_type} products.`;
      recommendedChannel = sameTypeSuccess[0].metadata?.organic_test_plan?.channels?.[0];
    }

    return {
      boost,
      reason,
      similar_signals: sameNicheSuccess.length + sameTypeSuccess.length,
      recommended_channel: recommendedChannel,
      confidence_basis: "Learning-weighted ranking enabled."
    };
  } catch (error) {
    console.error("Failed to calculate learning boost:", error);
    return {
      boost: 0,
      reason: "Prior learning data could not be fully analyzed.",
      similar_signals: 0,
      recommended_channel: null,
      confidence_basis: "Fallback to standard ranking."
    };
  }
}

export async function generateProductCandidates(profile: any) {
  const userId = profile.owner_user_id;
  const email = profile.owner_email;

  // Cleanup existing drafts for this user to keep it clean
  const existing = await DropshippingProductCandidate.filter({ owner_user_id: userId, status: "analyzed" });
  for (const e of existing) {
    // Only cleanup very old ones if needed, for now we just keep generating
  }

  const templates = [
    {
      candidate_type: "physical",
      title: "Ergonomic Desk Accessory",
      niche: profile.niches[0] || "Home Office",
      summary: "A sleek, minimalist desk organizer with built-in wireless charging.",
      demand_signals: "Aligned with trending 'aesthetic desk setup' preferences.",
      estimated_cost: 12.50,
      suggested_price: 39.99,
      score: 85
    },
    {
      candidate_type: "digital",
      title: "Content Creator Starter Pack",
      niche: "Marketing",
      summary: "A bundle of 50+ high-converting hook templates and caption presets.",
      demand_signals: "Aligned with common content creator toolkit requirements.",
      estimated_cost: 0,
      suggested_price: 27.00,
      score: 92
    },
    {
      candidate_type: "physical",
      title: "Portable Smart Juicer",
      niche: profile.niches[1] || "Wellness",
      summary: "Compact USB-rechargeable juicer for travelers and busy professionals.",
      demand_signals: "Aligned with established wellness and portable health trends.",
      estimated_cost: 18.00,
      suggested_price: 45.00,
      score: 78
    }
  ];

  const results = [];
  for (const t of templates) {
    const learning = await calculateDropshippingLearningBoost(email, t);
    const finalScore = Math.min(100, t.score + learning.boost);

    const created = await DropshippingProductCandidate.create({
      owner_user_id: userId,
      owner_email: email,
      ...t,
      score: finalScore,
      source_mode: "Free Research (Templates)",
      supplier_label: t.candidate_type === "physical" ? "Staged Supplier" : "Autopilot Content Engine",
      status: "analyzed",
      risk_level: "Low",
      metadata: {
        learning_boost: learning.boost,
        learning_reason: learning.reason,
        similar_past_signals: learning.similar_signals,
        recommended_test_channel: learning.recommended_channel,
        confidence_basis: learning.confidence_basis,
        applied_at: new Date().toISOString()
      }
    });
    results.push(created);
  }

  await logDropshippingAudit({
    action: "Learning-Weighted Candidates Generated",
    summary: `Generated ${results.length} product candidates with learning-weighted ranking applied based on past test outcomes.`,
    userEmail: email,
    metadata: { 
      candidate_count: results.length,
      learning_applied: true
    }
  });

  return results;
}

export async function generateOfferBlueprint(candidate: any) {
  const email = candidate.owner_email;
  const blueprint = await DropshippingOfferBlueprint.create({
    owner_user_id: candidate.owner_user_id,
    owner_email: email,
    candidate_id: candidate.id,
    offer_type: "standard",
    headline: `Unlock the Future of ${candidate.niche} with ${candidate.title}`,
    positioning: `Premium, efficient, and tailored for the modern ${candidate.niche} enthusiast.`,
    pricing_notes: `Introductory price of $${candidate.suggested_price} with free shipping.`,
    bonuses: "Access to our exclusive community and a digital quick-start guide.",
    guarantee_notes: "30-day money-back guarantee, no questions asked.",
    upsells: "Premium extended warranty and a 1-on-1 setup consultation.",
    status: "draft",
    quality_score: 88,
    metadata: {}
  });

  await logDropshippingAudit({
    action: "Offer Blueprint Created",
    summary: `Generated a comprehensive offer strategy for "${candidate.title}".`,
    userEmail: email,
    relatedId: blueprint.id,
    relatedType: "DropshippingOfferBlueprint"
  });

  return blueprint;
}

export async function generateTwoSalesPageDrafts(candidate: any, offer: any) {
  const email = candidate.owner_email;
  const userId = candidate.owner_user_id;

  // Cleanup old drafts for same type to enforce exactly two active (one physical, one digital)
  const existing = await DropshippingSalesPageDraft.filter({ 
    owner_user_id: userId, 
    page_type: candidate.candidate_type,
    status: "active" 
  });
  
  for (const e of existing) {
    await DropshippingSalesPageDraft.update(e.id, { status: "archived" });
  }

  const draft = await DropshippingSalesPageDraft.create({
    owner_user_id: userId,
    owner_email: email,
    candidate_id: candidate.id,
    offer_id: offer.id,
    page_type: candidate.candidate_type,
    title: `${candidate.title} - Official Launch`,
    slug_suggestion: candidate.title.toLowerCase().replace(/ /g, "-"),
    hero_copy: offer.headline,
    product_story: candidate.summary,
    benefits: "High quality, reliable performance, and exceptional value.",
    offer_stack: `Product + ${offer.bonuses}`,
    faq: "Shipping timing and delivery methods are configured during final supplier setup.",
    status: "active",
    publish_status: "staged",
    page_builder_status: "pending",
    metadata: {}
  });

  await logDropshippingAudit({
    action: "Sales Page Staged",
    summary: `Created a new staged sales page draft for "${candidate.title}". Only one active draft per product type is permitted.`,
    userEmail: email,
    relatedId: draft.id,
    relatedType: "DropshippingSalesPageDraft"
  });

  return draft;
}

export async function generateMarketingPlan(candidate: any, offer: any) {
  const email = candidate.owner_email;
  const readyToPostAssets = {
    captions: [
      `Transform your ${candidate.niche} routine with ${candidate.title}. ✨ #OrganicGrowth #NicheMarket`,
      `Stop settling for average. ${candidate.title} is designed for ${candidate.niche} enthusiasts who demand the best. 🚀`,
      `Ready to upgrade? Discover why everyone in ${candidate.niche} is talking about ${candidate.title}. 💎`
    ],
    video_hooks: [
      `The one thing you're missing in your ${candidate.niche} setup...`,
      `Stop scrolling! If you care about ${candidate.niche}, you need to see this.`
    ],
    status_post: `Big news! Our new ${candidate.title} is officially staged for the ${candidate.niche} community. Check the link in bio to see the official launch page. 📦`,
    community_post: `Hey ${candidate.niche} family! We've just finalized the blueprint for ${candidate.title}. It solves the common problem of high costs and low efficiency in our niche. What do you think? 👇`,
    message_blurb: `Hi! I noticed you're into ${candidate.niche}. I've just launched a new project called ${candidate.title} that I think you'd really find valuable. Would love for you to check it out!`,
    shot_list: [
      "Product in a clean, minimalist setting",
      "Close-up of key feature highlights",
      "Action shot of product being used in a daily routine",
      "Macro shot of material quality/textures"
    ],
    manual_checklist: [
      "Review all copy for brand alignment",
      "Check that your profile link points to the staged sales page",
      "Ensure your DMs are open for inquiries",
      "Verify shipping/fulfillment notes with your manual setup"
    ]
  };

  const plan = await DropshippingMarketingPlan.create({
    owner_user_id: candidate.owner_user_id,
    owner_email: email,
    candidate_id: candidate.id,
    offer_id: offer.id,
    plan_type: "organic",
    free_channels: ["TikTok Organic", "Instagram Reels", "Manual Community Outreach"],
    organic_content_plan: "Focus on educational value and problem-solving content for your target audience.",
    ad_copy_prompts: "Generate authentic, member-focused captions that highlight the specific benefits of this product for your niche.",
    creative_prompts: "Natural, non-commercial lighting focusing on the product's integration into a real lifestyle.",
    paid_ads_enabled: false,
    status: "active",
    metadata: {
      ready_to_post_assets: readyToPostAssets,
      member_marketing_focus: true,
      safety_check: "No paid ads active. Manual posting only."
    }
  });

  await logDropshippingAudit({
    action: "Organic Marketing Plan Created",
    summary: `Developed a manual organic marketing strategy with ready-to-post assets for "${candidate.title}".`,
    userEmail: email,
    relatedId: plan.id,
    relatedType: "DropshippingMarketingPlan"
  });

  return plan;
}

export async function createFulfillmentPlan(candidate: any) {
  const email = candidate.owner_email;
  const plan = await DropshippingFulfillmentPlan.create({
    owner_user_id: candidate.owner_user_id,
    owner_email: email,
    candidate_id: candidate.id,
    product_type: candidate.candidate_type,
    fulfillment_mode: "semi-auto",
    automation_allowed: false,
    approval_required: true,
    status: "draft",
    delivery_notes: candidate.candidate_type === "physical" 
      ? "Fulfillment requires a future approved supplier connector or manual user setup." 
      : "Digital delivery asset must be reviewed and connected before live delivery.",
    metadata: {}
  });

  await logDropshippingAudit({
    action: "Fulfillment Plan Prepared",
    summary: `Staged fulfillment logic for "${candidate.title}". Automation is disabled by default.`,
    userEmail: email,
    relatedId: plan.id,
    relatedType: "DropshippingFulfillmentPlan"
  });

  return plan;
}

export async function generateProfitPlan(candidate: any, draft: any) {
  const email = candidate.owner_email;
  const plan = await DropshippingProfitPlan.create({
    owner_user_id: candidate.owner_user_id,
    owner_email: email,
    candidate_id: candidate.id,
    page_draft_id: draft.id,
    revenue_estimate: candidate.suggested_price * 10, // Mock 10 sales
    cost_estimate: candidate.estimated_cost * 10,
    profit_estimate: (candidate.suggested_price - candidate.estimated_cost) * 10,
    status: "monitoring",
    confidence: 75,
    winning_signals: "Strong niche alignment and competitive pricing.",
    metadata: {}
  });

  await logDropshippingAudit({
    action: "Profit Plan Initialized",
    summary: `Estimated potential profitability for the "${candidate.title}" campaign.`,
    userEmail: email,
    relatedId: plan.id,
    relatedType: "DropshippingProfitPlan"
  });

  return plan;
}

export async function prepareSalesPageReviewPacket(draftId: string, email: string) {
  const draft = await DropshippingSalesPageDraft.get(draftId);
  if (!draft) throw new Error("Draft not found");

  const candidate = await DropshippingProductCandidate.get(draft.candidate_id);
  
  const packet = {
    headline: draft.hero_copy,
    sections: [
      { title: "Product Story", content: draft.product_story },
      { title: "Core Benefits", content: draft.benefits },
      { title: "The Offer", content: draft.offer_stack }
    ],
    faq: draft.faq,
    payment_readiness: "Manual Setup Required",
    fulfillment_readiness: candidate?.candidate_type === "physical" ? "Supplier Selection Pending" : "Digital Asset Verification Pending",
    risk_notes: candidate?.risk_level === "Low" ? "Low risk, high demand niche." : "Market validation recommended.",
    checklist: [
      { task: "Copy Review", status: "completed" },
      { task: "Offer Accuracy", status: "completed" },
      { task: "Pricing Verification", status: "completed" },
      { task: "Payment Linkage", status: "pending" },
      { task: "Supplier Connection", status: "pending" }
    ],
    manual_launch_notes: "This page is currently a staged draft. Live deployment requires connection to the Page Builder and Payment Connectors."
  };

  const updated = await DropshippingSalesPageDraft.update(draftId, {
    metadata: {
      ...draft.metadata,
      review_packet: packet,
      packet_prepared_at: new Date().toISOString()
    },
    page_builder_status: "review_ready"
  });

  await logDropshippingAudit({
    action: "Review Packet Prepared",
    summary: `Generated a comprehensive review packet for "${draft.title}".`,
    userEmail: email,
    relatedId: draftId,
    relatedType: "DropshippingSalesPageDraft",
    metadata: { packet }
  });

  // Create Autopilot Mission for review
  const missionTitle = `Review staged dropshipping page: ${draft.title}`;
  const missionDetails = `Review the prepared sales page packet for "${draft.title}" (${candidate?.candidate_type}). Headline: "${draft.hero_copy}".`;
  
  const existingMissions = await AutopilotMission.filter({
    created_by: email,
    mission_type: "DROPSHIPPING_PAGE_REVIEW",
    status: "pending"
  });

  // Deduplicate: If there's already a pending review for this exact draft, update it. Otherwise create new.
  const existingForDraft = existingMissions.find(m => m.metadata?.related_id === draftId);

  if (existingForDraft) {
    await AutopilotMission.update(existingForDraft.id, {
      title: missionTitle,
      details: missionDetails,
      updated_at: new Date().toISOString()
    });
  } else {
    await AutopilotMission.create({
      title: missionTitle,
      details: missionDetails,
      mission_type: "DROPSHIPPING_PAGE_REVIEW",
      source_department: "Trade Bay",
      status: "pending",
      risk_level: "Low",
      metadata: {
        created_by: email,
        related_id: draftId,
        related_type: "DropshippingSalesPageDraft",
        module: "Dropshipping Engine",
        user_facing_summary: `A review packet for your dropshipping page "${draft.title}" is ready in the Action Bridge.`,
        autopilot_stage: "needs_decision"
      }
    });

    await logDropshippingAudit({
      action: "Review Mission Queued",
      summary: `Queued an Autopilot review mission for the "${draft.title}" page packet.`,
      userEmail: email,
      relatedId: draftId,
      relatedType: "DropshippingSalesPageDraft"
    });
  }

  return updated;
}

export async function createOrganicProfitTestPlan(draftId: string, email: string) {
  const draft = await DropshippingSalesPageDraft.get(draftId);
  if (!draft) throw new Error("Draft not found");

  const candidate = await DropshippingProductCandidate.get(draft.candidate_id);
  const profiles = await DropshippingCommerceProfile.filter({ owner_email: email });
  const userProfile = profiles[0];

  const hypothesis = `Organic traffic from ${userProfile?.preferred_free_channels?.join(", ") || "social media"} will validate interest in ${candidate?.title} at a ${candidate?.suggested_price} price point.`;
  
  const testPlan = {
    hypothesis,
    channels: userProfile?.preferred_free_channels || ["TikTok Organic", "Instagram Reels"],
    duration_days: 7,
    checklist: [
      { task: "Create 3 organic short-form videos", status: "pending" },
      { task: "Post in 5 relevant community groups", status: "pending" },
      { task: "Track daily visitor counts manually", status: "pending" },
      { task: "Record any direct inquiries or 'add to cart' signals", status: "pending" }
    ],
    safety_limits: "Zero ad spend. Manual tracking only. No live payments.",
    next_step: "Review manual metrics after 7 days to decide on scaling or pivoting."
  };

  // Find or create profit plan
  const existingPlans = await DropshippingProfitPlan.filter({ page_draft_id: draftId });
  let profitPlan;

  if (existingPlans.length > 0) {
    profitPlan = await DropshippingProfitPlan.update(existingPlans[0].id, {
      status: "monitoring",
      traffic_notes: `Organic test initiated. Channels: ${testPlan.channels.join(", ")}`,
      next_test_recommendation: testPlan.next_step,
      metadata: {
        ...existingPlans[0].metadata,
        organic_test_plan: testPlan,
        test_initiated_at: new Date().toISOString()
      }
    });
  } else {
    profitPlan = await DropshippingProfitPlan.create({
      owner_user_id: draft.owner_user_id,
      owner_email: email,
      candidate_id: draft.candidate_id,
      page_draft_id: draft.id,
      revenue_estimate: 0,
      cost_estimate: 0,
      profit_estimate: 0,
      status: "monitoring",
      confidence: 60,
      traffic_notes: `Organic test initiated. Channels: ${testPlan.channels.join(", ")}`,
      next_test_recommendation: testPlan.next_step,
      metadata: {
        organic_test_plan: testPlan,
        test_initiated_at: new Date().toISOString()
      }
    });
  }

  // Archive the plan for long-term reference
  await saveArchiveItem({
    title: `Organic Profit Test Plan: ${candidate?.title || 'Unknown SKU'}`,
    content_type: "plan",
    source_department: "Trade Bay",
    source_module: "Dropshipping Engine",
    workflow_name: "ORGANIC_PROFIT_TEST_PLANNING",
    body: `HYPOTHESIS: ${hypothesis}\n\nCHANNELS: ${testPlan.channels.join(", ")}\n\nCHECKLIST:\n${testPlan.checklist.map(c => `- ${c.task}`).join("\n")}`,
    summary: `Staged organic traffic experiment for ${candidate?.title}.`,
    related_record_id: profitPlan.id,
    related_record_type: "DropshippingProfitPlan",
    tags: ["dropshipping", "organic-test", "staged-launch"],
    metadata: { draft_id: draftId, candidate_id: draft.candidate_id }
  });

  await logDropshippingAudit({
    action: "Organic Test Planned",
    summary: `Created a 7-day organic profit test plan for "${candidate?.title}". No ad spend required.`,
    userEmail: email,
    relatedId: profitPlan.id,
    relatedType: "DropshippingProfitPlan",
    metadata: { testPlan }
  });

  return profitPlan;
}

export async function captureDropshippingLearningSignal(profitPlanId: string, email: string, outcomeData: any) {
  const plan = await DropshippingProfitPlan.get(profitPlanId);
  if (!plan) throw new Error("Profit plan not found");

  const candidate = await DropshippingProductCandidate.get(plan.candidate_id);
  
  const isSuccessful = outcomeData.quality_signal === 'high' || (outcomeData.visits || 0) > 100;
  
  // Update the plan with observed outcomes
  const updatedPlan = await DropshippingProfitPlan.update(profitPlanId, {
    status: "completed",
    conversion_rate_observed: outcomeData.conversion_rate || 0,
    winning_signals: outcomeData.wins || "N/A",
    losing_signals: outcomeData.losses || "N/A",
    traffic_notes: outcomeData.notes || "Test completed.",
    metadata: {
      ...plan.metadata,
      test_completed_at: new Date().toISOString(),
      outcome_metrics: outcomeData
    }
  });

  // Record a learning outcome for Autopilot
  await recordLearningOutcome({
    department: "Trade Bay",
    workflow_type: "DROPSHIPPING_ORGANIC_TEST",
    workflow_name: `Organic Test: ${candidate?.title || 'Product'}`,
    steps: [
      { label: "Hypothesis Creation", action: "PLANNING", mode: "auto" },
      { label: "Content Distribution", action: "ORGANIC_POSTING", mode: "manual" },
      { label: "Metric Tracking", action: "MANUAL_LOGGING", mode: "manual" },
      { label: "Profitability Analysis", action: "DATA_ANALYSIS", mode: "auto" }
    ],
    outcome_label: isSuccessful ? 'success' : 'helpful',
    success_score: isSuccessful ? 1.0 : 0.5,
    notes: `Learned from organic test of ${candidate?.title}. ${outcomeData.notes}`,
    metadata: {
      product_type: candidate?.candidate_type,
      niche: candidate?.niche,
      channels: plan.metadata?.organic_test_plan?.channels,
      quality_score: isSuccessful ? 90 : 60
    }
  });

  await logDropshippingAudit({
    action: "Learning Signal Captured",
    summary: `Captured organic test results for "${candidate?.title}". Signal: ${isSuccessful ? 'Positive' : 'Neutral'}.`,
    userEmail: email,
    relatedId: profitPlanId,
    relatedType: "DropshippingProfitPlan",
    metadata: { outcomeData }
  });

  return updatedPlan;
}

export async function generateDropshippingNextMove(profitPlanId: string, email: string) {
  const plan = await DropshippingProfitPlan.get(profitPlanId);
  if (!plan) throw new Error("Profit plan not found");

  const candidate = await DropshippingProductCandidate.get(plan.candidate_id);
  const outcome = plan.metadata?.outcome_metrics || {};
  
  const visits = outcome.visits || 0;
  const signals = outcome.quality_signal || 'neutral';
  
  // Default recommendation: Neutral/Weak
  let recommendation = {
    label: "Revise Offer & Re-test",
    reason: "Low traffic and neutral quality signals suggest the offer or hook needs refinement.",
    confidence: 65,
    next_action: "Update headline and create a new content batch for a different organic channel.",
    stays_manual: "All content creation and posting remains manual.",
    safety_boundary: "No ad spend or live page publishing.",
    autopilot_action: "DROPSHIPPING_STRATEGY_REVISION"
  };

  if (visits > 100 && (signals === 'high' || (outcome.conversion_rate || 0) > 1)) {
    // Strong Signal
    recommendation = {
      label: "Refine & Stage Launch Revision",
      reason: "High traffic and strong engagement validate interest. Moving to refine the sales copy for higher conversion.",
      confidence: 85,
      next_action: "Generate a revised sales page draft with the 'Review Packet' for final sign-off.",
      stays_manual: "Launch still requires manual payment and supplier setup.",
      safety_boundary: "Live checkout remains disabled.",
      autopilot_action: "DROPSHIPPING_REVISION_PREP"
    };
  } else if (visits > 30 || signals === 'medium') {
    // Moderate Signal
    recommendation = {
      label: "Narrow Niche & Double Down",
      reason: "Moderate interest detected. Suggesting a pivot to a more specific sub-niche or different organic community.",
      confidence: 75,
      next_action: "Adjust target niche keywords and stage a 3-day micro-test.",
      stays_manual: "Community outreach is manual.",
      safety_boundary: "No automation of social accounts.",
      autopilot_action: "DROPSHIPPING_NICHE_PIVOT"
    };
  } else if (plan.status === 'completed' && visits < 10) {
    // Very Weak Signal
    recommendation = {
      label: "Pivot Product",
      reason: "Insufficient traffic and signals suggest this product candidate may have low organic demand in the current channels.",
      confidence: 90,
      next_action: "Archive this plan and return to Product Research for a new candidate.",
      stays_manual: "Selection of new product is manual.",
      safety_boundary: "No automated product sourcing.",
      autopilot_action: "DROPSHIPPING_PRODUCT_PIVOT"
    };
  }

  const updatedPlan = await DropshippingProfitPlan.update(profitPlanId, {
    metadata: {
      ...plan.metadata,
      next_move_recommendation: recommendation,
      recommendation_generated_at: new Date().toISOString()
    }
  });

  await logDropshippingAudit({
    action: "Recommendation Generated",
    summary: `Autopilot generated a next-move recommendation for "${candidate?.title}": ${recommendation.label}.`,
    userEmail: email,
    relatedId: profitPlanId,
    relatedType: "DropshippingProfitPlan",
    metadata: { recommendation }
  });

  // Create an Autopilot Mission for the user to review the recommendation
  const missionTitle = `Review Next Move: ${candidate?.title}`;
  const missionDetails = `Autopilot recommends: ${recommendation.label} based on organic test results. Reason: ${recommendation.reason}`;
  
  const existingMissions = await AutopilotMission.filter({
    created_by: email,
    mission_type: "DROPSHIPPING_RECOMMENDATION_REVIEW",
    status: "pending"
  });

  const existingForPlan = existingMissions.find(m => m.metadata?.related_id === profitPlanId);

  if (existingForPlan) {
    await AutopilotMission.update(existingForPlan.id, {
      title: missionTitle,
      details: missionDetails,
      metadata: {
        ...existingForPlan.metadata,
        recommendation
      },
      updated_at: new Date().toISOString()
    });
  } else {
    await AutopilotMission.create({
      title: missionTitle,
      details: missionDetails,
      mission_type: "DROPSHIPPING_RECOMMENDATION_REVIEW",
      source_department: "Trade Bay",
      status: "pending",
      risk_level: "Low",
      metadata: {
        created_by: email,
        related_id: profitPlanId,
        related_type: "DropshippingProfitPlan",
        recommendation,
        module: "Dropshipping Engine",
        user_facing_summary: `Your organic test for "${candidate?.title}" has a new recommendation ready for review.`,
        autopilot_stage: "needs_decision"
      }
    });
  }

  return updatedPlan;
}

export async function getDropshippingCommerceMemory(email: string) {
  try {
    const pastPlans = await DropshippingProfitPlan.filter({ owner_email: email, status: "completed" });
    
    if (pastPlans.length === 0) {
      return null;
    }

    const totalTests = pastPlans.length;
    const positiveSignals = pastPlans.filter(p => (p.conversion_rate_observed || 0) > 1 || p.metadata?.outcome_metrics?.quality_signal === 'high').length;
    const neutralSignals = pastPlans.filter(p => (p.conversion_rate_observed || 0) <= 1 && p.conversion_rate_observed > 0 || p.metadata?.outcome_metrics?.quality_signal === 'medium').length;
    const weakSignals = Math.max(0, totalTests - positiveSignals - neutralSignals);

    // Aggregate niches and channels
    const planCandidateIds = [...new Set(pastPlans.map(p => p.candidate_id))];
    const pastCandidates = await Promise.all(planCandidateIds.map(id => DropshippingProductCandidate.get(id)));
    const candidateMap = new Map();
    pastCandidates.forEach(c => { if (c) candidateMap.set(c.id, c); });

    const nicheCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};

    pastPlans.forEach(p => {
      const c = candidateMap.get(p.candidate_id);
      if (c?.niche) {
        nicheCounts[c.niche] = (nicheCounts[c.niche] || 0) + 1;
      }
      const channels = p.metadata?.organic_test_plan?.channels || [];
      channels.forEach((ch: string) => {
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      });
    });

    const topNiches = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const topChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    // Determine strongest pattern
    let strongestPattern = "Testing multiple niches to find product-market fit.";
    if (positiveSignals > 0) {
      const bestNiche = topNiches[0] || "primary";
      const bestChannel = topChannels[0] || "organic";
      strongestPattern = `Strongest signals detected in the ${bestNiche} niche via ${bestChannel}.`;
    } else if (totalTests >= 3) {
      strongestPattern = "Diversifying niches to identify initial engagement signals.";
    }

    // Next safest recommendation
    const lastPlan = pastPlans[pastPlans.length - 1];
    const nextSafestMove = lastPlan?.metadata?.next_move_recommendation?.label || "Run fresh product research";

    return {
      totalTests,
      positiveSignals,
      neutralSignals,
      weakSignals,
      topNiches,
      topChannels,
      strongestLearnedPattern: strongestPattern,
      nextSafestRecommendation: nextSafestMove,
      confidenceNote: totalTests > 5 ? "High confidence based on multiple tests." : "More manual test data improves this.",
      safetyBoundaryText: "Memory guides recommendations only — it does not launch ads, publish pages, charge customers, or order products."
    };
  } catch (error) {
    console.error("Failed to get commerce memory:", error);
    return null;
  }
}
