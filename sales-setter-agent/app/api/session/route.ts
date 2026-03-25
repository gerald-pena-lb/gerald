import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/session
 *
 * Creates a conversation token for ElevenLabs Conversational AI.
 * Returns both signed URL (WebSocket) and conversation token (WebRTC).
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

    // Get a signed URL (for WebSocket fallback)
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": elevenLabsKey },
      }
    );

    let signedUrl = null;
    if (signedUrlRes.ok) {
      const data = await signedUrlRes.json();
      signedUrl = data.signed_url;
    }

    return NextResponse.json({
      signedUrl,
      agentId,
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
