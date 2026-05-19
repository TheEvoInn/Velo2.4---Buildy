import { PlatformPreset } from "./platformDiscovery";

export interface PlatformSetupGuide {
  platformName: string;
  signupUrl: string;
  estimatedSetupTime: string;
  payoutMethod: string;
  payoutSpeed: string;
  aiPolicy: string;
  approvalTips: string[];
  verificationRequirements: string[];
  whatToExpect: string;
  bestTaskTypes: string[];
  minimumPayout: string;
  signupSteps: string[];
}

export interface AccountPreparationPlan {
  platformName: string;
  category: string;
  status: 'connected' | 'likely_existing' | 'missing' | 'needs_review';
  method: 'google_sign_in' | 'oauth' | 'manual_signup' | 'unknown';
  requiredFields: string[];
  suggestedValues: Record<string, any>;
  prefillPayload: Record<string, any>;
  manualSteps: string[];
  platformGuide?: PlatformSetupGuide;
}

export const PLATFORM_SETUP_GUIDE: Record<string, PlatformSetupGuide> = {
  "Toloka": {
    platformName: "Toloka",
    signupUrl: "https://toloka.ai",
    estimatedSetupTime: "15-30 minutes",
    payoutMethod: "PayPal, Payoneer, Skrill",
    payoutSpeed: "1-2 days",
    aiPolicy: "AI allowed as helper for understanding instructions and reviewing work. Never auto-answer tasks.",
    approvalTips: ["Complete your profile 100%", "Start with simple training tasks", "Maintain high accuracy (>85%)", "Read task instructions carefully each time"],
    verificationRequirements: ["Phone number", "Payment account", "Basic profile"],
    whatToExpect: "Open task feed. Grab microtasks like image labeling, text categorization, and data validation. Tasks approved within hours.",
    bestTaskTypes: ["Image annotation", "Search relevance", "Content moderation", "Data validation"],
    minimumPayout: "$1",
    signupSteps: ["Go to https://toloka.ai", "Click 'Join as a Performer'", "Enter your email and create password", "Complete your profile with skills and languages", "Verify your phone number", "Complete training tasks to unlock paid work", "Connect your PayPal or Payoneer for payouts"]
  },
  "Clickworker": {
    platformName: "Clickworker",
    signupUrl: "https://www.clickworker.com/sign-up/",
    estimatedSetupTime: "20-40 minutes",
    payoutMethod: "PayPal, SEPA",
    payoutSpeed: "Weekly (Wednesdays)",
    aiPolicy: "AI assistance OK for review and research. Automated completion banned.",
    approvalTips: ["Fill profile completely", "Take UHRS assessment seriously", "Complete tax form promptly", "Start with lower-paying tasks to build rating"],
    verificationRequirements: ["Tax ID or W-8BEN", "Verified PayPal", "Profile photo"],
    whatToExpect: "Access to UHRS microtask marketplace after assessment. Web research, text categorization, data annotation tasks.",
    bestTaskTypes: ["Web research", "Data categorization", "Content evaluation", "Search engine evaluation"],
    minimumPayout: "$5 (or €5)",
    signupSteps: ["Go to https://www.clickworker.com/sign-up/", "Choose 'Freelancer / Clickworker' option", "Fill in your personal details", "Complete the UHRS assessment", "Submit tax information (W-8BEN for non-US)", "Link your PayPal account", "Start browsing available tasks"]
  },
  "Amazon MTurk": {
    platformName: "Amazon MTurk",
    signupUrl: "https://www.mturk.com/worker",
    estimatedSetupTime: "1-3 days (approval wait)",
    payoutMethod: "Amazon Payments (US bank) or gift cards",
    payoutSpeed: "Daily after approval",
    aiPolicy: "Light tool use tolerated. Automated answering banned.",
    approvalTips: ["Use a real, established Amazon account", "Complete tax interview carefully", "Start with quick surveys to build approval rate", "Avoid requesters with low approval ratings"],
    verificationRequirements: ["Amazon account", "Tax information (IRS)", "US bank account", "Email verification"],
    whatToExpect: "Huge pool of surveys, data tasks, and transcription work. Approval rates matter — build yours above 98%.",
    bestTaskTypes: ["Surveys", "Data validation", "Transcription", "Content moderation"],
    minimumPayout: "$1",
    signupSteps: ["Go to https://www.mturk.com/worker", "Sign in with your Amazon account", "Complete the MTurk Worker registration", "Fill out tax interview (W-9 for US, W-8BEN for non-US)", "Wait for approval email (1-3 days)", "Once approved, browse available HITs", "Set up your payment method"]
  },
  "PromptBase": {
    platformName: "PromptBase",
    signupUrl: "https://promptbase.com/signup",
    estimatedSetupTime: "10-20 minutes",
    payoutMethod: "Stripe, PayPal",
    payoutSpeed: "Monthly on request",
    aiPolicy: "AI-first platform. Sell prompts for ChatGPT, Midjourney, DALL-E, Stable Diffusion.",
    approvalTips: ["Create 3-5 high-quality prompts before listing", "Show example outputs", "Write clear descriptions", "Price competitively at first ($1.99-$4.99)"],
    verificationRequirements: ["Payment account (Stripe/PayPal)", "Profile image", "Prompt examples"],
    whatToExpect: "Marketplace for AI prompts. You create prompt listings, users buy them. Semi-passive income once listings are up.",
    bestTaskTypes: ["ChatGPT prompts", "Midjourney prompts", "Stable Diffusion prompts", "DALL-E prompts"],
    minimumPayout: "$10",
    signupSteps: ["Go to https://promptbase.com/signup", "Create account with email", "Set up your seller profile", "Connect Stripe or PayPal for payouts", "Create your first prompt listing", "Add example images for Midjourney/DALL-E prompts", "Publish and share your prompt store"]
  },
  "Appen": {
    platformName: "Appen",
    signupUrl: "https://appen.com/careers/",
    estimatedSetupTime: "1-2 weeks (qualification)",
    payoutMethod: "PayPal, Payoneer",
    payoutSpeed: "Weekly after QA pass",
    aiPolicy: "Strict. No AI assistance for labeled data tasks. Can use AI to learn guidelines.",
    approvalTips: ["Apply to multiple projects", "Take qualification tests seriously", "Read project guidelines multiple times", "Communicate issues quickly"],
    verificationRequirements: ["ID verification", "Language proficiency test", "Payment account"],
    whatToExpect: "Longer onboarding but higher pay than microtask sites. Steady project work with recurring tasks.",
    bestTaskTypes: ["Search evaluation", "Social media evaluation", "Data annotation", "Linguistics tasks"],
    minimumPayout: "$10",
    signupSteps: ["Go to https://appen.com/careers/", "Browse open projects and apply", "Complete your profile with skills and languages", "Take qualification exams for your chosen projects", "Wait for project invitation (can take days)", "Complete project-specific onboarding", "Start working on assigned tasks"]
  },
  "Test IO": {
    platformName: "Test IO",
    signupUrl: "https://test.io/become-a-tester",
    estimatedSetupTime: "30-60 minutes",
    payoutMethod: "PayPal",
    payoutSpeed: "1-3 days after approval",
    aiPolicy: "AI tools allowed for documentation and research. Testing must be manual.",
    approvalTips: ["Write detailed bug reports with screenshots", "Follow the test cycle instructions exactly", "Be thorough — quality over quantity", "Complete the onboarding qualification carefully"],
    verificationRequirements: ["Technical skills assessment", "PayPal account", "Profile completion"],
    whatToExpect: "Get invited to test cycles for websites and apps. Find bugs, write reports. Paid per approved bug.",
    bestTaskTypes: ["Functional testing", "Exploratory testing", "Regression testing", "Usability feedback"],
    minimumPayout: "$5",
    signupSteps: ["Go to https://test.io/become-a-tester", "Sign up with your email", "Complete your tester profile", "Take the onboarding qualification test", "Demonstrate bug reporting skills in sample test", "Once approved, wait for test cycle invitations", "Connect PayPal for payouts"]
  },
  "UserTesting": {
    platformName: "UserTesting",
    signupUrl: "https://www.usertesting.com/get-paid-to-test",
    estimatedSetupTime: "1-2 weeks (sample review)",
    payoutMethod: "PayPal",
    payoutSpeed: "7 days after completion",
    aiPolicy: "No AI during test recording. Can use AI to prepare notes beforehand.",
    approvalTips: ["Speak your thoughts clearly during sample test", "Use a good microphone", "Complete profile with demographics", "Be honest and thorough in feedback"],
    verificationRequirements: ["Sample test recording", "Good microphone", "PayPal account", "Profile photo"],
    whatToExpect: "Record yourself using websites/apps while speaking your thoughts. $10 per 20-min test. $30-$60 for live interviews.",
    bestTaskTypes: ["Website testing", "App testing", "Prototype feedback", "Live interviews"],
    minimumPayout: "$10 per test",
    signupSteps: ["Go to https://www.usertesting.com/get-paid-to-test", "Create your account", "Download the screen recorder", "Complete your demographic profile", "Record your sample test", "Wait for review (up to 2 weeks)", "Once approved, start claiming available tests"]
  },
  "Prolific": {
    platformName: "Prolific",
    signupUrl: "https://www.prolific.com/participant",
    estimatedSetupTime: "10-20 minutes",
    payoutMethod: "PayPal (instant cashout)",
    payoutSpeed: "Instant after approval",
    aiPolicy: "Honest human responses required. AI-generated answers will cause rejection.",
    approvalTips: ["Complete your 'About You' section 100%", "Keep your profile up to date", "Use the Prolific Assistant browser extension", "Respond quickly to study invitations"],
    verificationRequirements: ["ID verification", "Phone number", "PayPal account", "Complete demographic profile"],
    whatToExpect: "Academic research studies. Higher pay than MTurk. Studies appear based on your demographics. Instant PayPal cashout.",
    bestTaskTypes: ["Academic surveys", "Research studies", "Cognitive tasks", "Decision-making experiments"],
    minimumPayout: "£5 (instant cashout after)",
    signupSteps: ["Go to https://www.prolific.com/participant", "Click 'Become a Participant'", "Create account with email", "Verify your phone number", "Complete ID verification", "Fill out 'About You' section completely", "Connect PayPal for instant cashouts", "Install Prolific Assistant browser extension"]
  }
};

