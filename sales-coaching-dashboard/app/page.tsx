"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ─── */
interface Call {
  id: string;
  date: string;
  fileName: string;
  prospectName: string;
  callDate: string;
  analysis: AnalysisResult | null;
  outcome: string;
}

interface Agent {
  id: string;
  name: string;
  calls: Call[];
  createdAt: string;
}

interface AppData {
  agents: Agent[];
}

interface AnalysisCategory {
  name: string;
  score: number;
  maxScore: number;
  assessment: string;
  transcriptQuote?: string;
  transcriptContext?: string;
  feedback?: string;
  suggestion?: string;
}

interface AnalysisResult {
  overallScore: number;
  maxScore: number;
  summary: string;
  categories: AnalysisCategory[];
  coachingFlags?: string[];
  coaching: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ─── Constants ─── */
const COLORS = {
  primary: "#4f46e5",
  primaryLight: "#e0e7ff",
  green: "#059669",
  greenLight: "#d1fae5",
  red: "#dc2626",
  redLight: "#fee2e2",
  yellow: "#d97706",
  yellowLight: "#fef3c7",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  bg: "#f3f4f6",
  white: "#ffffff",
  border: "#e5e7eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
};

const OUTCOMES = [
  { key: "booked", label: "Booked", color: COLORS.blue, bg: COLORS.blueLight },
  { key: "closed", label: "Closed", color: COLORS.green, bg: COLORS.greenLight },
  { key: "no-show", label: "No-Show", color: COLORS.yellow, bg: COLORS.yellowLight },
  { key: "not-interested", label: "Not Interested", color: COLORS.red, bg: COLORS.redLight },
  { key: "callback", label: "Callback", color: COLORS.primary, bg: COLORS.primaryLight },
];


/* ─── Helpers ─── */

function pct(score: number, max: number): number {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

function getWeekRange(weekStr: string) {
  const [year, week] = weekStr.split("-W").map(Number);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const start = new Date(jan1);
  start.setDate(jan1.getDate() + (week - 1) * 7 - dayOfWeek + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function filterCalls(calls: Call[], weekFilter: string): Call[] {
  if (!weekFilter) return calls;
  const { start, end } = getWeekRange(weekFilter);
  return calls.filter((c) => {
    const d = new Date(c.date);
    return d >= start && d <= end;
  });
}

function scoreColor(pct: number) {
  if (pct >= 0.7) return COLORS.green;
  if (pct >= 0.4) return COLORS.yellow;
  return COLORS.red;
}

/* Stage-specific pass thresholds from the QA checklist */
const STAGE_THRESHOLDS: Record<number, { green: number; amber: number }> = {
  10: { green: 7, amber: 5 },   // Connect (7/10), Situation (7/10)
  14: { green: 10, amber: 7 },  // Problem (10/14), Consequence (10/14)
  8:  { green: 6, amber: 4 },   // Open Wallet Test (6/8)
  37: { green: 27, amber: 20 }, // Book the Call / Closing & Commitment (27/37)
};

/* Override for Book the Call which has a higher pass threshold */
function getStageThresholds(maxScore: number, name: string): { green: number; amber: number } {
  if (name.includes("Book") || name.includes("Stage 6") || name.includes("Closing")) return { green: 27, amber: 20 };
  return STAGE_THRESHOLDS[maxScore] || { green: Math.ceil(maxScore * 0.7), amber: Math.ceil(maxScore * 0.5) };
}

function stageStatus(cat: AnalysisCategory): "green" | "amber" | "red" {
  const t = getStageThresholds(cat.maxScore, cat.name);
  if (cat.score >= t.green) return "green";
  if (cat.score >= t.amber) return "amber";
  return "red";
}

function overallScoreColor(pct: number): string {
  if (pct >= 0.9) return COLORS.green;
  if (pct >= 0.8) return COLORS.yellow;
  return COLORS.red;
}

/* ─── Components ─── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: COLORS.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${COLORS.border}`, flex: "1 1 160px", minWidth: 140 }}>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, height = 8 }: { value: number; max: number; height?: number }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <div style={{ background: "#e5e7eb", borderRadius: height / 2, height, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", borderRadius: height / 2, background: scoreColor(pct), transition: "width 0.3s" }} />
    </div>
  );
}

function ScoreRing({ score, max, useOverallColor }: { score: number; max: number; useOverallColor?: boolean }) {
  const pct = max > 0 ? score / max : 0;
  const pctDisplay = Math.round(pct * 100);
  const color = useOverallColor ? overallScoreColor(pct) : scoreColor(pct);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct);
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.5s" }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700" fill={color}>{pctDisplay}%</text>
    </svg>
  );
}

function TranscriptContext({ context }: { context: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!context) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: 12, color: COLORS.primary, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{ display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>&#9654;</span>
        {expanded ? "Hide transcript context" : "Show transcript context"}
      </button>
      {expanded && (
        <div style={{
          marginTop: 8, padding: 12, background: "#f9fafb", border: `1px solid ${COLORS.border}`,
          borderRadius: 6, fontSize: 12, lineHeight: 1.7, color: COLORS.textPrimary,
          whiteSpace: "pre-wrap", fontFamily: "monospace",
        }}>
          {context}
        </div>
      )}
    </div>
  );
}

function StageFeedbackCard({ cat }: { cat: AnalysisCategory }) {
  const status = stageStatus(cat);
  const t = getStageThresholds(cat.maxScore, cat.name);
  const isRed = status === "red";
  const isAmber = status === "amber";
  const isGreen = status === "green";
  const color = isGreen ? COLORS.green : isAmber ? COLORS.yellow : COLORS.red;

  const borderColor = isRed ? COLORS.red : isAmber ? COLORS.yellow : COLORS.green;
  const statusLabel = isRed ? "Needs Work" : isAmber ? "Almost There" : "Pass";
  const statusBg = isRed ? COLORS.redLight : isAmber ? COLORS.yellowLight : COLORS.greenLight;
  const statusTextColor = isRed ? "#991b1b" : isAmber ? "#92400e" : "#065f46";
  const thresholdNote = isRed ? `Need ${t.green} to pass` : isAmber ? `Need ${t.green - cat.score} more to pass` : "";

  return (
    <div style={{ borderLeft: `4px solid ${borderColor}`, borderRadius: 8, padding: 16, marginBottom: 12, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderLeftColor: borderColor, borderLeftWidth: 4 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
        <span style={{ fontWeight: 700, color, fontSize: 14 }}>{pct(cat.score, cat.maxScore)}%</span>
        <span style={{ background: statusBg, color: statusTextColor, fontSize: 11, padding: "2px 10px", borderRadius: 12, fontWeight: 700 }}>
          {statusLabel}
        </span>
        {thresholdNote && <span style={{ fontSize: 11, color: COLORS.textSecondary, fontStyle: "italic" }}>{thresholdNote}</span>}
      </div>

      <ProgressBar value={cat.score} max={cat.maxScore} />
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8, marginBottom: 10 }}>{cat.assessment}</div>

      {/* Transcript quote */}
      {cat.transcriptQuote && (
        <div style={{
          background: isGreen ? COLORS.greenLight : isAmber ? COLORS.yellowLight : COLORS.redLight,
          padding: 12, borderRadius: 6, fontStyle: "italic", fontSize: 13, marginBottom: 8,
          color: isGreen ? "#065f46" : isAmber ? "#92400e" : "#991b1b",
        }}>
          {isGreen ? "What worked: " : "From the call: "}&ldquo;{cat.transcriptQuote}&rdquo;
        </div>
      )}

      {/* Feedback */}
      {cat.feedback && (
        <div style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.6, marginBottom: 8 }}>
          {cat.feedback}
        </div>
      )}

