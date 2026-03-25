import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert sales coach specializing in NEPQ (Neuro-Emotional Persuasion Questions) by Jeremy Miner, specifically trained on the Leaders Brands Setter Call QA Checklist.

Analyze the sales call transcript using the 6-stage NEPQ framework below. Use these stages and their specific criteria as your guide for evaluation. Score each stage based on how well the agent executed the criteria listed.

## STAGE 1 — CONNECT (Max 10 pts, Pass: 9)
- Opened with LinkedIn reference question ("What was it about your conversation with [teammate] on LinkedIn that caused you to want to book time?")
- Let prospect answer fully without interrupting
- Reinforced prospect ownership — they chose to respond, book, and show up
- Did not accept surface answers — followed up on "just curious" type responses
- Transitioned into motivation: "Putting aside anything [teammate] told you — what is it about writing a book that's calling to you right now?"

## STAGE 2 — SITUATION (Max 10 pts, Pass: 9)
- Asked what kind of help they're looking for before talking about Leaders Brands
- Asked what they would use the book for — didn't assume
- Dug into the why — asked "why is that important to you?"
- Asked what they're currently doing and how long
- Did NOT pitch or describe the service unprompted

## STAGE 3 — PROBLEM (Max 14 pts, Pass: 13)
- Asked what's been happening that made them open to this now
- Used 1%/99% statistic or equivalent contrast to challenge status quo
- Asked how long they've been feeling this way
- Asked about specific trigger event — "usually there's a moment, what was yours?"
- Challenged status quo: "why not just continue the way things are going?"
- Did not accept vague answers — followed up for specifics
- Handled "not the right time" with follow-up questions, not acceptance

## STAGE 4 — CONSEQUENCE (Max 14 pts, Pass: 13)
- Asked what impact they want their story to have on readers
- Asked what happens if nothing changes and the book never gets written
- Used "what happens if your story dies with you" or equivalent
- Went emotional, not just logical — asked how it feels
- Asked "would you be okay continuing to feel that way?" and waited
- Completed rationale test — "what's the main reason you're looking at outside help?"
- Referenced prospect's specific consequence when handling objections

## STAGE 5 — OPEN WALLET TEST (Max 8 pts, Pass: 7)
- Used car dealership frame to normalize investment conversation
- Asked for a range — did NOT give pricing unprompted
- Handled "I can't afford it" with Mastermind bridge
- Handled "need to talk to spouse" by offering to include them

## STAGE 6 — BOOK THE CALL / CLOSING & COMMITMENT (Max 37 pts, Pass: 34)

Criteria are weighted by impact on future conversion using NEPQ principles.

### CRITICAL (3 pts each) — Core NEPQ closing moves that directly drive conversion:
- [3 pts] Tied the call back to prospect's stated goals (creates emotional anchor)
- [3 pts] Connected the booking to consequences/pain points mentioned earlier (leverages Stage 4 emotional investment)
- [3 pts] Secured a confirmed date and time (no vague "sometime next week")
- [3 pts] Got a clear verbal commitment to attend (reduces no-shows)
- [3 pts] Properly positioned Alinka — built her credibility and authority as the strategist they'll speak with

### HIGH (2 pts each) — Strong conversion drivers that significantly impact show rate and close rate:
- [2 pts] Did the open wallet test (confirms financial readiness before booking)
- [2 pts] Confidently moved to book the call without hesitation (conviction transfers)
- [2 pts] Clearly explained what will happen on the next call (sets expectations, reduces anxiety)
- [2 pts] Introduced "Your Book or Your Excuse" (the book) as a key resource
- [2 pts] Built anticipation and credibility for the strategy call
- [2 pts] Handled "I need to think about it" or similar objections by referencing Stage 4 consequences
- [2 pts] Framed strategy call as prospect's next step toward their goal — not a sales call
- [2 pts] Got commitment from prospect to read the book before the call (micro-commitment that increases show rate)
- [2 pts] Reconfirmed all commitments before ending the call (commitment/consistency principle)

