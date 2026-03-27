import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", Number(id))
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [minutesRes, goalsRes, expendituresRes] = await Promise.all([
    supabase
      .from("meeting_minutes")
      .select("*")
      .eq("event_id", Number(id))
      .order("date", { ascending: false }),
    supabase
      .from("goals")
      .select("*")
      .eq("event_id", Number(id))
      .order("created_at", { ascending: false }),
    supabase
      .from("expenditures")
      .select("*")
      .eq("event_id", Number(id))
      .order("date", { ascending: false }),
  ]);

  return NextResponse.json({
    ...event,
    minutes: minutesRes.data || [],
    goals: goalsRes.data || [],
    expenditures: expendituresRes.data || [],
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const { error } = await supabase
    .from("events")
    .update({
      name: body.name,
      description: body.description || null,
      date: body.date,
      type: body.type,
      status: body.status,
    })
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase.from("events").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
