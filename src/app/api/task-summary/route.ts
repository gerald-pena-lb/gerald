import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET() {
  const { data, error } = await supabase
    .from("project_tasks")
    .select("assigned_to, status");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map = new Map<string, { completed: number; total: number }>();
  for (const task of data || []) {
    const name = task.assigned_to?.trim();
    if (!name) continue;
    const entry = map.get(name) || { completed: 0, total: 0 };
    entry.total += 1;
    if (task.status === "completed") entry.completed += 1;
    map.set(name, entry);
  }

  const summaries = Array.from(map.entries())
    .map(([assigned_to, counts]) => ({ assigned_to, ...counts }))
    .sort((a, b) => a.assigned_to.localeCompare(b.assigned_to));

  return NextResponse.json(summaries);
}
