import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", Number(id))
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: dues } = await supabase
    .from("annual_dues")
    .select("*")
    .eq("member_id", Number(id))
    .order("year", { ascending: false });

  const { data: donations } = await supabase
    .from("donations")
    .select("*")
    .eq("member_id", Number(id))
    .order("date_given", { ascending: false });

  return NextResponse.json({ ...member, dues: dues || [], donations: donations || [] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const { error } = await supabase
    .from("members")
    .update({
      full_name: body.full_name,
      batch_name: body.batch_name || null,
      batch_letter: body.batch_letter || null,
      year: body.year || null,
      phone_number: body.phone_number || null,
      current_company: body.current_company || null,
      title: body.title || null,
      industry: body.industry || null,
      status: body.status || "alive",
      updated_at: new Date().toISOString(),
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

  const { error } = await supabase.from("members").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
