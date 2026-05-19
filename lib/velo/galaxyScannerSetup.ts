

/**
 * VELO Galaxy Scanner Setup & Source Presets
 * Focus: Free-first, manual, and open-source discovery paths.
 */

export interface ScannerSourcePreset {
  id: string;
  name: string;
  department: "freelance" | "crypto" | "trade" | "market";
  source_type: "api" | "scraper" | "manual" | "feed";
  cost_mode: "free" | "paid" | "open-source";
  access_mode: "automatic" | "connector-ready" | "manual";
  setup_notes: string;
  fallback_path: string;
  allowed_actions: string[];
  forbidden_actions: string[];
  confidence: number;
}

export const GALAXY_SOURCE_PRESETS: ScannerSourcePreset[] = [
  // --- FREELANCE & GIGS ---
  {
    id: "preset_instant_testing",
    name: "Instant Testing & QA Platforms",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Guided discovery for UserTesting, Prolific, Respondent, and similar online testing sites.",
    fallback_path: "Direct login to testing dashboard.",
    allowed_actions: ["List Studies", "Review Screeners"],
    forbidden_actions: ["Auto-Complete Study", "Bypass Qualification"],
    confidence: 0.95
  },
  {
    id: "preset_europe_testing",
    name: "Europe Research & Testing Hubs",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Registry for Testbirds (Germany), TestingTime (Switzerland), and Ferpection (France). High demand for multilingual testers.",
    fallback_path: "Manual navigation to Euro testing portals.",
    allowed_actions: ["List Studies", "Review Multilingual Tasks"],
    forbidden_actions: ["Auto-Submit", "Identity Mocking"],
    confidence: 0.9
  },
  {
    id: "preset_asia_microtask",
    name: "Asia-Pacific Microtask Registry",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Focuses on Appen, TELUS AI, and Toloka opportunities in Japan, Korea, and SE Asia.",
    fallback_path: "Manual check of APAC data task pools.",
    allowed_actions: ["Track APAC Tasks", "Identify Local Language Needs"],
    forbidden_actions: ["Automated Labeling", "Scripted Submission"],
    confidence: 0.85
  },
  {
    id: "preset_global_language",
    name: "Global Translation & Language Gigs",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Aggregated tasks from Gengo, Unbabel, and OneForma language projects. Ideal for translation feature testing.",
    fallback_path: "Direct access to language task marketplaces.",
    allowed_actions: ["List Translation Tasks", "Preview Source Text"],
    forbidden_actions: ["Auto-Translate Submission", "Bypass Quality Checks"],
    confidence: 0.9
  },
  {
    id: "preset_ai_training",
    name: "AI Training & Labeling Registry",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Registry of active task pools on DataAnnotation, Remotasks, and Outlier.",
    fallback_path: "Manual portal check.",
    allowed_actions: ["Track Task Availability", "Estimate Earnings"],
    forbidden_actions: ["Automated Labeling", "Account Management"],
    confidence: 0.9
  },
  {
    id: "preset_digital_bounty",
    name: "Digital Bounty Boards (Gitcoin/Superteam)",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Aggregated view of fixed-scope bounties across Web3 and Open Source ecosystems.",
    fallback_path: "Direct site navigation to bounty boards.",
    allowed_actions: ["List Bounties", "Analyze Requirements"],
    forbidden_actions: ["Submit Work", "Claim Bounty"],
    confidence: 0.85
  },
  {
    id: "preset_remote_ok",
    name: "Remote OK (Jobs & Freelance)",
    department: "freelance",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Uses the public Remote OK JSON API. Primarily traditional remote employment and long-term freelance.",
    fallback_path: "Manual review of remoteok.com search results.",
    allowed_actions: ["List Gigs", "Fetch Descriptions", "Map Skills"],
    forbidden_actions: ["Auto-Apply", "Message Client", "Submit Portfolio"],
    confidence: 0.9
  },
  {
    id: "preset_microtask_hubs",
    name: "Microtask Hubs (mTurk/Microworkers)",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Focuses on high-volume, low-friction digital tasks with fast turnaround.",
    fallback_path: "Manual hit discovery on mTurk/Microworkers.",
    allowed_actions: ["Task Monitoring", "Batch Analysis"],
    forbidden_actions: ["Auto-Submission", "Scripted Execution"],
    confidence: 0.8
  },
  {
    id: "preset_arbeitnow",
    name: "Arbeitnow (Remote Tech Jobs)",
    department: "freelance",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Uses the public Arbeitnow job board API. High reliability for traditional tech roles.",
    fallback_path: "Manual search on arbeitnow.com.",
    allowed_actions: ["List Roles", "Extract Requirements"],
    forbidden_actions: ["Apply via VELO", "Internal Messaging"],
    confidence: 0.85
  },
  {
    id: "preset_hn_hiring",
    name: "Hacker News Hiring Public API Parser",
    department: "freelance",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Parses the monthly 'Who is Hiring' thread on Hacker News via Algolia API.",
    fallback_path: "Manual reading of the current HN Hiring thread.",
    allowed_actions: ["Extract Contact Info", "Summarize Postings"],
    forbidden_actions: ["Auto-Email", "Web Automation Execution"],
    confidence: 0.8
  },
  {
    id: "preset_ai_creation_gigs",
    name: "AI Creation & Prompt Engineering",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "AI-allowed platforms for prompt work, content generation, and AI training gigs.",
    fallback_path: "Manual search on AI gig platforms.",
    allowed_actions: ["Discover AI Gigs", "Prepare AI Work Templates"],
    forbidden_actions: ["Auto-Post Content", "Bypass Platform Rules"],
    confidence: 0.92
  },
  {
    id: "preset_fast_payout_digital",
    name: "Fast-Payout Digital Gigs",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Platforms known for fast payout digital tasks — same day to 72 hours.",
    fallback_path: "Direct platform login for task discovery.",
    allowed_actions: ["Scan Available Tasks", "Sort by Payout Speed"],
    forbidden_actions: ["Automated Task Completion", "Bulk Claims"],
    confidence: 0.90
  },
  {
    id: "preset_instant_claim_bounties",
    name: "Instant Claim & Bounty Boards",
    department: "freelance",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Bounty boards and instant-claim platforms for digital work.",
    fallback_path: "Manual browsing of bounty platforms.",
    allowed_actions: ["Review Bounty Listings", "Claim Available Tasks"],
    forbidden_actions: ["Automated Bounty Spam"],
    confidence: 0.93
  },

  // --- CRYPTO ---
  {
    id: "preset_coingecko_free",
    name: "CoinGecko (Public API)",
    department: "crypto",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Uses CoinGecko public V3 API. No API key required for standard rate limits.",
    fallback_path: "Manual check of CoinGecko terminal.",
    allowed_actions: ["Price Feeds", "Market Cap Sync", "Global Volume"],
    forbidden_actions: ["Trade Execution", "Wallet Linkage"],
    confidence: 0.95
  },
  {
    id: "preset_chain_explorer_manual",
    name: "Public Chain Explorers (Manual)",
    department: "crypto",
    source_type: "manual",
    cost_mode: "free",
    access_mode: "manual",
    setup_notes: "Structured guidance for manual review of Etherscan, Solscan, and others.",
    fallback_path: "Direct URL navigation to chain explorers.",
    allowed_actions: ["Balance Verification", "Transaction Audit"],
    forbidden_actions: ["Send Funds", "Sign Message", "Approve Contract"],
    confidence: 0.99
  },

  // --- TRADE BAY ---
  {
    id: "preset_hn_trends",
    name: "Hacker News Trends",
    department: "trade",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Analyzes high-engagement discussions on HN for product and tech trends.",
    fallback_path: "Manual review of HN 'Show HN' and 'Ask HN' feeds.",
    allowed_actions: ["Trend Discovery", "Sentiment Mapping"],
    forbidden_actions: ["External Posting", "Messaging Users"],
    confidence: 0.75
  },
  {
    id: "preset_gh_signals",
    name: "GitHub Signals (Public Search)",
    department: "trade",
    source_type: "api",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Searches for emerging SaaS and developer tool trends via GitHub API.",
    fallback_path: "Manual search on GitHub Trending page.",
    allowed_actions: ["Repo Analysis", "Language/Tech Identification"],
    forbidden_actions: ["Code Execution", "Account Writes"],
    confidence: 0.8
  },

  // --- MARKET DECK ---
  {
    id: "preset_macro_news_rss",
    name: "Macro News & RSS Feeds",
    department: "market",
    source_type: "feed",
    cost_mode: "free",
    access_mode: "automatic",
    setup_notes: "Aggregates free financial news and economic indicator feeds.",
    fallback_path: "Manual review of trusted financial news portals.",
    allowed_actions: ["Headline Summarization", "Macro Sentiment"],
    forbidden_actions: ["Trading", "Fund Movement", "Live Publishing"],
    confidence: 0.7
  }
];

