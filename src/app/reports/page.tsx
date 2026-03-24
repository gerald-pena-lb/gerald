"use client";

import { useEffect, useState } from "react";
import { generateFinancialPDF, generateCollectionRatePDF } from "@/lib/pdf";

interface FinancialReport {
  summary: {
    total_dues: number;
    total_donations: number;
    total_income: number;
    total_expenditures: number;
    net: number;
  };
  breakdown: {
    dues: { month: string; total: number }[];
    donations: { month: string; total: number }[];
    expenditures: { month: string; total: number }[];
  };
  filters: { start: string; end: string };
}

interface CollectionRate {
  year: number;
  total_active_members: number;
  paid_members: number;
  collection_rate: string;
  total_collected: number;
  monthly: { month: string; count: number; amount: number }[];
}

export default function ReportsPage() {
  const [tab, setTab] = useState<"financial" | "collection">("financial");
  const [filter, setFilter] = useState<"month" | "quarter" | "year" | "custom">("year");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [collectionRate, setCollectionRate] = useState<CollectionRate | null>(null);

  function getDateRange() {
    const y = Number(year);
    const now = new Date();
    if (filter === "month") {
      const m = (now.getMonth() + 1).toString().padStart(2, "0");
      return { start: `${y}-${m}-01`, end: `${y}-${m}-31` };
    }
    if (filter === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      const startMonth = (q * 3 + 1).toString().padStart(2, "0");
      const endMonth = (q * 3 + 3).toString().padStart(2, "0");
      return { start: `${y}-${startMonth}-01`, end: `${y}-${endMonth}-31` };
    }
    if (filter === "year") {
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    return { start: startDate, end: endDate };
  }

  useEffect(() => {
    if (tab === "financial") {
      const { start, end } = getDateRange();
      if (!start || !end) return;
      fetch(`/api/reports?type=financial&start=${start}&end=${end}`)
        .then((r) => r.json())
        .then(setReport)
        .catch(() => {});
    } else {
      fetch(`/api/reports?type=collection_rate&year=${year}`)
        .then((r) => r.json())
        .then(setCollectionRate)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter, year, startDate, endDate]);

  function handleDownloadPDF() {
    if (!report) return;
    generateFinancialPDF(report);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setTab("financial")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${tab === "financial" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"}`}
        >
          Financial Report
        </button>
        <button
          onClick={() => setTab("collection")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${tab === "collection" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"}`}
        >
          Collection Rate
        </button>
      </div>

      {tab === "financial" && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-600">Filter by:</label>
              {(["month", "quarter", "year", "custom"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm ${filter === f ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-700"}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {filter !== "custom" && (
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24"
                  placeholder="Year"
                />
              )}
              {filter === "custom" && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  />
                </>
              )}
              {report && (
                <button
                  onClick={handleDownloadPDF}
                  className="ml-auto px-4 py-1.5 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08d20]"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>

          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
                <SummaryCard label="Total Dues" value={report.summary.total_dues} />
                <SummaryCard label="Total Donations" value={report.summary.total_donations} />
                <SummaryCard label="Total Income" value={report.summary.total_income} color="text-green-600" />
                <SummaryCard label="Total Expenditures" value={report.summary.total_expenditures} color="text-red-600" />
                <SummaryCard label="Net" value={report.summary.net} color={report.summary.net >= 0 ? "text-green-600" : "text-red-600"} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <BreakdownTable title="Dues by Month" data={report.breakdown.dues} />
                <BreakdownTable title="Donations by Month" data={report.breakdown.donations} />
                <BreakdownTable title="Expenditures by Month" data={report.breakdown.expenditures} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "collection" && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-600">Year:</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24"
            />
            {collectionRate && (
              <button
                onClick={() => generateCollectionRatePDF(collectionRate)}
                className="ml-auto px-4 py-1.5 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08d20]"
              >
                Download PDF
              </button>
            )}
          </div>

          {collectionRate && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="text-sm text-gray-500">Active Members</div>
                  <div className="text-2xl font-bold mt-1">{collectionRate.total_active_members}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="text-sm text-gray-500">Paid Members</div>
                  <div className="text-2xl font-bold mt-1">{collectionRate.paid_members}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="text-sm text-gray-500">Collection Rate</div>
                  <div className="text-2xl font-bold mt-1 text-[#c9a227]">{collectionRate.collection_rate}%</div>
                </div>
                <div className="bg-white rounded-lg shadow p-5">
                  <div className="text-sm text-gray-500">Total Collected</div>
                  <div className="text-2xl font-bold mt-1">&#8369;{collectionRate.total_collected.toLocaleString()}</div>
                </div>
              </div>

              {/* Monthly Breakdown Table */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-5 overflow-x-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Monthly Collection Breakdown</h3>
                {collectionRate.monthly && collectionRate.monthly.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Members Paid</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount Collected</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {collectionRate.monthly.map((row) => (
                        <tr key={row.month} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-700">{row.month}</td>
                          <td className="px-3 py-2 text-sm text-right">{row.count}</td>
                          <td className="px-3 py-2 text-sm text-right font-medium">&#8369;{row.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-right text-[#c9a227] font-medium">
                            {collectionRate.total_active_members > 0
                              ? ((row.count / collectionRate.total_active_members) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-3 py-2 text-sm">Total</td>
                        <td className="px-3 py-2 text-sm text-right">{collectionRate.paid_members}</td>
                        <td className="px-3 py-2 text-sm text-right">&#8369;{collectionRate.total_collected.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm text-right text-[#c9a227]">{collectionRate.collection_rate}%</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-400 text-sm">No collection data for this year</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color || "text-gray-900"}`}>
        &#8369;{value.toLocaleString()}
      </div>
    </div>
  );
}

function BreakdownTable({ title, data }: { title: string; data: { month: string; total: number }[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {data.length > 0 ? (
        <table className="min-w-full">
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.month}>
                <td className="py-1.5 text-sm text-gray-600">{row.month}</td>
                <td className="py-1.5 text-sm text-right font-medium">&#8369;{row.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-gray-400 text-sm">No data</div>
      )}
    </div>
  );
}
