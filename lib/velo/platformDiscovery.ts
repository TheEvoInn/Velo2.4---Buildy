













/**
 * Platform Discovery Intelligence for VELO
 * Handles classification, readiness, and mission staging for income platforms.
 */

export interface PlatformPreset {
  name: string;
  category: "freelance" | "gig" | "creator" | "affiliate" | "trade" | "e-commerce" | "emerging";
  target_department: "freelance" | "trade";
  platform_type: string;
  source_url: string;
  cost_mode: string;
  access_mode: string;
  requirements: string[];
  risk_level: "low" | "medium" | "high";
  notes: string;
  payout_speed?: "instant" | "fast" | "standard";
  ai_allowed?: boolean;
}

export const PLATFORM_DISCOVERY_PRESETS: PlatformPreset[] = [
  {
    name: "Fiverr",
    category: "freelance",
    target_department: "freelance",
    platform_type: "Marketplace",
    source_url: "https://www.fiverr.com",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Service List", "Profile Photo", "Contact Email"],
    risk_level: "low",
    notes: "Gig-based marketplace. Best for defined productized services.",
    payout_speed: "standard",
    ai_allowed: true
  },
  {
    name: "Upwork",
    category: "freelance",
    target_department: "freelance",
    platform_type: "Marketplace",
    source_url: "https://www.upwork.com",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Professional Bio", "Skill List", "Portfolio Link", "ID Verification"],
    risk_level: "low",
    notes: "High-volume freelance marketplace. Requires detailed professional identity.",
    payout_speed: "standard",
    ai_allowed: false
  },
  {
    name: "Shopify",
    category: "trade",
    target_department: "trade",
    platform_type: "E-commerce",
    source_url: "https://www.shopify.com",
    cost_mode: "paid_optional",
    access_mode: "connector-ready",
    requirements: ["Store URL", "Access Token", "Niche Focus"],
    risk_level: "low",
    notes: "E-commerce platform for autonomous store management.",
    payout_speed: "standard",
    ai_allowed: false
  },
  {
    name: "Gumroad",
    category: "creator",
    target_department: "trade",
    platform_type: "Marketplace",
    source_url: "https://www.gumroad.com",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Product Portfolio", "Payment Details"],
    risk_level: "low",
    notes: "Platform for digital creators to sell assets and tools.",
    payout_speed: "standard",
    ai_allowed: false
  }
];

