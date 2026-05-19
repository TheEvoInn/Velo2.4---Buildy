
import { executeContinuityTask } from "./continuity";
import { saveArchiveItem, ArchiveContentType } from "./contentArchive";
import { buildContentLearningGuidance, recordContentArchiveLearningSignal } from "./learningLoop";
import { User, VeloConnectorProfile } from "@/entities";

export type ContentAssetKind = 
  | "proposal_template" 
  | "intro_message" 
  | "professional_bio" 
  | "service_listing" 
  | "portfolio_blurb" 
  | "faq_answer" 
  | "product_listing" 
  | "deliverable" 
  | "delivery_message" 
  | "outreach_message" 
  | "research_brief"
  | "claim_checklist"
  | "social_caption"
  | "short_video_script"
  | "community_post"
  | "launch_message"
  | "editing_pass"
  | "content_pack_summary"
  | "image_prompt"
  | "pdf_export_brief"
  | "code_help_brief";

export type ContentPackType = 
  | "proposal_pack" 
  | "marketing_pack" 
  | "product_listing_pack" 
  | "client_delivery_pack" 
  | "profile_pack" 
  | "research_to_content_pack" 
  | "design_asset_pack" 
  | "code_help_pack";

export interface ContentPackDefinition {
  type: ContentPackType;
  title: string;
  description: string;
  assetTypes: ContentAssetKind[];
  safety_note: string;
  intended_use: string;
}

export interface ContentBriefInput {
  profile?: any;
  platform?: any;
  application?: any;
  opportunity?: any;
  job?: any;
  task?: any;
  mission?: any;
  target_department?: string;
  intended_next_action?: string;
  audience?: string;
  tone?: string;
  constraints?: string[];
  additional_constraints?: string[];
  requested_asset_type: ContentAssetKind;
  client_facing_language?: string;
  internal_guidance_language?: string;
  learned_guidance?: string;
}

export interface ContentGenerationResult {
  title: string;
  body: string;
  tone: string;
  quality_score: number;
  strengths: string[];
  improvement_notes: string;
  revision_prompts: string[];
  source_context_summary: string;
  brief: any;
  completion_checklist: string[];
  metadata: any;
}

export interface ContentPackResult {
  packType: ContentPackType;
  packTitle: string;
  assets: ContentGenerationResult[];
  packSummary: string;
  overallQualityScore: number;
  childTitles: string[];
  childQualityScores: number[];
  manualReviewRequired: boolean;
  externalUseStatus: "draft_only";
  completionChecklist: string[];
  revisionPrompts: string[];
  strengths: string[];
  improvementNotes: string;
  archivedRecordId?: string;
}

/**
 * Safe helpers for VELO profile field mapping.
 */
function getProfileDisplayName(profile: any) {
  return profile?.public_name || profile?.legal_name || "Professional Pilot";
}

function getProfileRole(profile: any) {
  return profile?.role || "Strategic Operator";
}

function getProfileSkills(profile: any) {
  if (Array.isArray(profile?.skills)) return profile.skills.join(', ');
  return profile?.skills || "Professional";
}

function getProfileBackground(profile: any) {
  return profile?.background || profile?.profile_summary || profile?.autopilot_brief || "";
}

/**
 * Fetches the user's communication identity if set.
 */
async function getCommunicationIdentity(userEmail: string) {
  try {
    const identList = await VeloConnectorProfile.query()
      .where("name", "Email Identity")
      .where("owner_email", userEmail)
      .limit(1)
      .exec();
    
    if (identList && identList.length > 0) {
      const ident = identList[0];
      const m = ident.metadata || {};
      return `\nCOMMUNICATION IDENTITY (Use these details for outreach):
- Display Name: ${m.display_name || "Not set"}
- Preferred Tone: ${m.preferred_tone || "Professional"}
- Signature: ${m.signature || "Not set"}
- Sending Address Label: ${m.sending_address_label || "Not set"}`;
    }
  } catch (error) {
    console.warn("Failed to fetch communication identity:", error);
  }
  return "";
}

