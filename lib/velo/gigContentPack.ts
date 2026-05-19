
import { generateContentAsset, ContentBriefInput, ContentAssetKind } from "./contentEngine";
import { VeloContentAsset } from "@/entities";
import { generateImage } from "@/integrations/core";

export interface PlatformContentProfile {
  platformName: string;
  category: string;
  bioGuidance: string; 
  skillEmphasis: string[]; 
  serviceExamples: string[]; 
  tone: string; 
  keyPhrases: string[]; 
  portfolioGuidance: string; 
  imagePromptGuidance?: string;
}

export const PLATFORM_CONTENT_PROFILES: Record<string, PlatformContentProfile> = {
  "Toloka": {
    platformName: "Toloka",
    category: "Microtask & AI Training",
    bioGuidance: "Emphasize detail-oriented work, high accuracy rates, and experience with data labeling and content moderation. Mention language proficiency.",
    skillEmphasis: ["Data annotation", "Image labeling", "Content moderation", "Quality assurance", "Attention to detail"],
    serviceExamples: ["Data labeling for AI training", "Search relevance evaluation", "Content moderation", "Image and video annotation"],
    tone: "Precise, reliable, detail-focused",
    keyPhrases: ["high accuracy", "fast turnaround", "quality-focused", "experienced annotator"],
    portfolioGuidance: "Focus on task volume and accuracy metrics. Reference specific annotation tool experience if any.",
    imagePromptGuidance: "A professional workspace with a dual-monitor setup, clean desk, and soft morning light. Reflects focus and productivity."
  },
  "Clickworker": {
    platformName: "Clickworker",
    category: "Microtask & Data Annotation",
    bioGuidance: "Highlight reliability and proficiency in web research and data categorization. Mention familiarity with UHRS tasks if applicable.",
    skillEmphasis: ["Web research", "Data categorization", "Content evaluation", "Search engine evaluation", "Copywriting"],
    serviceExamples: ["Web research projects", "Data categorization for search engines", "Content evaluation and proofreading", "Data entry and validation"],
    tone: "Professional, analytical, consistent",
    keyPhrases: ["reliable worker", "consistent quality", "analytical mindset", "web-savvy"],
    portfolioGuidance: "Emphasize experience with varied microtask types and successful completion rates.",
    imagePromptGuidance: "A close-up of a modern laptop on a wooden desk with a notebook and a cup of coffee. Warm, analytical atmosphere."
  },
  "Amazon MTurk": {
    platformName: "Amazon MTurk",
    category: "Crowdsourced Tasks",
    bioGuidance: "Focus on high approval rates and experience with surveys, transcription, and data validation. Emphasize speed and accuracy.",
    skillEmphasis: ["Data validation", "Transcription", "Survey participation", "Content moderation", "Fast typing"],
    serviceExamples: ["Accurate data validation", "High-quality transcription", "Detailed survey feedback", "Micro-task fulfillment"],
    tone: "Efficient, accurate, dependable",
    keyPhrases: ["high approval rate", "master worker", "detailed transcription", "accurate labeling"],
    portfolioGuidance: "Mention total HITs completed and maintenance of a high approval rating (>98%).",
    imagePromptGuidance: "An abstract digital grid representing data flow and task fulfillment. Cyan and dark blue professional color palette."
  },
  "PromptBase": {
    platformName: "PromptBase",
    category: "AI Prompt Marketplace",
    bioGuidance: "Showcase expertise in prompt engineering for specific AI models (ChatGPT, Midjourney, etc.). Focus on creative and utility-based prompt design.",
    skillEmphasis: ["Prompt engineering", "ChatGPT optimization", "Midjourney art direction", "Stable Diffusion workflows", "Creative writing"],
    serviceExamples: ["High-performance ChatGPT prompts", "Creative Midjourney art prompts", "Stable Diffusion generation workflows", "Niche prompt engineering"],
    tone: "Innovative, creative, technical",
    keyPhrases: ["prompt architect", "AI optimization", "creative prompt engineering", "consistent outputs"],
    portfolioGuidance: "Provide examples of successful prompt outputs (images for art prompts, structured text for LLM prompts).",
    imagePromptGuidance: "A futuristic digital art piece showing a blend of human creativity and neural network connections. Vibrant and innovative."
  },
  "Appen": {
    platformName: "Appen",
    category: "AI Data Solutions",
    bioGuidance: "Emphasize adherence to complex guidelines and long-term project commitment. Focus on linguistics, search evaluation, and data quality.",
    skillEmphasis: ["Search evaluation", "Social media evaluation", "Linguistics", "Data annotation", "Guideline adherence"],
    serviceExamples: ["Search relevance assessment", "Social media trend evaluation", "Linguistic data collection", "High-precision data annotation"],
    tone: "Meticulous, committed, academic",
    keyPhrases: ["guideline-focused", "long-term project partner", "high-precision data", "linguistic expert"],
    portfolioGuidance: "Reference experience with specific large-scale data projects or search evaluation tasks.",
    imagePromptGuidance: "A macro shot of a keyboard with focus on the 'Enter' key, backlit with blue light. Suggests meticulous attention to detail."
  },
  "Test IO": {
    platformName: "Test IO",
    category: "QA & Bug Testing",
    bioGuidance: "Highlight technical troubleshooting skills and experience in software testing. Focus on detailed bug reporting and exploratory testing.",
    skillEmphasis: ["Software testing", "Bug reporting", "Exploratory testing", "Regression testing", "Technical troubleshooting"],
    serviceExamples: ["Functional website testing", "Mobile app bug discovery", "Usability feedback reports", "Exploratory testing sessions"],
    tone: "Analytical, technical, thorough",
    keyPhrases: ["bug hunter", "detailed reporting", "edge-case discovery", "QA specialist"],
    portfolioGuidance: "Mention types of bugs found (functional, visual, content) and quality of past bug reports.",
    imagePromptGuidance: "A high-tech digital interface showing lines of code being scanned for errors. Deep purple and neon green accents."
  },
  "UserTesting": {
    platformName: "UserTesting",
    category: "UX Research",
    bioGuidance: "Focus on being a clear communicator who provides insightful, 'think-aloud' feedback on user experiences. Mention attention to usability.",
    skillEmphasis: ["User experience feedback", "Usability testing", "Verbal communication", "Critical thinking", "Consumer insights"],
    serviceExamples: ["Detailed website usability testing", "App prototype walkthroughs", "Consumer feedback sessions", "UX research participation"],
    tone: "Articulate, observant, helpful",
    keyPhrases: ["clear communicator", "insightful feedback", "observant tester", "usability-focused"],
    portfolioGuidance: "Highlight experience with diverse digital products and ability to provide actionable UX suggestions.",
    imagePromptGuidance: "A person's hands holding a modern smartphone, interacting with a colorful app interface. Bright, user-centric lighting."
  },
  "Prolific": {
    platformName: "Prolific",
    category: "Academic Research",
    bioGuidance: "Emphasize honesty, attention to detail, and interest in academic research. Focus on being a reliable participant for scientific studies.",
    skillEmphasis: ["Research participation", "Survey accuracy", "Cognitive tasks", "Attention to detail", "Ethical participation"],
    serviceExamples: ["Academic survey participation", "Psychological study contributor", "Decision-making research participant", "Detailed study respondent"],
    tone: "Serious, honest, reliable",
    keyPhrases: ["high-quality participant", "honest responses", "attention-check safe", "reliable researcher"],
    portfolioGuidance: "Mention total studies completed and high trust score on the platform.",
    imagePromptGuidance: "A minimalist study room with a large window, a single plant, and a clean desk with a tablet. Calm and focused academic vibe."
  },
  "DataAnnotation.tech": {
    platformName: "DataAnnotation.tech",
    category: "AI Training & Evaluation",
    bioGuidance: "Showcase advanced writing, coding, or analytical skills used to train AI models. Focus on creative evaluation and complex reasoning.",
    skillEmphasis: ["AI model evaluation", "Creative writing", "Python coding", "Logical reasoning", "Comparison analysis"],
    serviceExamples: ["LLM response evaluation", "Creative writing for AI training", "Code verification for models", "Complex reasoning tasks"],
    tone: "Intelligent, creative, analytical",
    keyPhrases: ["AI trainer", "creative evaluator", "complex reasoning specialist", "high-quality writer"],
    portfolioGuidance: "Highlight expertise in specific domains like coding, literature, or data science applied to AI.",
    imagePromptGuidance: "An abstract representation of a brain integrated with glowing neural pathways and floating code snippets. Sophisticated and intelligent."
  },
  "Remotasks": {
    platformName: "Remotasks",
    category: "Data Annotation",
    bioGuidance: "Focus on high throughput and accuracy in data labeling, specifically LIDAR or image segmentation if applicable.",
    skillEmphasis: ["Data labeling", "Image segmentation", "LIDAR annotation", "Categorization", "Quality checks"],
    serviceExamples: ["High-volume image labeling", "LIDAR data annotation", "Object detection tasks", "Data quality auditing"],
    tone: "Efficient, industrious, precise",
    keyPhrases: ["high throughput", "accurate labeling", "LIDAR specialist", "precise annotation"],
    portfolioGuidance: "Reference volume of tasks completed and speed/accuracy metrics.",
    imagePromptGuidance: "A 3D LIDAR point cloud visualization of a city street, with bounding boxes around vehicles. Technical and precise."
  },
  "Fiverr": {
    platformName: "Fiverr",
    category: "Service Marketplace",
    bioGuidance: "Emphasize productized services, fast delivery, and specific niche expertise. Focus on customer satisfaction and clear service tiers.",
    skillEmphasis: ["Graphic design", "Digital marketing", "Writing", "Translation", "Video editing"],
    serviceExamples: ["Professional logo design", "SEO-optimized article writing", "Social media management", "Video intro creation"],
    tone: "Entrepreneurial, approachable, result-oriented",
    keyPhrases: ["top-rated service", "unlimited revisions", "fast delivery", "niche expert"],
    portfolioGuidance: "Showcase visual examples of delivered work and positive client testimonials.",
    imagePromptGuidance: "A vibrant, creative home office setup with art on the walls and colorful desk accessories. Energetic and approachable."
  },
  "Upwork": {
    platformName: "Upwork",
    category: "Professional Freelance",
    bioGuidance: "Focus on high-level professional expertise, client management, and delivering complex projects. Emphasize specialized skills and long-term value.",
    skillEmphasis: ["Web development", "Mobile app dev", "Financial consulting", "Legal writing", "Project management"],
    serviceExamples: ["Full-stack web development", "Mobile application design", "Strategic business consulting", "Long-term project management"],
    tone: "Professional, authoritative, high-trust",
    keyPhrases: ["expert freelancer", "proven track record", "specialized consultant", "high-value delivery"],
    portfolioGuidance: "Detailed case studies, links to live projects, and professional certifications.",
    imagePromptGuidance: "A high-rise city view from a modern, glass-walled office. Refined, authoritative, and professional."
  },
  "Superteam Earn": {
    platformName: "Superteam Earn",
    category: "Web3 & AI Bounties",
    bioGuidance: "Highlight Web3 native skills, Solana ecosystem knowledge, and ability to fulfill creative or technical bounties.",
    skillEmphasis: ["Web3 development", "Solana blockchain", "Technical writing", "Graphic design", "Community management"],
    serviceExamples: ["Solana dApp development", "Web3 ecosystem research", "Governance proposal writing", "Visual identity for DAO projects"],
    tone: "Modern, technical, ecosystem-focused",
    keyPhrases: ["Web3 builder", "Solana native", "bounty hunter", "ecosystem contributor"],
    portfolioGuidance: "Links to GitHub repos, published bounties, and on-chain proof of work.",
    imagePromptGuidance: "A stylized 3D Solana logo floating in a digital void with glowing particles. Cyberpunk aesthetic, modern and technical."
  }
};

