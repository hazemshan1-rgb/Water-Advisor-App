"use client";

import { useState } from "react";
import type { Analysis, DiagnosisResult } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function ChatPanel({ analysis, diagnosis }: { analysis: Analysis; diagnosis: DiagnosisResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        body: JSON.stringify({ mode: "chat", analysis, diagnosis, userMessage }),
      });
      const body = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: body.reply }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 space-y-3">
      <h2 className="font-semibold">Ask about this diagnosis</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="inline-block bg-slate-100 rounded px-2 py-1 text-sm">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a follow-up question..."
        />
        <button className="bg-slate-900 text-white rounded px-3 py-1" onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
