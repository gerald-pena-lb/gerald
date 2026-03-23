import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a sales coach using NEPQ (Jeremy Miner). Return ONLY valid JSON. No markdown, no code fences.

CRITICAL RULES:
- Every text field MUST be under 10 words
- Quotes MUST be under 10 words
- Use 1 excerpt and 1 strength only
- coaching field under 15 words`;

const JSON_PREFIX = `{"overallScore":`;

// Build the expected structure so we can fill defaults for missing fields
const DEFAULTS = {
  overallScore: 35,
  maxScore: 70,
  summary: "Analysis incomplete",
  categories: [
    { name: "Connection & Rapport", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Situation Questions", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Problem Awareness", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Solution Awareness", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Objection Handling", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Closing & Commitment", score: 5, maxScore: 10, assessment: "N/A" },
    { name: "Tone & Listening", score: 5, maxScore: 10, assessment: "N/A" },
  ],
  excerpts: [],
  strengths: [],
  coaching: "Review NEPQ fundamentals",
};

function deepMerge(defaults: Record<string, unknown>, partial: Record<string, unknown>): Record<string, unknown> {
  const result = { ...defaults };
  for (const key of Object.keys(partial)) {
    if (partial[key] !== undefined && partial[key] !== null) {
      result[key] = partial[key];
    }
  }
  // Ensure categories array has all 7 entries
  if (Array.isArray(result.categories)) {
    const cats = result.categories as Array<Record<string, unknown>>;
    const defaultCats = (defaults.categories as Array<Record<string, unknown>>);
    result.categories = defaultCats.map((dc, i) => cats[i] ? { ...dc, ...cats[i] } : dc);
  }
  return result;
}

function parseResponse(raw: string): Record<string, unknown> {
  // Strip markdown fences
  let text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // continue to repair
  }

  // Truncation repair: remove trailing incomplete string value
  text = text.replace(/"[^"]*$/, '""');
  // Remove trailing comma/colon
  text = text.replace(/[,:]\s*$/, "");

  // Count and close open brackets
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  text += stack.reverse().join("");

  try {
    return JSON.parse(text);
  } catch {
    // Return defaults if all parsing fails
    return {};
  }
}

async function callClaude(apiKey: string, transcript: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyze this sales call transcript using NEPQ framework. Score each of the 7 categories 1-10. Return JSON with: overallScore, maxScore(70), summary, categories[7], excerpts[1], strengths[1], coaching.\n\n${transcript}`,
          },
          {
            role: "assistant",
            content: JSON_PREFIX,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "API error");
    }

    const text = JSON_PREFIX + (data.content?.[0]?.text || "");
    console.log(`Claude: stop=${data.stop_reason} len=${text.length}`);
    return parseResponse(text);
  } finally {
    clearTimeout(timeout);
  }
}

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

    const trimmed = transcript.slice(0, 3000);

    // Try up to 2 times
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const partial = await callClaude(apiKey, trimmed);
        const analysis = deepMerge(DEFAULTS, partial);
        return NextResponse.json({ analysis });
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Unknown error";
        console.log(`Attempt ${attempt + 1} failed: ${lastError}`);
      }
    }

    return NextResponse.json({ error: lastError }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to analyze transcript";
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