const CONTENT_PACK_DEFINITIONS: Record<ContentPackType, ContentPackDefinition> = {
  proposal_pack: {
    type: "proposal_pack",
    title: "Proposal Outreach Pack",
    description: "Complete proposal with cover intro and a pre-send checklist for client opportunities.",
    assetTypes: ["proposal_template", "intro_message", "claim_checklist"],
    safety_note: "Draft only. Review all client-facing copy before submission on the target platform.",
    intended_use: "Freelance platform proposals, direct client outreach, gig applications"
  },
  marketing_pack: {
    type: "marketing_pack",
    title: "Marketing Outreach Pack",
    description: "Social captions, community posts, and outreach messages for a campaign push.",
    assetTypes: ["social_caption", "outreach_message", "community_post"],
    safety_note: "Draft only. Verify brand voice and compliance before publishing publicly.",
    intended_use: "Social media campaigns, community engagement, cold outreach sequences"
  },
  product_listing_pack: {
    type: "product_listing_pack",
    title: "Product Listing Pack",
    description: "Listing copy, service description, and FAQ for a product or service page.",
    assetTypes: ["product_listing", "service_listing", "faq_answer"],
    safety_note: "Draft only. Confirm pricing, availability, and platform terms before going live.",
    intended_use: "E-commerce listings, marketplace services, digital product pages"
  },
  client_delivery_pack: {
    type: "client_delivery_pack",
    title: "Client Delivery Pack",
    description: "Deliverable summary, handoff message, and a review checklist for safe delivery.",
    assetTypes: ["deliverable", "delivery_message", "claim_checklist"],
    safety_note: "Draft only. Attach final files and verify client details before sending.",
    intended_use: "Project handoffs, milestone deliveries, client update packages"
  },
  profile_pack: {
    type: "profile_pack",
    title: "Professional Profile Pack",
    description: "Bio, service listing, portfolio blurb, and a professional header image prompt.",
    assetTypes: ["professional_bio", "service_listing", "portfolio_blurb", "image_prompt"],
    safety_note: "Draft only. Update links, photos, and credentials before publishing.",
    intended_use: "Platform profiles, personal websites, pitch decks"
  },
  research_to_content_pack: {
    type: "research_to_content_pack",
    title: "Research-to-Content Pack",
    description: "Research brief turned into a short script and social post for distribution.",
    assetTypes: ["research_brief", "short_video_script", "social_caption"],
    safety_note: "Draft only. Cite sources and fact-check before external use.",
    intended_use: "Content marketing from research, thought-leadership posts"
  },
  design_asset_pack: {
    type: "design_asset_pack",
    title: "Design Asset Pack",
    description: "Image prompts and social captions to feed a creative pipeline.",
    assetTypes: ["image_prompt", "social_caption"],
    safety_note: "Draft only. Review prompts and generated visuals before client delivery.",
    intended_use: "Creative campaigns, visual asset planning, social graphics"
  },
  code_help_pack: {
    type: "code_help_pack",
    title: "Code Help Pack",
    description: "Implementation brief, summary, and a checklist for safe deployment.",
    assetTypes: ["code_help_brief", "deliverable", "claim_checklist"],
    safety_note: "Draft only. Test code in a sandbox and review security before deploying.",
    intended_use: "Technical documentation, code snippets, deployment guides"
  }
};

export function getContentPackDefinition(packType: ContentPackType): ContentPackDefinition {
  return CONTENT_PACK_DEFINITIONS[packType];
}

export function inferContentPackTypeFromPrompt(prompt: string): ContentPackType | null {
  const p = prompt.toLowerCase();

  if (p.includes("proposal") || p.includes("pitch")) return "proposal_pack";
  if (p.includes("marketing") || p.includes("campaign") || p.includes("outreach sequence")) return "marketing_pack";
  if (p.includes("product listing") || p.includes("sales page") || p.includes("listing copy")) return "product_listing_pack";
  if (p.includes("delivery") || p.includes("handoff") || p.includes("deliver to client")) return "client_delivery_pack";
  if (p.includes("profile") || p.includes("resume") || p.includes("bio pack")) return "profile_pack";
  if (p.includes("research") && (p.includes("content") || p.includes("post"))) return "research_to_content_pack";
  if (p.includes("design") || p.includes("image prompt") || p.includes("graphic")) return "design_asset_pack";
  if (p.includes("code") || p.includes("script") || p.includes("technical brief")) return "code_help_pack";

  return null;
}

/**
 * Produces a safe content brief object for generation.
 */
