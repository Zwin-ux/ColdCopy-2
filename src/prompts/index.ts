export const targetScrapePrompt = `You extract factual business and personal details about a target from the given text. Respond with clean JSON only containing these fields (set to null if unknown):\n\nindustry\nrole\ncompany\nrecent_achievements\nnotable_products_or_services\npublic_pain_points\nwriting_tone\nvalues_or_preferences\n\nDo not embellish or guess. No prose, JSON only.`;

export const signalExtractionPrompt = `Given this JSON about a target, extract three signals that matter for cold outreach. Keep them short, use at most one sentence per field, avoid buzzwords, and tie each field directly to the target context. Return this object:\n\n{
  "buying_reason": "...",
  "credibility_hook": "...",
  "emotional_hook": "..."
}`;

export const angleGenerationPrompt = `Create exactly three outreach angles referencing the provided signals. Each must be one short line with no corporate tone, and must reference at least one signal. Return this object:\n\n{
  "value_angle": "...",
  "curiosity_angle": "...",
  "social_angle": "..."
}`;

export const templateAssemblyPrompt = `Compose a cold outreach email with 4 lines:\nline 1 reason\nline 2 value\nline 3 proof\nline 4 call to action.\nUse a mix of the chosen angle, the extracted signals, and what the sender sells. Do not exceed ninety words, do not open with 'hope you are well', and write plainly like a founder sending a quick note. Return the email as plain text.`;

export const toneAdapterPrompt = `Rewrite the following email in the requested tone (friendly | professional | aggressive | minimalist). Preserve meaning and structure, keep the word count similar, and do not add new ideas. Make sure the chosen tone is clearly felt.`;

export const humanizerPrompt = `Rewrite this email to feel human: add subtle imperfections, vary sentence length, and remove repetitive patterns or obvious AI phrases. Keep it clear and direct, like a busy person writing quickly. Return the final email as plain text.`;