export const AI_SETUP_PROMPTS = {
  source_notes: (sourceName: string, dept: string) => `
    Generate clear, helpful setup instructions for a new ${dept} data source named "${sourceName}".
    The instructions should focus on free or manual access methods.
    Do not imply that any automated connector is already active or authorized to move funds.
    Emphasize that all discoveries must be reviewed in the Galaxy Scanner Bay before action.
  `,
  query_assist: (dept: string) => `
    Suggest 5 effective search queries or parameters for a ${dept} scan.
    Focus on finding high-quality, actionable opportunities that fit within the VELO free-first framework.
    Queries should be broad enough to catch trends but specific enough to be useful.
  `,
  fallback_guide: (sourceName: string) => `
    Draft a manual fallback procedure for when "${sourceName}" is offline.
    Include step-by-step instructions for a human pilot to gather the same data manually using free/public tools.
  `
};

export const REVIEW_DECISION_LABELS = [
  { value: "approve", label: "Approve for Staging", variant: "success" },
  { value: "edit", label: "Edit Summary", variant: "outline" },
  { value: "reject", label: "Reject / Irrelevant", variant: "destructive" },
  { value: "mission", label: "Send to Mission Bay", variant: "default" },
  { value: "useful", label: "Mark Useful (Signal)", variant: "outline" },
  { value: "not_useful", label: "Not Useful (Signal)", variant: "ghost" }
];
