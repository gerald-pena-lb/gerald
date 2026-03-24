import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);

  const { data: project, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", numId)
    .eq("type", "project")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get sections
  const { data: sections } = await supabase
    .from("project_sections")
    .select("*")
    .eq("project_id", numId)
    .order("sort_order", { ascending: true });

  // Get tasks
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", numId)
    .order("sort_order", { ascending: true });

  // Get expenditures
  const { data: expenditures } = await supabase
    .from("expenditures")
    .select("*")
    .eq("event_id", numId)
    .order("date", { ascending: false });

  const allTasks = tasks || [];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;

  return NextResponse.json({
    ...project,
    sections: sections || [],
    tasks: allTasks,
    expenditures: expenditures || [],
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    completion_pct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
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
      goals: body.goals || null,
      date: body.date,
      due_date: body.due_date || null,
      status: body.status,
    })
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from("events").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