export const AI_FREELANCE_PLATFORM_PRESETS: PlatformPreset[] = [
  {
    name: "Toloka",
    category: "gig",
    target_department: "freelance",
    platform_type: "Microtask",
    source_url: "https://toloka.ai",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Skill List", "Payment Details"],
    risk_level: "low",
    notes: "Instant-claim microtask platform. Tasks approved within hours. Fast PayPal/Payoneer payouts. AI assistance allowed as helper.",
    payout_speed: "fast",
    ai_allowed: true
  },
  {
    name: "Clickworker",
    category: "gig",
    target_department: "freelance",
    platform_type: "Microtask",
    source_url: "https://www.clickworker.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Payment Details", "ID Verification"],
    risk_level: "low",
    notes: "Data annotation and microtasks. Quick task approval. Weekly payouts via PayPal/SEPA. AI tools allowed for review.",
    payout_speed: "fast",
    ai_allowed: true
  },
  {
    name: "Amazon MTurk",
    category: "gig",
    target_department: "freelance",
    platform_type: "Microtask",
    source_url: "https://www.mturk.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Payment Details", "Tax Information"],
    risk_level: "low",
    notes: "Surveys, labeling, transcription. Tasks approved in hours to days. Daily bank transfers. Light AI tool use tolerated.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "PromptBase",
    category: "gig",
    target_department: "freelance",
    platform_type: "AI Marketplace",
    source_url: "https://promptbase.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Service List", "Portfolio Link", "Payment Details"],
    risk_level: "low",
    notes: "Sell AI prompts for ChatGPT, Midjourney, Stable Diffusion. AI-first platform. Payouts via Stripe/PayPal.",
    payout_speed: "fast",
    ai_allowed: true
  },
  {
    name: "Appen",
    category: "gig",
    target_department: "freelance",
    platform_type: "AI Training",
    source_url: "https://appen.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Skill List", "ID Verification", "Payment Details"],
    risk_level: "low",
    notes: "AI data annotation and evaluation. Regular projects with weekly payouts. Strict on no-automation.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "Test IO",
    category: "gig",
    target_department: "freelance",
    platform_type: "QA Testing",
    source_url: "https://test.io",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Technical Skill List", "Payment Details"],
    risk_level: "low",
    notes: "Crowdsourced software testing. Claim individual test cycles. Fast approval on bug reports. PayPal payouts.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "UserTesting",
    category: "gig",
    target_department: "freelance",
    platform_type: "UX Testing",
    source_url: "https://www.usertesting.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Profile Photo", "Payment Details"],
    risk_level: "low",
    notes: "Website and app user testing. Sessions pay within 7 days. PayPal payouts. No resume needed for basic tests.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "Prolific",
    category: "gig",
    target_department: "freelance",
    platform_type: "Research",
    source_url: "https://www.prolific.com",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "ID Verification", "Payment Details"],
    risk_level: "low",
    notes: "Academic research studies. Instant cash-out to PayPal once approved. High pay rates for qualified participants.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "DataAnnotation.tech",
    category: "gig",
    target_department: "freelance",
    platform_type: "AI Training",
    source_url: "https://www.dataannotation.tech",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Professional Bio", "Technical Skill List", "Portfolio Proof"],
    risk_level: "low",
    notes: "High-paying AI training and evaluation platform. Focuses on coding and creative writing.",
    payout_speed: "fast",
    ai_allowed: true
  },
  {
    name: "Remotasks",
    category: "gig",
    target_department: "freelance",
    platform_type: "Microtask",
    source_url: "https://www.remotasks.com",
    cost_mode: "free",
    access_mode: "staged-only",
    requirements: ["Skill List", "Payment Details", "ID Verification"],
    risk_level: "low",
    notes: "Task-based platform for AI training. High volume of small tasks.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "dealwork.ai",
    category: "freelance",
    target_department: "freelance",
    platform_type: "AI Marketplace",
    source_url: "https://dealwork.ai",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Agent Profile", "Service Capabilities", "Portfolio Proof", "Payout Reference", "API Connector Readiness"],
    risk_level: "low",
    notes: "AI-native marketplace for agents and automated tasks. Focuses on content, research, and coding.",
    payout_speed: "standard",
    ai_allowed: true
  },
  {
    name: "Toku",
    category: "freelance",
    target_department: "freelance",
    platform_type: "AI Agency",
    source_url: "https://toku.agency",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Service Listing", "Technical Skill List", "Portfolio Proof", "Stripe Payout Reference"],
    risk_level: "low",
    notes: "AI agent services with instant fulfillment and automation focus.",
    payout_speed: "standard",
    ai_allowed: true
  },
  {
    name: "ClawGig",
    category: "freelance",
    target_department: "freelance",
    platform_type: "Web3 AI Marketplace",
    source_url: "https://clawgig.ai",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Service Profile", "Crypto Capability Notes", "Solana Wallet", "API Key"],
    risk_level: "high",
    notes: "AI-agent-only marketplace with Web3 integration. Requires crypto infrastructure.",
    payout_speed: "standard",
    ai_allowed: true
  },
  {
    name: "Superteam Earn",
    category: "freelance",
    target_department: "freelance",
    platform_type: "Bounty Board",
    source_url: "https://earn.superteam.fun",
    cost_mode: "free",
    access_mode: "manual-only",
    requirements: ["Profile Link", "Project Proof", "Solana Wallet"],
    risk_level: "medium",
    notes: "Public bounty and grant marketplace for AI and Web3 opportunities.",
    payout_speed: "fast",
    ai_allowed: false
  },
  {
    name: "Upwork AI Jobs",
    category: "freelance",
    target_department: "freelance",
    platform_type: "Traditional Marketplace",
    source_url: "https://www.upwork.com/freelance-jobs/artificial-intelligence/",
    cost_mode: "free",
    access_mode: "connector-ready",
    requirements: ["Professional Bio", "AI Skill List", "Portfolio Link", "ID Verification", "Payout Reference"],
    risk_level: "low",
    notes: "Traditional platform with high AI demand. Best for high-budget, high-trust jobs.",
    payout_speed: "standard",
    ai_allowed: false
  },
  {
    name: "Enso",
    category: "emerging",
    target_department: "freelance",
    platform_type: "Enterprise AI",
    source_url: "https://enso.bot",
    cost_mode: "paid_optional",
    access_mode: "staged-only",
    requirements: ["Corporate Profile", "Service List"],
    risk_level: "medium",
    notes: "Emerging enterprise automation platform. Requirements are evolving.",
    payout_speed: "standard",
    ai_allowed: false
  }
];


