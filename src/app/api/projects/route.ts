import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET() {
  // Get all projects with task counts for completion percentage
  const { data: projects, error } = await supabase
    .from("events")
    .select("*")
    .eq("type", "project")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get task counts per project
  const projectIds = (projects || []).map((p) => p.id);
  if (projectIds.length === 0) return NextResponse.json([]);

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("project_id, status")
    .in("project_id", projectIds);

  const taskCounts = new Map<number, { total: number; completed: number }>();
  for (const t of tasks || []) {
    const c = taskCounts.get(t.project_id) || { total: 0, completed: 0 };
    c.total++;
    if (t.status === "completed") c.completed++;
    taskCounts.set(t.project_id, c);
  }

  const result = (projects || []).map((p) => {
    const counts = taskCounts.get(p.id) || { total: 0, completed: 0 };
    return {
      ...p,
      total_tasks: counts.total,
      completed_tasks: counts.completed,
      completion_pct: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("events")
    .insert({
      name: body.name,
      description: body.description || null,
      goals: body.goals || null,
      date: body.date,
      due_date: body.due_date || null,
      type: "project",
      status: body.status || "upcoming",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
