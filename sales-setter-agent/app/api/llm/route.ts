import { NextRequest } from "next/server";

/**
 * POST /api/llm
 *
 * Custom LLM proxy for ElevenLabs Conversational AI.
 * Receives OpenAI Chat Completions-format requests from ElevenLabs,
 * translates them to Anthropic Messages API format (Claude Opus 4.6),
 * and streams back in OpenAI SSE format.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { messages, temperature, max_tokens } = body;

    // Separate system message from conversation messages
    const systemMessage = messages?.find(
      (m: { role: string }) => m.role === "system"
    );
    const conversationMessages = (messages || []).filter(
      (m: { role: string }) => m.role !== "system"
    );

    // Call Claude Opus 4.6 with streaming
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: max_tokens || 300,
        temperature: temperature ?? 0.7,
        system: systemMessage?.content || "",
        messages: conversationMessages.map(
          (m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })
        ),
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({ error: "LLM request failed" }),
        { status: anthropicRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream-translate Anthropic SSE → OpenAI SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const event = JSON.parse(dataStr);

                if (event.type === "content_block_delta" && event.delta?.text) {
                  // Translate to OpenAI format
                  const openAiChunk = JSON.stringify({
                    choices: [
                      {
                        delta: { content: event.delta.text },
                        index: 0,
                      },
                    ],
                  });
                  controller.enqueue(
                    encoder.encode(`data: ${openAiChunk}\n\n`)
                  );
                }

                if (event.type === "message_stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }

          // Ensure we always send [DONE]
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream translation error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("LLM proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
