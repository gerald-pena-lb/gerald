import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, password, display_name, role")
    .eq("username", username)
    .single();

  if (error) {
    console.error("Auth query error:", error.message);
    // Table likely doesn't exist yet - return helpful message
    if (error.message.includes("relation") || error.code === "42P01" || error.message.includes("does not exist")) {
      return NextResponse.json({ error: "app_users table not found. Please run the migration SQL in Supabase." }, { status: 500 });
    }
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  if (!data || data.password !== password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      role: data.role,
    },
  });
}
