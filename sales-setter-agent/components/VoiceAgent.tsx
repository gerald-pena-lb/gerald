"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const addTranscriptEntry = useCallback(
    (role: "agent" | "prospect", text: string) => {
      setTranscript((prev) => {
        // Merge consecutive entries from the same role
        if (prev.length > 0 && prev[prev.length - 1].role === role) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: updated[updated.length - 1].text + " " + text,
          };
          return updated;
        }
        return [...prev, { role, text, timestamp: Date.now() }];
      });
    },
    []
  );

  const handleToolCall = useCallback(
    async (toolName: string, args: string, callId: string) => {
      if (toolName === "book_strategy_call") {
        try {
          const parsedArgs = JSON.parse(args);
          const response = await fetch("/api/calendly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedArgs),
          });
          const result = await response.json();

          if (result.scheduling_url) {
            setSchedulingUrl(result.scheduling_url);
          }

          // Send tool result back to the agent via data channel
          if (dcRef.current?.readyState === "open") {
            dcRef.current.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify({
                    success: true,
                    message: result.message,
                    scheduling_url: result.scheduling_url,
                  }),
                },
              })
            );
            // Trigger agent to respond after tool result
            dcRef.current.send(
              JSON.stringify({ type: "response.create" })
            );
          }
        } catch (err) {
          console.error("Tool call error:", err);
          if (dcRef.current?.readyState === "open") {
            dcRef.current.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify({
                    success: false,
                    message:
                      "There was an issue with the booking system. Please ask the prospect for their email and let them know we will send the scheduling link shortly.",
                  }),
                },
              })
            );
            dcRef.current.send(
              JSON.stringify({ type: "response.create" })
            );
          }
        }
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
      // 1. Get ephemeral session token from our backend
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
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error("No ephemeral key received from session endpoint");
      }

      // 2. Set up WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up remote audio playback
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // Get user microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 3. Set up data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      // Track function call accumulation
      const pendingToolCalls: Record<
        string,
        { name: string; args: string; callId: string }
      > = {};

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "response.audio_transcript.delta":
              if (msg.delta) {
                addTranscriptEntry("agent", msg.delta);
              }
              break;

            case "conversation.item.input_audio_transcription.completed":
              if (msg.transcript) {
                addTranscriptEntry("prospect", msg.transcript);
              }
              break;

            case "response.audio.started":
              setIsAgentSpeaking(true);
              break;

            case "response.audio.done":
            case "response.done":
              setIsAgentSpeaking(false);
              break;

            case "response.function_call_arguments.delta":
              if (msg.call_id) {
                if (!pendingToolCalls[msg.call_id]) {
                  pendingToolCalls[msg.call_id] = {
                    name: msg.name || "",
                    args: "",
                    callId: msg.call_id,
                  };
                }
                if (msg.name) {
                  pendingToolCalls[msg.call_id].name = msg.name;
                }
                if (msg.delta) {
                  pendingToolCalls[msg.call_id].args += msg.delta;
                }
              }
              break;

            case "response.function_call_arguments.done":
              if (msg.call_id && pendingToolCalls[msg.call_id]) {
                const tool = pendingToolCalls[msg.call_id];
                handleToolCall(tool.name, tool.args, tool.callId);
                delete pendingToolCalls[msg.call_id];
              }
              break;

            case "error":
              console.error("Realtime API error:", msg.error);
              if (msg.error?.message) {
                setError(msg.error.message);
              }
              break;
          }
        } catch (err) {
          console.error("Failed to parse data channel message:", err);
        }
      };

      dc.onopen = () => {
        setCallState(CALL_STATES.CONNECTED);
        // Trigger the initial greeting
        dc.send(JSON.stringify({ type: "response.create" }));
      };

      // 4. Create and set local SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 5. Send offer to OpenAI Realtime API
      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("Failed to establish WebRTC connection with OpenAI");
      }

      // 6. Set remote SDP answer
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      console.error("Call start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setCallState(CALL_STATES.ERROR);
    }
  }, [prospectName, teammateName, addTranscriptEntry, handleToolCall]);

  const endCall = useCallback(() => {
    // Close data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Close peer connection and stop all tracks
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) sender.track.stop();
      });
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
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
          <button
            onClick={() => setError(null)}
            style={styles.errorDismiss}
          >
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
