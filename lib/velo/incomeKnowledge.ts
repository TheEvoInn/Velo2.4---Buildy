
export interface IncomeDomain {
  id: string;
  label: string;
  description: string;
  department: string;
  platforms: string[];
  skills: string[];
  assets: string[];
  workflows: string[];
  fastTurnaround: boolean;
  autopilotFit: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high";
  riskNotes: string;
  manualFallback: string;
  scannerKeywords: string[];
}

export const INCOME_DOMAINS: IncomeDomain[] = [
  {
    id: "online_digital_gigs",
    label: "Online Digital Gigs",
    description: "100% online tasks, bounties, and micro-work that can be claimed and completed instantly.",
    department: "Freelance Station",
    platforms: ["dealwork.ai", "Toku", "ClawGig", "Superteam Earn", "Remotasks", "DataAnnotation.tech"],
    skills: ["AI Training", "Data Labeling", "Research", "Testing", "Content Evaluation"],
    assets: ["Verified Profile", "Payment Method"],
    workflows: ["Instant Task Discovery", "Automated Preparation", "Review & Submit"],
    fastTurnaround: true,
    autopilotFit: "high",
    riskLevel: "low",
    riskNotes: "High volume, low individual risk. Buildy can prepare most deliverables.",
    manualFallback: "Claim and submit tasks via the official platform dashboard.",
    scannerKeywords: ["bounty", "microtask", "ai training", "data labeling", "research task", "fixed price gig"]
  },
  {
    id: "freelancing",
    label: "Freelancing",
    description: "Selling specialized services to clients on a project basis.",
    department: "Freelance Station",
    platforms: ["Upwork", "Fiverr", "Toptal", "Freelancer.com", "Remote OK"],
    skills: ["Communication", "Niche Skill (Coding, Design, Writing)", "Pricing"],
    assets: ["Portfolio", "Resume", "Profile Bio"],
    workflows: ["Job Discovery", "Proposal Generation", "Client Interview", "Delivery"],
    fastTurnaround: false,
    autopilotFit: "medium",
    riskLevel: "low",
    riskNotes: "Time-intensive but stable. Risk is mainly unpaid work or platform bans.",
    manualFallback: "Apply to jobs manually via platform direct links.",
    scannerKeywords: ["freelance", "contract", "remote job", "hiring"]
  },
  {
    id: "gig_work",
    label: "Gig Work & Microtasks",
    description: "Short, low-barrier tasks that pay quickly.",
    department: "Freelance Station",
    platforms: ["Amazon Mechanical Turk", "Appen", "Clickworker", "Prolofic", "Remotasks"],
    skills: ["Data Entry", "Image Labeling", "Transcription", "Survey Participation"],
    assets: ["Verified Platform Accounts"],
    workflows: ["Task Batching", "Quality Assurance", "Payout Management"],
    fastTurnaround: true,
    autopilotFit: "high",
    riskLevel: "low",
    riskNotes: "Low hourly pay. Risk of account suspension for low accuracy.",
    manualFallback: "Complete tasks directly on platform dashboards.",
    scannerKeywords: ["microtask", "gig", "surveys", "data entry", "ai training"]
  },
  {
    id: "content_creation",
    label: "Content Creation",
    description: "Building an audience and monetizing through ads, sponsorships, or products.",
    department: "Content Arsenal",
    platforms: ["YouTube", "TikTok", "Instagram", "Substack", "Medium"],
    skills: ["Video Editing", "Copywriting", "Storytelling", "SEO"],
    assets: ["Channel/Profile", "Content Calendar", "Media Kit"],
    workflows: ["Ideation", "Scripting", "Production", "Distribution", "Analytics"],
    fastTurnaround: false,
    autopilotFit: "medium",
    riskLevel: "medium",
    riskNotes: "High effort before payoff. Algorithm dependency risk.",
    manualFallback: "Write and record content manually; post via official apps.",
    scannerKeywords: ["trending topics", "keywords", "viral hooks", "niche ideas"]
  },
  {
    id: "ecommerce",
    label: "E-commerce & Storefronts",
    description: "Launch and manage stores for physical or digital products. Includes dropshipping, print-on-demand, and custom digital downloads.",
    department: "Commerce Hub",
    platforms: ["Shopify", "Etsy", "WooCommerce", "Gumroad", "Printify", "EPROLO", "CJDropshipping", "DSers", "Trendsi"],
    skills: ["Product Sourcing", "Customer Support", "Digital Marketing", "SEO"],
    assets: ["Storefront", "Product Listings", "Inventory (if physical)"],
    workflows: ["Market Research", "Product Selection", "Listing Optimization", "Marketing Strategy"],
    fastTurnaround: false,
    autopilotFit: "medium",
    riskLevel: "medium",
    riskNotes: "Ad spend risk. Store setup required. Buildy stages all product and listing drafts.",
    manualFallback: "Manage orders and listings via store admin panels.",
    scannerKeywords: ["winning products", "trending items", "niche markets", "ecommerce ideas"]
  },
  {
    id: "dropshipping",
    label: "Dropshipping & POD",
    description: "Sell products without holding inventory. Connect with free suppliers to fulfill orders automatically.",
    department: "Commerce Hub",
    platforms: ["AliExpress", "DSers", "CJDropshipping", "Printify", "EPROLO", "Trendsi"],
    skills: ["Market Research", "Supplier Selection", "Ad Creative", "Trend Spotting"],
    assets: ["Automated Store", "Supplier Links", "Brand Identity"],
    workflows: ["Supplier Sourcing", "Product Import", "Auto-Fulfillment Staging", "Marketing Automation"],
    fastTurnaround: true,
    autopilotFit: "high",
    riskLevel: "medium",
    riskNotes: "Quality control and shipping delays. Buildy researches winning products and stages supplier connections.",
    manualFallback: "Order items manually on supplier sites for each customer.",
    scannerKeywords: ["dropship", "supplier", "fast shipping", "print on demand", "pod"]
  },
  {
    id: "affiliate_marketing",
    label: "Affiliate Marketing",
    description: "Earning commissions by promoting other people's products.",
    department: "Content Arsenal",
    platforms: ["Amazon Associates", "ClickBank", "ShareASale", "Impact"],
    skills: ["Content Writing", "PPC", "Traffic Generation"],
    assets: ["Affiliate Links", "Review Content", "Bridge Pages"],
    workflows: ["Offer Selection", "Link Cloaking", "Promotional Campaign"],
    fastTurnaround: true,
    autopilotFit: "medium",
    riskLevel: "low",
    riskNotes: "Traffic dependency. Risk of affiliate program closure.",
    manualFallback: "Share links manually on social media or blogs.",
    scannerKeywords: ["affiliate program", "high ticket", "commission", "referral"]
  },
  {
    id: "same_day_profit",
    label: "Same-Day Profit",
    description: "Fast-turnaround paths for immediate income.",
    department: "Continuity Core",
    platforms: ["UserTesting", "Respondent", "Prolific", "TaskRabbit", "Upwork (Fixed)"],
    skills: ["Fast Response", "Profile Completeness", "Task Reliability"],
    assets: ["Payment Processor Link (PayPal/Stripe)"],
    workflows: ["Instant Scan", "Fast Apply", "Proof of Delivery"],
    fastTurnaround: true,
    autopilotFit: "high",
    riskLevel: "low",
    riskNotes: "Limited scalability. High competition for tasks.",
    manualFallback: "Manually refresh task boards constantly.",
    scannerKeywords: ["instant pay", "same day", "quick task", "paid survey"]
  },
  {
    id: "passive_income",
    label: "Passive Income",
    description: "Building systems that earn with minimal ongoing effort.",
    department: "Continuity Core",
    platforms: ["Gumroad", "Teachable", "Kindle Direct Publishing", "Printful"],
    skills: ["Product Creation", "Automation", "Marketing Systems"],
    assets: ["Digital Product", "Email List", "Sales Funnel"],
    workflows: ["Product Development", "Automated Sequence", "Traffic Loop"],
    fastTurnaround: false,
    autopilotFit: "medium",
    riskLevel: "low",
    riskNotes: "Front-loaded effort. No guarantee of sales.",
    manualFallback: "Manually email products to customers upon purchase.",
    scannerKeywords: ["digital product", "course", "ebook", "print on demand"]
  }
];