export interface RequirementDef {
  label: string;
  destination: "clone_bay" | "secure_core";
  description: string;
  example: string;
  sensitivity: "low" | "medium" | "high";
  field_suggestion?: string;
}

export const REQUIREMENT_MAP: Record<string, RequirementDef> = {
  "Professional Bio": {
    label: "Professional Bio",
    destination: "clone_bay",
    description: "A compelling summary of your professional background and expertise.",
    example: "Expert developer with 10 years experience in React and Node.js.",
    sensitivity: "low",
    field_suggestion: "profile_summary"
  },
  "Skill List": {
    label: "Skill List",
    destination: "clone_bay",
    description: "A categorized list of your core technical and soft skills.",
    example: "TypeScript, UI Design, Project Management",
    sensitivity: "low",
    field_suggestion: "skills"
  },
  "Portfolio Link": {
    label: "Portfolio Link",
    destination: "clone_bay",
    description: "URL to your professional work portfolio or GitHub profile.",
    example: "https://github.com/username",
    sensitivity: "low",
    field_suggestion: "portfolio_url"
  },
  "ID Verification": {
    label: "ID Verification",
    destination: "clone_bay",
    description: "Government-issued ID or verification status for platform trust.",
    example: "Verified Passport or Driver's License",
    sensitivity: "high",
    field_suggestion: "verification_status"
  },
  "Service List": {
    label: "Service List",
    destination: "clone_bay",
    description: "The specific services or 'gigs' you offer to clients.",
    example: "Web Audit, Logo Design, Content Writing",
    sensitivity: "low",
    field_suggestion: "services"
  },
  "Profile Photo": {
    label: "Profile Photo",
    destination: "clone_bay",
    description: "A professional headshot for your public profile.",
    example: "uploaded_photo_url",
    sensitivity: "low",
    field_suggestion: "photo_url"
  },
  "Contact Email": {
    label: "Contact Email",
    destination: "clone_bay",
    description: "Preferred email address for platform notifications and leads.",
    example: "hello@example.com",
    sensitivity: "low",
    field_suggestion: "public_email"
  },
  "API Key": {
    label: "API Key",
    destination: "secure_core",
    description: "Primary authentication key for API access.",
    example: "ak_live_...",
    sensitivity: "high"
  },
  "Secret Key": {
    label: "Secret Key",
    destination: "secure_core",
    description: "Sensitive secret key paired with your API key.",
    example: "sk_live_...",
    sensitivity: "high"
  },
  "Two-Factor Auth": {
    label: "Two-Factor Auth",
    destination: "secure_core",
    description: "Backup codes or 2FA secret for automated login security.",
    example: "ABC-123-XYZ",
    sensitivity: "high"
  },
  "Store URL": {
    label: "Store URL",
    destination: "clone_bay",
    description: "The unique web address for your e-commerce storefront.",
    example: "https://mystore.myshopify.com",
    sensitivity: "low",
    field_suggestion: "store_url"
  },
  "Access Token": {
    label: "Access Token",
    destination: "secure_core",
    description: "OAuth or permanent access token for platform operations.",
    example: "shpat_...",
    sensitivity: "high"
  },
  "Niche Focus": {
    label: "Niche Focus",
    destination: "clone_bay",
    description: "The specific market or industry segment you target.",
    example: "Organic Skincare, Indie Games",
    sensitivity: "low",
    field_suggestion: "niche"
  },
  "Product Portfolio": {
    label: "Product Portfolio",
    destination: "clone_bay",
    description: "List or link to products available for sale.",
    example: "Digital assets, SaaS tools",
    sensitivity: "low",
    field_suggestion: "products"
  },
  "Payment Details": {
    label: "Payment Details",
    destination: "clone_bay",
    description: "Reference to payout methods or payment configurations.",
    example: "Stripe Connected, PayPal active",
    sensitivity: "medium",
    field_suggestion: "payment_method"
  },
  "Portfolio ID": {
    label: "Portfolio ID",
    destination: "secure_core",
    description: "Specific identifier for a sub-portfolio or account group.",
    example: "port_789...",
    sensitivity: "medium"
  },
  "Agent Profile": {
    label: "Agent Profile",
    destination: "clone_bay",
    description: "A specialized profile describing your AI agent or autonomous service capabilities.",
    example: "VELO Autonomous Researcher v1.0",
    sensitivity: "low",
    field_suggestion: "agent_description"
  },
  "Service Capabilities": {
    label: "Service Capabilities",
    destination: "clone_bay",
    description: "A detailed list of tasks your AI agent can perform autonomously.",
    example: "Market analysis, competitive research, lead generation",
    sensitivity: "low",
    field_suggestion: "capabilities"
  },
  "Portfolio Proof": {
    label: "Portfolio Proof",
    destination: "clone_bay",
    description: "Concrete examples or output logs demonstrating successful task completion.",
    example: "links to generated reports or project repositories",
    sensitivity: "low",
    field_suggestion: "portfolio_assets"
  },
  "Payout Reference": {
    label: "Payout Reference",
    destination: "clone_bay",
    description: "Name or label of your preferred payout method for earnings.",
    example: "Main Stripe Account, Secondary PayPal",
    sensitivity: "medium",
    field_suggestion: "payout_label"
  },
  "API Connector Readiness": {
    label: "API Connector Readiness",
    destination: "clone_bay",
    description: "Confirmation that your agent is ready to receive and process tasks via API/Webhooks.",
    example: "Webhook URL configured, API key mapped",
    sensitivity: "medium",
    field_suggestion: "connector_readiness"
  },
  "Technical Skill List": {
    label: "Technical Skill List",
    destination: "clone_bay",
    description: "Specific technical skills required for advanced AI task fulfillment.",
    example: "Python, OpenAI API, Vector Databases",
    sensitivity: "low",
    field_suggestion: "skills"
  },
  "Stripe Payout Reference": {
    label: "Stripe Payout Reference",
    destination: "secure_core",
    description: "Secure label for your Stripe account configuration.",
    example: "Stripe Connect: VELO Main",
    sensitivity: "medium"
  },
  "Solana Wallet": {
    label: "Project Proof",
    destination: "clone_bay",
    description: "Evidence of completed projects or contributions.",
    example: "Pull request links, certification IDs",
    sensitivity: "low",
    field_suggestion: "work_history"
  },
  "AI Skill List": {
    label: "AI Skill List",
    destination: "clone_bay",
    description: "Curated skills specifically for Artificial Intelligence roles.",
    example: "NLP, LLM Orchestration, Prompt Engineering",
    sensitivity: "low",
    field_suggestion: "skills"
  },
  "Tax Information": {
    label: "Tax Information",
    destination: "secure_core",
    description: "Tax identification numbers or residency documents.",
    example: "W-8BEN, W-9, or local Tax ID",
    sensitivity: "high"
  },
  "Business Address": {
    label: "Business Address",
    destination: "clone_bay",
    description: "Verified physical or registered address for business operations.",
    example: "123 Starship Lane, Sector 7",
    sensitivity: "medium",
    field_suggestion: "legal_address"
  },
  "Phone Verification": {
    label: "Phone Verification",
    destination: "clone_bay",
    description: "A verified phone number for SMS authentication and trust.",
    example: "+1 555-0199",
    sensitivity: "medium",
    field_suggestion: "phone"
  }
};

