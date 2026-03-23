import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";

const SYSTEM_PROMPT = `You are a sales coach using NEPQ (Jeremy Miner). Return ONLY a valid JSON object. No markdown, no code fences, no explanation.

CRITICAL: Keep your response SHORT. Every text field must be under 12 words. Use abbreviations freely.

JSON schema:
{"overallScore":N,"maxScore":70,"summary":"1 sentence max","categories":[{"name":"Connection & Rapport","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Situation Questions","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Problem Awareness","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Solution Awareness","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Objection Handling","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Closing & Commitment","score":N,"maxScore":10,"assessment":"<8 words>"},{"name":"Tone & Listening","score":N,"maxScore":10,"assessment":"<8 words>"}],"excerpts":[{"type":"improvement","label":"3 words","quote":"short exact quote","rewrite":"NEPQ version","nepqPrinciple":"name","explanation":"<10 words>"}],"strengths":[{"quote":"short exact quote","explanation":"<10 words>"}],"coaching":"<20 words max>"}

Return exactly 2 excerpts and 2 strengths. Keep quotes under 15 words.`;

function tryParseAnalysis(text: string): Record<string, unknown> {
  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // If JSON is truncated, try to close it
  // Remove trailing incomplete string (ends mid-string without closing quote)
  const lastComplete = text.replace(/"[^"]*$/, '"');

  // Try multiple repair strategies
  const attempts = [text, lastComplete];
  for (const attempt of attempts) {
    try {
      return JSON.parse(jsonrepair(attempt));
    } catch {
      // try next
    }
  }

  // Last resort: manually close all open brackets
  let fixed = lastComplete;
  const opens = (fixed.match(/[{[]/g) || []).length;
  const closes = (fixed.match(/[}\]]/g) || []).length;
  const missing = opens - closes;
  // Remove any trailing comma or colon
  fixed = fixed.replace(/[,:]\s*$/, "");
  for (let i = 0; i < missing; i++) {
    // Guess bracket type from context - scan backwards
    const lastOpen = Math.max(fixed.lastIndexOf("{"), fixed.lastIndexOf("["));
    if (lastOpen >= 0 && fixed[lastOpen] === "[") {
      fixed += "]";
    } else {
      fixed += "}";
    }
  }

  try {
    return JSON.parse(jsonrepair(fixed));
  } catch {
    throw new Error("Could not parse Claude response as JSON");
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const trimmed = transcript.slice(0, 4000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

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
        messages: [{ role: "user", content: `Analyze this sales call:\n\n${trimmed}` }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "API error" }, { status: response.status });
    }

    const text = data.content?.[0]?.text || "";
    const stopReason = data.stop_reason;

    // Log for debugging
    console.log(`Claude response: stop_reason=${stopReason}, length=${text.length}`);

    if (!text) {
      return NextResponse.json({ error: "Empty response from Claude" }, { status: 500 });
    }

    const analysis = tryParseAnalysis(text);

    return NextResponse.json({ analysis });
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
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