export function buildContentBrief(input: ContentBriefInput) {
  const { 
    profile, platform, application, opportunity, job, task, 
    target_department, intended_next_action, audience, tone, 
    constraints, requested_asset_type, client_facing_language, internal_guidance_language,
    learned_guidance
  } = input;

  const m = opportunity?.metadata || {};
  const sourceName = opportunity?.source_name || m.source_name || opportunity?.source_platform || m.source_platform || platform?.name || audience || "General Professional";

  const mergedConstraints = [...(constraints || []), ...(input.additional_constraints || [])];

  const brief = {
    asset_type: requested_asset_type,
    objective: intended_next_action || `Generate ${requested_asset_type.replace(/_/g, ' ')}`,
    audience: sourceName,
    tone: tone || profile?.tone || "Professional",
    context_summary: "",
    constraints: mergedConstraints,
    must_include: [] as string[],
    avoid: ["generic AI platitudes", "empty promises", "robotic structure"],
    safety_note: "Manual review required before external use. No live credentials included.",
    client_facing_language: client_facing_language || "English",
    internal_guidance_language: internal_guidance_language || "English"
  };

  const isForeign = brief.client_facing_language.toLowerCase() !== "english";

  const contextParts = [];
  if (profile) {
    const name = getProfileDisplayName(profile);
    const role = getProfileRole(profile);
    const skills = getProfileSkills(profile);
    const background = getProfileBackground(profile);
    
    let profileContext = `User Persona: ${name}. Role: ${role}. Skills: ${skills}.`;
    if (background) profileContext += ` Background: ${background}`;
    if (profile.service_description) profileContext += ` Services: ${profile.service_description}`;
    
    contextParts.push(profileContext);
  }
  
  if (platform) contextParts.push(`Platform: ${platform.name}. Context: ${platform.description || 'General marketplace'}.`);
  
  if (opportunity) {
    const optTitle = m.translated_title || opportunity.title || opportunity.job_title;
    const optBrief = m.translated_summary || m.description_full || opportunity.summary || opportunity.brief || opportunity.description || 'Freelance project';
    const payoutText = opportunity.payout_text || m.payout_text || opportunity.payout_amount || m.payout_amount || "Payout not listed by source";
    const sourceUrl = opportunity.source_url || m.source_url || opportunity.source_link || m.source_link;
    const isPayoutVerified = !!(opportunity.payout_verified || m.payout_verified);
    
    // Requirements & Steps extraction (handle string or array)
    const rawReqs = opportunity.requirements || m.requirements || m.requirements_list;
    const reqs = Array.isArray(rawReqs) ? rawReqs.join(', ') : rawReqs;
    
    const rawSteps = opportunity.steps || m.steps || m.steps_list;
    const steps = Array.isArray(rawSteps) ? rawSteps.join(' -> ') : rawSteps;

    const skillLevel = opportunity.skill_level || m.skill_level;
    const deadline = opportunity.deadline || m.deadline;
    const autopilotFit = opportunity.autopilot_compatibility || m.autopilot_completion_fit;

    contextParts.push(`Opportunity: ${optTitle}. Platform: ${sourceName}. Payout: ${payoutText}${isPayoutVerified ? ' (Verified)' : ' (Estimated)'}.`);
    contextParts.push(`Brief: ${optBrief}.`);
    
    if (sourceUrl) contextParts.push(`Source URL: ${sourceUrl}.`);
    if (reqs) contextParts.push(`Requirements: ${reqs}.`);
    if (steps) contextParts.push(`Workflow Steps: ${steps}.`);
    if (skillLevel) contextParts.push(`Skill Level: ${skillLevel}.`);
    if (deadline) contextParts.push(`Deadline: ${deadline}.`);
    if (autopilotFit) contextParts.push(`Autopilot Compatibility: ${autopilotFit}.`);

    // Account & Identity Requirements
    if (opportunity.account_creation_required || m.account_creation_required) {
      contextParts.push("NOTICE: External account creation is required for this opportunity.");
      brief.must_include.push("Account creation prerequisite step");
    }
    if (opportunity.identity_verification_required || m.identity_verification_required) {
      contextParts.push("NOTICE: Identity verification (KYC) is required for this opportunity.");
      brief.must_include.push("Identity verification prerequisite step");
    }
    
    if (isForeign) {
      contextParts.push(`ORIGINAL LANGUAGE: ${brief.client_facing_language}.`);
    }

    // Safety and Verification Rules
    if (!isPayoutVerified) {
      brief.avoid.push("guaranteeing specific payout amounts", "mentioning fixed rewards");
      brief.must_include.push("Acknowledge payout is subject to verification");
    }
    
    brief.must_include.push(`Reference the ${sourceName} platform requirements`);
  }

  if (job) contextParts.push(`Active Job: ${job.job_title}. Client: ${job.client_name}. Status: ${job.status}.`);
  if (task) contextParts.push(`Current Task: ${task.title}. Type: ${task.task_type}.`);
  if (application) contextParts.push(`Application Status: ${application.status}. Platform: ${application.platform}.`);

  if (learned_guidance) contextParts.push(learned_guidance);

  brief.context_summary = contextParts.join(' ');

  // Add specific requirements based on type
  if (requested_asset_type === "proposal_template") {
    brief.must_include.push(
      "Direct value proposition", 
      "Next steps/Call to action", 
      "Relevance to client requirements",
      "Reminder for manual submission on the platform"
    );
  } else if (requested_asset_type === "deliverable") {
    brief.must_include.push(
      "Outcome summary", 
      "Key results", 
      "Implementation notes where applicable",
      "Final manual review before delivery"
    );
    if (isForeign) {
      brief.must_include.push(`The deliverable content must be in ${brief.client_facing_language}`);
    }
  } else if (requested_asset_type === "delivery_message") {
    brief.must_include.push("Confirmation of completion", "Next steps for client feedback");
    if (isForeign) {
      brief.must_include.push(`The message to the client must be in ${brief.client_facing_language}`);
    }
  } else if (requested_asset_type === "professional_bio") {
    brief.must_include.push("Expertise summary", "Unique selling points", "Professional journey highlight");
  } else if (requested_asset_type === "service_listing") {
    brief.constraints.push("List skills as individual keywords separated by commas, not as full sentences");
  }

  if (input.additional_constraints?.some(c => c.includes("Target Platform"))) {
    // This is a platform-specific gig packet — add anti-duplication hint
    brief.constraints.push("Each asset type must have unique content. Professional_bio is about the person, service_listing is about what they sell, portfolio_blurb is about past work proof.");
  } else if (requested_asset_type === "claim_checklist") {
    brief.must_include.push(
      "Open original source link and verify availability",
      "Confirm payout and deadline details",
      "Check account and identity verification requirements",
      "Pre-claim verification steps", 
      "Platform-specific requirements", 
      "Safety/Security warnings",
      "Final manual review before external submission"
    );
    // Checklists are always internal
    brief.must_include.push("Must be written in English for the user");
  } else if (requested_asset_type === "research_brief") {
    brief.must_include.push("Source credibility assessment", "Key data points", "Actionable recommendations");
  } else if (requested_asset_type === "image_prompt") {
    brief.must_include.push(
      "High-resolution photographic style", 
      "Professional lighting (softbox or cinematic)", 
      "Clean, minimal background",
      "Reflect the professional role and tone",
      "No text or characters if a header image"
    );
    brief.avoid.push("cartoonish style", "clutter", "low quality", "unprofessional elements");
  }

  return brief;
}

