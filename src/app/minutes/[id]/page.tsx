"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Participant {
  name: string;
  role: string | null;
}

interface Update {
  topic: string;
  details: string;
  by: string | null;
}

interface ActionItem {
  task: string;
  assigned_to: string;
  deadline: string | null;
}

interface PreviousActionItem {
  task: string;
  assigned_to: string;
  status: "done" | "pending";
  remarks: string | null;
}

interface MeetingSummary {
  id: number;
  raw_text: string;
  title: string | null;
  meeting_date: string | null;
  location: string | null;
  participants: Participant[];
  updates: Update[];
  action_items: ActionItem[];
  previous_action_items: PreviousActionItem[];
  created_at: string;
}

export default function MinuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MeetingSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MeetingSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/minutes/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setForm(d); });
  }, [id]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    const res = await fetch(`/api/minutes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setData(form);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/minutes/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/minutes");
  }

  if (!data) return <div className="max-w-4xl mx-auto p-6 text-center text-gray-500">Loading...</div>;

  const meeting = editing ? form! : data;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/minutes" className="text-sm text-[#1e3a5f] hover:underline mb-1 inline-block">&larr; All Minutes</Link>
          {editing ? (
            <input
              type="text"
              value={form?.title || ""}
              onChange={(e) => setForm(form ? { ...form, title: e.target.value } : form)}
              className="block text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 w-full mt-1"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{data.title || "Untitled Meeting"}</h1>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setForm(data); setEditing(false); }} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm bg-[#1e3a5f] text-white rounded-md font-medium hover:bg-[#152c4a] disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowRaw(!showRaw)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                {showRaw ? "Hide Raw" : "Show Raw"}
              </button>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm bg-[#1e3a5f] text-white rounded-md font-medium hover:bg-[#152c4a]">
                Edit
              </button>
              <button onClick={() => setShowDelete(true)} className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-700 mb-3">Are you sure you want to delete these minutes? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-md">Yes, Delete</button>
            <button onClick={() => setShowDelete(false)} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">Cancel</button>
          </div>
        </div>
      )}

      {/* Raw text toggle */}
      {showRaw && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Original Raw Text</h3>
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">{data.raw_text}</pre>
        </div>
      )}

      {/* Meeting Info Card */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
            {editing ? (
              <input
                type="date"
                value={form?.meeting_date || ""}
                onChange={(e) => setForm(form ? { ...form, meeting_date: e.target.value } : form)}
                className="block border border-gray-300 rounded-md px-3 py-1.5 text-sm mt-1 w-full"
              />
            ) : (
              <p className="text-sm text-gray-900 mt-1">
                {data.meeting_date
                  ? new Date(data.meeting_date + "T00:00:00").toLocaleDateString("en-PH", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</span>
            {editing ? (
              <input
                type="text"
                value={form?.location || ""}
                onChange={(e) => setForm(form ? { ...form, location: e.target.value } : form)}
                className="block border border-gray-300 rounded-md px-3 py-1.5 text-sm mt-1 w-full"
              />
            ) : (
              <p className="text-sm text-gray-900 mt-1">{data.location || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <h3 className="text-md font-bold text-gray-900 mb-3">
          Participants ({meeting.participants.length})
        </h3>
        {editing ? (
          <div className="space-y-2">
            {form?.participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => {
                    const updated = [...form.participants];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setForm({ ...form, participants: updated });
                  }}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={p.role || ""}
                  onChange={(e) => {
                    const updated = [...form.participants];
                    updated[i] = { ...updated[i], role: e.target.value || null };
                    setForm({ ...form, participants: updated });
                  }}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  placeholder="Role"
                />
                <button
                  onClick={() => setForm({ ...form, participants: form.participants.filter((_, j) => j !== i) })}
                  className="text-red-400 hover:text-red-600 text-lg px-1"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => setForm(form ? { ...form, participants: [...form.participants, { name: "", role: null }] } : form)}
              className="text-sm text-[#1e3a5f] hover:underline font-medium"
            >+ Add Participant</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.participants.map((p, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-[#1e3a5f] rounded-full text-sm">
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="ml-1 text-gray-500 text-xs">({p.role})</span>}
              </span>
            ))}
            {data.participants.length === 0 && <p className="text-sm text-gray-500 italic">No participants listed</p>}
          </div>
        )}
      </div>

      {/* Updates & Discussion */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <h3 className="text-md font-bold text-gray-900 mb-3">
          Updates & Discussion ({meeting.updates.length})
        </h3>
        {editing ? (
          <div className="space-y-3">
            {form?.updates.map((u, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={u.topic}
                    onChange={(e) => {
                      const updated = [...form.updates];
                      updated[i] = { ...updated[i], topic: e.target.value };
                      setForm({ ...form, updates: updated });
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium"
                    placeholder="Topic"
                  />
                  <input
                    type="text"
                    value={u.by || ""}
                    onChange={(e) => {
                      const updated = [...form.updates];
                      updated[i] = { ...updated[i], by: e.target.value || null };
                      setForm({ ...form, updates: updated });
                    }}
                    className="w-36 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    placeholder="By"
                  />
                  <button
                    onClick={() => setForm({ ...form, updates: form.updates.filter((_, j) => j !== i) })}
                    className="text-red-400 hover:text-red-600 text-lg px-1"
                  >×</button>
                </div>
                <textarea
                  value={u.details}
                  onChange={(e) => {
                    const updated = [...form.updates];
                    updated[i] = { ...updated[i], details: e.target.value };
                    setForm({ ...form, updates: updated });
                  }}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm resize-y"
                  placeholder="Details"
                />
              </div>
            ))}
            <button
              onClick={() => setForm(form ? { ...form, updates: [...form.updates, { topic: "", details: "", by: null }] } : form)}
              className="text-sm text-[#1e3a5f] hover:underline font-medium"
            >+ Add Update</button>
          </div>
        ) : (
          <div className="space-y-4">
            {data.updates.map((u, i) => (
              <div key={i} className="border-l-4 border-[#1e3a5f] pl-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{u.topic}</h4>
                  {u.by && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">by {u.by}</span>}
                </div>
                <p className="text-sm text-gray-700 mt-1">{u.details}</p>
              </div>
            ))}
            {data.updates.length === 0 && <p className="text-sm text-gray-500 italic">No updates recorded</p>}
          </div>
        )}
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <h3 className="text-md font-bold text-gray-900 mb-3">
          Action Items ({meeting.action_items.length})
        </h3>
        {editing ? (
          <div className="space-y-2">
            {form?.action_items.map((a, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-3 space-y-2">
                <input
                  type="text"
                  value={a.task}
                  onChange={(e) => {
                    const updated = [...form.action_items];
                    updated[i] = { ...updated[i], task: e.target.value };
                    setForm({ ...form, action_items: updated });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  placeholder="Task"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={a.assigned_to}
                    onChange={(e) => {
                      const updated = [...form.action_items];
                      updated[i] = { ...updated[i], assigned_to: e.target.value };
                      setForm({ ...form, action_items: updated });
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    placeholder="Assigned to"
                  />
                  <input
                    type="text"
                    value={a.deadline || ""}
                    onChange={(e) => {
                      const updated = [...form.action_items];
                      updated[i] = { ...updated[i], deadline: e.target.value || null };
                      setForm({ ...form, action_items: updated });
                    }}
                    className="w-36 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    placeholder="Deadline"
                  />
                  <button
                    onClick={() => setForm({ ...form, action_items: form.action_items.filter((_, j) => j !== i) })}
                    className="text-red-400 hover:text-red-600 text-lg px-1"
                  >×</button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setForm(form ? { ...form, action_items: [...form.action_items, { task: "", assigned_to: "", deadline: null }] } : form)}
              className="text-sm text-[#1e3a5f] hover:underline font-medium"
            >+ Add Action Item</button>
          </div>
        ) : (
          <div className="space-y-2">
            {data.action_items.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#c9a227] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{a.task}</p>
                  <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-gray-600">
                    <span className="bg-white border border-amber-300 px-2 py-0.5 rounded-full font-medium">{a.assigned_to}</span>
                    {a.deadline && <span>Due: {a.deadline}</span>}
                  </div>
                </div>
              </div>
            ))}
            {data.action_items.length === 0 && <p className="text-sm text-gray-500 italic">No action items</p>}
          </div>
        )}
      </div>

      {/* Previous Action Items */}
      {meeting.previous_action_items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h3 className="text-md font-bold text-gray-900 mb-3">
            Previous Meeting Action Items
          </h3>
          <div className="space-y-2">
            {meeting.previous_action_items.map((p, i) => {
              const isDone = p.status === "done";
              return (
                <div key={i} className={`flex items-center gap-3 rounded-md p-3 ${isDone ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                  {editing ? (
                    <button
                      onClick={() => {
                        if (!form) return;
                        const updated = [...form.previous_action_items];
                        updated[i] = { ...updated[i], status: isDone ? "pending" : "done" };
                        setForm({ ...form, previous_action_items: updated });
                      }}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isDone ? "bg-green-500 border-green-500 text-white" : "border-yellow-500 text-yellow-500"
                      }`}
                    >
                      {isDone ? "✓" : "!"}
                    </button>
                  ) : (
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-green-500 border-green-500 text-white" : "border-yellow-500 text-yellow-500"
                    }`}>
                      {isDone ? "✓" : "!"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{p.task}</p>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
                      <span>{p.assigned_to}</span>
                      {p.remarks && <span className="italic">— {p.remarks}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isDone ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {isDone ? "DONE" : "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
