import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "financial";
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const year = url.searchParams.get("year");

  if (type === "collection_rate") {
    const duesYear = Number(year || new Date().getFullYear());

    const [totalRes, paidRes, collectedRes] = await Promise.all([
      supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "alive"),
      supabase.from("annual_dues").select("member_id", { count: "exact", head: true }).eq("year", duesYear),
      supabase.from("annual_dues").select("amount, date_paid").eq("year", duesYear),
    ]);

    const totalMembers = totalRes.count || 0;
    const paidMembers = paidRes.count || 0;
    const duesData = collectedRes.data || [];
    const totalCollected = duesData.reduce((sum, d) => sum + Number(d.amount), 0);

    // Monthly breakdown of collections
    const monthlyMap = new Map<string, { count: number; amount: number }>();
    for (const d of duesData) {
      const datePaid = (d as { date_paid: string }).date_paid;
      if (!datePaid) continue;
      const month = datePaid.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Number(d.amount);
      monthlyMap.set(month, existing);
    }
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    return NextResponse.json({
      year: duesYear,
      total_active_members: totalMembers,
      paid_members: paidMembers,
      collection_rate: totalMembers > 0
        ? ((paidMembers / totalMembers) * 100).toFixed(1)
        : "0.0",
      total_collected: totalCollected,
      monthly,
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

  const totalDues = duesData.reduce((s, d) => s + Number(d.amount), 0);
  const totalDonations = donationsData.reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenditures = expendituresData.reduce((s, d) => s + Number(d.amount), 0);

  // Breakdown by month
  function monthlyBreakdown(items: { amount: number; date: string }[], dateField: string) {
    const map = new Map<string, number>();
    for (const item of items) {
      const d = (item as unknown as Record<string, string>)[dateField];
      if (!d) continue;
      const month = d.substring(0, 7); // YYYY-MM
      map.set(month, (map.get(month) || 0) + Number(item.amount));
    }
    return Array.from(map.entries())
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
      dues: monthlyBreakdown(duesData as unknown as { amount: number; date: string }[], "date_paid"),
      donations: monthlyBreakdown(donationsData as unknown as { amount: number; date: string }[], "date_given"),
      expenditures: monthlyBreakdown(expendituresData as unknown as { amount: number; date: string }[], "date"),
    },
    filters: { start: startDate, end: endDate },
  });
}