/**
 * Classifies a requirement label into a verification type for Secure Core tracking.
 */
export function classifyVerificationType(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("id ") || l.includes("identity") || l.includes("passport")) return "id_document";
  if (l.includes("photo") || l.includes("selfie")) return "selfie_or_profile_photo";
  if (l.includes("address") || l.includes("residency")) return "address";
  if (l.includes("tax")) return "tax";
  if (l.includes("business")) return "business";
  if (l.includes("portfolio") || l.includes("proof")) return "portfolio";
  if (l.includes("payout") || l.includes("payment")) return "payout";
  if (l.includes("2fa") || l.includes("auth") || l.includes("factor")) return "two_factor";
  return "manual_review";
}

/**
 * Detects verification requirements from a platform's requirement list.
 */
export function detectVerificationRequirements(platform: any) {
  const verificationKeywords = [
    "verification", "id", "photo", "selfie", "tax", "address", 
    "payout", "payment", "payout reference", "stripe", "wallet", 
    "two-factor", "2fa", "proof"
  ];
  
  const requirements = platform && Array.isArray(platform.requirements) ? platform.requirements : [];
  return requirements.filter((req: any) => {
    if (typeof req !== 'string') return false;
    const l = req.toLowerCase();
    return verificationKeywords.some(kw => l.includes(kw));
  });
}

