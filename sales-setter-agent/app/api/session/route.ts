import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/session
 *
 * Creates a signed conversation URL for ElevenLabs Conversational AI.
 * The client uses this to establish a WebSocket connection with ElevenLabs.
 */
export async function POST(req: NextRequest) {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required" },
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

    // Get a signed URL for the private agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": elevenLabsKey },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs signed URL error:", errorText);
      return NextResponse.json(
        { error: "Failed to create conversation session" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      signedUrl: data.signed_url,
      prospectName,
      teammateName,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