export function searchIncomeDomains(query: string): IncomeDomain[] {
  const lowQuery = query.toLowerCase();
  return INCOME_DOMAINS.filter(domain => 
    domain.label.toLowerCase().includes(lowQuery) ||
    domain.description.toLowerCase().includes(lowQuery) ||
    domain.platforms.some(p => p.toLowerCase().includes(lowQuery)) ||
    domain.scannerKeywords.some(k => k.toLowerCase().includes(lowQuery))
  );
}

export function getDomainById(id: string): IncomeDomain | undefined {
  return INCOME_DOMAINS.find(d => d.id === id);
}

export function getMissingInputs(domain: IncomeDomain, userProfile: any): string[] {
  const missing: string[] = [];
  
  // Basic check against common profile fields
  if (domain.skills.length > 0) {
    const userSkills = (userProfile?.skills || "").toLowerCase();
    const missingSkills = domain.skills.filter(s => !userSkills.includes(s.toLowerCase()));
    if (missingSkills.length > 0) {
      missing.push(`Skills: ${missingSkills.join(", ")}`);
    }
  }
  
  if (domain.assets.length > 0) {
    // This is more complex, but we can check if they have specific keywords in background or bio
    const userContext = (userProfile?.background || "" + userProfile?.profile_summary || "").toLowerCase();
    const missingAssets = domain.assets.filter(a => !userContext.includes(a.toLowerCase()));
    if (missingAssets.length > 0) {
      missing.push(`Assets: ${missingAssets.join(", ")}`);
    }
  }
  
  return missing;
}
