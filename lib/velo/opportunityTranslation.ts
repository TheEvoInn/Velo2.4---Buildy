
import { invokeLLM } from "@/integrations/core";

export interface TranslationResult {
  source_language_label: string;
  translated_title: string;
  translated_summary: string;
  translated_limitations?: string;
  translation_status: 'translated' | 'not_needed' | 'unavailable' | 'failed';
  translation_notes?: string;
  translated_at: string;
}

/**
 * Lightweight heuristic to detect if text might be non-English.
 * Looks for common non-English characters or excessive non-ASCII.
 */
export function detectNonEnglish(text: string): boolean {
  if (!text) return false;
  // Check for common non-English characters (accented letters, non-Latin scripts)
  const nonEnglishRegex = /[^\x00-\x7F]|[¡¿]/;
  return nonEnglishRegex.test(text);
}

/**
 * Normalizes language labels into a clean string.
 */
export function normalizeLanguageLabel(label: string): string {
  if (!label) return "Unknown";
  const l = label.toLowerCase();
  if (l.includes("english")) return "English";
  if (l.includes("spanish")) return "Spanish";
  if (l.includes("french")) return "French";
  if (l.includes("german")) return "German";
  if (l.includes("japanese")) return "Japanese";
  if (l.includes("chinese")) return "Chinese";
  if (l.includes("portuguese")) return "Portuguese";
  if (l.includes("italian")) return "Italian";
  if (l.includes("korean")) return "Korean";
  if (l.includes("russian")) return "Russian";
  if (l.includes("arabic")) return "Arabic";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Checks if a language label or status indicates the source is already English.
 */
export function isActuallyEnglish(label?: string, status?: string): boolean {
  if (status === 'not_needed') return true;
  if (!label) return true; // Default to English if unknown but status is fine
  return label.toLowerCase().includes("english");
}

/**
 * Uses AI to translate an opportunity payload to English.
 */
export async function translateOpportunity(payload: {
  title: string;
  summary: string;
  limitations?: string;
  source_name: string;
}): Promise<TranslationResult> {
  try {
    const prompt = `
      Translate the following opportunity discovery details into clear, professional English.
      
      Opportunity Title: ${payload.title}
      Opportunity Summary: ${payload.summary}
      Limitations: ${payload.limitations || "None specified"}
      Source: ${payload.source_name}
      
      RULES:
      1. Translate faithfully and accurately. Do not add or invent facts.
      2. Preserve all numbers, currencies, dates, and links exactly.
      3. Maintain the technical context (e.g., programming languages, platforms, requirements).
      4. If a part is already in English, keep it as is.
      5. Identify the source language.
      6. Output ONLY a valid JSON object matching the requested schema.
    `;

    const response = await invokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          source_language_label: { type: "string", description: "The name of the detected source language (e.g., Spanish, Japanese, unknown)" },
          translated_title: { type: "string" },
          translated_summary: { type: "string" },
          translated_limitations: { type: "string" },
          translation_notes: { type: "string", description: "Any notes about translation quality or ambiguous terms" }
        },
        required: ["source_language_label", "translated_title", "translated_summary"]
      }
    });

    if (typeof response === "object") {
      return {
        source_language_label: response.source_language_label || "Unknown",
        translated_title: response.translated_title,
        translated_summary: response.translated_summary,
        translated_limitations: response.translated_limitations,
        translation_status: 'translated',
        translation_notes: response.translation_notes,
        translated_at: new Date().toISOString()
      };
    }

    throw new Error("Invalid translation response from AI");
  } catch (error) {
    console.error("[VELO] Translation failed:", error);
    return {
      source_language_label: "Unknown",
      translated_title: payload.title,
      translated_summary: payload.summary,
      translated_limitations: payload.limitations,
      translation_status: 'failed',
      translation_notes: "Automatic translation unavailable.",
      translated_at: new Date().toISOString()
    };
  }
}
