
export interface FirstMissionSuggestion {
  title: string;
  goalPrompt: string;
  reason: string;
  recommendedTrack: 'passive_income' | 'hybrid' | 'freelance_fallback';
  department: string;
  riskNote: string;
  ctaLabel: string;
}

/**
 * Generates a personalized first mission suggestion based on onboarding intake data.
 */
export function generateFirstMissionSuggestion(profile: any): FirstMissionSuggestion {
  const meta = typeof profile?.onboarding_metadata === 'string' 
    ? JSON.parse(profile.onboarding_metadata) 
    : (profile?.onboarding_metadata || {});
  
  const sectors = meta.selectedDepts || [];
  const background = (profile?.background || "").toLowerCase();
  const skills = Array.isArray(profile?.skills) ? profile.skills.map((s: string) => s.toLowerCase()) : [];
  
  // 1. Commerce Hub (Passive Income)
  if (sectors.includes('trade')) {
    return {
      title: "Digital Asset Forge",
      goalPrompt: "Research high-demand digital products and draft initial sales copy and assets for a new launch.",
      reason: "Based on your Commerce Hub selection, we'll start by identifying a profitable digital niche and drafting your first assets.",
      recommendedTrack: 'passive_income',
      department: "Commerce Hub",
      riskNote: "Internal drafting and research phase.",
      ctaLabel: "Start Asset Forge"
    };
  }

  // 2. Freelance Station Fallback
  return {
    title: "Gig Intelligence Loop",
    goalPrompt: "Scan top freelance platforms for missions that match my skills and background, and draft a high-impact proposal template.",
    reason: "We'll start by finding real-world work opportunities that match your professional DNA.",
    recommendedTrack: 'freelance_fallback',
    department: "Freelance Station",
    riskNote: "Search and draft mode only.",
    ctaLabel: "Find First Gig"
  };
}

/**
 * Safely extracts the saved suggestion and its state from profile metadata.
 */
export function getSavedMissionSuggestionState(profile: any) {
  try {
    const meta = typeof profile?.onboarding_metadata === 'string' 
      ? JSON.parse(profile.onboarding_metadata) 
      : (profile?.onboarding_metadata || {});
    
    return {
      suggestion: (meta.firstMissionSuggestion || null) as FirstMissionSuggestion | null,
      status: (meta.firstMissionStatus || 'suggested') as 'suggested' | 'started' | 'completed',
      suggestedAt: meta.firstMissionSuggestedAt || null,
      startedAt: meta.firstMissionStartedAt || null
    };
  } catch (e) {
    return {
      suggestion: null,
      status: 'suggested' as const,
      suggestedAt: null,
      startedAt: null
    };
  }
}

/**
 * Safely extracts the saved suggestion from profile metadata.
 * Kept for compatibility, now uses the state helper.
 */
export function getSavedMissionSuggestion(profile: any): FirstMissionSuggestion | null {
  return getSavedMissionSuggestionState(profile).suggestion;
}
