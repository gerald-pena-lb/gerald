import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");

  let query = supabase
    .from("donations")
    .select("*, members!inner(last_name, first_name)");

  if (memberId) query = query.eq("member_id", Number(memberId));

  const { data, error } = await query.order("date_given", { ascending: false });
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
    .from("donations")
    .insert({
      member_id: body.member_id,
      amount: body.amount,
      date_given: body.date_given,
      remarks: body.remarks || null,
      transaction_reference: body.transaction_reference || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