/**
 * Derives a Google-profile shaped object from an Autopilot Profile for non-Google users.
 */
export function deriveProfileFromAutopilot(authUser: any, autopilotProfile: any): { email: string; name: string; picture: string | null } {
  return {
    email: authUser?.email || "",
    name: autopilotProfile?.public_name || autopilotProfile?.legal_name || authUser?.email?.split('@')[0] || "User",
    picture: null
  };
}

/**
 * Identifies the connection status of platforms for a user.
 */
export function identifyPlatformStatuses(
  presets: PlatformPreset[],
  connectedProfiles: any[],
  vaultItems: any[],
  googleProfile: { email: string; name: string } | null
): AccountPreparationPlan[] {
  const plans: AccountPreparationPlan[] = [];

  for (const preset of presets) {
    // Check if already connected via VeloPlatformProfile
    const existingProfile = connectedProfiles.find(p => 
      p.platform_name?.toLowerCase() === preset.name.toLowerCase() ||
      p.platform_preset_name?.toLowerCase() === preset.name.toLowerCase()
    );

    // Check if already connected via Vault label
    const hasVaultEntry = vaultItems.some(v => 
      v.label?.toLowerCase().includes(preset.name.toLowerCase())
    );

    let status: AccountPreparationPlan['status'] = 'missing';
    let method: AccountPreparationPlan['method'] = 'manual_signup';

    if (existingProfile?.connection_status === 'active' || hasVaultEntry) {
      status = 'connected';
    } else if (googleProfile && preset.access_mode === 'oauth') {
      status = 'likely_existing';
      method = 'google_sign_in';
    } else if (preset.access_mode === 'oauth') {
      method = 'oauth';
    }

    const guide = PLATFORM_SETUP_GUIDE[preset.name];

    plans.push({
      platformName: preset.name,
      category: preset.category,
      status,
      method,
      requiredFields: preset.requirements || [],
      suggestedValues: {},
      prefillPayload: {},
      manualSteps: guide ? guide.signupSteps : [
        `Visit the ${preset.name} official website at ${preset.source_url}`,
        `Locate the 'Sign Up' or 'Join' button to begin your application.`,
        preset.access_mode === 'oauth' ? `Select 'Continue with Google' to prefill your identity details safely.` : `Manually enter your professional details as listed in your VELO profile.`,
        `Review all prefilled information for accuracy before final submission.`,
        `After completion, manually update your connection status in the VELO dashboard.`
      ],
      platformGuide: guide
    });
  }

  plans.sort((a, b) => {
    const presetA = presets.find(p => p.name === a.platformName);
    const presetB = presets.find(p => p.name === b.platformName);
    
    // Gig category first
    const catA = presetA?.category === 'gig' ? 0 : presetA?.category === 'freelance' ? 1 : 2;
    const catB = presetB?.category === 'gig' ? 0 : presetB?.category === 'freelance' ? 1 : 2;
    if (catA !== catB) return catA - catB;
    
    // Then payout speed
    const speedOrder = { instant: 0, fast: 1, standard: 2 };
    const speedA = speedOrder[presetA?.payout_speed || 'standard'] ?? 2;
    const speedB = speedOrder[presetB?.payout_speed || 'standard'] ?? 2;
    if (speedA !== speedB) return speedA - speedB;
    
    // Then AI allowed
    if (presetA?.ai_allowed && !presetB?.ai_allowed) return -1;
    if (!presetA?.ai_allowed && presetB?.ai_allowed) return 1;
    
    return 0;
  });

  return plans;
}

