import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET /api/debug — test Supabase connection and show diagnostics
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // Check env vars
  diagnostics.hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  diagnostics.hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  diagnostics.urlPrefix = process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + "...";

  // Test agents table
  try {
    const { data, error, count } = await getSupabase()
      .from("agents")
      .select("*", { count: "exact" });

    diagnostics.agentsError = error?.message || null;
    diagnostics.agentsCount = data?.length ?? 0;
    diagnostics.agentsData = data;
  } catch (err) {
    diagnostics.agentsException = err instanceof Error ? err.message : String(err);
  }

  // Test insert + delete
  try {
    const { data, error } = await getSupabase()
      .from("agents")
      .insert({ name: "__debug_test__" })
      .select()
      .single();

    diagnostics.insertError = error?.message || null;
    diagnostics.insertedId = data?.id || null;

    if (data?.id) {
      await getSupabase().from("agents").delete().eq("id", data.id);
      diagnostics.cleanedUp = true;
    }
  } catch (err) {
    diagnostics.insertException = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnostics);
}
