"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface MinuteSummary {
  id: number;
  title: string | null;
  meeting_date: string | null;
  location: string | null;
  participants: { name: string; role?: string | null }[];
  created_at: string;
}

export default function MinutesPage() {
  const [minutes, setMinutes] = useState<MinuteSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/minutes?${params}`);
    if (res.ok) setMinutes(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minutes of the Meeting</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered meeting summaries</p>
        </div>
        <Link
          href="/minutes/new"
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm font-medium hover:bg-[#152c4a] text-center"
        >
          + New Minutes
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by title or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : minutes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meeting minutes yet</h3>
          <p className="text-gray-500 mb-4">Paste your raw meeting notes and let AI summarize them for you.</p>
          <Link
            href="/minutes/new"
            className="inline-block px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm font-medium hover:bg-[#152c4a]"
          >
            Create First Minutes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {minutes.map((m) => (
            <Link
              key={m.id}
              href={`/minutes/${m.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {m.title || "Untitled Meeting"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    {m.meeting_date && (
                      <span>
                        📅 {new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {m.location && <span>📍 {m.location}</span>}
                    {m.participants && m.participants.length > 0 && (
                      <span>👥 {m.participants.length} participant{m.participants.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  Added {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
