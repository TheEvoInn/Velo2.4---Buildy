import { 
  generateContentPack, 
  inferContentPackTypeFromPrompt,
  ContentPackType,
  ContentBriefInput,
  ContentPackResult
} from "@/lib/velo/contentEngine";
import { saveArchiveItem, ArchiveContentType } from "@/lib/velo/contentArchive";
import { User, AutopilotProfile } from "@/entities";

export interface ContentCommandResult {
  type: string;
  message: string;
  data?: any;
  archiveIds?: string[];
}

// Keyword detection for content commands
const CONTENT_KEYWORDS = {
  proposal: ["write proposal", "create proposal", "draft proposal", "proposal for",
             "write application", "draft application", "apply for", "bid for"],
  marketing: ["social post", "social media", "instagram caption", "tiktok script",
              "video script", "marketing content", "promote", "promotional",
              "community post", "launch announcement", "launch message",
              "generate post", "create post", "write captions", "content calendar"],
  product_listing: ["product description", "product listing", "describe product",
                    "product copy", "selling points", "product features",
                    "write about product", "product page copy"],
  client_delivery: ["delivery message", "follow up message", "follow-up", "client message",
                    "send to client", "client update", "deliverable message",
                    "handoff message", "check-in message"],
  profile: ["update my bio", "write bio", "profile description", "about me",
            "service description", "portfolio blurb", "improve profile",
            "profile content", "professional summary"],
  general: ["generate content", "write content", "create content", "content for",
            "need copy", "need text", "write me", "draft me"]
};

function detectContentIntent(text: string): { type: string; confidence: number } {
  const t = text.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(CONTENT_KEYWORDS)) {
    if (intent === 'general') continue;
    for (const kw of keywords) {
      if (t.includes(kw)) return { type: intent, confidence: 0.85 };
    }
  }
  
  // General content catch-all (looser matching)
  for (const kw of CONTENT_KEYWORDS.general) {
    if (t.includes(kw)) return { type: 'general', confidence: 0.6 };
  }
  
  return { type: 'none', confidence: 0 };
}

// Map intent to content pack type
const INTENT_TO_PACK: Record<string, ContentPackType> = {
  proposal: 'proposal_pack',
  marketing: 'marketing_pack',
  product_listing: 'product_listing_pack',
  client_delivery: 'client_delivery_pack',
  profile: 'profile_pack',
  general: 'marketing_pack' // default for general
};

// Map pack type to archive content type
const PACK_TO_ARCHIVE_TYPE: Record<string, ArchiveContentType> = {
  proposal_pack: 'job_application',
  marketing_pack: 'social_post',
  product_listing_pack: 'product_description',
  client_delivery_pack: 'autopilot_deliverable',
  profile_pack: 'template',
  research_to_content_pack: 'research_summary',
  design_asset_pack: 'graphic',
  code_help_pack: 'workflow_output'
};

export async function handleContentCommand(
  text: string,
  userEmail: string,
  userId: string
): Promise<ContentCommandResult> {
  const intent = detectContentIntent(text);
  
  let packType: ContentPackType | null = null;
  
  if (intent.type === 'none') {
    // Try AI inference as fallback
    packType = inferContentPackTypeFromPrompt(text);
    if (!packType) return { type: 'none', message: '' };
  } else {
    packType = INTENT_TO_PACK[intent.type] || 'marketing_pack';
  }

  try {
    // Gather context
    const [me, profiles] = await Promise.all([
      User.me().catch(() => null),
      AutopilotProfile.list().catch(() => [])
    ]);
    if (!me) return { type: 'error', message: "I couldn't verify your identity. Try again." };
    
    const profile = profiles.find(p => p.owner_email === userEmail) || profiles[0] || null;
    
    // Build content brief
    const brief: any = {
      profile: profile ? {
        legal_name: profile.legal_name,
        public_name: profile.public_name,
        background: profile.background,
        skills: profile.skills,
        tone: profile.tone || 'professional',
        service_description: profile.service_description,
        product_focus: profile.product_focus,
        autopilot_brief: profile.autopilot_brief
      } : null,
      target_department: 'Command Officer',
      intended_next_action: 'Review and use in chat',
      audience: 'client',
      tone: profile?.tone || 'professional',
      constraints: ['Must be ready-to-use', 'Include practical next steps'],
      requested_asset_type: 'professional_bio', // default, generation pack handles actual types
      internal_guidance_language: 'English',
      client_facing_language: 'English'
    };

    // Generate content pack
    const result: ContentPackResult = await generateContentPack({
      ...brief,
      pack_type: packType
    });

    // Save to archive
    const archiveIds: string[] = [];
    const archiveType = PACK_TO_ARCHIVE_TYPE[packType] || 'other';

    if (result.assets) {
      for (const asset of result.assets) {
        try {
          const saved = await saveArchiveItem({
            title: asset.title || 'Generated Content',
            content_type: archiveType,
            source_department: 'Command Officer',
            source_module: 'contentAutopilot',
            workflow_name: 'content_generation',
            body: asset.body || '',
            summary: asset.source_context_summary || '',
            quality_score: asset.quality_score || 0,
            status: 'archived',
            visibility: 'user',
            tags: ['chat-generated', packType],
            metadata: {
              tone: asset.tone || 'professional',
              strengths: asset.strengths || [],
              improvement_notes: asset.improvement_notes || '',
              pack_type: packType
            }
          });
          if (saved?.id) archiveIds.push(saved.id);
        } catch (e) {
          console.error("[ContentAutopilot] Failed to save asset to archive:", e);
        }
      }
    }

    // Format results for chat display
    const packLabel = result.packTitle || packType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const assetCount = result.assets?.length || 0;
    
    let message = `### 📝 ${packLabel}\n\n`;
    message += `I've generated ${assetCount} content asset${assetCount !== 1 ? 's' : ''} for you based on your request.\n\n`;
    
    if (result.assets) {
      result.assets.forEach((asset, i) => {
        message += `**${i + 1}. ${asset.title || 'Asset ' + (i + 1)}**\n`;
        
        // Truncate long content for chat display
        const body = asset.body || '';
        if (body.length > 500) {
          message += `${body.substring(0, 500)}...\n\n`;
          message += `*(Full version saved to your Content Archive)*\n\n`;
        } else {
          message += `${body}\n\n`;
        }
        
        if (asset.quality_score) {
          message += `Quality: ${asset.quality_score}/100 | Tone: ${asset.tone || 'professional'}\n`;
        }
        message += '\n';
      });
    }
    
    if (result.overallQualityScore) {
      message += `**Overall quality**: ${result.overallQualityScore}/100\n`;
    }
    
    if (result.completionChecklist?.length) {
      message += `\n**Next steps**: ${result.completionChecklist.slice(0, 3).map(step => `• ${step}`).join(' ')}\n`;
    }
    
    message += `\nAll content has been secured in your **Content Archive**. Would you like me to refine any of these drafts?`;

    return {
      type: packType,
      message,
      data: result,
      archiveIds
    };
  } catch (error) {
    console.error("[ContentAutopilot] Error:", error);
    return {
      type: 'error',
      message: "I ran into an issue generating that content. You can use **Content Arsenal** in Docking Control to create it manually, or try rephrasing your request."
    };
  }
}
