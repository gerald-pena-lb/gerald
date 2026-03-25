import { NextResponse } from "next/server";
import { NEPQ_SYSTEM_PROMPT, AGENT_FIRST_MESSAGE, ELEVENLABS_VOICE_CONFIG } from "@/lib/nepq-prompt";

/**
 * GET /api/agent/fix
 *
 * Forces the existing ElevenLabs agent to use built-in Claude Sonnet 4.6
 * instead of custom LLM. Visit this URL in your browser to fix the agent.
 */
export async function GET() {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json({
      error: "ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID not set",
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: "PATCH",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: NEPQ_SYSTEM_PROMPT,
                llm: "claude-sonnet-4-6",
                custom_llm: null,
                temperature: 0.7,
                max_tokens: 300,
              },
              first_message: AGENT_FIRST_MESSAGE,
              language: "en",
            },
            tts: {
              model_id: "eleven_turbo_v2",
              voice_id: "21m00Tcm4TlvDq8ikWAM",
              stability: 0.7,
              similarity_boost: 0.75,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        status: "error",
        message: "Failed to update agent",
        details: errorText,
      });
    }

    return NextResponse.json({
      status: "ok",
      agent_id: agentId,
      llm: "claude-sonnet-4-6",
      message: "Agent updated to use built-in Claude Sonnet 4.6. Try starting a call now.",
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
