import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/db";

const client = new Anthropic();

const SYSTEM_PROMPT = `Ikaw si Ubag, ang AI assistant ng UP Alpha Sigma Fraternity Alumni Association database system. Tumutulong ka sa mga user na i-manage ang alumni data nila nang maayos.

MAHALAGA: Laging mag-respond sa Filipino (Tagalog). Gamitin ang natural na Taglish kung kinakailangan para sa technical terms, pero Filipino ang primary language mo.

Pwede kang gumawa ng mga sumusunod na actions gamit ang JSON action blocks:

1. **Gumawa ng project** na may sections at tasks:
\`\`\`action
{"action":"create_project","name":"...","description":"...","date":"YYYY-MM-DD","sections":[{"name":"...","tasks":[{"name":"...","description":"..."}]}]}
\`\`\`

2. **Magdagdag ng mga brods (members)** sa database:
\`\`\`action
{"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","batch_letter":"...","year":2000,"phone_number":"...","current_company":"...","title":"...","industry":"...","status":"alive|deceased"}]}
\`\`\`

Kapag nag-paste ang user ng unstructured text:
- Para sa projects: I-parse ito sa structured project na may logical sections at tasks.
- Para sa members/brods: I-parse ang mga pangalan at available data. I-match ang fields sa best effort mo. Para sa chapter, i-map ang common variations (hal., "LB" -> "Los Banos", "UP Diliman" -> "Diliman", "Manila" -> "Manila"). Default status ay "alive". I-infer ang fields mula sa context kung posible.

Palaging ipaliwanag muna kung ano ang gagawin mo bago mag-output ng action block. Kung hindi malinaw ang data, sabihin ang mga assumptions mo. Pwede kang mag-include ng multiple action blocks sa isang response.

Maging maikli at helpful ang responses. Maging friendly at gumamit ng fraternity-appropriate na salita.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Parse action blocks from the response
    const actionRegex = /```action\n([\s\S]*?)```/g;
    const actions: unknown[] = [];
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        actions.push(JSON.parse(match[1].trim()));
      } catch {
        // skip unparseable blocks
      }
    }

    // Execute actions
    const results: string[] = [];
    for (const action of actions) {
      const a = action as Record<string, unknown>;
      if (a.action === "create_project") {
        const result = await createProject(a);
        results.push(result);
      } else if (a.action === "add_members") {
        const result = await addMembers(a);
        results.push(result);
      }
    }

    return NextResponse.json({ reply: text, actions_executed: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createProject(data: Record<string, unknown>): Promise<string> {
  const { data: project, error: projErr } = await supabase
    .from("events")
    .insert({
      name: data.name as string,
      description: (data.description as string) || null,
      date: (data.date as string) || new Date().toISOString().split("T")[0],
      type: "project",
      status: "upcoming",
      goals: (data.goals as string) || null,
      due_date: (data.due_date as string) || null,
    })
    .select("id")
    .single();

  if (projErr) return `Failed to create project: ${projErr.message}`;

  const sections = (data.sections as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const { data: sec, error: secErr } = await supabase
      .from("project_sections")
      .insert({
        project_id: project.id,
        name: section.name as string,
        sort_order: i,
      })
      .select("id")
      .single();

    if (secErr) continue;

    const tasks = (section.tasks as Array<Record<string, unknown>>) || [];
    for (let j = 0; j < tasks.length; j++) {
      const task = tasks[j];
      await supabase.from("project_tasks").insert({
        project_id: project.id,
        section_id: sec.id,
        name: task.name as string,
        description: (task.description as string) || null,
        due_date: (task.due_date as string) || null,
        sort_order: j,
      });
    }
  }

  return `Project "${data.name}" created with ${sections.length} sections`;
}

async function addMembers(data: Record<string, unknown>): Promise<string> {
  const CHAPTER_MAP: Record<string, string> = {
    manila: "Manila",
    "los banos": "Los Banos",
    "los baños": "Los Banos",
    lb: "Los Banos",
    diliman: "Diliman",
    "up diliman": "Diliman",
    "up manila": "Manila",
    "up los banos": "Los Banos",
    "up lb": "Los Banos",
  };

  const members = (data.members as Array<Record<string, unknown>>) || [];
  const rows = members.map((m) => ({
    last_name: (m.last_name as string)?.trim() || "",
    first_name: (m.first_name as string)?.trim() || "",
    chapter: CHAPTER_MAP[((m.chapter as string) || "").trim().toLowerCase()] || null,
    batch_name: (m.batch_name as string)?.trim() || null,
    batch_letter: (m.batch_letter as string)?.trim() || null,
    year: m.year ? Number(m.year) : null,
    phone_number: (m.phone_number as string)?.trim() || null,
    current_company: (m.current_company as string)?.trim() || null,
    title: (m.title as string)?.trim() || null,
    industry: (m.industry as string)?.trim() || null,
    status: ((m.status as string) || "alive").toLowerCase() === "deceased" ? "deceased" : "alive",
  })).filter((r) => r.last_name && r.first_name);

  if (rows.length === 0) return "No valid members to add";

  const { error } = await supabase.from("members").insert(rows);
  if (error) return `Failed to add members: ${error.message}`;

  return `Added ${rows.length} brod${rows.length > 1 ? "s" : ""} to the database`;
}
