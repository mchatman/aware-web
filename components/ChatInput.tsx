"use client";

import { useCallback, useRef, useState } from "react";

type ChatInputProps = {
  onSend: (text: string) => void;
  onAbort: () => void;
  sending: boolean;
  connected: boolean;
  recording: boolean;
  transcribing?: boolean;
  onRecordingStart: () => void;
  onRecordingStop: () => void;
};

export function ChatInput({
  onSend,
  onAbort,
  sending,
  connected,
  recording,
  transcribing,
  onRecordingStart,
  onRecordingStop,
}: ChatInputProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [draft, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (e.nativeEvent.isComposing) return;
      if (e.shiftKey) return; // allow Shift+Enter for line breaks
      if (!connected) return;
      e.preventDefault();
      if (sending) return;
      handleSend();
    },
    [connected, sending, handleSend],
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <div className="chat-input">
      <button
        className={`chat-input__mic ${recording ? "chat-input__mic--recording" : ""} ${transcribing ? "chat-input__mic--transcribing" : ""}`}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!transcribing) onRecordingStart();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onRecordingStop();
        }}
        onPointerLeave={() => {
          if (recording) onRecordingStop();
        }}
        disabled={!connected || transcribing}
        title={transcribing ? "Transcribing..." : "Hold to record voice"}
        aria-label="Voice input"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        {recording && <span className="chat-input__recording-pulse" />}
      </button>
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        value={draft}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={transcribing ? "Transcribing..." : connected ? "Type a message..." : "Connecting..."}
        disabled={!connected}
        rows={1}
      />
      {sending ? (
        <button
          className="chat-input__stop"
          onClick={onAbort}
          title="Stop"
          aria-label="Stop response"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          className="chat-input__send"
          onClick={handleSend}
          disabled={!connected || !draft.trim()}
          title="Send"
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      )}
    </div>
  );
}
