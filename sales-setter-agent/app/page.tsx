"use client";

import React, { useState } from "react";

export default function HomePage() {
  const [prospectName, setProspectName] = useState("");
  const [teammateName, setTeammateName] = useState("");

  const handleStart = () => {
    if (!prospectName.trim() || !teammateName.trim()) return;
    const params = new URLSearchParams({
      prospect: prospectName.trim(),
      teammate: teammateName.trim(),
    });
    window.location.href = `/call/session?${params.toString()}`;
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Gerald</h1>
          <p style={styles.subtitle}>Sales Setter Voice Agent</p>
        </div>

        <div style={styles.form}>
          <p style={styles.description}>
            Enter the prospect and teammate details to start the voice call.
            The agent will follow the NEPQ framework to qualify the prospect
            and book a strategy call with Alinka.
          </p>

          <div style={styles.field}>
            <label style={styles.label}>Prospect Name</label>
            <input
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="e.g. John Smith"
              style={styles.input}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Teammate Name (LinkedIn outreach)</label>
            <input
              type="text"
              value={teammateName}
              onChange={(e) => setTeammateName(e.target.value)}
              placeholder="e.g. Sarah"
              style={styles.input}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!prospectName.trim() || !teammateName.trim()}
            style={{
              ...styles.button,
              ...(!prospectName.trim() || !teammateName.trim()
                ? styles.buttonDisabled
                : {}),
            }}
          >
            Start Voice Call
          </button>
        </div>

        <div style={styles.footer}>
          <h3 style={styles.footerTitle}>How it works</h3>
          <ol style={styles.steps}>
            <li>Your team connects with a prospect on LinkedIn</li>
            <li>Prospect books a call and lands here</li>
            <li>Gerald qualifies them using the NEPQ framework</li>
            <li>Qualified prospects get booked with Alinka on Calendly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  header: {
    padding: "32px 32px 0",
    textAlign: "center" as const,
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#718096",
    marginTop: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    fontWeight: 500,
  },
  form: {
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  description: {
    fontSize: "14px",
    color: "#718096",
    lineHeight: "1.6",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#4a5568",
  },
  input: {
    padding: "10px 14px",
    fontSize: "15px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s",
    color: "#1a202c",
  },
  button: {
    marginTop: "8px",
    padding: "12px 24px",
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e0",
    cursor: "not-allowed",
  },
  footer: {
    padding: "20px 32px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f7f8fa",
  },
  footerTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#4a5568",
    margin: "0 0 8px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  steps: {
    paddingLeft: "18px",
    margin: 0,
    fontSize: "13px",
    color: "#718096",
    lineHeight: "1.8",
  },
};
