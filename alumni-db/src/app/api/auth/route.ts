import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, display_name, role")
    .eq("username", username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  // Check password
  const { data: fullUser } = await supabase
    .from("app_users")
    .select("password")
    .eq("id", data.id)
    .single();

  if (!fullUser || fullUser.password !== password) {
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