/**
 * Calculates missing information for a platform based on requirements.
 */
export function calculateMissingInfo(requirements: string[], profile: any, vault: any[]): string[] {
  const missing: string[] = [];
  const safeVault = Array.isArray(vault) ? vault : [];
  const vaultLabels = new Set(safeVault.map(v => v?.label?.toLowerCase()).filter(Boolean));
  
  const safeRequirements = Array.isArray(requirements) ? requirements : [];

  safeRequirements.forEach(req => {
    if (typeof req !== 'string' || !req) return;
    const def = REQUIREMENT_MAP[req];
    
    if (def?.destination === "secure_core") {
      // Check vault by label
      if (!vaultLabels.has(req.toLowerCase())) {
        missing.push(req);
      }
    } else {
      // Check Clone Bay (AutopilotProfile)
      const field = def?.field_suggestion || req.toLowerCase().replace(/ /g, "_");
      
      // Check top level
      let hasValue = profile && profile[field] && (Array.isArray(profile[field]) ? profile[field].length > 0 : true);
      
      // Check metadata
      if (!hasValue && profile?.metadata) {
        hasValue = profile.metadata[field] || profile.metadata[req];
      }
      
      if (!hasValue) missing.push(req);
    }
  });
  
  return missing;
}

/**
 * Builds a sync plan for a platform.
 */
export function buildPlatformSyncPlan(platform: any, profile: any, vault: any[]) {
  const requirements = platform?.requirements || [];
  const missing = calculateMissingInfo(requirements, profile, vault);
  const requests = (Array.isArray(missing) ? missing : []).map(req => {
    if (typeof req !== 'string') return null;
    const def = REQUIREMENT_MAP[req] || {
      label: req,
      destination: (req.toLowerCase().includes("key") || req.toLowerCase().includes("secret") || req.toLowerCase().includes("auth")) ? "secure_core" : "clone_bay",
      description: `Requirement for ${platform?.name || 'Platform'}`,
      example: "Data needed",
      sensitivity: "medium"
    };
    return def;
  }).filter(Boolean);

  const cloneRequests = (Array.isArray(requests) ? requests : []).filter((r: any) => r?.destination === "clone_bay");
  const secureRequests = (Array.isArray(requests) ? requests : []).filter((r: any) => r?.destination === "secure_core");
  
  const total = Array.isArray(requirements) ? (requirements.length || 1) : 1;
  const progress = Math.round(((total - (Array.isArray(missing) ? missing.length : 0)) / total) * 100);

  return {
    missing,
    requests,
    cloneRequests,
    secureRequests,
    progress,
    isReady: missing.length === 0
  };
}

