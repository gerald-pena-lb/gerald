import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/db";

const client = new Anthropic();

const SUMMARIZE_PROMPT = `You are a meeting minutes parser for UP Alpha Sigma Fraternity Alumni Association. Given raw meeting text (notes, transcripts, or informal minutes), extract and return a structured JSON summary.

IMPORTANT: You must return ONLY valid JSON. No explanation, no markdown, no extra text. Just the JSON object.

Look at the MOST RECENT previous meeting's action items (provided in context) to determine which ones are still pending vs completed based on mentions in the current meeting text.

Return this exact JSON structure:
{
  "title": "Brief descriptive title for this meeting (e.g. 'Monthly General Assembly - March 2026')",
  "meeting_date": "YYYY-MM-DD format if mentioned, or null",
  "location": "Meeting location/venue if mentioned, or null",
  "participants": [
    { "name": "Full Name", "role": "Role or position if mentioned, otherwise null" }
  ],
  "updates": [
    { "topic": "Brief topic title", "details": "Summary of the update/discussion", "by": "Person who gave the update if mentioned, otherwise null" }
  ],
  "action_items": [
    { "task": "Description of what needs to be done", "assigned_to": "Person responsible", "deadline": "Deadline if mentioned, otherwise null" }
  ],
  "previous_action_items": [
    { "task": "Original action item description", "assigned_to": "Person responsible", "status": "done or pending", "remarks": "Any update or reason if still pending" }
  ]
}

Rules:
- Extract ALL participants mentioned (attendees, speakers, anyone named)
- Identify action items clearly - who needs to do what
- For previous action items, only include them if prior meeting context is provided
- If the text mentions follow-ups from last meeting, map those to previous action items
- Be thorough but concise in summaries
- Use the actual names/nicknames as they appear in the text
- If something is ambiguous, make your best inference`;

export async function POST(req: NextRequest) {
  const { raw_text } = await req.json();

  if (!raw_text || typeof raw_text !== "string") {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
  }

  // Fetch most recent meeting summary for previous action items context
  let previousContext = "";
  const { data: prevMeeting } = await supabase
    .from("meeting_summaries")
    .select("title, meeting_date, action_items")
    .order("meeting_date", { ascending: false })
    .limit(1)
    .single();

  if (prevMeeting && prevMeeting.action_items && (prevMeeting.action_items as unknown[]).length > 0) {
    previousContext = `\n\nPREVIOUS MEETING (${prevMeeting.meeting_date || "unknown date"} - ${prevMeeting.title || "untitled"}) ACTION ITEMS:\n${JSON.stringify(prevMeeting.action_items, null, 2)}`;
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Parse the following meeting text into structured minutes:${previousContext}\n\nRAW MEETING TEXT:\n${raw_text}`,
        },
      ],
      system: SUMMARIZE_PROMPT,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Try to parse JSON from the response
    let summary;
    try {
      // Try direct parse first
      summary = JSON.parse(text.trim());
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the text
        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          summary = JSON.parse(braceMatch[0]);
        } else {
          return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }
      }
    }

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
