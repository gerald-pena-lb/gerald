import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Get max sort_order
  const { data: existing } = await supabase
    .from("project_sections")
    .select("sort_order")
    .eq("project_id", Number(id))
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("project_sections")
    .insert({
      project_id: Number(id),
      name: body.name,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.section_id && body.name !== undefined) {
    const { error } = await supabase
      .from("project_sections")
      .update({ name: body.name })
      .eq("id", body.section_id)
      .eq("project_id", Number(id));

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("section_id");

  if (!sectionId) return NextResponse.json({ error: "section_id required" }, { status: 400 });

  const { error } = await supabase
    .from("project_sections")
    .delete()
    .eq("id", Number(sectionId))
    .eq("project_id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
