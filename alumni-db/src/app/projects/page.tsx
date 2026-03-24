"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: number;
  name: string;
  description: string;
  goals: string;
  date: string;
  due_date: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]"
        >
          New Project
        </Link>
      </div>

      <div className="grid gap-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-lg">{p.name}</div>
                {p.description && (
                  <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                )}
              </div>
              <div className="text-right ml-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.status === "upcoming"
                      ? "bg-blue-100 text-blue-800"
                      : p.status === "ongoing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Start: {p.date}</span>
              {p.due_date && <span>Due: {p.due_date}</span>}
              <span>{p.total_tasks} tasks</span>
            </div>

            {p.total_tasks > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-[#1e3a5f]">{p.completion_pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#c9a227] h-2 rounded-full transition-all"
                    style={{ width: `${p.completion_pct}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">No projects yet.</div>
        )}
      </div>
    </div>
  );
}
