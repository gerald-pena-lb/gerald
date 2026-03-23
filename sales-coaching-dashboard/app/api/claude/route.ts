import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert sales coach specializing in NEPQ (Neuro-Emotional Persuasion Questions) by Jeremy Miner.

Analyze the sales call transcript and evaluate the agent's performance across the NEPQ framework:
- Connection & Rapport: Building trust and genuine connection
- Situation Questions: Understanding the prospect's current state
- Problem Awareness: Helping prospect discover their pain points
- Solution Awareness: Guiding prospect to see the fix
- Objection Handling: Addressing concerns using NEPQ techniques
- Closing & Commitment: Trial closes and commitment questions
- Tone & Listening: Tonality, active listening, empathy

Score each category 1-10. Provide exactly 3 specific transcript excerpts that need improvement with NEPQ-based rewrites. Provide exactly 2 things the agent did well. Give a detailed coaching recommendation paragraph.

Keep quote fields to the essential phrase only (under 20 words). Assessment fields under 12 words.`;

// Use Claude tool_use to guarantee valid JSON output
const ANALYSIS_TOOL = {
  name: "submit_analysis",
  description: "Submit the NEPQ sales call analysis",
  input_schema: {
    type: "object" as const,
    required: ["overallScore", "maxScore", "summary", "categories", "excerpts", "strengths", "coaching"],
    properties: {
      overallScore: { type: "number" as const, description: "Total score across all categories" },
      maxScore: { type: "number" as const, description: "Always 70" },
      summary: { type: "string" as const, description: "1-2 sentence overall assessment" },
      categories: {
        type: "array" as const,
        description: "Exactly 7 NEPQ category scores",
        items: {
          type: "object" as const,
          required: ["name", "score", "maxScore", "assessment"],
          properties: {
            name: { type: "string" as const },
            score: { type: "number" as const, description: "Score 1-10" },
            maxScore: { type: "number" as const, description: "Always 10" },
            assessment: { type: "string" as const, description: "Brief assessment under 12 words" },
          },
        },
      },
      excerpts: {
        type: "array" as const,
        description: "Exactly 3 specific transcript moments that need improvement",
        items: {
          type: "object" as const,
          required: ["type", "label", "quote", "rewrite", "nepqPrinciple", "explanation"],
          properties: {
            type: { type: "string" as const, enum: ["improvement"], description: "Always improvement" },
            label: { type: "string" as const, description: "Short label for the issue (3-5 words)" },
            quote: { type: "string" as const, description: "What the agent actually said (exact or near-exact words from transcript, under 20 words)" },
            rewrite: { type: "string" as const, description: "How to rephrase it using NEPQ principles" },
            nepqPrinciple: { type: "string" as const, description: "Which NEPQ principle applies (e.g. Problem Awareness, Consequence Question)" },
            explanation: { type: "string" as const, description: "Why the rewrite is more effective (1-2 sentences)" },
          },
        },
      },
      strengths: {
        type: "array" as const,
        description: "Exactly 2 things the agent did well, with transcript evidence",
        items: {
          type: "object" as const,
          required: ["quote", "explanation"],
          properties: {
            quote: { type: "string" as const, description: "What the agent said that was effective (under 20 words)" },
            explanation: { type: "string" as const, description: "Why this was effective from an NEPQ perspective (1-2 sentences)" },
          },
        },
      },
      coaching: { type: "string" as const, description: "Detailed coaching recommendation paragraph (3-5 sentences). What to start doing, stop doing, and specific NEPQ techniques/phrases to practice." },
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

    const trimmed = transcript.slice(0, 4000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

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
          max_tokens: 4096,
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
