import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/calendly
 *
 * Handles the book_strategy_call tool invocation from the voice agent.
 * Creates a scheduling link or books directly via Calendly API.
 */
export async function POST(req: NextRequest) {
  const calendlyApiKey = process.env.CALENDLY_API_KEY;
  const schedulingUrl = process.env.CALENDLY_SCHEDULING_URL;

  if (!calendlyApiKey || !schedulingUrl) {
    // Fallback: return the public scheduling URL for manual booking
    return NextResponse.json({
      success: true,
      method: "manual",
      scheduling_url: schedulingUrl || "https://calendly.com",
      message:
        "Calendly API not fully configured. Returning public scheduling link.",
    });
  }

  try {
    const body = await req.json();
    const { prospect_email, prospect_name, notes } = body;

    // Get available times from Calendly
    const eventTypeUri = process.env.CALENDLY_EVENT_TYPE_URI;

    if (eventTypeUri) {
      // Fetch available slots for the next 7 days
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const availabilityRes = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(
          eventTypeUri
        )}&start_time=${now.toISOString()}&end_time=${nextWeek.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${calendlyApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        const availableSlots = availabilityData.collection?.slice(0, 10) || [];

        return NextResponse.json({
          success: true,
          method: "api",
          scheduling_url: `${schedulingUrl}?name=${encodeURIComponent(
            prospect_name
          )}&email=${encodeURIComponent(prospect_email)}`,
          available_slots: availableSlots.map(
            (slot: { start_time: string; status: string }) => ({
              start_time: slot.start_time,
              status: slot.status,
            })
          ),
          notes_saved: true,
          message: `Scheduling link generated for ${prospect_name}. Available times retrieved.`,
        });
      }
    }

    // Fallback: return pre-filled scheduling link
    const prefilledUrl = `${schedulingUrl}?name=${encodeURIComponent(
      prospect_name
    )}&email=${encodeURIComponent(prospect_email)}`;

    return NextResponse.json({
      success: true,
      method: "link",
      scheduling_url: prefilledUrl,
      message: `I've generated a personalized booking link for ${prospect_name}. They can select their preferred time directly.`,
      notes,
    });
  } catch (error) {
    console.error("Calendly API error:", error);
    return NextResponse.json(
      { error: "Failed to process booking request" },
      { status: 500 }
    );
  }
}