      {/* Suggestion for red/amber */}
      {cat.suggestion && (
        <div style={{ background: COLORS.blueLight, padding: 12, borderRadius: 6, fontSize: 13, color: "#1e40af" }}>
          <strong>Try this:</strong> &ldquo;{cat.suggestion}&rdquo;
        </div>
      )}

      {/* Expandable transcript context */}
      <TranscriptContext context={cat.transcriptContext || ""} />
    </div>
  );
}

function AnalysisReport({ analysis }: { analysis: AnalysisResult }) {
  const cats = analysis.categories || [];
  const redStages = cats.filter((c) => stageStatus(c) === "red");
  const amberStages = cats.filter((c) => stageStatus(c) === "amber");
  const greenStages = cats.filter((c) => stageStatus(c) === "green");

  return (
    <div style={{ marginTop: 16 }}>
      {/* Overall Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <ScoreRing score={analysis.overallScore} max={analysis.maxScore} useOverallColor />
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Overall NEPQ Score</div>
          <div style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{analysis.summary}</div>
        </div>
      </div>

      {/* Category Score Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {cats.map((cat, i) => {
          const s = stageStatus(cat);
          const stageColor = s === "green" ? COLORS.green : s === "amber" ? COLORS.yellow : COLORS.red;
          return (
            <div key={i} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                <span style={{ fontWeight: 700, color: stageColor, fontSize: 14 }}>{pct(cat.score, cat.maxScore)}%</span>
              </div>
              <ProgressBar value={cat.score} max={cat.maxScore} />
              <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8 }}>{cat.assessment}</div>
            </div>
          );
        })}
      </div>

      {/* Red Stages — Critical Issues */}
      {redStages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: COLORS.red }}>Critical — Needs Immediate Coaching</h3>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>These stages are well below the pass threshold. Focus coaching here first.</div>
          {redStages.map((cat, i) => <StageFeedbackCard key={i} cat={cat} />)}
        </div>
      )}

      {/* Amber Stages — Improvement Areas */}
      {amberStages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: COLORS.yellow }}>Almost There — Close to Passing</h3>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>These stages are close to the pass threshold but need refinement.</div>
          {amberStages.map((cat, i) => <StageFeedbackCard key={i} cat={cat} />)}
        </div>
      )}

      {/* Green Stages — What Worked Well */}
      {greenStages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: COLORS.green }}>Strong — What Worked Well</h3>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>These stages met or exceeded the pass threshold. Keep it up.</div>
          {greenStages.map((cat, i) => <StageFeedbackCard key={i} cat={cat} />)}
        </div>
      )}

      {/* Coaching Flags */}
      {analysis.coachingFlags && analysis.coachingFlags.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.red, marginTop: 0, marginBottom: 10 }}>Automatic Coaching Flags</h3>
          {analysis.coachingFlags.map((flag, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14, color: "#991b1b" }}>
              <span style={{ fontSize: 16 }}>&#9888;</span>
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Coaching */}
      {analysis.coaching && (
        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginTop: 0, marginBottom: 8 }}>NEPQ Coaching Recommendation</h3>
          <div style={{ fontSize: 14, color: "#3730a3", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{analysis.coaching}</div>
        </div>
      )}
    </div>
  );
}

