"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
  status: string;
}

interface TaskSummary {
  assigned_to: string;
  completed: number;
  total: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [taskSummaries, setTaskSummaries] = useState<TaskSummary[]>([]);

  useEffect(() => {
    fetch("/api/events?type=event").then((r) => r.json()).then(setEvents).catch(() => {});
    fetch("/api/task-summary").then((r) => r.json()).then(setTaskSummaries).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          href="/events/new?type=event"
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]"
        >
          New Event
        </Link>
      </div>

      {/* Task Summary Per User */}
      {taskSummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Task Progress by Member</h2>
          <div className="flex flex-wrap gap-3">
            {taskSummaries.map((s) => (
              <div
                key={s.assigned_to}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-900">{s.assigned_to}</span>
                <span
                  className={`text-sm font-bold ${
                    s.completed === s.total && s.total > 0
                      ? "text-green-600"
                      : "text-[#c9a227]"
                  }`}
                >
                  {s.completed}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{ev.name}</div>
                <div className="text-sm text-gray-500 mt-1">{ev.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{ev.date}</div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ev.status === "upcoming"
                      ? "bg-blue-100 text-blue-800"
                      : ev.status === "ongoing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {ev.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">No events yet.</div>
        )}
      </div>
    </div>
  );
}
