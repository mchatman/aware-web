"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGatewayEvent } from "./gateway-context";
import type { GatewayEventFrame } from "./gateway-client";

const TTS_STORAGE_KEY = "aware.tts.enabled";

export function useTtsPlayer() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(TTS_STORAGE_KEY);
    return stored !== "false";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(TTS_STORAGE_KEY, String(next));
      if (!next && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return next;
    });
  }, []);

  const handleTts = useCallback(
    (evt: GatewayEventFrame) => {
      if (!enabled) return;
      const payload = evt.payload as Record<string, unknown> | undefined;
      if (!payload) return;

      const audio = typeof payload.audio === "string" ? payload.audio : "";
      const format = typeof payload.format === "string" ? payload.format : "mp3";
      if (!audio) return;

      // Decode base64 to Blob
      const binary = atob(audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
      const blob = new Blob([bytes], { type: mimeType });

      // Stop previous playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const el = new Audio(url);
      audioRef.current = el;
      el.play().catch((err) => {
        console.warn("[tts] playback failed:", err);
      });
    },
    [enabled],
  );

  useGatewayEvent("tts", handleTts);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  return { enabled, toggle };
}