/**
 * Deterministic quality scoring logic.
 */
export function scoreContentQuality(body: string, brief: any, kind: ContentAssetKind): { score: number; strengths: string[]; improvement_notes: string } {
  let score = 70; // Baseline
  const strengths: string[] = [];
  const notes: string[] = [];

  if (!body || typeof body !== 'string') {
    return {
      score: 0,
      strengths: [],
      improvement_notes: "Empty or invalid content body provided."
    };
  }

  const wordCount = body.split(/\s+/).length;
  
  // Specificity checks
  if (wordCount < 50) {
    score -= 15;
    notes.push("Content is too brief; lacks necessary detail and depth.");
  } else if (wordCount > 100) {
    strengths.push("Good depth and comprehensive detail.");
    score += 5;
  }

  // Generic phrasing detection
  const genericMarkers = ["reimagining", "delighted to", "game-changer", "world-class", "best-in-class", "holistic", "seamless"];
  const genericCount = genericMarkers.filter(m => body.toLowerCase().includes(m)).length;
  if (genericCount > 2) {
    score -= 10;
    notes.push("Uses several generic AI-style clichés; try more specific, authentic language.");
  } else {
    strengths.push("Avoids excessive generic marketing jargon.");
    score += 5;
  }

  // Structure checks
  if (body.includes('\n\n')) {
    strengths.push("Well-structured with clear paragraph breaks.");
    score += 5;
  } else {
    score -= 10;
    notes.push("Lacks paragraph breaks; harder to read.");
  }

  // Context fit (pseudo-check)
  if (brief.audience && body.toLowerCase().includes(brief.audience.toLowerCase().split(' ')[0])) {
    strengths.push(`Directly references the target audience/platform: ${brief.audience}.`);
    score += 5;
  }

  // Action orientation
  const actionKeywords = ["let's", "schedule", "call", "discuss", "next steps", "check", "view", "attached"];
  if (actionKeywords.some(k => body.toLowerCase().includes(k))) {
    strengths.push("Strong call to action or clear next steps included.");
    score += 5;
  } else if (kind !== "professional_bio" && kind !== "research_brief" && kind !== "portfolio_blurb") {
    score -= 10;
    notes.push("Missing a clear next action or call to movement.");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    strengths,
    improvement_notes: notes.join(' ')
  };
}

/**
 * Main content generation function.
 */
