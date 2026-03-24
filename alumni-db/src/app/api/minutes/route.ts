import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";

  let query = supabase
    .from("meeting_summaries")
    .select("id, title, meeting_date, location, participants, created_at")
    .order("meeting_date", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { raw_text, meeting_date, location, participants, updates, action_items, previous_action_items, title } = body;

  const { data, error } = await supabase
    .from("meeting_summaries")
    .insert({
      raw_text,
      meeting_date: meeting_date || null,
      location: location || null,
      participants: participants || [],
      updates: updates || [],
      action_items: action_items || [],
      previous_action_items: previous_action_items || [],
      title: title || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
