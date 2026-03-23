import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";

const SYSTEM_PROMPT = `Sales coach using NEPQ (Jeremy Miner). Return ONLY valid JSON, no markdown.
NEPQ: Connection (trust/rapport), Situation (current state), Problem Awareness (discover pain), Solution Awareness (see the fix), Consequence (cost of inaction), Commitment (trial close).
Score 1-10 each. Keep ALL text fields under 15 words. Max 2 excerpts, 2 strengths. Coaching under 30 words.
JSON format: {"overallScore":0,"maxScore":70,"summary":"1-2 sentences","categories":[{"name":"Connection & Rapport","score":0,"maxScore":10,"assessment":"brief"},{"name":"Situation Questions","score":0,"maxScore":10,"assessment":"brief"},{"name":"Problem Awareness","score":0,"maxScore":10,"assessment":"brief"},{"name":"Solution Awareness","score":0,"maxScore":10,"assessment":"brief"},{"name":"Objection Handling","score":0,"maxScore":10,"assessment":"brief"},{"name":"Closing & Commitment","score":0,"maxScore":10,"assessment":"brief"},{"name":"Tone & Listening","score":0,"maxScore":10,"assessment":"brief"}],"excerpts":[{"type":"improvement","label":"issue label","quote":"exact transcript words","rewrite":"NEPQ phrasing","nepqPrinciple":"principle name","explanation":"why better"}],"strengths":[{"quote":"exact words","explanation":"why effective"}],"coaching":"specific NEPQ techniques, phrases to use, what to stop/start doing"}`;

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

    const trimmed = transcript.slice(0, 6000);
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
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Analyze this sales call transcript:\n\n${trimmed}` }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "API error" }, { status: response.status });
    }

    let text = data.content?.[0]?.text || "";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    // Repair and parse JSON server-side
    const analysis = JSON.parse(jsonrepair(text));

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