/**
 * Determines the readiness status based on missing information.
 */
export function getPlatformReadiness(missingCount: number): { status: string; color: string } {
  if (missingCount === 0) return { status: "Ready to Dock", color: "text-emerald-400" };
  if (missingCount <= 2) return { status: "Awaiting Minor Data", color: "text-amber-400" };
  return { status: "Incomplete Configuration", color: "text-red-400" };
}

/**
 * Builds a mission details for a platform onboarding request.
 */
export function buildOnboardingMission(platform: any, created_by?: string): any {
  return {
    title: `Onboard Platform: ${platform?.name || 'Unknown'}`,
    details: `Review and approve connection to ${platform?.name || 'Unknown'} (${platform?.category || 'General'}).\n\nTarget Department: ${(platform?.target_department || 'Freelance').toUpperCase()}\nAccess Mode: ${(platform?.access_mode || 'Manual').toUpperCase()}\nRisk Level: ${(platform?.risk_level || 'Low').toUpperCase()}\n\nRequirements detected: ${Array.isArray(platform?.requirements) ? platform.requirements.join(", ") : "None detected"}`,
    requested_action: `SYNC_PLATFORM_ONBOARDING:${platform?.id}`,
    created_by
  };
}

/**
 * Builds a mission to request missing core information.
 */
export function buildSyncMission(platform: any, missing: string[], created_by?: string): any {
  return {
    title: `Sync Core Data: ${platform?.name || 'Platform'}`,
    details: `The following information is required to dock with ${platform?.name || 'Platform'}:\n\n${(Array.isArray(missing) ? missing : []).map(m => `- ${m}`).join("\n")}\n\nPlease update Clone Bay and Secure Core to proceed.`,
    requested_action: `COMPLETE_SYNC:${platform?.id}`,
    source_department: "Docking Control",
    mission_type: "PLATFORM_CORE_SYNC_REQUEST",
    risk_level: "low",
    status: "pending",
    metadata: { platform_id: platform?.id, missing_requirements: Array.isArray(missing) ? missing : [] },
    created_by
  };
}

/**
 * Builds a review-safe application packet for a platform.
 * Pulls data from profile and vault labels.
 */
export function buildApplicationPacket(platform: any, profile: any, vault: any[]) {
  const generated: Record<string, any> = {};
  const missing: string[] = [];
  const safeVault = Array.isArray(vault) ? vault : [];
  const vaultLabels = new Set(safeVault.map(v => v?.label?.toLowerCase()).filter(Boolean));

  const requirements = Array.isArray(platform?.requirements) ? platform.requirements : [];
  requirements.forEach((req: string) => {
    if (typeof req !== 'string' || !req) return;
    const def = REQUIREMENT_MAP[req];
    if (!def) {
      missing.push(req);
      return;
    }

    if (def.destination === "secure_core") {
      if (vaultLabels.has(req.toLowerCase())) {
        generated[req] = `[SECURE_LABEL: ${req}]`;
      } else {
        missing.push(req);
      }
    } else {
      const field = def.field_suggestion || req.toLowerCase().replace(/ /g, "_");
      let val = profile && profile[field];
      
      if (!val && profile?.metadata) {
        val = profile.metadata[field] || profile.metadata[req];
      }

      if (val) {
        generated[req] = Array.isArray(val) ? val.join(", ") : val;
      } else {
        missing.push(req);
      }
    }
  });

  return {
    platform_id: platform?.id,
    platform_name: platform?.name,
    target_department: platform?.target_department,
    generated_fields: generated,
    missing_fields: missing,
    is_ready: missing.length === 0,
    risk_level: platform?.risk_level
  };
}
