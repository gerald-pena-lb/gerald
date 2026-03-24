import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Get max sort_order for this section
  const { data: existing } = await supabase
    .from("project_tasks")
    .select("sort_order")
    .eq("section_id", body.section_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: Number(id),
      section_id: body.section_id,
      name: body.name,
      description: body.description || null,
      due_date: body.due_date || null,
      remarks: body.remarks || null,
      notes: body.notes || null,
      assigned_to: body.assigned_to || null,
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

  if (!body.task_id) {
    return NextResponse.json({ error: "task_id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.remarks !== undefined) updates.remarks = body.remarks;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;

  const { error } = await supabase
    .from("project_tasks")
    .update(updates)
    .eq("id", body.task_id)
    .eq("project_id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");

  if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

  const { error } = await supabase
    .from("project_tasks")
    .delete()
    .eq("id", Number(taskId))
    .eq("project_id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
