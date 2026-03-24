"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const UBAG_ICON = "https://lh5.googleusercontent.com/swiXiaqSWjfVRdkMPqn4zLc4yXpbs-vg-99-87VSXPpmfofHi8QPLVx7mEJ7aapCXG81UY7bIOGo7oNFPoMRaMZOpNPxXIz90AlFzU8TE8nBIrwXwYQ2MOE2Ix58PQ0hJk2s80c0v0-04HnweA";

const LOADING_PHRASES = [
  "Teka brod, isipin ko muna...",
  "Skaler brod, nagiisip ako...",
  "Yosi ka muna, wait lang...",
  "Ningit ka muna sa eyabab sa dokil habang nagiisip ako...",
];

export default function UbagWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionsExecuted, setActionsExecuted] = useState<string[]>([]);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Cycle through loading phrases every 3 seconds while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingIdx((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setLoadingIdx(0);
    setActionsExecuted([]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages([...newMessages, { role: "assistant", content: `Dehins yan brod: ${err.error || "may problema"}` }]);
        return;
      }

      const data = await res.json();
      // Strip action blocks from display text
      const displayText = data.reply
        .replace(/```action\n[\s\S]*?```/g, "")
        .trim();

      setMessages([...newMessages, { role: "assistant", content: displayText }]);
      if (data.actions_executed?.length > 0) {
        setActionsExecuted(data.actions_executed);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Dehins yan brod, parang walang connection. Try mo ulit!" }]);
    } finally {
      setLoading(false);
    }
  }

  function formatMessage(text: string) {
    // Basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:scale-105 transition-all z-50 flex items-center justify-center overflow-hidden"
        title="Chat with Ubag"
      >
        {open ? (
          <div className="w-full h-full bg-[#1e3a5f] flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <img src={UBAG_ICON} alt="Ubag" className="w-full h-full object-cover" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 h-[calc(100vh-8rem)] sm:h-[32rem] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <img src={UBAG_ICON} alt="Ubag" className="w-8 h-8 rounded-full object-cover" />
            <div>
              <div className="font-semibold text-sm">Ubag</div>
              <div className="text-xs text-white/70">AI Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <img src={UBAG_ICON} alt="Ubag" className="w-12 h-12 rounded-full object-cover mx-auto mb-3" />
                <p className="font-medium text-gray-600">Orayt brod! Ako si Ubag!</p>
                <p className="mt-1">Ano bang kailangan mo brod? Pwede akong gumawa ng projects, magdagdag ng brods, at mag-organisa ng tasks. I-paste lang ang data mo o sabihin mo lang!</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            ))}

            {/* Action results */}
            {actionsExecuted.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                <div className="font-medium mb-1">Actions completed:</div>
                {actionsExecuted.map((result, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {result}
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-600 italic">
                  {LOADING_PHRASES[loadingIdx]}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-2 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Sabihin mo lang brod, ano kailangan mo..."
                rows={2}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#152c4a] disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
