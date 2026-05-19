import { VeloContentArchiveItem, User } from "@/entities";
import { recordContentArchiveLearningSignal, buildContentLearningGuidance } from "./learningLoop";

export type ArchiveContentType = 
  | "job_application" 
  | "email" 
  | "social_post" 
  | "product_description" 
  | "sales_copy" 
  | "report" 
  | "plan" 
  | "template" 
  | "digital_product" 
  | "research_summary" 
  | "graphic" 
  | "workflow_output" 
  | "autopilot_deliverable" 
  | "file" 
  | "other";

export interface SaveArchiveItemInput {
  title: string;
  content_type: ArchiveContentType;
  source_department?: string;
  source_module?: string;
  workflow_name?: string;
  body: string;
  summary?: string;
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  related_mission_id?: string;
  related_record_id?: string;
  related_record_type?: string;
  quality_score?: number;
  status?: "archived" | "draft" | "final" | "reused";
  visibility?: "user" | "admin";
  tags?: string[];
  metadata?: any;
}

/**
 * Saves a new item to the user's content archive.
 */
export async function saveArchiveItem(input: SaveArchiveItemInput) {
  try {
    const user = await User.me();
    if (!user) throw new Error("User not authenticated");

    // Improved sanitization for secret-like patterns
    let sanitizedBody = input.body;
    const secretPatterns = [
      /\b(sk-[a-zA-Z0-9]{20,})\b/gi,
      /\b(pk_[a-zA-Z0-9]{10,})\b/gi,
      /\b(ghp_[a-zA-Z0-9]{20,})\b/gi,
      /\b([a-zA-Z0-9]{20,}-[a-zA-Z0-9]{10,})\b/gi,
      /\b(-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (RSA |OPENSSH )?PRIVATE KEY-----)\b/gi,
      /\b[A-Za-z0-9+/]{40,}={0,2}\b/g
    ];
    secretPatterns.forEach(pattern => {
      sanitizedBody = sanitizedBody.replace(pattern, "[REDACTED]");
    });
    sanitizedBody = sanitizedBody.replace(/(bearer|token|secret|key|password|api_key|auth|credential)\s*[:=]\s*[\w\.-]+/gi, "$1=[REDACTED]");

    // Fallback summary with sanitization
    const rawSummary = input.summary || sanitizedBody;
    const summary = rawSummary.length > 200 ? rawSummary.substring(0, 197) + "..." : rawSummary;

    const record = await VeloContentArchiveItem.create({
      owner_user_id: user.id,
      owner_email: user.email,
      title: input.title,
      content_type: input.content_type,
      source_department: input.source_department || "Command Officer",
      source_module: input.source_module,
      workflow_name: input.workflow_name,
      body: sanitizedBody,
      summary,
      file_url: input.file_url,
      file_name: input.file_name,
      mime_type: input.mime_type,
      related_mission_id: input.related_mission_id,
      related_record_id: input.related_record_id,
      related_record_type: input.related_record_type,
      quality_score: input.quality_score || 0,
      status: input.status || "archived",
      visibility: input.visibility || "user",
      tags: input.tags || [],
      reuse_count: 0,
      created_at_label: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      metadata: {
        ...(input.metadata || {}),
        archived_at: new Date().toISOString(),
        origin_url: window.location.href
      }
    });

    console.log(`[VELO] Content archived: ${record.id} (${input.title})`);
    return record;
  } catch (error) {
    console.error("[VELO] Failed to save archive item:", error);
    return null;
  }
}

/**
 * Lists archive items for the current user.
 */
export async function listArchiveItems(filters: { content_type?: string; department?: string; tag?: string } = {}) {
  try {
    const user = await User.me();
    if (!user) return [];

    let query = VeloContentArchiveItem.query().where("owner_email", user.email);

    if (filters.content_type) {
      query = query.where("content_type", filters.content_type);
    }
    if (filters.department) {
      query = query.where("source_department", filters.department);
    }
    
    const items = await query.sort("-created_at").exec();
    
    if (filters.tag) {
      return items.filter(item => Array.isArray(item.tags) && item.tags.includes(filters.tag!));
    }

    return items;
  } catch (error) {
    console.error("[VELO] Failed to list archive items:", error);
    return [];
  }
}

/**
 * Searches archive items by text.
 */