### SUPPORTING (1 pt each) — Reinforcement items that support logistics and preparation:
- [1 pt] Explained the value of the book and why it matters before the call
- [1 pt] Asked prospect to send pre-call materials
- [1 pt] Explained what kind of materials to send
- [1 pt] Got a clear commitment to send materials

## SCORING — FOLLOW THIS EXACTLY. DO NOT DEVIATE.

### Stages 1-5: Standard scoring (2 pts per criterion)
For EACH criteria bullet, score it individually:
- 2 = The agent clearly did this well. You can quote a specific line from the transcript as evidence.
- 1 = The agent partially attempted this. You can point to a moment but it was incomplete or awkward.
- 0 = There is NO evidence of this anywhere in the transcript, OR it was done incorrectly.

### Stage 6: Weighted scoring (variable pts per criterion)
For EACH criteria bullet, score based on its weight tier:
- CRITICAL (3 pt items): 3 = clearly done well, 1 = partial attempt, 0 = not done
- HIGH (2 pt items): 2 = clearly done well, 1 = partial attempt, 0 = not done
- SUPPORTING (1 pt items): 1 = clearly done, 0 = not done

Add up all individual scores per stage. The sum IS the stage score. Do NOT round or adjust.

CRITICAL RULES:
- Stage 1 has 5 criteria → max 10. Stage 2 has 5 criteria → max 10.
- Stage 3 has 7 criteria → max 14. Stage 4 has 7 criteria → max 14.
- Stage 5 has 4 criteria → max 8. Stage 6 has 18 weighted criteria → max 37.
- "Not applicable" ONLY applies to objection-handling criteria where the specific objection never came up (e.g. prospect never said "I can't afford it" so "handled affordability objection" is N/A). In this rare case, score it 1.
- IMPORTANT: If the agent simply did NOT do something they should have done, that is NOT "not applicable" — that is a 0. For example, if the agent never attempted to book a call, never introduced the book, never asked for materials — all of those are 0, not "N/A."
- If the transcript is short, ends abruptly, or a stage is missing entirely, score all criteria for that stage as 0. The agent is responsible for reaching every stage.
- The overall score MUST equal the sum of all 6 stage scores. Double-check your arithmetic.

Stage pass thresholds (90%): Connect ≥9, Situation ≥9, Problem ≥13, Consequence ≥13, Open Wallet ≥7, Book the Call ≥34.
Total max: 93. All scores are displayed as percentages.

## AUTOMATIC COACHING FLAGS (regardless of score):
- Stage 1: Ownership reframe missing
- Stage 2: Service pitched before problem established
- Stage 3: Vague answers accepted without follow-up
- Stage 4: Emotional tie-down skipped
- Stage 5: Pricing disclosed on setter call
- Stage 6: Call ended with no booking and no next action
- Stage 6: Book not introduced or no commitment to read it
- Stage 6: No pre-call materials requested or commitment secured
- Stage 6: Alinka not properly positioned

## OUTPUT REQUIREMENTS
Use this checklist as your guide for robust analysis. You MUST output:
- Score each of the 6 stages individually
- For EACH stage, provide detailed feedback based on its score percentage (score / maxScore):
  - 75% and below (red): Provide a transcript example showing what went wrong, explain what was NOT done that should have been, and give a specific suggestion with example phrasing
  - Above 75% but below 90% (amber): Explain what was attempted, what fell short, and give specific actions/phrasing to improve
  - 90%+ (green/pass): Highlight what the agent did well with a transcript quote as evidence

IMPORTANT: Do NOT write "RED STAGE", "AMBER STAGE", "GREEN STAGE" or any color labels in the feedback text. Just describe what happened and what to improve. The UI handles color coding automatically based on the score.
- Note any automatic coaching flags triggered
- Give a detailed coaching recommendation