/**
 * Generates a set of platform-specific content assets for a gig platform.
 */
export async function generatePlatformContentAssets(
  platformName: string,
  profile: any,
  contentProfile: PlatformContentProfile
): Promise<any[]> {
  const assetTypes: (ContentAssetKind | "header_image")[] = [
    "professional_bio",
    "service_listing",
    "portfolio_blurb",
    "claim_checklist",
    "header_image"
  ];

  const results: any[] = [];
  const additionalConstraints = [
    `Target Platform: ${platformName}`,
    `Category Focus: ${contentProfile.category}`,
    `Specific Tone: ${contentProfile.tone}`,
    `Emphasis: ${contentProfile.skillEmphasis.join(', ')}`,
    `Bio Strategy: ${contentProfile.bioGuidance}`,
    `Key Phrases to use: ${contentProfile.keyPhrases.join(', ')}`,
    `Portfolio Guidance: ${contentProfile.portfolioGuidance}`
  ];

  if (contentProfile.imagePromptGuidance) {
    additionalConstraints.push(`Image Style Guidance: ${contentProfile.imagePromptGuidance}`);
  }

  for (const assetType of assetTypes) {
    try {
      if (assetType === "header_image") {
        // 1. Generate an image prompt using the content engine
        const promptInput: ContentBriefInput = {
          profile,
          requested_asset_type: "image_prompt",
          additional_constraints: [
            ...additionalConstraints,
            "Create a detailed AI image generation prompt for a professional platform header image.",
            "Focus on the visual style, lighting, and composition described in the guidance."
          ],
          target_department: "freelance"
        };

        const promptResult = await generateContentAsset(promptInput);
        
        // 2. Use the prompt to generate the actual image
        const { url } = await generateImage({
          prompt: promptResult.body,
          quality: "high-quality",
          image_size: "landscape_16_9"
        });

        results.push({
          platform_name: platformName,
          asset_type: "header_image",
          title: `Header Image for ${platformName}`,
          body: `Generated professional header image for ${platformName} using prompt: ${promptResult.body}`,
          file_url: url,
          tone: promptResult.tone,
          status: "ready",
          quality_score: 95,
          strengths: ["High-resolution", "Platform-appropriate style", "Professional lighting"],
          source_context_summary: promptResult.source_context_summary,
          metadata: {
            is_gig_packet: true,
            platform_name: platformName,
            category: contentProfile.category,
            image_prompt: promptResult.body,
            generated_at: new Date().toISOString()
          }
        });
      } else {
        const input: ContentBriefInput = {
          profile,
          requested_asset_type: assetType as ContentAssetKind,
          additional_constraints: additionalConstraints,
          target_department: "freelance"
        };

        const generated = await generateContentAsset(input);

        results.push({
          platform_name: platformName,
          asset_type: assetType,
          title: generated.title,
          body: generated.body,
          tone: generated.tone,
          status: "ready",
          quality_score: generated.quality_score,
          strengths: generated.strengths,
          improvement_notes: generated.improvement_notes,
          source_context_summary: generated.source_context_summary,
          metadata: {
            is_gig_packet: true,
            platform_name: platformName,
            category: contentProfile.category,
            generated_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error(`Failed to generate ${assetType} for ${platformName}:`, error);
    }
  }

  return results;
}
