import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("event_id");

  let query = supabase
    .from("expenditures")
    .select("*, events(name)");

  if (eventId) {
    query = query.eq("event_id", Number(eventId));
  }

  query = query.order("date", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data || []).map((e) => ({
    ...e,
    event_name: (e.events as { name: string } | null)?.name || null,
    events: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("expenditures")
    .insert({
      description: body.description,
      amount: body.amount,
      date: body.date,
      event_id: body.event_id || null,
      remarks: body.remarks || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
