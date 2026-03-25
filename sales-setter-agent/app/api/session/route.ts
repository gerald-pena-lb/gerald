import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, VOICE_CONFIG } from "@/lib/nepq-prompt";

/**
 * POST /api/session
 *
 * Creates an ephemeral OpenAI Realtime API session token.
 * The client uses this token to establish a WebRTC connection directly
 * with OpenAI's Realtime servers — no audio is routed through our backend.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { prospectName, teammateName } = body;

    if (!prospectName || !teammateName) {
      return NextResponse.json(
        { error: "prospectName and teammateName are required" },
        { status: 400 }
      );
    }

    const instructions = buildSystemPrompt({ prospectName, teammateName });

    // Create an ephemeral session with OpenAI Realtime API
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview",
          voice: VOICE_CONFIG.voice,
          instructions,
          tools: [
            {
              type: "function",
              name: "book_strategy_call",
              description:
                "Book a strategy call with Alinka on Calendly. Call this when the prospect agrees to schedule a strategy call. You must collect their email and preferred time window first.",
              parameters: {
                type: "object",
                properties: {
                  prospect_email: {
                    type: "string",
                    description: "The prospect's email address for the calendar invite",
                  },
                  prospect_name: {
                    type: "string",
                    description: "The prospect's full name",
                  },
                  notes: {
                    type: "string",
                    description:
                      "Summary notes for Alinka including: prospect's goal, main problem/pain point, emotional consequence of inaction, budget range, and any materials they agreed to send",
                  },
                },
                required: ["prospect_email", "prospect_name", "notes"],
              },
            },
          ],
          tool_choice: "auto",
          temperature: VOICE_CONFIG.temperature,
          max_response_output_tokens: VOICE_CONFIG.max_response_output_tokens,
          turn_detection: VOICE_CONFIG.turn_detection,
          input_audio_transcription: {
            model: "whisper-1",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI session creation failed:", error);
      return NextResponse.json(
        { error: "Failed to create voice session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
