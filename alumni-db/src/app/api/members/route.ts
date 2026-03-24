import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const industry = url.searchParams.get("industry") || "";
  const batch = url.searchParams.get("batch") || "";
  const year = url.searchParams.get("year") || "";
  const titleFilter = url.searchParams.get("title") || "";
  const status = url.searchParams.get("status") || "";

  let query = supabase.from("members").select("*");

  if (search) query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%`);
  if (industry) query = query.eq("industry", industry);
  if (batch) query = query.or(`batch_name.ilike.%${batch}%,batch_letter.ilike.%${batch}%`);
  if (year) query = query.eq("year", Number(year));
  if (titleFilter) query = query.ilike("title", `%${titleFilter}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("last_name").order("first_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (Array.isArray(body)) {
    const rows = body.map((m) => ({
      last_name: m.last_name,
      first_name: m.first_name,
      batch_name: m.batch_name || null,
      batch_letter: m.batch_letter || null,
      year: m.year || null,
      phone_number: m.phone_number || null,
      current_company: m.current_company || null,
      title: m.title || null,
      industry: m.industry || null,
      status: m.status || "alive",
    }));
    const { error } = await supabase.from("members").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, count: rows.length }, { status: 201 });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      last_name: body.last_name,
      first_name: body.first_name,
      batch_name: body.batch_name || null,
      batch_letter: body.batch_letter || null,
      year: body.year || null,
      phone_number: body.phone_number || null,
      current_company: body.current_company || null,
      title: body.title || null,
      industry: body.industry || null,
      status: body.status || "alive",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
