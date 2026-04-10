import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST /api/calls — create a new call
export async function POST(req: NextRequest) {
  const { agentId, fileName, analysis, prospectName, callDate } = await req.json();
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("calls")
    .insert({
      agent_id: agentId,
      file_name: fileName || "",
      prospect_name: prospectName || "",
      call_date: callDate || "",
      analysis: analysis || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    call: {
      id: data.id,
      date: data.created_at,
      fileName: data.file_name,
      prospectName: data.prospect_name,
      callDate: data.call_date,
      outcome: data.outcome,
      analysis: data.analysis,
    },
  });
}

// PATCH /api/calls — update outcome or analysis
export async function PATCH(req: NextRequest) {
  const { id, outcome, analysis } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (outcome !== undefined) updates.outcome = outcome;
  if (analysis !== undefined) updates.analysis = analysis;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("calls")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/calls?id=xxx — delete a call
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await getSupabase().from("calls").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