export async function generateContentAsset(input: ContentBriefInput): Promise<ContentGenerationResult> {
  const user = await User.me().catch(() => null);
  const learnedGuidance = user ? await buildContentLearningGuidance(user.email, input.requested_asset_type) : "";
  const identityContext = user ? await getCommunicationIdentity(user.email) : "";
  
  const briefInput = { ...input, learned_guidance: learnedGuidance + identityContext };
  const brief = buildContentBrief(briefInput);
  
  const prompt = `Generate a high-quality ${input.requested_asset_type.replace(/_/g, ' ')} based on this brief:
  
  AUDIENCE: ${brief.audience}
  TONE: ${brief.tone}
  OBJECTIVE: ${brief.objective}
  CONTEXT: ${brief.context_summary}
  CONSTRAINTS: ${brief.constraints.join(', ')}
  MUST INCLUDE: ${brief.must_include.join(', ')}
  AVOID: ${brief.avoid.join(', ')}
  CLIENT-FACING LANGUAGE: ${brief.client_facing_language}
  INTERNAL GUIDANCE LANGUAGE: ${brief.internal_guidance_language}
  
  LANGUAGE RULES:
  1. If this is a client-facing asset (Proposal, Delivery Message, Deliverable), it MUST be written in ${brief.client_facing_language}.
  2. If this is internal guidance (Claim Checklist, Research Brief), it MUST be written in ${brief.internal_guidance_language}.
  3. All metadata (checklist, title, notes) must be in ${brief.internal_guidance_language} for the user to understand.
  
  Provide:
  1. title: A compelling headline or subject line (in ${brief.internal_guidance_language}).
  2. body: The full, ready-to-use content (in the correct target language specified above).
  3. tone_analysis: A short note on the actual tone achieved (in ${brief.internal_guidance_language}).
  4. completion_checklist: 3-5 specific items the user should check before using this (in ${brief.internal_guidance_language}).
  5. revision_prompts: 2-3 specific ways the user could ask to change this (in ${brief.internal_guidance_language}).`;

  const result = await executeContinuityTask({
    prompt,
    system_prompt: `You are the VELO Content Engine. Your goal is to produce marketplace-ready, high-scoring content assets. 
    Do not use placeholders like [Your Name]. Use the provided context. If context is missing, use realistic professional defaults.
    Return the result as a valid JSON object.`,
    department: input.target_department || "Command Officer",
    workflow_name: `Content Generation: ${input.requested_asset_type}`,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        tone_analysis: { type: "string" },
        completion_checklist: { type: "array", items: { type: "string" } },
        revision_prompts: { type: "array", items: { type: "string" } }
      },
      required: ["title", "body", "tone_analysis", "completion_checklist", "revision_prompts"]
    }
  });

  let generated = result.content;
  let fallbackOccurred = result.fallback_occurred || !generated;

  if (fallbackOccurred) {
    generated = getDeterministicFallback(input, brief);
  }

  const quality = scoreContentQuality(generated.body, brief, input.requested_asset_type);

  // Archive the generated content automatically
  const archiveTypeMap: Record<string, ArchiveContentType> = {
    "proposal_template": "template",
    "intro_message": "email",
    "professional_bio": "plan",
    "service_listing": "product_description",
    "portfolio_blurb": "other",
    "faq_answer": "other",
    "product_listing": "product_description",
    "deliverable": "autopilot_deliverable",
    "delivery_message": "email",
    "outreach_message": "email",
    "research_brief": "research_summary",
    "claim_checklist": "workflow_output",
    "social_caption": "social_post",
    "short_video_script": "social_post",
    "community_post": "social_post",
    "launch_message": "email",
    "editing_pass": "other",
    "content_pack_summary": "other",
    "image_prompt": "graphic",
    "pdf_export_brief": "template",
    "code_help_brief": "template"
  };

  saveArchiveItem({
    title: generated.title,
    content_type: archiveTypeMap[input.requested_asset_type] || "other",
    source_department: input.target_department || "Command Officer",
    workflow_name: `Content Generation: ${input.requested_asset_type}`,
    body: generated.body,
    summary: generated.tone_analysis,
    quality_score: quality.score,
    status: "draft",
    tags: [input.requested_asset_type, input.target_department || "general"],
    related_mission_id: input.mission?.id,
    metadata: {
      is_engine_generated: true,
      revision_prompts: generated.revision_prompts,
      checklist: generated.completion_checklist
    }
  }).catch(err => console.error("[VELO] Auto-archive failed:", err));

  // Record learning signal for high quality drafts
  if (user && quality.score >= 80) {
    recordContentArchiveLearningSignal({
      userEmail: user.email,
      contentType: input.requested_asset_type,
      signalType: 'quality_score',
      qualityScore: quality.score,
      metadata: {
        title: generated.title,
        source_department: input.target_department,
        brief_objective: brief.objective
      }
    }).catch(err => console.error("[VELO] Learning signal failed:", err));
  }

  return {
    title: generated.title,
    body: generated.body,
    tone: generated.tone_analysis || brief.tone,
    quality_score: quality.score,
    strengths: quality.strengths,
    improvement_notes: quality.improvement_notes,
    revision_prompts: generated.revision_prompts || [],
    source_context_summary: brief.context_summary,
    brief,
    completion_checklist: generated.completion_checklist || [],
    metadata: {
      provider_used: result.provider_used,
      fallback_occurred: fallbackOccurred,
      generated_at: new Date().toISOString(),
      content_engine_version: "1.2.2",
      input_constraints: brief.constraints
    }
  };
}

/**
 * Batch generation for Content Arsenal.
 */
export async function generateContentAssetSet(input: ContentBriefInput, assetTypes: ContentAssetKind[]): Promise<ContentGenerationResult[]> {
  const results: ContentGenerationResult[] = [];
  
  // We process these sequentially to avoid hammering the provider and to ensure quality
  for (const type of assetTypes) {
    const assetInput = { ...input, requested_asset_type: type };
    const res = await generateContentAsset(assetInput);
    results.push(res);
  }
  
  return results;
}

/**
 * Generates a content pack: a small set of related deliverable assets.
 */
