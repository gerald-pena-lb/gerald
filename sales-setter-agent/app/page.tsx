"use client";

import React, { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load ElevenLabs widget script
  useEffect(() => {
    if (document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://elevenlabs.io/convai-widget/index.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  // Render widget
  useEffect(() => {
    if (!ready || !widgetRef.current) return;

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) return;

    widgetRef.current.innerHTML = "";
    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", agentId);
    widgetRef.current.appendChild(widget);
  }, [ready]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Tiffany</h1>
          <p style={styles.subtitle}>Book Publishing Strategy Call</p>
        </div>

        <div style={styles.card}>
          <p style={styles.description}>
            Click the microphone button to start your conversation with Tiffany.
            She'll learn about your goals and help you explore the next steps
            toward publishing your book.
          </p>
          <div ref={widgetRef} style={styles.widgetArea} />
        </div>

        <div style={styles.infoPanel}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Stages</span>
            <span style={styles.infoValue}>
              Connect &rarr; Situation &rarr; Problem &rarr; Consequence &rarr;
              Wallet Test &rarr; Book Call
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Goal</span>
            <span style={styles.infoValue}>
              Book qualified prospect onto strategy call with Alinka
            </span>
          </div>
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
  container: {
    maxWidth: "520px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    textAlign: "center" as const,
  },
  description: {
    fontSize: "14px",
    color: "#718096",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  widgetArea: {
    display: "flex",
    justifyContent: "center",
    minHeight: "80px",
  },
  infoPanel: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  infoItem: {
    display: "flex",
    gap: "12px",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  infoLabel: {
    color: "#718096",
    fontWeight: 600,
    minWidth: "60px",
    flexShrink: 0,
  },
  infoValue: {
    color: "#4a5568",
  },
};
