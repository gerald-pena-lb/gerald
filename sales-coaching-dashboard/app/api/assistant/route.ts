import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an AI assistant for a sales coaching dashboard that tracks setter call performance using the NEPQ (Neuro-Emotional Persuasion Questions) framework by Jeremy Miner, specifically for Leaders Brands.

You have access to the full dataset of agents, their calls, scores, and analysis. Answer questions about:
- Individual agent performance and trends
- Overall team performance
- Specific call analysis details
- Coaching recommendations
- Comparisons between agents
- Score breakdowns by stage (Connect, Situation, Problem, Consequence, Open Wallet Test, Book the Call)
- Booking and close rates

Scoring reference:
- Total max: 88 points across 6 stages
- Bookable Quality: 80-88, Needs Improvement: 70-79, Mandatory Coaching: below 70
- Stage pass thresholds: Connect ≥7/10, Situation ≥7/10, Problem ≥10/14, Consequence ≥10/14, Open Wallet ≥6/8, Book the Call / Closing & Commitment ≥24/32

Be concise, data-driven, and actionable. Use specific numbers from the data when answering. If you don't have enough data to answer, say so clearly.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { question, context } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

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
          max_tokens: 2000,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Here is the current dashboard data:\n\n${context}\n\nQuestion: ${question}`,
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

      const textBlock = data.content?.find(
        (block: { type: string }) => block.type === "text"
      );

      return NextResponse.json({ answer: textBlock?.text || "No response generated." });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out"
        : error instanceof Error
          ? error.message
          : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