export async function searchArchiveItems(searchTerm: string) {
  try {
    const user = await User.me();
    if (!user) return [];

    const items = await VeloContentArchiveItem.query()
      .where("owner_email", user.email)
      .sort("-created_at")
      .exec();

    const lowTerm = searchTerm.toLowerCase();
    return items.filter(item => 
      (item.title && item.title.toLowerCase().includes(lowTerm)) ||
      (item.body && item.body.toLowerCase().includes(lowTerm)) ||
      (item.summary && item.summary.toLowerCase().includes(lowTerm)) ||
      (Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(lowTerm)))
    );
  } catch (error) {
    console.error("[VELO] Failed to search archive items:", error);
    return [];
  }
}

/**
 * Marks an item as reused.
 */
export async function markArchiveItemReused(itemId: string) {
  try {
    const item = await VeloContentArchiveItem.get(itemId);
    if (!item) return;

    await VeloContentArchiveItem.update(itemId, {
      reuse_count: (item.reuse_count || 0) + 1,
      last_reused_at: new Date().toISOString(),
      status: "reused"
    });

    // Record learning signal
    if (item.owner_email) {
      await recordContentArchiveLearningSignal({
        userEmail: item.owner_email,
        itemId: item.id,
        contentType: item.content_type,
        signalType: 'reuse',
        metadata: {
          title: item.title,
          workflow_name: item.workflow_name
        }
      });
    }
  } catch (error) {
    console.error("[VELO] Failed to mark item reused:", error);
  }
}

/**
 * Builds a richer reuse prompt from an archive item.
 */
export function buildArchiveReusePrompt(item: any, instruction?: string): string {
  const title = item?.title || "Untitled work";
  const type = item?.content_type || "archive";
  const summary = item?.summary || "";
  const bodyExcerpt = item?.body ? item.body.substring(0, 400) : "";
  const tags = Array.isArray(item?.tags) ? item.tags.join(", ") : "";
  const quality = item?.quality_score || 0;

  let prompt = `Reuse and improve this previous work:\nTitle: ${title}\nType: ${type}\nSummary: ${summary}`;
  if (tags) prompt += `\nTags: ${tags}`;
  if (bodyExcerpt) prompt += `\nContent excerpt:\n${bodyExcerpt}${item.body.length > 400 ? "..." : ""}`;
  prompt += `\nPrevious quality score: ${quality}%`;
  if (instruction) prompt += `\nSpecific instruction: ${instruction}`;
  prompt += "\nProduce an updated version that preserves the strengths and fixes the weaknesses noted in the original.";

  return prompt;
}

/**
 * Returns a quality summary of the archive for display.
 */
export function getArchiveQualitySummary(items: any[]) {
  if (!items || items.length === 0) {
    return {
      total: 0,
      highestQualityItem: null,
      mostReusedItem: null,
      recommendedAction: "Start creating content to build your archive."
    };
  }

  const countsByType: Record<string, number> = {};
  items.forEach(item => {
    const t = item.content_type || "other";
    countsByType[t] = (countsByType[t] || 0) + 1;
  });

  const sortedByQuality = [...items].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
  const highestQualityItem = sortedByQuality[0];

  const sortedByReuse = [...items].sort((a, b) => (b.reuse_count || 0) - (a.reuse_count || 0));
  const mostReusedItem = sortedByReuse[0];

  let recommendedAction = "Browse your recent drafts and review the highest-quality items.";
  if (highestQualityItem && highestQualityItem.quality_score >= 85) {
    recommendedAction = `Your draft "${highestQualityItem.title}" scored very high. Consider reusing or expanding it.`;
  } else if (mostReusedItem && mostReusedItem.reuse_count > 0) {
    recommendedAction = `You have reused "${mostReusedItem.title}" before. It may be worth refining further.`;
  }

  return {
    total: items.length,
    countsByType,
    highestQualityItem,
    mostReusedItem,
    recommendedAction
  };
}

/**
 * Returns compact context for Autopilot reuse planning.
 */
export async function getArchiveContextForAutopilot(userEmail: string, query?: string) {
  try {
    const [items, guidance] = await Promise.all([
      VeloContentArchiveItem.query()
        .where("owner_email", userEmail)
        .limit(10)
        .sort("-created_at")
        .exec(),
      buildContentLearningGuidance(userEmail)
    ]);

    if (items.length === 0) return "";

    let context = "\nRelevant User Content Archive Items (Previous work to reuse/reference):\n";
    items.forEach((item, idx) => {
      context += `${idx + 1}. [${item.content_type.toUpperCase()}] ${item.title}: ${item.summary}\n`;
    });
    
    if (guidance) {
      context += guidance;
    }
    
    return context;
  } catch (error) {
    return "";
  }
}
