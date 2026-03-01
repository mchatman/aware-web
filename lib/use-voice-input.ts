"use client";

import { useCallback, useRef, useState } from "react";

type RequestFn = <T = unknown>(method: string, params?: unknown) => Promise<T>;

/**
 * Encode an ArrayBuffer to base64 without spreading — safe for large buffers.
 * The spread approach `btoa(String.fromCharCode(...new Uint8Array(buf)))` throws
 * RangeError for buffers larger than ~65 KB due to max function argument limits.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KB chunks — well within call-stack limits
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function useVoiceInput(
  onTranscript: (text: string) => void,
  request: RequestFn,
) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer audio/webm;codecs=opus if supported, fall back to default
      const preferredMime = "audio/webm;codecs=opus";
      const mimeType = MediaRecorder.isTypeSupported(preferredMime)
        ? preferredMime
        : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks so the mic indicator goes away
        for (const track of stream.getTracks()) track.stop();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const arrayBuf = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuf);

          // Race the request against a timeout so the UI never gets stuck
          // on "Transcribing..." if the gateway is slow or unresponsive.
          const TRANSCRIBE_TIMEOUT_MS = 30_000;
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("transcription timed out")), TRANSCRIBE_TIMEOUT_MS),
          );
          const res = await Promise.race([
            request<{ text: string }>("audio.transcribe", {
              audio: base64,
              mimeType: recorder.mimeType,
            }),
            timeout,
          ]);
          const text = res?.text?.trim();
          if (text) {
            onTranscript(text);
          } else {
            console.warn("[voice] transcription returned empty text");
          }
        } catch (err) {
          console.error("[voice] transcription failed:", err);
        } finally {
          setTranscribing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("[voice] getUserMedia failed:", err);
    }
  }, [onTranscript, request]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setRecording(false);
  }, []);

  return { recording, transcribing, start, stop };
}