/* ─── PDF Download ─── */
async function downloadPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2pdf = (await import("html2pdf.js" as any)).default;
  html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    })
    .from(element)
    .save();
}

/* ─── AI Assistant Widget ─── */
function AssistantWidget({ data }: { data: AppData }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function buildContext(): string {
    const lines: string[] = [];
    data.agents.forEach((agent) => {
      const calls = agent.calls;
      const total = calls.length;
      const booked = calls.filter((c) => c.outcome === "booked").length;
      const closed = calls.filter((c) => c.outcome === "closed").length;
      const noShow = calls.filter((c) => c.outcome === "no-show").length;
      lines.push(`\nAgent: ${agent.name} (${total} calls, ${booked} booked, ${closed} closed, ${noShow} no-shows)`);
      calls.forEach((call) => {
        const a = call.analysis;
        if (!a) return;
        const prospect = call.prospectName || "Unknown";
        const date = call.callDate || call.date;
        const stages = (a.categories || []).map((c) => `${c.name}: ${pct(c.score, c.maxScore)}%`).join(", ");
        const flags = (a.coachingFlags || []).join("; ") || "None";
        lines.push(`  Call: ${prospect} (${date}) | Score: ${pct(a.overallScore, a.maxScore)}% | Outcome: ${call.outcome || "pending"}`);
        lines.push(`    Stages: ${stages}`);
        lines.push(`    Flags: ${flags}`);
      });
    });
    return lines.join("\n");
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: buildContext() }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${json.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to reach assistant." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          width: 56, height: 56, borderRadius: "50%",
          background: COLORS.primary, color: COLORS.white, border: "none",
          fontSize: 24, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="AI Assistant"
      >
        &#128172;
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 380, zIndex: 2000,
      background: COLORS.white, borderLeft: `1px solid ${COLORS.border}`,
      display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: COLORS.primary,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.white }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Ask about agent performance, scores, trends</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", color: COLORS.white, fontSize: 22, cursor: "pointer", padding: "0 4px" }}
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: COLORS.textSecondary, marginTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#128172;</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ask me anything</div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              &ldquo;How is Sarah performing this week?&rdquo;<br />
              &ldquo;Which agent has the best close rate?&rdquo;<br />
              &ldquo;What are the most common coaching flags?&rdquo;
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? COLORS.primary : "#f3f4f6",
              color: msg.role === "user" ? COLORS.white : COLORS.textPrimary,
              fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#f3f4f6", fontSize: 13, color: COLORS.textSecondary }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask a question..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
            fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 16px", borderRadius: 8, border: "none",
            background: input.trim() && !loading ? COLORS.primary : "#c7d2fe",
            color: COLORS.white, fontWeight: 600, fontSize: 13, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function Page() {
  const [data, setData] = useState<AppData>({ agents: [] });
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState("");
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [analyzingCalls, setAnalyzingCalls] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const json = await res.json();
      if (res.ok) {
        setData({ agents: json.agents });
      } else {
        console.error("API error:", json);
        alert("Failed to load agents: " + (json.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      alert("Failed to connect to API: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedAgent = data.agents.find((a) => a.id === selectedAgentId) || null;

  /* ─── Agent Actions ─── */
  async function addAgent() {
    const name = prompt("Enter agent name:");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => ({ agents: [...prev.agents, json.agent] }));
      }
    } catch (err) {
      alert("Failed to add agent: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function removeAgent(id: string) {
    if (!confirm("Remove this agent and all their calls?")) return;
    try {
      await fetch(`/api/agents?id=${id}`, { method: "DELETE" });
      setData((prev) => ({ agents: prev.agents.filter((a) => a.id !== id) }));
      if (selectedAgentId === id) setSelectedAgentId(null);
    } catch (err) {
      alert("Failed to remove agent: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  /* ─── Call Actions ─── */
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [prospectName, setProspectName] = useState("");
  const [callDate, setCallDate] = useState("");

  async function saveCallToDb(agentId: string, fileName: string, analysis: AnalysisResult, pName?: string, cDate?: string): Promise<Call | null> {
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, fileName, analysis, prospectName: pName || "", callDate: cDate || "" }),
      });
      const json = await res.json();
      if (res.ok) return json.call;
    } catch (err) {
      console.error("Failed to save call:", err);
    }
    return null;
  }

  function addCallToState(agentId: string, call: Call) {
    setData((prev) => ({
      agents: prev.agents.map((a) =>
        a.id === agentId ? { ...a, calls: [...a.calls, call] } : a
      ),
    }));
  }

  function validateCallInfo(): boolean {
    if (!prospectName.trim()) {
      alert("Please enter the prospect name before uploading.");
      return false;
    }
    if (!callDate) {
      alert("Please select the date of call before uploading.");
      return false;
    }
    return true;
  }

  async function processFiles(files: File[], agentId: string) {
    if (!validateCallInfo()) return;
    const pName = prospectName.trim();
    const cDate = callDate;
    setAnalyzingCalls((p) => ({ ...p, [agentId]: true }));
    try {
      for (const file of files) {
        const text = await file.text();
        if (!text?.trim()) continue;
        const analysis = await analyzeTranscript(text);
        const call = await saveCallToDb(agentId, file.name, analysis, pName, cDate);
        if (call) addCallToState(agentId, call);
      }
      setProspectName("");
      setCallDate("");
    } catch (err) {
      alert("Analysis failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setAnalyzingCalls((p) => ({ ...p, [agentId]: false }));
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedAgent || !e.target.files) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;
    processFiles(files, selectedAgent.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!selectedAgent) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    processFiles(files, selectedAgent.id);
  }

  async function handlePasteSubmit() {
    if (!selectedAgent || !pasteText.trim()) return;
    if (!validateCallInfo()) return;
    const agentId = selectedAgent.id;
    const text = pasteText.trim();
    const pName = prospectName.trim();
    const cDate = callDate;
    setPasteText("");
    setShowPaste(false);
    setAnalyzingCalls((p) => ({ ...p, [agentId]: true }));
    try {
      const analysis = await analyzeTranscript(text);
      const fileName = `Pasted ${new Date().toLocaleString()}`;
      const call = await saveCallToDb(agentId, fileName, analysis, pName, cDate);
      if (call) addCallToState(agentId, call);
      setProspectName("");
      setCallDate("");
    } catch (err) {
      alert("Analysis failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setAnalyzingCalls((p) => ({ ...p, [agentId]: false }));
    }
  }

  async function setOutcome(agentId: string, callId: string, outcome: string) {
    const agent = data.agents.find((a) => a.id === agentId);
    const call = agent?.calls.find((c) => c.id === callId);
    const newOutcome = call?.outcome === outcome ? "" : outcome;

    // Optimistic update
    setData((prev) => ({
      agents: prev.agents.map((a) =>
        a.id === agentId
          ? { ...a, calls: a.calls.map((c) => (c.id === callId ? { ...c, outcome: newOutcome } : c)) }
          : a
      ),
    }));

    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: callId, outcome: newOutcome }),
      });
    } catch (err) {
      console.error("Failed to update outcome:", err);
    }
  }

  async function deleteCall(agentId: string, callId: string) {
    if (!confirm("Delete this call?")) return;
    try {
      await fetch(`/api/calls?id=${callId}`, { method: "DELETE" });
      setData((prev) => ({
        agents: prev.agents.map((a) =>
          a.id === agentId ? { ...a, calls: a.calls.filter((c) => c.id !== callId) } : a
        ),
      }));
    } catch (err) {
      alert("Failed to delete call: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function analyzeTranscript(transcript: string): Promise<AnalysisResult> {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "API error");
    return resData.analysis;
  }

  /* ─── Computed Stats ─── */
  function agentStats(agent: Agent) {
    const calls = filterCalls(agent.calls, weekFilter);
    const total = calls.length;
    const booked = calls.filter((c) => c.outcome === "booked").length;
    const closed = calls.filter((c) => c.outcome === "closed").length;
    const noShow = calls.filter((c) => c.outcome === "no-show").length;
    const closeRate = total > 0 ? closed / total : 0;
    const bookToClose = booked > 0 ? closed / booked : 0;
    return { total, booked, closed, noShow, closeRate, bookToClose };
  }

  function globalStats() {
    let total = 0, booked = 0, closed = 0;
    data.agents.forEach((a) => {
      const s = agentStats(a);
      total += s.total;
      booked += s.booked;
      closed += s.closed;
    });
    const bookToClose = booked > 0 ? closed / booked : 0;
    return { total, booked, closed, bookToClose };
  }

  const gStats = globalStats();

  /* ─── Styles ─── */
  const btnStyle: React.CSSProperties = {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  };

  const btnSmall: React.CSSProperties = {
    ...btnStyle,
    padding: "5px 12px",
    fontSize: 12,
    borderRadius: 6,
  };

  const linkBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    color: COLORS.red,
    cursor: "pointer",
    fontSize: 12,
    textDecoration: "underline",
    padding: 0,
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: COLORS.bg }}>
        <div style={{ textAlign: "center", color: COLORS.textSecondary }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg }}>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1001,
          background: COLORS.primary,
          color: COLORS.white,
          border: "none",
          borderRadius: 8,
          width: 40,
          height: 40,
          fontSize: 20,
          cursor: "pointer",
          ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "flex", alignItems: "center", justifyContent: "center" } : {}),
        }}
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: COLORS.white,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : undefined,
          bottom: 0,
          zIndex: 1000,
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: COLORS.primary, marginBottom: 4, cursor: "pointer" }} onClick={() => setSelectedAgentId(null)}>
          Sales Coach
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 }}>NEPQ Call Analysis</div>

        <button onClick={() => setSelectedAgentId(null)} style={{ ...btnStyle, width: "100%", marginBottom: 8, background: !selectedAgentId ? COLORS.primary : COLORS.white, color: !selectedAgentId ? COLORS.white : COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}>
          Dashboard
        </button>

        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 }}>Agents</div>

        {data.agents.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 2,
              background: selectedAgentId === a.id ? COLORS.primaryLight : "transparent",
              fontWeight: selectedAgentId === a.id ? 600 : 400,
            }}
            onClick={() => { setSelectedAgentId(a.id); setSidebarOpen(false); }}
          >
            <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeAgent(a.id); }}
              style={{ background: "none", border: "none", color: COLORS.textSecondary, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
              title="Remove agent"
            >
              &times;
            </button>
          </div>
        ))}

        <button onClick={addAgent} style={{ ...btnStyle, width: "100%", marginTop: 12, background: COLORS.white, color: COLORS.primary, border: `2px dashed ${COLORS.primary}` }}>
          + Add Agent
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 260, padding: "32px 40px", maxWidth: 1100 }}>
        {/* Week Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Filter by week:</label>
          <input
            type="week"
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}
          />
          <button onClick={() => setWeekFilter("")} style={{ ...btnSmall, background: weekFilter ? COLORS.white : COLORS.primary, color: weekFilter ? COLORS.textPrimary : COLORS.white, border: `1px solid ${COLORS.border}` }}>
            All Time
          </button>
        </div>

        {!selectedAgent ? (
          /* ─── Dashboard View ─── */
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, marginTop: 0 }}>Dashboard</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              <StatCard label="Total Calls" value={gStats.total} />
              <StatCard label="Booked" value={gStats.booked} />
              <StatCard label="Closed" value={gStats.closed} />
              <StatCard label="Book-to-Close %" value={`${(gStats.bookToClose * 100).toFixed(0)}%`} />
            </div>

            {data.agents.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: COLORS.textSecondary }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#128101;</div>
                <div style={{ fontSize: 16 }}>No agents yet. Add one from the sidebar.</div>
              </div>
            ) : (
              <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Agent", "Calls", "Booked", "Closed", "No-Show", "Close Rate", "Progress"].map((h) => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents.map((a) => {
                      const s = agentStats(a);
                      return (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: "12px 16px" }}>
                            <span onClick={() => setSelectedAgentId(a.id)} style={{ color: COLORS.primary, cursor: "pointer", fontWeight: 600 }}>
                              {a.name}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>{s.total}</td>
                          <td style={{ padding: "12px 16px" }}>{s.booked}</td>
                          <td style={{ padding: "12px 16px" }}>{s.closed}</td>
                          <td style={{ padding: "12px 16px" }}>{s.noShow}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: scoreColor(s.closeRate) === COLORS.green ? COLORS.greenLight : scoreColor(s.closeRate) === COLORS.yellow ? COLORS.yellowLight : COLORS.redLight, color: scoreColor(s.closeRate) }}>
                              {(s.closeRate * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", minWidth: 100 }}>
                            <ProgressBar value={s.closeRate * 100} max={100} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ─── Agent Profile View ─── */
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, marginTop: 0 }}>{selectedAgent.name}</h1>

            {/* Agent Stat Cards */}
            {(() => {
              const s = agentStats(selectedAgent);
              return (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <StatCard label="Total Calls" value={s.total} />
                    <StatCard label="Booked" value={s.booked} />
                    <StatCard label="Closed" value={s.closed} />
                    <StatCard label="Book-to-Close %" value={`${(s.bookToClose * 100).toFixed(0)}%`} />
                    <StatCard label="No-Show" value={s.noShow} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Close Rate</span>
                    <div style={{ flex: 1, maxWidth: 300 }}>
                      <ProgressBar value={s.closeRate * 100} max={100} height={10} />
                    </div>
                    <span style={{ fontWeight: 700, color: scoreColor(s.closeRate), fontSize: 14 }}>
                      {(s.closeRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </>
              );
            })()}

            {/* Upload Area */}
            <div style={{ marginBottom: 24 }}>
              {/* Prospect Info Fields */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>Prospect Name *</label>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Enter prospect name"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>Date of Call *</label>
                  <input
                    type="date"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? COLORS.primary : "#c7d2fe"}`,
                  borderRadius: 12,
                  padding: 28,
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#e0e7ff" : COLORS.primaryLight,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>&#128196;</div>
                <div style={{ fontWeight: 600, color: COLORS.primary, fontSize: 14 }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Supports .txt, .md, .csv, .json</div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.text" multiple onChange={handleFileUpload} style={{ display: "none" }} />
              </div>

              <div style={{ textAlign: "center", margin: "12px 0", fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>OR</div>

              {!showPaste ? (
                <button
                  onClick={() => setShowPaste(true)}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    background: COLORS.white,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.primary,
                  }}
                >
                  &#9998; Paste transcript text
                </button>
              ) : (
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", background: COLORS.white }}>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your transcript here..."
                    style={{
                      width: "100%",
                      minHeight: 150,
                      padding: 16,
                      border: "none",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.6,
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 12px", borderTop: `1px solid ${COLORS.border}`, background: "#f9fafb" }}>
                    <button
                      onClick={() => { setShowPaste(false); setPasteText(""); }}
                      style={{ padding: "8px 16px", border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.white, cursor: "pointer", fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim()}
                      style={{
                        padding: "8px 20px",
                        border: "none",
                        borderRadius: 8,
                        background: pasteText.trim() ? COLORS.primary : "#c7d2fe",
                        color: COLORS.white,
                        cursor: pasteText.trim() ? "pointer" : "not-allowed",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Analyze & Add
                    </button>
                  </div>
                </div>
              )}
              {selectedAgent && analyzingCalls[selectedAgent.id] && (
                <div style={{ marginTop: 12, padding: 16, background: "#fef3c7", borderRadius: 10, textAlign: "center", fontWeight: 600, fontSize: 14, color: "#92400e" }}>
                  Analyzing transcript... this may take a moment.
                </div>
              )}
            </div>

            {/* Calls List */}
            {filterCalls(selectedAgent.calls, weekFilter)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((call) => (
                <div key={call.id} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <div>
                      {call.prospectName && <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{call.prospectName}</div>}
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{call.fileName}</div>
                      <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {call.callDate ? `Call date: ${new Date(call.callDate + "T00:00:00").toLocaleDateString()}` : new Date(call.date).toLocaleDateString()}{" "}
                        &middot; Uploaded {new Date(call.date).toLocaleDateString()} {new Date(call.date).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {call.analysis && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: overallScoreColor(call.analysis.maxScore > 0 ? call.analysis.overallScore / call.analysis.maxScore : 0) }}>
                            {pct(call.analysis.overallScore, call.analysis.maxScore)}%
                          </div>
                        </div>
                      )}
                      <button onClick={() => deleteCall(selectedAgent.id, call.id)} style={linkBtn}>Delete</button>
                    </div>
                  </div>

                  {/* Outcome Pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => setOutcome(selectedAgent.id, call.id, o.key)}
                        style={{
                          padding: "4px 14px",
                          borderRadius: 20,
                          border: `1.5px solid ${o.color}`,
                          background: call.outcome === o.key ? o.bg : "transparent",
                          color: o.color,
                          fontWeight: call.outcome === o.key ? 700 : 500,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {call.analysis && (
                      <button onClick={() => setExpandedAnalysis((p) => ({ ...p, [call.id]: !p[call.id] }))} style={btnSmall}>
                        {expandedAnalysis[call.id] ? "Hide" : "Show"} Analysis
                      </button>
                    )}
                    {call.analysis && (
                      <button
                        onClick={() => downloadPdf(`analysis-${call.id}`, `${call.prospectName || "Call"}-Analysis.pdf`)}
                        style={{ ...btnSmall, background: COLORS.white, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}
                      >
                        Download PDF
                      </button>
                    )}
                  </div>

                  {/* Analysis */}
                  {expandedAnalysis[call.id] && call.analysis && (
                    <div id={`analysis-${call.id}`}>
                      <div style={{ padding: "16px 0 8px 0", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{call.prospectName || call.fileName}</div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                          {call.callDate ? `Call date: ${new Date(call.callDate + "T00:00:00").toLocaleDateString()}` : ""} | Agent: {selectedAgent.name}
                        </div>
                      </div>
                      <AnalysisReport analysis={call.analysis} />
                    </div>
                  )}
                </div>
              ))}

            {filterCalls(selectedAgent.calls, weekFilter).length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textSecondary }}>No calls yet. Upload a transcript above.</div>
            )}
          </>
        )}
      </main>

      {/* AI Assistant Widget */}
      <AssistantWidget data={data} />

      {/* Mobile responsive style */}
      <style>{`
        @media (max-width: 768px) {
          aside { position: fixed !important; transform: translateX(${sidebarOpen ? "0" : "-100%"}); transition: transform 0.2s; }
          main { margin-left: 0 !important; padding: 20px 16px !important; padding-top: 60px !important; }
          button[style*="display: none"] { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
