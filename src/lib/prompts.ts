export const PROMPTS = {
  EXTRACTION_SYSTEM: `You are a precision cognitive state extractor.
Extract structured reasoning state from AI conversations.
Return ONLY valid JSON. No markdown. No explanation. No preamble.
If a field has no clear data return empty array or empty string.
Never hallucinate or infer beyond what is explicitly in the conversation.`,

  EXTRACTION_USER: `Extract the cognitive state from this conversation.

Return exactly this JSON structure:
{
  "current_goal": "single sentence describing what the user is building or solving right now",
  "active_tasks": [
    "specific task currently in progress — max 3 items"
  ],
  "blockers": [
    "specific unresolved problem or error — max 2 items"  
  ],
  "decisions_made": [
    "specific technical decision already committed to — max 3 items"
  ],
  "confidence_score": 0.0
}

confidence_score rules:
1.0 = crystal clear goal with explicit decisions and blockers
0.7 = clear goal, some decisions implicit
0.4 = goal somewhat clear, limited decisions captured
0.2 = conversation too early or too vague to extract reliably

CONVERSATION:
{CONTEXT}`,

  RECONSTRUCTION_TEMPLATE: `SYNAPSE CONTEXT BRIEF
─────────────────────────────────────────
Continuing session from {PLATFORM} — {RELATIVE_TIME}
─────────────────────────────────────────

WHAT YOU ARE BUILDING:
{CURRENT_GOAL}

CURRENTLY IN PROGRESS:
{ACTIVE_TASKS}

BLOCKED ON:
{BLOCKERS}

ALREADY DECIDED — DO NOT REVISIT:
{DECISIONS}

─────────────────────────────────────────
Continue from exactly this point.
No need for background explanation.
─────────────────────────────────────────`
} as const;
