import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/db";

const client = new Anthropic();

const SYSTEM_PROMPT = `Ikaw si Ubag, ang AI assistant ng UP Alpha Sigma Fraternity Alumni Association database system. Tumutulong ka sa mga brod na i-manage ang alumni data nila.

MAHALAGA:
- Laging mag-respond sa casual Filipino/Taglish. Parang kausap mo ang isang kapatid sa frat.
- LAGING tawagin ang user na "brod". Hal: "Ayos brod!", "Orayt brod!", "Solid brod!", "G na brod!"
- Gumamit ng mga expression tulad ng: "ayos", "solid!", "orayt brod!", "G!", "nice brod!", "eto na brod!", "panalo!", "sige brod"
- Kapag nag-execute ka ng action, mag-react ka ng enthusiastic: "Solid brod! Nagawa ko na!" o "Ayos! Tapos na brod!"
- Maging chill, witty, at kapatid ang dating mo. Hindi formal. Hindi robot.
- Kapag hindi mo kayang gawin ang request, sabihin: "Edni brod, di ko kaya yan" o "Dehins yan eto na lang ( ‿ * ‿ )" tapos mag-suggest ng alternative.

Pwede kang gumawa ng mga actions gamit ang JSON action blocks:

1. **Gumawa ng project** na may sections at tasks:
\`\`\`action
{"action":"create_project","name":"...","description":"...","date":"YYYY-MM-DD","sections":[{"name":"...","tasks":[{"name":"...","description":"..."}]}]}
\`\`\`

2. **Magdagdag ng mga brods (members)** sa database:
\`\`\`action
{"action":"add_members","members":[{"last_name":"...","first_name":"...","chapter":"Manila|Los Banos|Diliman","batch_name":"...","batch_letter":"...","year":2000,"phone_number":"...","current_company":"...","title":"...","industry":"...","status":"alive|deceased"}]}
\`\`\`

3. **Gumawa ng event**:
\`\`\`action
{"action":"create_event","name":"...","description":"...","date":"YYYY-MM-DD","status":"upcoming|ongoing|completed"}
\`\`\`

4. **Mag-upload ng meeting minutes** (i-paste lang ang raw text at i-pa-parse sa AI):
\`\`\`action
{"action":"upload_minutes","raw_text":"...the raw meeting text..."}
\`\`\`

5. **Mag-query ng finances** (para makita ang financial summary):
\`\`\`action
{"action":"query_finances","year":"2026"}
\`\`\`

6. **Mag-generate ng report** (financial o collection rate):
\`\`\`action
{"action":"generate_report","type":"financial|collection_rate","year":"2026"}
\`\`\`

Kapag nag-paste ang user ng unstructured text:
- Para sa projects: I-parse ito sa structured project na may logical sections at tasks.
- Para sa members/brods: I-parse ang mga pangalan at available data. I-match ang fields sa best effort mo. Para sa chapter, i-map ang common variations (hal., "LB" -> "Los Banos", "UP Diliman" -> "Diliman", "Manila" -> "Manila"). Default status ay "alive". I-infer ang fields mula sa context kung posible.
- Para sa minutes: I-parse at i-upload gamit ang upload_minutes action.

Kapag nagtatanong ang user tungkol sa finances, dues, donations, o expenditures, gamitin ang query_finances action para kunin ang data at sagutin ang tanong nila.

Kapag humingi ng report ang user, gamitin ang generate_report action.

Ipaliwanag muna kung ano ang gagawin mo bago mag-output ng action block. Kung hindi malinaw ang data, sabihin ang mga assumptions mo.

Maging maikli ang responses. Walang essay-essay, brod.`;

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
        results.push(await createProject(a));
      } else if (a.action === "add_members") {
        results.push(await addMembers(a));
      } else if (a.action === "create_event") {
        results.push(await createEvent(a));
      } else if (a.action === "upload_minutes") {
        results.push(await uploadMinutes(a));
      } else if (a.action === "query_finances") {
        results.push(await queryFinances(a));
      } else if (a.action === "generate_report") {
        results.push(await generateReport(a));
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

async function createEvent(data: Record<string, unknown>): Promise<string> {
  const { error } = await supabase
    .from("events")
    .insert({
      name: data.name as string,
      description: (data.description as string) || null,
      date: (data.date as string) || new Date().toISOString().split("T")[0],
      type: "event",
      status: (data.status as string) || "upcoming",
    });

  if (error) return `Failed to create event: ${error.message}`;
  return `Event "${data.name}" created`;
}

async function uploadMinutes(data: Record<string, unknown>): Promise<string> {
  const rawText = data.raw_text as string;
  if (!rawText) return "No meeting text provided";

  try {
    // Use the AI summarizer to parse the raw text
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `You are a meeting minutes parser for UP Alpha Sigma Fraternity Alumni Association. Given raw meeting text, extract and return ONLY valid JSON with this structure:
{
  "title": "Brief title",
  "meeting_date": "YYYY-MM-DD or null",
  "location": "location or null",
  "participants": [{"name": "Full Name", "role": "role or null"}],
  "updates": [{"topic": "topic", "details": "summary", "by": "person or null"}],
  "action_items": [{"task": "what to do", "assigned_to": "person", "deadline": "deadline or null"}]
}`,
      messages: [{ role: "user", content: rawText }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let summary;
    try {
      summary = JSON.parse(text.trim());
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        return "Failed to parse meeting minutes";
      }
    }

    const { error } = await supabase.from("meeting_summaries").insert({
      raw_text: rawText,
      title: summary.title || null,
      meeting_date: summary.meeting_date || null,
      location: summary.location || null,
      participants: summary.participants || [],
      updates: summary.updates || [],
      action_items: summary.action_items || [],
    });

    if (error) return `Failed to save minutes: ${error.message}`;
    return `Meeting minutes "${summary.title || "Untitled"}" uploaded and parsed`;
  } catch {
    return "Failed to process meeting minutes";
  }
}

async function queryFinances(data: Record<string, unknown>): Promise<string> {
  const year = (data.year as string) || new Date().getFullYear().toString();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const [duesRes, donationsRes, expendituresRes] = await Promise.all([
    supabase.from("annual_dues").select("amount, date_paid").eq("year", Number(year)),
    supabase.from("donations").select("amount, date_given").gte("date_given", startDate).lte("date_given", endDate),
    supabase.from("expenditures").select("amount, date, description").gte("date", startDate).lte("date", endDate),
  ]);

  const totalDues = (duesRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const totalDonations = (donationsRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenditures = (expendituresRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const duesCount = duesRes.data?.length || 0;
  const donationsCount = donationsRes.data?.length || 0;

  return `Financial Summary for ${year}: Dues collected: ₱${totalDues.toLocaleString()} (${duesCount} payments) | Donations: ₱${totalDonations.toLocaleString()} (${donationsCount} donations) | Total Income: ₱${(totalDues + totalDonations).toLocaleString()} | Expenditures: ₱${totalExpenditures.toLocaleString()} | Net: ₱${(totalDues + totalDonations - totalExpenditures).toLocaleString()}`;
}

async function generateReport(data: Record<string, unknown>): Promise<string> {
  const type = (data.type as string) || "financial";
  const year = (data.year as string) || new Date().getFullYear().toString();

  if (type === "collection_rate") {
    const [totalRes, paidRes, collectedRes] = await Promise.all([
      supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "alive"),
      supabase.from("annual_dues").select("member_id", { count: "exact", head: true }).eq("year", Number(year)),
      supabase.from("annual_dues").select("amount").eq("year", Number(year)),
    ]);

    const totalMembers = totalRes.count || 0;
    const paidMembers = paidRes.count || 0;
    const totalCollected = (collectedRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
    const rate = totalMembers > 0 ? ((paidMembers / totalMembers) * 100).toFixed(1) : "0.0";

    return `Collection Rate Report ${year}: Active Members: ${totalMembers} | Paid: ${paidMembers} | Rate: ${rate}% | Total Collected: ₱${totalCollected.toLocaleString()}`;
  }

  // Financial report
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const [duesRes, donationsRes, expendituresRes] = await Promise.all([
    supabase.from("annual_dues").select("amount, date_paid").gte("date_paid", startDate).lte("date_paid", endDate),
    supabase.from("donations").select("amount, date_given").gte("date_given", startDate).lte("date_given", endDate),
    supabase.from("expenditures").select("amount, date, description").gte("date", startDate).lte("date", endDate),
  ]);

  const totalDues = (duesRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const totalDonations = (donationsRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenditures = (expendituresRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
  const net = totalDues + totalDonations - totalExpenditures;

  const topExpenses = (expendituresRes.data || [])
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => `${e.description}: ₱${Number(e.amount).toLocaleString()}`)
    .join(", ");

  return `Financial Report ${year}: Dues: ₱${totalDues.toLocaleString()} | Donations: ₱${totalDonations.toLocaleString()} | Income: ₱${(totalDues + totalDonations).toLocaleString()} | Expenditures: ₱${totalExpenditures.toLocaleString()} | Net: ₱${net.toLocaleString()}${topExpenses ? ` | Top expenses: ${topExpenses}` : ""}`;
}