export async function generateContentPack(input: ContentBriefInput & { pack_type: ContentPackType }): Promise<ContentPackResult> {
  const definition = getContentPackDefinition(input.pack_type);
  const maxAssets = Math.min(definition.assetTypes.length, 4);
  const assetTypes = definition.assetTypes.slice(0, maxAssets);

  const assets: ContentGenerationResult[] = [];
  for (const type of assetTypes) {
    const assetInput = { ...input, requested_asset_type: type };
    const res = await generateContentAsset(assetInput);
    assets.push(res);
  }

  const childTitles = assets.map(a => a.title);
  const childQualityScores = assets.map(a => a.quality_score);
  const overallQualityScore = childQualityScores.length > 0
    ? Math.round(childQualityScores.reduce((a, b) => a + b, 0) / childQualityScores.length)
    : 0;

  const allChecklists = assets.flatMap(a => a.completion_checklist);
  const allRevisionPrompts = assets.flatMap(a => a.revision_prompts);
  const allStrengths = assets.flatMap(a => a.strengths);
  const allNotes = assets.map(a => a.improvement_notes).filter(Boolean);

  const packSummary = `Pack: ${definition.title}. Contains ${assets.length} asset(s): ${childTitles.join(", ")}. Intended for: ${definition.intended_use}. ${definition.safety_note}`;

  const packResult: ContentPackResult = {
    packType: input.pack_type,
    packTitle: definition.title,
    assets,
    packSummary,
    overallQualityScore,
    childTitles,
    childQualityScores,
    manualReviewRequired: true,
    externalUseStatus: "draft_only",
    completionChecklist: Array.from(new Set([...allChecklists, "Review every asset before external use", "Confirm no credentials or secrets are included", "Verify target platform terms"])),
    revisionPrompts: Array.from(new Set([...allRevisionPrompts, "Adjust tone across all pack items", "Shorten or expand individual assets"])),
    strengths: Array.from(new Set(allStrengths)),
    improvementNotes: allNotes.join(" ") || "No specific improvement notes."
  };

  // Archive the pack as a parent record
  try {
    const archiveTypeMap: Record<string, ArchiveContentType> = {
      proposal_pack: "template",
      marketing_pack: "social_post",
      product_listing_pack: "product_description",
      client_delivery_pack: "autopilot_deliverable",
      profile_pack: "plan",
      research_to_content_pack: "research_summary",
      design_asset_pack: "graphic",
      code_help_pack: "template"
    };

    const record = await saveArchiveItem({
      title: packResult.packTitle,
      content_type: archiveTypeMap[input.pack_type] || "other",
      source_department: input.target_department || "Command Officer",
      workflow_name: `Content Pack: ${input.pack_type}`,
      body: packResult.packSummary,
      summary: packResult.packSummary,
      quality_score: overallQualityScore,
      status: "draft",
      tags: [input.pack_type, "content_pack", input.target_department || "general"],
      related_mission_id: input.mission?.id,
      metadata: {
        is_content_pack: true,
        pack_type: input.pack_type,
        pack_item_count: assets.length,
        child_titles: childTitles,
        quality_scores: childQualityScores,
        manual_review_required: true,
        external_use_status: "draft_only",
        completion_checklist: packResult.completionChecklist,
        revision_prompts: packResult.revisionPrompts,
        strengths: packResult.strengths,
        improvement_notes: packResult.improvementNotes,
        child_assets: assets.map(a => ({
          title: a.title,
          quality_score: a.quality_score,
          asset_type: input.requested_asset_type
        }))
      }
    });

    if (record) {
      packResult.archivedRecordId = record.id;
      
      // Record learning signal for pack creation
      const user = await User.me().catch(() => null);
      if (user) {
        recordContentArchiveLearningSignal({
          userEmail: user.email,
          itemId: record.id,
          contentType: input.pack_type,
          signalType: 'pack_creation',
          qualityScore: overallQualityScore,
          metadata: {
            pack_title: packResult.packTitle,
            asset_count: assets.length
          }
        }).catch(err => console.error("[VELO] Pack learning signal failed:", err));
      }
    }
  } catch (err) {
    console.error("[VELO] Pack archive failed:", err);
  }

  return packResult;
}

/**
 * Deterministic fallbacks for when AI is unavailable.
 */
