import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "financial";
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const year = url.searchParams.get("year");

  if (type === "collection_rate") {
    const duesYear = Number(year || new Date().getFullYear());

    const [membersRes, duesRes] = await Promise.all([
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("status", "alive"),
      supabase.from("annual_dues").select("member_id, amount").eq("year", duesYear),
    ]);

    const totalMembers = membersRes.count || 0;
    const duesData = duesRes.data || [];
    const paidMembers = new Set(duesData.map((d) => d.member_id)).size;
    const totalCollected = duesData.reduce((sum, d) => sum + (d.amount || 0), 0);

    return NextResponse.json({
      year: duesYear,
      total_active_members: totalMembers,
      paid_members: paidMembers,
      collection_rate:
        totalMembers > 0 ? ((paidMembers / totalMembers) * 100).toFixed(1) : "0.0",
      total_collected: totalCollected,
    });
  }

  // Financial report
  let duesQuery = supabase.from("annual_dues").select("amount, date_paid");
  let donationsQuery = supabase.from("donations").select("amount, date_given");
  let expendituresQuery = supabase.from("expenditures").select("amount, date");

  if (startDate && endDate) {
    duesQuery = duesQuery.gte("date_paid", startDate).lte("date_paid", endDate);
    donationsQuery = donationsQuery.gte("date_given", startDate).lte("date_given", endDate);
    expendituresQuery = expendituresQuery.gte("date", startDate).lte("date", endDate);
  }

  const [duesRes, donationsRes, expendituresRes] = await Promise.all([
    duesQuery,
    donationsQuery,
    expendituresQuery,
  ]);

  const duesData = duesRes.data || [];
  const donationsData = donationsRes.data || [];
  const expendituresData = expendituresRes.data || [];

  const totalDues = duesData.reduce((s, d) => s + (d.amount || 0), 0);
  const totalDonations = donationsData.reduce((s, d) => s + (d.amount || 0), 0);
  const totalExpenditures = expendituresData.reduce((s, d) => s + (d.amount || 0), 0);

  function groupByMonth(rows: { amount: number; [key: string]: unknown }[], dateField: string) {
    const map: Record<string, number> = {};
    for (const row of rows) {
      const dateVal = row[dateField] as string;
      if (!dateVal) continue;
      const month = dateVal.substring(0, 7); // YYYY-MM
      map[month] = (map[month] || 0) + (row.amount || 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
  }

  return NextResponse.json({
    summary: {
      total_dues: totalDues,
      total_donations: totalDonations,
      total_income: totalDues + totalDonations,
      total_expenditures: totalExpenditures,
      net: totalDues + totalDonations - totalExpenditures,
    },
    breakdown: {
      dues: groupByMonth(duesData, "date_paid"),
      donations: groupByMonth(donationsData, "date_given"),
      expenditures: groupByMonth(expendituresData, "date"),
    },
    filters: { start: startDate, end: endDate },
  });
}