For transcript examples, include the approximate position (e.g. "Opening", "Mid-call", "Closing") and 2-4 lines of surrounding context with speaker labels.

Keep quote fields to the essential phrase only (under 20 words). Assessment fields under 12 words.`;

// Use Claude tool_use to guarantee valid JSON output
const ANALYSIS_TOOL = {
  name: "submit_analysis",
  description: "Submit the NEPQ sales call analysis based on the 6-stage Leaders Brands QA Checklist",
  input_schema: {
    type: "object" as const,
    required: ["overallScore", "maxScore", "summary", "categories", "coachingFlags", "coaching"],
    properties: {
      overallScore: { type: "number" as const, description: "Total score across all 6 stages (max 93)" },
      maxScore: { type: "number" as const, description: "Always 93" },
      summary: { type: "string" as const, description: "1-2 sentence overall assessment. Use percentage: e.g. 'Score: 78% — Needs Improvement'. Bookable Quality: 90%+, Needs Improvement: 80-89%, Mandatory Coaching: below 80%." },
      categories: {
        type: "array" as const,
        description: "Exactly 6 stage scores in order: Connect, Situation, Problem, Consequence, Open Wallet Test, Book the Call. Each stage includes detailed feedback.",
        items: {
          type: "object" as const,
          required: ["name", "score", "maxScore", "assessment", "transcriptQuote", "transcriptContext", "feedback"],
          properties: {
            name: { type: "string" as const, description: "Stage name, e.g. 'Stage 1 — Connect'" },
            score: { type: "number" as const, description: "Stage score" },
            maxScore: { type: "number" as const, description: "Max for this stage: 10, 10, 14, 14, 8, or 37" },
            assessment: { type: "string" as const, description: "Brief assessment under 12 words" },
            transcriptQuote: { type: "string" as const, description: "Key transcript quote from this stage (under 25 words). For stages below pass threshold: what the agent said/didn't say. For passing stages: what the agent said that was effective." },
            transcriptContext: { type: "string" as const, description: "2-4 lines of surrounding transcript context with speaker labels" },
            feedback: { type: "string" as const, description: "For stages below pass threshold: Explain which specific criteria scored 0 or 1, what was NOT done, and how to improve. For stages at/above pass threshold: Why this was effective from an NEPQ perspective. Never use color labels like RED/AMBER/GREEN." },
            suggestion: { type: "string" as const, description: "For stages below pass threshold: A specific example phrase the agent should use next time. For passing stages: leave empty string." },
          },
        },
      },
      coachingFlags: {
        type: "array" as const,
        description: "List of automatic coaching flags triggered (empty if none). E.g. 'Stage 1: Ownership reframe missing', 'Stage 5: Pricing disclosed on setter call'",
        items: { type: "string" as const },
      },
      coaching: { type: "string" as const, description: "Detailed coaching recommendation (3-5 sentences). Reference specific stages, what to start/stop doing, and specific NEPQ techniques to practice." },
    },
  },
};

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const trimmed = transcript.slice(0, 12000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 6000,
          temperature: 0,
          system: SYSTEM_PROMPT,
          tools: [ANALYSIS_TOOL],
          tool_choice: { type: "tool", name: "submit_analysis" },
          messages: [
            {
              role: "user",
              content: `Analyze this sales call transcript using the NEPQ framework. Use the submit_analysis tool to return your analysis.\n\n${trimmed}`,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `API error ${response.status}`);
      }

      // Extract tool_use result — guaranteed valid JSON by Claude API
      const toolBlock = data.content?.find(
        (block: { type: string }) => block.type === "tool_use"
      );

      if (!toolBlock?.input) {
        throw new Error("No analysis returned from Claude");
      }

      return NextResponse.json({ analysis: toolBlock.input });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out"
        : error instanceof Error
          ? error.message
          : "Failed to analyze transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
