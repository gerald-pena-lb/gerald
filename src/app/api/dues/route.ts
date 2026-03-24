import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");
  const year = url.searchParams.get("year");

  let query = supabase
    .from("annual_dues")
    .select("*, members!inner(last_name, first_name)");

  if (memberId) query = query.eq("member_id", Number(memberId));
  if (year) query = query.eq("year", Number(year));

  const { data, error } = await query.order("year", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data || []).map((d) => {
    const m = d.members as { last_name: string; first_name: string };
    return {
      ...d,
      full_name: `${m.last_name}, ${m.first_name}`,
      members: undefined,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("annual_dues")
    .insert({
      member_id: body.member_id,
      year: body.year,
      amount: body.amount,
      date_paid: body.date_paid,
      remarks: body.remarks || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Dues already recorded for this member and year" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