/**
 * Builds a preparation plan with suggested values from Google and Autopilot Profile.
 */
export function buildPreparationPlan(
  preset: PlatformPreset,
  googleProfile: { email: string; name: string; picture?: string } | null,
  autopilotProfile: any
): AccountPreparationPlan {
  const suggestedValues: Record<string, any> = {};
  const prefillPayload: Record<string, any> = {};

  // Default mappings from Google
  if (googleProfile) {
    suggestedValues['Email'] = googleProfile.email;
    suggestedValues['Full Name'] = googleProfile.name;
    const nameParts = googleProfile.name.split(' ');
    suggestedValues['First Name'] = nameParts[0];
    suggestedValues['Last Name'] = nameParts.slice(1).join(' ');
  }

  // Mappings from AutopilotProfile
  if (autopilotProfile) {
    if (autopilotProfile.profile_summary) suggestedValues['Bio'] = autopilotProfile.profile_summary;
    if (autopilotProfile.skills) suggestedValues['Skills'] = autopilotProfile.skills;
    if (autopilotProfile.portfolio_url) suggestedValues['Portfolio'] = autopilotProfile.portfolio_url;
  }

  // Build prefill payload (safe keys)
  for (const req of (preset.requirements || [])) {
    const key = req.toLowerCase().replace(/ /g, '_');
    if (suggestedValues[req]) prefillPayload[key] = suggestedValues[req];
    else if (suggestedValues['First Name'] && req.toLowerCase().includes('first name')) prefillPayload[key] = suggestedValues['First Name'];
    else if (suggestedValues['Last Name'] && req.toLowerCase().includes('last name')) prefillPayload[key] = suggestedValues['Last Name'];
    else if (suggestedValues['Email'] && req.toLowerCase().includes('email')) prefillPayload[key] = suggestedValues['Email'];
  }

  // Check for platform-specific setup guide
  const guide = PLATFORM_SETUP_GUIDE[preset.name];

  return {
    platformName: preset.name,
    category: preset.category,
    status: 'missing', 
    method: preset.access_mode === 'oauth' ? 'google_sign_in' : 'manual_signup',
    requiredFields: preset.requirements || [],
    suggestedValues,
    prefillPayload,
    manualSteps: guide ? guide.signupSteps : [
      `Navigate to the ${preset.name} signup portal: ${preset.source_url}`,
      preset.access_mode === 'oauth' ? `Use 'Sign in with Google' to prefill your basic information from your connected account.` : `Copy the suggested values from this plan to populate the registration form.`,
      `Crucial: Review all fields to ensure they align with your target professional identity.`,
      `Submit the form manually when you are satisfied with the account configuration.`,
      `Return here to confirm the connection and store a safe metadata label in your vault.`
    ],
    platformGuide: guide
  };
}
