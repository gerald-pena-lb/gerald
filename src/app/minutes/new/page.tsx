"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface Summary {
  title: string | null;
  meeting_date: string | null;
  location: string | null;
  participants: Participant[];
  updates: Update[];
  action_items: ActionItem[];
  previous_action_items: PreviousActionItem[];
}

const LOADING_PHRASES = [
  "Binabasa ko yung minutes, brod...",
  "Teka lang, sine-summarize ko pa...",
  "Sinusuri ko yung notes mo, brod...",
  "Hintay lang, ini-identify ko pa yung action items...",
];

export default function NewMinutesPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(0);

  async function handleSummarize() {
    if (!rawText.trim()) return;
    setProcessing(true);
    setError("");
    setSummary(null);
    setLoadingIdx(0);

    const interval = setInterval(() => {
      setLoadingIdx((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);

    try {
      const res = await fetch("/api/minutes/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Summarization failed");
      }
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(interval);
      setProcessing(false);
    }
  }

  async function handleSave() {
    if (!summary) return;
    setSaving(true);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          ...summary,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/minutes/${data.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Inline edit helpers
  function updateField<K extends keyof Summary>(key: K, value: Summary[K]) {
    if (summary) setSummary({ ...summary, [key]: value });
  }

  function updateParticipant(idx: number, field: keyof Participant, value: string) {
    if (!summary) return;
    const updated = [...summary.participants];
    updated[idx] = { ...updated[idx], [field]: value || null };
    setSummary({ ...summary, participants: updated });
  }

  function removeParticipant(idx: number) {
    if (!summary) return;
    setSummary({ ...summary, participants: summary.participants.filter((_, i) => i !== idx) });
  }

  function addParticipant() {
    if (!summary) return;
    setSummary({ ...summary, participants: [...summary.participants, { name: "", role: null }] });
  }

  function updateUpdate(idx: number, field: keyof Update, value: string) {
    if (!summary) return;
    const updated = [...summary.updates];
    updated[idx] = { ...updated[idx], [field]: value || null } as Update;
    setSummary({ ...summary, updates: updated });
  }

  function removeUpdate(idx: number) {
    if (!summary) return;
    setSummary({ ...summary, updates: summary.updates.filter((_, i) => i !== idx) });
  }

  function addUpdate() {
    if (!summary) return;
    setSummary({ ...summary, updates: [...summary.updates, { topic: "", details: "", by: null }] });
  }

  function updateActionItem(idx: number, field: keyof ActionItem, value: string) {
    if (!summary) return;
    const updated = [...summary.action_items];
    updated[idx] = { ...updated[idx], [field]: value || null } as ActionItem;
    setSummary({ ...summary, action_items: updated });
  }

  function removeActionItem(idx: number) {
    if (!summary) return;
    setSummary({ ...summary, action_items: summary.action_items.filter((_, i) => i !== idx) });
  }

  function addActionItem() {
    if (!summary) return;
    setSummary({ ...summary, action_items: [...summary.action_items, { task: "", assigned_to: "", deadline: null }] });
  }

  function updatePrevItem(idx: number, field: keyof PreviousActionItem, value: string) {
    if (!summary) return;
    const updated = [...summary.previous_action_items];
    updated[idx] = { ...updated[idx], [field]: value } as PreviousActionItem;
    setSummary({ ...summary, previous_action_items: updated });
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Meeting Minutes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste your raw meeting notes below and let AI extract the structured summary.
        </p>
      </div>

      {/* Step 1: Raw Text Input */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Raw Meeting Text
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your meeting notes, transcript, or minutes here... e.g.&#10;&#10;Meeting last March 15, 2026 at Brod Jun's house.&#10;Present: Brod Gerald, Brod Jun, Brod Mark, Brod Rico&#10;&#10;Updates:&#10;- Gerald reported that the alumni database is now live&#10;- Jun mentioned the upcoming reunion on April&#10;&#10;Action items:&#10;- Gerald will add the minutes feature by next week&#10;- Jun to confirm the venue for April reunion&#10;- Mark to collect dues from batch Delta"
          rows={12}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
          disabled={processing}
        />

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSummarize}
            disabled={!rawText.trim() || processing}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-md text-sm font-medium hover:bg-[#152c4a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : summary ? "Re-summarize" : "Summarize with AI"}
          </button>
        </div>

        {processing && (
          <div className="mt-4 flex items-center gap-3 bg-blue-50 rounded-md p-3">
            <div className="animate-spin w-5 h-5 border-2 border-[#1e3a5f] border-t-transparent rounded-full flex-shrink-0" />
            <span className="text-sm text-[#1e3a5f] italic">{LOADING_PHRASES[loadingIdx]}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 rounded-md p-3 text-sm">{error}</div>
        )}
      </div>

      {/* Step 2: Editable Summary */}
      {summary && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-sm font-bold">AI</span>
              Summary Preview
            </h2>
            <p className="text-xs text-gray-500 mb-4">Review and edit the AI-generated summary below before saving.</p>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={summary.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {/* Date & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={summary.meeting_date || ""}
                  onChange={(e) => updateField("meeting_date", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={summary.location || ""}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-bold text-gray-900">Participants ({summary.participants.length})</h3>
              <button onClick={addParticipant} className="text-sm text-[#1e3a5f] hover:underline font-medium">+ Add</button>
            </div>
            {summary.participants.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No participants identified</p>
            ) : (
              <div className="space-y-2">
                {summary.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateParticipant(i, "name", e.target.value)}
                      placeholder="Name"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={p.role || ""}
                      onChange={(e) => updateParticipant(i, "role", e.target.value)}
                      placeholder="Role (optional)"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    />
                    <button onClick={() => removeParticipant(i)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Updates / Discussion */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-bold text-gray-900">Updates & Discussion ({summary.updates.length})</h3>
              <button onClick={addUpdate} className="text-sm text-[#1e3a5f] hover:underline font-medium">+ Add</button>
            </div>
            {summary.updates.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No updates identified</p>
            ) : (
              <div className="space-y-4">
                {summary.updates.map((u, i) => (
                  <div key={i} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={u.topic}
                        onChange={(e) => updateUpdate(i, "topic", e.target.value)}
                        placeholder="Topic"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium"
                      />
                      <input
                        type="text"
                        value={u.by || ""}
                        onChange={(e) => updateUpdate(i, "by", e.target.value)}
                        placeholder="Reported by"
                        className="w-40 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                      />
                      <button onClick={() => removeUpdate(i)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
                    </div>
                    <textarea
                      value={u.details}
                      onChange={(e) => updateUpdate(i, "details", e.target.value)}
                      placeholder="Details..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-bold text-gray-900">Action Items ({summary.action_items.length})</h3>
              <button onClick={addActionItem} className="text-sm text-[#1e3a5f] hover:underline font-medium">+ Add</button>
            </div>
            {summary.action_items.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No action items identified</p>
            ) : (
              <div className="space-y-2">
                {summary.action_items.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 border border-gray-200 rounded-md p-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={a.task}
                        onChange={(e) => updateActionItem(i, "task", e.target.value)}
                        placeholder="Task description"
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={a.assigned_to}
                            onChange={(e) => updateActionItem(i, "assigned_to", e.target.value)}
                            placeholder="Assigned to"
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div className="w-36">
                          <input
                            type="text"
                            value={a.deadline || ""}
                            onChange={(e) => updateActionItem(i, "deadline", e.target.value)}
                            placeholder="Deadline"
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeActionItem(i)} className="text-red-400 hover:text-red-600 text-lg px-2 pt-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Action Items */}
          {summary.previous_action_items.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-md font-bold text-gray-900 mb-3">
                Previous Action Items ({summary.previous_action_items.length})
              </h3>
              <div className="space-y-2">
                {summary.previous_action_items.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-md p-3">
                    <button
                      onClick={() => updatePrevItem(i, "status", p.status === "done" ? "pending" : "done")}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                        p.status === "done"
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-yellow-500 text-yellow-500"
                      }`}
                    >
                      {p.status === "done" ? "✓" : "!"}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${p.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {p.task}
                      </p>
                      <p className="text-xs text-gray-500">
                        Assigned: {p.assigned_to}
                        {p.remarks && <span className="ml-2 italic">— {p.remarks}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              onClick={() => { setSummary(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
            >
              Discard Summary
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#c9a227] text-white rounded-md text-sm font-bold hover:bg-[#b8921f] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Minutes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
