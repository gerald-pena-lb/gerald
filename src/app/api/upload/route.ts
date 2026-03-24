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
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: "CSV parse errors", details: parsed.errors },
      { status: 400 }
    );
  }

  const CHAPTER_MAP: Record<string, string> = {
    manila: "Manila",
    "los banos": "Los Banos",
    "los baños": "Los Banos",
    "lb": "Los Banos",
    diliman: "Diliman",
  };

  const STATUS_MAP: Record<string, string> = {
    alive: "alive",
    active: "alive",
    living: "alive",
    deceased: "deceased",
    dead: "deceased",
  };

  const rows = (parsed.data as Record<string, string>[])
    .filter((row) => row.last_name && row.first_name)
    .map((row) => ({
      last_name: row.last_name.trim(),
      first_name: row.first_name.trim(),
      chapter: CHAPTER_MAP[row.chapter?.trim().toLowerCase()] || null,
      batch_name: row.batch_name?.trim() || null,
      batch_letter: row.batch_letter?.trim() || null,
      year: row.year ? Number(row.year) : null,
      phone_number: row.phone_number?.trim() || null,
      current_company: row.current_company?.trim() || null,
      title: row.title?.trim() || null,
      industry: row.industry?.trim() || null,
      status: STATUS_MAP[row.status?.trim().toLowerCase()] || "alive",
    }));

  const skipped = (parsed.data as Record<string, string>[]).length - rows.length;
  const errors: string[] = [];
  if (skipped > 0) errors.push(`${skipped} rows skipped: missing last_name or first_name`);

  const { error } = await supabase.from("members").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, imported: rows.length, errors }, { status: 201 });
}
