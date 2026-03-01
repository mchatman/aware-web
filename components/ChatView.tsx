"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGateway, useGatewayEvent } from "@/lib/gateway-context";
import type { GatewayEventFrame } from "@/lib/gateway-client";
import { generateUUID } from "@/lib/uuid";
import { ChatInput } from "./ChatInput";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

type StreamState = {
  text: string;
  startedAt: number;
} | null;

/**
 * Extract text from gateway chat event payload.
 * Gateway sends: { state, message: { role, content: [{ type: "text", text: "..." }] } }
 */
function extractMessageText(payload: Record<string, unknown>): string {
  // Try nested message.content[].text structure (gateway format)
  const message = payload.message;
  if (message && typeof message === "object") {
    const msg = message as Record<string, unknown>;
    const content = msg.content;
    if (Array.isArray(content)) {
      return content
        .filter(
          (block): block is { type: string; text: string } =>
            block &&
            typeof block === "object" &&
            "type" in block &&
            block.type === "text" &&
            typeof block.text === "string",
        )
        .map((block) => block.text)
        .join("");
    }
    // content might be a plain string
    if (typeof content === "string") return content;
  }
  // Fallback: direct text field
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.fullText === "string") return payload.fullText;
  return "";
}

export function ChatView({
  onActiveChange,
  onRecordingStart,
  onRecordingStop,
  recording,
  transcribing,
  onSendTextReady,
}: {
  onActiveChange: (active: boolean) => void;
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  recording: boolean;
  transcribing?: boolean;
  onSendTextReady?: (fn: (text: string) => void) => void;
}) {
  const { request, connected, sessionKey } = useGateway();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stream, setStream] = useState<StreamState>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const sendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load chat history
  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    request<{ messages?: unknown[] }>("chat.history", {
      sessionKey,
      limit: 200,
    })
      .then((res) => {
        if (res?.messages && Array.isArray(res.messages)) {
          const parsed = res.messages
            .map((m) => parseMessage(m))
            .filter((m): m is ChatMessage => m !== null);
          setMessages(parsed);
        }
      })
      .catch((err) => {
        console.error("[chat] failed to load history:", err);
      })
      .finally(() => setLoading(false));
  }, [connected, sessionKey, request]);

  // Safety timeout: clear "sending" state if no terminal event arrives.
  // This prevents the UI from getting permanently stuck if the gateway
  // drops the final/error event.
  const SENDING_TIMEOUT_MS = 120_000; // 2 minutes
  const clearSendingTimeout = useCallback(() => {
    if (sendingTimeoutRef.current) {
      clearTimeout(sendingTimeoutRef.current);
      sendingTimeoutRef.current = null;
    }
  }, []);
  const resetSendingTimeout = useCallback(() => {
    clearSendingTimeout();
    sendingTimeoutRef.current = setTimeout(() => {
      setSending(false);
      onActiveChange(false);
      setStream((prev) => {
        if (prev && prev.text.trim()) {
          setMessages((msgs) => [
            ...msgs,
            {
              id: generateUUID(),
              role: "assistant",
              content: prev.text,
              timestamp: Date.now(),
            },
          ]);
        }
        return null;
      });
    }, SENDING_TIMEOUT_MS);
  }, [clearSendingTimeout, onActiveChange]);

  // Handle chat events
  const handleChatEvent = useCallback(
    (evt: GatewayEventFrame) => {
      const payload = evt.payload as Record<string, unknown> | undefined;
      if (!payload) return;

      const state = payload.state as string | undefined;

      // Extract text from gateway's nested message structure:
      // { state, message: { role, content: [{ type: "text", text: "..." }] } }
      const text = extractMessageText(payload);

      if (state === "delta") {
        onActiveChange(true);
        setSending(true);
        // Reset timeout on activity
        resetSendingTimeout();
        // Gateway sends cumulative (full) text in each delta, not incremental.
        // Replace the stream text with the latest snapshot.
        setStream((prev) => ({
          text: text,
          startedAt: prev?.startedAt ?? Date.now(),
        }));
      } else if (state === "final") {
        clearSendingTimeout();
        onActiveChange(false);
        setSending(false);
        // For final, use the text from the message payload (already the complete text)
        const finalText = text;
        if (finalText) {
          setMessages((prev) => [
            ...prev,
            {
              id: (payload.messageId as string) ?? generateUUID(),
              role: "assistant",
              content: finalText,
              timestamp: Date.now(),
            },
          ]);
        }
        setStream(null);
      } else if (state === "error") {
        clearSendingTimeout();
        onActiveChange(false);
        setSending(false);
        const errMsg =
          typeof payload.errorMessage === "string"
            ? payload.errorMessage
            : typeof payload.error === "string"
              ? payload.error
              : "An error occurred";
        setMessages((prev) => [
          ...prev,
          {
            id: generateUUID(),
            role: "system",
            content: errMsg,
            timestamp: Date.now(),
          },
        ]);
        setStream(null);
      } else if (state === "aborted") {
        clearSendingTimeout();
        onActiveChange(false);
        setSending(false);
        // Finalize whatever was streamed
        setStream((prev) => {
          if (prev && prev.text.trim()) {
            setMessages((msgs) => [
              ...msgs,
              {
                id: generateUUID(),
                role: "assistant",
                content: prev.text + " [cancelled]",
                timestamp: Date.now(),
              },
            ]);
          }
          return null;
        });
      } else if (state === "reading") {
        onActiveChange(true);
        setSending(true);
      }
    },
    [onActiveChange, clearSendingTimeout, resetSendingTimeout],
  );

  useGatewayEvent("chat", handleChatEvent);

  // Clean up sending timeout on unmount
  useEffect(() => {
    return () => clearSendingTimeout();
  }, [clearSendingTimeout]);

  // Auto-scroll
  useEffect(() => {
    if (!autoScrollRef.current) return;
    const el = threadRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, stream]);

  const handleScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    autoScrollRef.current = atBottom;
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || !connected) return;
      const userMsg: ChatMessage = {
        id: generateUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      onActiveChange(true);
      resetSendingTimeout();
      request("chat.send", {
        sessionKey,
        message: text,
        idempotencyKey: generateUUID(),
      }).catch((err) => {
        console.error("[chat] send failed:", err);
        clearSendingTimeout();
        setSending(false);
        onActiveChange(false);
      });
    },
    [connected, sessionKey, request, onActiveChange, resetSendingTimeout, clearSendingTimeout],
  );

  // Expose handleSend to parent for voice input transcription
  useEffect(() => {
    onSendTextReady?.(handleSend);
  }, [onSendTextReady, handleSend]);

  const handleAbort = useCallback(() => {
    request("chat.abort", { sessionKey }).catch((err) => {
      console.error("[chat] abort failed:", err);
    });
  }, [request, sessionKey]);

  return (
    <div className="chat-container">
      <div className="chat-thread" ref={threadRef} onScroll={handleScroll}>
        {loading && (
          <div className="chat-loading">Loading chat...</div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {stream && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message__icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div className="chat-message__content">
              <span className="chat-message__text">{stream.text}</span>
              <span className="chat-cursor" />
            </div>
          </div>
        )}
        {sending && !stream && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message__icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div className="chat-message__content">
              <span className="chat-thinking-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
      </div>
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        sending={sending}
        connected={connected}
        recording={recording}
        transcribing={transcribing}
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`chat-message ${
        isUser
          ? "chat-message--user"
          : isSystem
            ? "chat-message--system"
            : "chat-message--assistant"
      }`}
    >
      {!isUser && !isSystem && (
        <div className="chat-message__icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
      )}
      <div className="chat-message__content">
        <span className="chat-message__text">{message.content}</span>
      </div>
    </div>
  );
}

function parseMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role.toLowerCase() : "";
  if (role !== "user" && role !== "assistant" && role !== "system") return null;

  // Content can be a string or an array of content blocks: [{ type: "text", text: "..." }]
  let content = "";
  if (typeof m.content === "string") {
    content = m.content;
  } else if (Array.isArray(m.content)) {
    content = (m.content as Array<Record<string, unknown>>)
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("");
  }
  if (!content) return null;

  const id =
    typeof m.id === "string"
      ? m.id
      : typeof m.messageId === "string"
        ? m.messageId
        : generateUUID();
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : Date.now();
  return { id, role: role as ChatMessage["role"], content, timestamp };
}
