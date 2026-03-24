import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: "CSV parse errors", details: parsed.errors },
      { status: 400 }
    );
  }

  const rows = (parsed.data as Record<string, string>[])
    .filter((row) => row.last_name && row.first_name)
    .map((row) => ({
      last_name: row.last_name,
      first_name: row.first_name,
      batch_name: row.batch_name || null,
      batch_letter: row.batch_letter || null,
      year: row.year ? Number(row.year) : null,
      phone_number: row.phone_number || null,
      current_company: row.current_company || null,
      title: row.title || null,
      industry: row.industry || null,
      status: row.status || "alive",
    }));

  const skipped = (parsed.data as Record<string, string>[]).length - rows.length;
  const errors: string[] = [];
  if (skipped > 0) errors.push(`${skipped} rows skipped: missing last_name or first_name`);

  const { error } = await supabase.from("members").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, imported: rows.length, errors }, { status: 201 });
}