function getDeterministicFallback(input: ContentBriefInput, brief: any): any {
  const persona = getProfileDisplayName(input.profile);
  const role = getProfileRole(input.profile);
  const skills = getProfileSkills(input.profile);
  
  const fallbacks: Record<string, any> = {
    "proposal_template": {
      title: `Proposal: Strategic Solution for ${brief.audience}`,
      body: `Hello,\n\nI am reaching out regarding your project for ${brief.audience}. As a ${role}, I specialize in delivering high-impact solutions that align with your specific objectives.\n\nMy approach focuses on efficiency and precision, ensuring all project requirements are met with professional rigor. I would welcome the opportunity to discuss how my expertise in ${skills} can support your current needs.\n\nBest regards,\n${persona}`,
      tone_analysis: "Professional & Direct",
      completion_checklist: ["Add specific project reference", "Adjust greeting", "Insert personal signature"],
      revision_prompts: ["Make it more enthusiastic", "Focus on technical stack"]
    },
    "professional_bio": {
      title: `${persona} | ${role}`,
      body: `${persona} is a dedicated ${role} focused on operational excellence and strategic growth. With a professional background in ${skills}, they specialize in delivering consistent, high-quality results across various complex environments.`,
      tone_analysis: "Refined & Trustworthy",
      completion_checklist: ["Verify skill list", "Check role title"],
      revision_prompts: ["Make it shorter", "Focus on leadership experience"]
    },
    "intro_message": {
      title: "Introduction & Collaboration Inquiry",
      body: `Hi there,\n\nI'm ${persona}, a ${role} currently exploring new opportunities on ${brief.audience}. Your recent activity caught my attention, and I'd love to connect and discuss potential synergies.\n\nLooking forward to hearing from you.`,
      tone_analysis: "Approachable & Concise",
      completion_checklist: ["Add platform specific context", "Check spelling"],
      revision_prompts: ["Make it warmer", "Keep it strictly business"]
    },
    "deliverable": {
      title: `Deliverable: ${input.job?.job_title || 'Project Update'}`,
      body: `Attached is the completed work for ${input.job?.job_title || 'the current phase'}. This deliverable addresses the key requirements of the brief and includes necessary implementation notes for immediate use.\n\nSummary of results:\n- Optimized target objectives\n- Structural alignment with brief\n- Final quality verification complete.`,
      tone_analysis: "Formal & Result-oriented",
      completion_checklist: ["Attach final files", "Double check requirements list"],
      revision_prompts: ["Add more technical detail", "Summarize for executive review"]
    },
    "delivery_message": {
      title: `Project Delivery: ${input.job?.job_title || 'Final Submission'}`,
      body: `Hi,\n\nI'm pleased to deliver the completed artifacts for ${input.job?.job_title || 'your project'}. Everything has been double-checked for quality and alignment with the initial brief.\n\nPlease let me know if you have any questions or if you'd like to discuss the next steps.\n\nBest,\n${persona}`,
      tone_analysis: "Professional & Accommodating",
      completion_checklist: ["Confirm all files are attached", "Check client name", "Add links if necessary"],
      revision_prompts: ["Make it more formal", "Add a brief summary of results"]
    },
    "service_listing": {
      title: `${role} Services | High-Impact ${skills}`,
      body: `Offering expert ${role} services tailored to your specific business needs. I provide comprehensive solutions in ${skills}, focusing on reliability, speed, and strategic alignment.\n\nKey areas of focus:\n- Strategic Operations\n- Results-driven delivery\n- Long-term value creation.`,
      tone_analysis: "Value-focused & Clear",
      completion_checklist: ["Verify service pricing", "Update skill tags", "Add portfolio link"],
      revision_prompts: ["Make it more sales-oriented", "Focus on a single skill"]
    },
    "portfolio_blurb": {
      title: `Project Spotlight: ${role} Excellence`,
      body: `A showcase of recent work demonstrating ${persona}'s expertise in ${skills}. This project involved complex problem-solving and resulted in high-quality outcomes for the client.`,
      tone_analysis: "Confident & Evidence-based",
      completion_checklist: ["Link to full case study", "Add client testimonial", "Update results data"],
      revision_prompts: ["Focus on technical difficulty", "Make it more client-centric"]
    },
    "faq_answer": {
      title: "Common Inquiry Response",
      body: `Thank you for asking. Regarding ${input.requested_asset_type}, my approach as a ${role} is to ensure maximum transparency and quality. I typically handle these requests by first assessing the core requirement and then applying specialized ${skills} to achieve the desired outcome.`,
      tone_analysis: "Helpful & Professional",
      completion_checklist: ["Check for clarity", "Ensure direct answer", "Add link to more FAQs"],
      revision_prompts: ["Make it shorter", "Add more technical detail"]
    },
    "product_listing": {
      title: `Strategic Asset: ${role} Output`,
      body: `This professional asset, developed by a ${role}, provides immediate value for ${brief.audience}. Built with expertise in ${skills}, it is designed for ease of use and maximum impact in professional settings.`,
      tone_analysis: "Benefit-led & Professional",
      completion_checklist: ["Verify feature list", "Check pricing", "Update screenshots"],
      revision_prompts: ["Focus on ROI", "Add more technical specifications"]
    },
    "outreach_message": {
      title: "Strategic Partnership Inquiry",
      body: `Hello,\n\nI'm ${persona}, a ${role} specializing in ${skills}. I've been following your work with ${brief.audience} and believe there's a strong opportunity for us to collaborate on upcoming initiatives.\n\nWould you be open to a brief chat about how my background might align with your current goals?\n\nBest,\n${persona}`,
      tone_analysis: "Strategic & Respectful",
      completion_checklist: ["Verify recipient name", "Add specific collaboration point", "Check call to action"],
      revision_prompts: ["Make it more casual", "Focus more on recent achievements"]
    },
    "research_brief": {
      title: `Strategic Research: ${brief.audience} Analysis`,
      body: `This research brief, compiled by a ${role}, provides a comprehensive overview of the current landscape for ${brief.audience}. Key findings highlight opportunities for ${skills} application and strategic growth.\n\nNext steps:\n1. Review competitive landscape\n2. Align with internal goals\n3. Execute targeted pilot.`,
      tone_analysis: "Analytical & Forward-looking",
      completion_checklist: ["Verify data sources", "Check formatting", "Add executive summary"],
      revision_prompts: ["Add more data points", "Focus on actionable insights"]
    },
    "claim_checklist": {
      title: `Claim Checklist: ${brief.audience} Opportunity`,
      body: `Review these items before claiming this task on ${brief.audience}:\n\n1. Verify task requirements match your current profile skills (${skills}).\n2. Ensure the reward and time commitment are acceptable.\n3. Check for any specific platform rules or restrictions.\n4. Confirm if the local computer (Ubuntu) is required for final submission.\n5. Log into the platform and ensure the task is still available for claim.`,
      tone_analysis: "Clear & Cautionary",
      completion_checklist: ["Open target platform", "Verify account status", "Confirm task availability"],
      revision_prompts: ["Make it more detailed", "Focus on platform security"]
    },
    "social_caption": {
      title: "Organic Social Caption Batch",
      body: `1. Discover the secret to better results in ${brief.audience}. ${input.opportunity?.title || 'This solution'} is here to help.\n2. Why wait? Upgrade your routine with ${input.opportunity?.title || 'the best tools'}.\n3. Ready for a change? ${input.opportunity?.title || 'This'} is what you've been looking for.`,
      tone_analysis: "Engaging & Direct",
      completion_checklist: ["Add niche hashtags", "Check emoji usage", "Verify link in bio"],
      revision_prompts: ["Make it more hype", "Focus on a single benefit"]
    },
    "short_video_script": {
      title: "Short-Form Video Hook & Script",
      body: `[Hook]: The one thing you're missing in your ${brief.audience} setup...\n[Body]: If you're looking for better results with ${brief.audience}, you need to see ${input.opportunity?.title || 'this'}. It's simple, effective, and designed for professionals.\n[CTA]: Click the link in bio to learn more.`,
      tone_analysis: "Dynamic & Action-oriented",
      completion_checklist: ["Check timing (under 15s)", "Ensure hook is first 3s", "Check lighting for shoot"],
      revision_prompts: ["Make it a story-based hook", "Add more technical details"]
    },
    "community_post": {
      title: "Community Engagement Post",
      body: `Hi everyone! I've been working on a new project for the ${brief.audience} community called ${input.opportunity?.title || 'this'}.\n\nIt focuses on solving common challenges in ${brief.audience} through efficiency and quality. I'd love to get your feedback on the latest version!\n\nCheck it out here: [Link]`,
      tone_analysis: "Community-focused & Authentic",
      completion_checklist: ["Verify community rules", "Personalize the greeting", "Check link functionality"],
      revision_prompts: ["Make it less sales-y", "Ask a specific question"]
    },
    "launch_message": {
      title: "Member Outreach / Launch Message",
      body: `Hello!\n\nI'm excited to share that ${input.opportunity?.title || 'our new product'} is officially staged for the ${brief.audience} niche. As someone interested in ${brief.audience}, I thought you'd appreciate a first look.\n\nYou can see the full details here: [Link]\n\nBest,\n${persona}`,
      tone_analysis: "Professional & Personal",
      completion_checklist: ["Insert correct recipient name", "Double-check link", "Check formatting"],
      revision_prompts: ["Make it shorter", "Focus on the 'why'"]
    },
    "editing_pass": {
      title: "Editing Pass Notes",
      body: `Reviewed draft for ${brief.audience}. Key edits:\n1. Tightened opening for clarity.\n2. Removed generic phrasing.\n3. Added a stronger call to action.\n4. Checked tone consistency throughout.\n\nNext: review the marked sections and approve changes before external use.`,
      tone_analysis: "Critical & Constructive",
      completion_checklist: ["Confirm all edits are correct", "Verify no meaning was lost", "Check formatting after edits"],
      revision_prompts: ["Focus on grammar only", "Rewrite for a different tone"]
    },
    "content_pack_summary": {
      title: "Content Pack Summary",
      body: `This pack contains curated assets for ${brief.audience}. Each item is drafted for manual review before external use.\n\nOverview:\n- Pack focus: ${brief.objective}\n- Target tone: ${brief.tone}\n- Language: ${brief.client_facing_language}\n\nReview all items, then approve or request revisions.`,
      tone_analysis: "Organized & Clear",
      completion_checklist: ["Open each asset in the pack", "Verify pack matches your goal", "Confirm no credentials leaked"],
      revision_prompts: ["Add more assets to the pack", "Change the target audience"]
    },
    "image_prompt": {
      title: "Image Generation Prompt",
      body: `Create a professional visual for ${brief.audience}. The image should reflect the tone ${brief.tone} and include elements that highlight ${input.profile?.skills || 'core expertise'}.\n\nStyle notes: clean, modern, high contrast. Avoid cluttered backgrounds. Ensure text is legible if included.\n\nUsage: review the generated image before publishing.`,
      tone_analysis: "Visual & Directive",
      completion_checklist: ["Review prompt for clarity", "Confirm style matches brand", "Check generated image for artifacts"],
      revision_prompts: ["Make the prompt more detailed", "Switch to illustration style"]
    },
    "pdf_export_brief": {
      title: "PDF Export Brief",
      body: `Document outline for ${brief.audience}:\n\n1. Title page with branding\n2. Executive summary\n3. Detailed sections aligned with ${brief.objective}\n4. Call to action / next steps\n5. Appendix with sources and credentials\n\nFormatting: professional layout, readable fonts, clear headers. Export as PDF only after final review.`,
      tone_analysis: "Structured & Formal",
      completion_checklist: ["Verify all sections are complete", "Check page breaks", "Export and preview the PDF"],
      revision_prompts: ["Add more visuals", "Shorten the executive summary"]
    },
    "code_help_brief": {
      title: "Code Implementation Brief",
      body: `Implementation guide for ${brief.audience}:\n\nObjective: ${brief.objective}\nTech context: ${input.profile?.skills || 'General development'}\n\nSteps:\n1. Review requirements and constraints.\n2. Set up a sandbox environment.\n3. Implement the core logic.\n4. Run tests before deploying.\n5. Document changes for future reference.\n\nSecurity: do not commit secrets. Review code manually before merging.`,
      tone_analysis: "Technical & Pragmatic",
      completion_checklist: ["Test in a sandbox first", "Remove any hardcoded secrets", "Run linting and type checks"],
      revision_prompts: ["Add error handling examples", "Include unit test suggestions"]
    }
  };

  return fallbacks[input.requested_asset_type] || {
    title: `Draft: ${input.requested_asset_type.replace(/_/g, ' ')}`,
    body: `This is a deterministic draft for ${input.requested_asset_type}. Context: ${brief.context_summary}. Please review and finalize manually.`,
    tone_analysis: "Neutral",
    completion_checklist: ["Review for accuracy", "Personalize content"],
    revision_prompts: ["Add more detail", "Adjust for specific platform"]
  };
}
