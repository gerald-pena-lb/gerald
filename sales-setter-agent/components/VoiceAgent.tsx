"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Conversation } from "@elevenlabs/client";
import { CALL_STATES, type CallState } from "@/lib/constants";

interface VoiceAgentProps {
  prospectName: string;
  teammateName: string;
}

interface TranscriptEntry {
  role: "agent" | "prospect";
  text: string;
  timestamp: number;
}

export default function VoiceAgent({
  prospectName,
  teammateName,
}: VoiceAgentProps) {
  const [callState, setCallState] = useState<CallState>(CALL_STATES.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const addTranscriptEntry = useCallback(
    (role: "agent" | "prospect", text: string) => {
      setTranscript((prev) => [...prev, { role, text, timestamp: Date.now() }]);
    },
    []
  );

  const handleToolCall = useCallback(
    async (params: Record<string, unknown>): Promise<string> => {
      try {
        const response = await fetch("/api/calendly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const result = await response.json();

        if (result.scheduling_url) {
          setSchedulingUrl(result.scheduling_url);
        }

        return JSON.stringify({
          success: true,
          message: result.message,
          scheduling_url: result.scheduling_url,
          available_slots: result.available_slots,
        });
      } catch (err) {
        console.error("Tool call error:", err);
        return JSON.stringify({
          success: false,
          message:
            "There was an issue with the booking system. Please ask the prospect for their email and let them know we will send the scheduling link shortly.",
        });
      }
    },
    []
  );

  const startCall = useCallback(async () => {
    setCallState(CALL_STATES.CONNECTING);
    setError(null);
    setTranscript([]);
    setSchedulingUrl(null);

    try {
      // 1. Get signed URL from our backend
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectName, teammateName }),
      });

      if (!sessionRes.ok) {
        const errData = await sessionRes.json();
        throw new Error(errData.error || "Failed to create session");
      }

      const sessionData = await sessionRes.json();

      if (!sessionData.signedUrl) {
        throw new Error("No signed URL received from session endpoint");
      }

      // 2. Request microphone permission early
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Start ElevenLabs conversation
      const conversation = await Conversation.startSession({
        signedUrl: sessionData.signedUrl,

        // Inject prospect/teammate names via dynamic variables
        dynamicVariables: {
          prospect_name: prospectName,
          teammate_name: teammateName,
        },

        // Client-side tools (Calendly booking)
        clientTools: {
          book_strategy_call: async (parameters: Record<string, unknown>) => {
            return await handleToolCall(parameters);
          },
        },

        // Callbacks
        onConnect: () => {
          console.log("ElevenLabs: connected");
          setCallState(CALL_STATES.CONNECTED);
        },

        onDisconnect: (details: { reason: string; message?: string; context?: unknown }) => {
          console.error("ElevenLabs disconnected:", JSON.stringify(details));
          if (details.reason === "error") {
            setError(`Call disconnected: ${details.message || "Unknown error"}`);
          }
          setCallState(CALL_STATES.ENDED);
          setIsAgentSpeaking(false);
        },

        onMessage: (message: { source?: string; message?: string }) => {
          if (message.source === "ai" && message.message) {
            addTranscriptEntry("agent", message.message);
          } else if (message.source === "user" && message.message) {
            addTranscriptEntry("prospect", message.message);
          }
        },

        onModeChange: (mode: { mode?: string }) => {
          setIsAgentSpeaking(mode.mode === "speaking");
        },

        onError: (message: string, context?: unknown) => {
          console.error("ElevenLabs error:", message, context);
          setError(message);
        },

        onStatusChange: (status: { status?: string }) => {
          console.log("ElevenLabs status:", status.status);
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("Call start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setCallState(CALL_STATES.ERROR);
    }
  }, [prospectName, teammateName, addTranscriptEntry, handleToolCall]);

  const endCall = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setCallState(CALL_STATES.ENDED);
    setIsAgentSpeaking(false);
  }, []);

  return (
    <div style={styles.container}>
      {/* Call Controls */}
      <div style={styles.controlPanel}>
        <div style={styles.statusSection}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor:
                callState === CALL_STATES.CONNECTED
                  ? "#38a169"
                  : callState === CALL_STATES.CONNECTING
                  ? "#d69e2e"
                  : callState === CALL_STATES.ERROR
                  ? "#e53e3e"
                  : "#a0aec0",
              ...(isAgentSpeaking ? styles.statusDotPulse : {}),
            }}
          />
          <span style={styles.statusText}>
            {callState === CALL_STATES.IDLE && "Ready to connect"}
            {callState === CALL_STATES.CONNECTING && "Connecting..."}
            {callState === CALL_STATES.CONNECTED &&
              (isAgentSpeaking ? "Agent speaking..." : "Listening...")}
            {callState === CALL_STATES.ENDED && "Call ended"}
            {callState === CALL_STATES.ERROR && "Connection error"}
          </span>
        </div>

        <div style={styles.buttonGroup}>
          {(callState === CALL_STATES.IDLE ||
            callState === CALL_STATES.ERROR ||
            callState === CALL_STATES.ENDED) && (
            <button onClick={startCall} style={styles.startButton}>
              {callState === CALL_STATES.ENDED ? "Start New Call" : "Start Call"}
            </button>
          )}
          {(callState === CALL_STATES.CONNECTED ||
            callState === CALL_STATES.CONNECTING) && (
            <button onClick={endCall} style={styles.endButton}>
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {/* Scheduling URL */}
      {schedulingUrl && (
        <div style={styles.schedulingBanner}>
          <span>Strategy call link ready: </span>
          <a
            href={schedulingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.schedulingLink}
          >
            Book with Alinka
          </a>
        </div>
      )}

      {/* Transcript */}
      <div style={styles.transcriptContainer}>
        <h3 style={styles.transcriptTitle}>Live Transcript</h3>
        <div style={styles.transcriptScroll}>
          {transcript.length === 0 && callState !== CALL_STATES.CONNECTED && (
            <p style={styles.transcriptPlaceholder}>
              Transcript will appear here once the call begins.
            </p>
          )}
          {transcript.length === 0 && callState === CALL_STATES.CONNECTED && (
            <p style={styles.transcriptPlaceholder}>
              Waiting for conversation to begin...
            </p>
          )}
          {transcript.map((entry, i) => (
            <div
              key={i}
              style={{
                ...styles.transcriptEntry,
                ...(entry.role === "agent"
                  ? styles.agentEntry
                  : styles.prospectEntry),
              }}
            >
              <span style={styles.transcriptRole}>
                {entry.role === "agent" ? "Gerald" : prospectName}
              </span>
              <p style={styles.transcriptText}>{entry.text}</p>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
  },
  controlPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  statusSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    transition: "background-color 0.3s",
  },
  statusDotPulse: {
    boxShadow: "0 0 0 4px rgba(56, 161, 105, 0.2)",
  },
  statusText: {
    fontSize: "15px",
    color: "#4a5568",
    fontWeight: 500,
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  startButton: {
    padding: "10px 24px",
    backgroundColor: "#1a1a2e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  endButton: {
    padding: "10px 24px",
    backgroundColor: "#e53e3e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    fontSize: "14px",
  },
  errorDismiss: {
    background: "none",
    border: "none",
    color: "#c53030",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },
  schedulingBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#c6f6d5",
    color: "#276749",
    borderRadius: "8px",
    fontSize: "14px",
  },
  schedulingLink: {
    color: "#276749",
    fontWeight: 600,
    textDecoration: "underline",
  },
  transcriptContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  transcriptTitle: {
    padding: "16px 24px",
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "#4a5568",
    borderBottom: "1px solid #e2e8f0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  transcriptScroll: {
    padding: "16px 24px",
    maxHeight: "400px",
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  transcriptPlaceholder: {
    color: "#a0aec0",
    fontSize: "14px",
    textAlign: "center" as const,
    padding: "40px 0",
    margin: 0,
  },
  transcriptEntry: {
    padding: "10px 14px",
    borderRadius: "8px",
  },
  agentEntry: {
    backgroundColor: "#f7fafc",
    borderLeft: "3px solid #1a1a2e",
  },
  prospectEntry: {
    backgroundColor: "#fffaf0",
    borderLeft: "3px solid #d69e2e",
  },
  transcriptRole: {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#718096",
    display: "block",
    marginBottom: "4px",
  },
  transcriptText: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#2d3748",
    margin: 0,
  },
};
