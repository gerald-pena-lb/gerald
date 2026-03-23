import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET /api/agents — list all agents with their calls
export async function GET() {
  const { data: agents, error: agentsErr } = await getSupabase()
    .from("agents")
    .select("*")
    .order("created_at", { ascending: true });

  if (agentsErr) {
    return NextResponse.json({ error: agentsErr.message }, { status: 500 });
  }

  const { data: calls, error: callsErr } = await getSupabase()
    .from("calls")
    .select("*")
    .order("created_at", { ascending: true });

  if (callsErr) {
    return NextResponse.json({ error: callsErr.message }, { status: 500 });
  }

  const result = (agents || []).map((agent) => ({
    id: agent.id,
    name: agent.name,
    createdAt: agent.created_at,
    calls: (calls || [])
      .filter((c) => c.agent_id === agent.id)
      .map((c) => ({
        id: c.id,
        date: c.created_at,
        fileName: c.file_name,
        prospectName: c.prospect_name || "",
        callDate: c.call_date || "",
        outcome: c.outcome,
        analysis: c.analysis,
      })),
  }));

  return NextResponse.json({ agents: result });
}

// POST /api/agents — create a new agent
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("agents")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    agent: { id: data.id, name: data.name, createdAt: data.created_at, calls: [] },
  });
}

// DELETE /api/agents?id=xxx — delete an agent (cascade deletes calls)
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await getSupabase().from("agents").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
