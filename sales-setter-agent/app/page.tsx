"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Conversation } from "@elevenlabs/client";

type Status = "idle" | "connecting" | "connected" | "ended";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";

  // Draw the glowing circle with static lines
  const drawCircle = useCallback((speaking: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 80;
    const lineCount = 64;

    ctx.clearRect(0, 0, w, h);

    // Outer glow
    if (speaking) {
      const gradient = ctx.createRadialGradient(cx, cy, radius - 10, cx, cy, radius + 40);
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.15)");
      gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.08)");
      gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Static lines on circumference
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const lineLen = speaking
        ? 8 + Math.random() * 22
        : 4 + Math.random() * 6;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + lineLen);
      const y2 = cy + Math.sin(angle) * (radius + lineLen);

      ctx.strokeStyle = speaking
        ? `rgba(99, 102, 241, ${0.5 + Math.random() * 0.5})`
        : "rgba(160, 174, 192, 0.4)";
      ctx.lineWidth = speaking ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Main circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = speaking
      ? "rgba(99, 102, 241, 0.08)"
      : "rgba(241, 245, 249, 1)";
    ctx.fill();
    ctx.strokeStyle = speaking
      ? "rgba(99, 102, 241, 0.6)"
      : "rgba(203, 213, 225, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // "T" label inside circle
    ctx.fillStyle = speaking ? "#6366f1" : "#94a3b8";
    ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("T", cx, cy);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawCircle(isSpeaking);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSpeaking, drawCircle]);

  const startCall = useCallback(async () => {
    if (!agentId) {
      setError("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set");
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        textOnly: false,

        onConnect: () => {
          setStatus("connected");
        },
        onDisconnect: () => {
          setStatus("ended");
          setIsSpeaking(false);
        },
        onModeChange: (mode: { mode?: string }) => {
          setIsSpeaking(mode.mode === "speaking");
        },
        onError: (message: string) => {
          console.error("ElevenLabs error:", message);
          setError(message);
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("Call start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("idle");
    }
  }, [agentId]);

  const endCall = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setStatus("ended");
    setIsSpeaking(false);
  }, []);

  const isActive = status === "connected" || status === "connecting";

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <h1 style={styles.title}>Tiffany</h1>
        <p style={styles.subtitle}>Book Publishing Strategy Call</p>

        {/* Glowing circle */}
        <div style={styles.circleWrapper}>
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            style={styles.canvas}
          />
        </div>

        {/* Status text */}
        <p style={styles.statusText}>
          {status === "idle" && "Tap the mic to start"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" && (isSpeaking ? "Tiffany is speaking" : "Listening...")}
          {status === "ended" && "Call ended"}
        </p>

        {/* Error */}
        {error && <p style={styles.errorText}>{error}</p>}

        {/* Mic button */}
        <div style={styles.micWrapper}>
          {!isActive && (
            <button onClick={startCall} style={styles.micButton}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
          {isActive && (
            <button onClick={endCall} style={styles.endButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {status === "ended" && (
          <button onClick={() => setStatus("idle")} style={styles.resetLink}>
            Start new call
          </button>
        )}
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
    backgroundColor: "#f7f8fa",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    maxWidth: "400px",
    width: "100%",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "2px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    fontWeight: 500,
  },
  circleWrapper: {
    marginTop: "24px",
    marginBottom: "8px",
  },
  canvas: {
    display: "block",
  },
  statusText: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: 500,
    margin: "0 0 16px",
  },
  errorText: {
    fontSize: "13px",
    color: "#ef4444",
    margin: "0 0 8px",
    textAlign: "center" as const,
  },
  micWrapper: {
    display: "flex",
    justifyContent: "center",
  },
  micButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#1a1a2e",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 2px 12px rgba(26, 26, 46, 0.2)",
  },
  endButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 12px rgba(239, 68, 68, 0.3)",
  },
  resetLink: {
    marginTop: "8px",
    background: "none",
    border: "none",
    color: "#6366f1",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "underline",
  },
};
