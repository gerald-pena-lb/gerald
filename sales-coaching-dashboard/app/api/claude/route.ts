import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert sales coach specializing in NEPQ (Neuro-Emotional Persuasion Questions) by Jeremy Miner, specifically trained on the Leaders Brands Setter Call QA Checklist.

Analyze the sales call transcript using the 6-stage NEPQ framework below. Use these stages and their specific criteria as your guide for evaluation. Score each stage based on how well the agent executed the criteria listed.

## STAGE 1 — CONNECT (Max 10 pts, Pass: 7)
- Opened with LinkedIn reference question ("What was it about your conversation with [teammate] on LinkedIn that caused you to want to book time?")
- Let prospect answer fully without interrupting
- Reinforced prospect ownership — they chose to respond, book, and show up
- Did not accept surface answers — followed up on "just curious" type responses
- Transitioned into motivation: "Putting aside anything [teammate] told you — what is it about writing a book that's calling to you right now?"

## STAGE 2 — SITUATION (Max 10 pts, Pass: 7)
- Asked what kind of help they're looking for before talking about Leaders Brands
- Asked what they would use the book for — didn't assume
- Dug into the why — asked "why is that important to you?"
- Asked what they're currently doing and how long
- Did NOT pitch or describe the service unprompted

## STAGE 3 — PROBLEM (Max 14 pts, Pass: 10)
- Asked what's been happening that made them open to this now
- Used 1%/99% statistic or equivalent contrast to challenge status quo
- Asked how long they've been feeling this way
- Asked about specific trigger event — "usually there's a moment, what was yours?"
- Challenged status quo: "why not just continue the way things are going?"
- Did not accept vague answers — followed up for specifics
- Handled "not the right time" with follow-up questions, not acceptance

## STAGE 4 — CONSEQUENCE (Max 14 pts, Pass: 10)
- Asked what impact they want their story to have on readers
- Asked what happens if nothing changes and the book never gets written
- Used "what happens if your story dies with you" or equivalent
- Went emotional, not just logical — asked how it feels
- Asked "would you be okay continuing to feel that way?" and waited
- Completed rationale test — "what's the main reason you're looking at outside help?"
- Referenced prospect's specific consequence when handling objections

## STAGE 5 — OPEN WALLET TEST (Max 8 pts, Pass: 6)
- Used car dealership frame to normalize investment conversation
- Asked for a range — did NOT give pricing unprompted
- Handled "I can't afford it" with Mastermind bridge
- Handled "need to talk to spouse" by offering to include them

## STAGE 6 — BOOK THE CALL (Max 10 pts, Pass: 8)
- Framed strategy call as prospect's next step toward their goal — not a sales call
- Committed prospect to reading the case study book before the call
- Asked prospect to send Alinka pre-call materials
- Handled "I need to think about it" by pointing back to Stage 4 consequence
- Confirmed specific date and time — did not leave without booking or clear next action

## SCORING — FOLLOW THIS EXACTLY
For EACH criteria listed under each stage, assign exactly one score:
- 2 = Done well and naturally, no prompting needed
- 1 = Attempted but incomplete, forced, or partially skipped
- 0 = Missing entirely or done incorrectly

Add up the criteria scores for each stage. This is the stage score.
A criteria scores 0 if there is NO evidence of it in the transcript.
A criteria scores 1 ONLY if you can point to a specific moment where it was attempted.
A criteria scores 2 ONLY if you can point to a specific moment where it was done well.

Stage pass thresholds: Connect ≥7, Situation ≥7, Problem ≥10, Consequence ≥10, Open Wallet ≥6, Book the Call ≥8.
Total max: 66. Bookable Quality: 56-66. Needs Improvement: 46-55. Mandatory Coaching: below 46.

## AUTOMATIC COACHING FLAGS (regardless of score):
- Stage 1: Ownership reframe missing
- Stage 2: Service pitched before problem established
- Stage 3: Vague answers accepted without follow-up
- Stage 4: Emotional tie-down skipped
- Stage 5: Pricing disclosed on setter call
- Stage 6: Call ended with no booking and no next action

## OUTPUT REQUIREMENTS
Use this checklist as your guide for robust analysis. You MUST output:
- Score each of the 6 stages individually
- For EACH stage, provide detailed feedback based on its score percentage (score / maxScore):
  - Below 40%: Provide a transcript example showing what went wrong, explain what was NOT done that should have been, and give a specific suggestion with example phrasing
  - 40-69%: Explain what was attempted, what fell short, and give specific actions/phrasing to improve
  - 70%+: Highlight what the agent did well with a transcript quote as evidence

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
      overallScore: { type: "number" as const, description: "Total score across all 6 stages (max 66)" },
      maxScore: { type: "number" as const, description: "Always 66" },
      summary: { type: "string" as const, description: "1-2 sentence overall assessment. Include rating: Bookable Quality (56-66), Needs Improvement (46-55), or Mandatory Coaching (below 46)." },
      categories: {
        type: "array" as const,
        description: "Exactly 6 stage scores in order: Connect, Situation, Problem, Consequence, Open Wallet Test, Book the Call. Each stage includes detailed feedback.",
        items: {
          type: "object" as const,
          required: ["name", "score", "maxScore", "assessment", "transcriptQuote", "transcriptContext", "feedback"],
          properties: {
            name: { type: "string" as const, description: "Stage name, e.g. 'Stage 1 — Connect'" },
            score: { type: "number" as const, description: "Stage score" },
            maxScore: { type: "number" as const, description: "Max for this stage: 10, 10, 14, 14, 8, or 10" },
            assessment: { type: "string" as const, description: "Brief assessment under 12 words" },
            transcriptQuote: { type: "string" as const, description: "Key transcript quote from this stage (under 25 words). For red/amber: what the agent said that was problematic. For green: what the agent said that was effective." },
            transcriptContext: { type: "string" as const, description: "2-4 lines of surrounding transcript context with speaker labels" },
            feedback: { type: "string" as const, description: "For RED stages (<40%): What was NOT done + specific suggestion with example phrasing. For AMBER stages (40-69%): What was attempted but fell short + specific actions to reach green. For GREEN stages (70%+): Why this was effective from an NEPQ perspective." },
            suggestion: { type: "string" as const, description: "For red/amber stages: A specific example phrase the agent should use next time. For green stages: leave empty string." },
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
