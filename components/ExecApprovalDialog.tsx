"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGateway, useGatewayEvent } from "@/lib/gateway-context";
import type { GatewayEventFrame } from "@/lib/gateway-client";

type ExecApprovalRequestPayload = {
  command: string;
  cwd?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  agentId?: string | null;
  resolvedPath?: string | null;
  sessionKey?: string | null;
};

type ExecApprovalEntry = {
  id: string;
  request: ExecApprovalRequestPayload;
  createdAtMs: number;
  expiresAtMs: number;
};

function parseExecApprovalRequested(payload: unknown): ExecApprovalEntry | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const request = p.request;
  if (!id || !request || typeof request !== "object") return null;
  const r = request as Record<string, unknown>;
  const command = typeof r.command === "string" ? r.command.trim() : "";
  if (!command) return null;
  const createdAtMs = typeof p.createdAtMs === "number" ? p.createdAtMs : 0;
  const expiresAtMs = typeof p.expiresAtMs === "number" ? p.expiresAtMs : 0;
  if (!createdAtMs || !expiresAtMs) return null;
  return {
    id,
    request: {
      command,
      cwd: typeof r.cwd === "string" ? r.cwd : null,
      host: typeof r.host === "string" ? r.host : null,
      security: typeof r.security === "string" ? r.security : null,
      ask: typeof r.ask === "string" ? r.ask : null,
      agentId: typeof r.agentId === "string" ? r.agentId : null,
      resolvedPath: typeof r.resolvedPath === "string" ? r.resolvedPath : null,
      sessionKey: typeof r.sessionKey === "string" ? r.sessionKey : null,
    },
    createdAtMs,
    expiresAtMs,
  };
}

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function ExecApprovalDialog() {
  const { request } = useGateway();
  const [queue, setQueue] = useState<ExecApprovalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Prune expired entries and tick countdown
  useEffect(() => {
    if (queue.length === 0) {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setQueue((prev) => prev.filter((e) => e.expiresAtMs > Date.now()));
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [queue.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequested = useCallback((evt: GatewayEventFrame) => {
    const entry = parseExecApprovalRequested(evt.payload);
    if (!entry) return;
    setQueue((prev) => {
      const pruned = prev.filter((e) => e.expiresAtMs > Date.now() && e.id !== entry.id);
      return [...pruned, entry];
    });
  }, []);

  const handleResolved = useCallback((evt: GatewayEventFrame) => {
    const payload = evt.payload as Record<string, unknown> | undefined;
    const id = typeof payload?.id === "string" ? payload.id : "";
    if (id) {
      setQueue((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  useGatewayEvent("exec.approval.requested", handleRequested);
  useGatewayEvent("exec.approval.resolved", handleResolved);

  const resolve = useCallback(
    (decision: string) => {
      const active = queue[0];
      if (!active) return;
      setBusy(true);
      setError(null);
      request("exec.approval.resolve", {
        id: active.id,
        decision,
      })
        .then(() => {
          setQueue((prev) => prev.filter((e) => e.id !== active.id));
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to resolve");
        })
        .finally(() => setBusy(false));
    },
    [queue, request],
  );

  const active = queue[0];
  if (!active) return null;

  const remainingMs = active.expiresAtMs - Date.now();
  const remaining = remainingMs > 0 ? `expires in ${formatRemaining(remainingMs)}` : "expired";

  return (
    <div className="exec-overlay" role="dialog" aria-live="polite">
      <div className="exec-card">
        <div className="exec-header">
          <div>
            <div className="exec-title">Exec approval needed</div>
            <div className="exec-sub">{remaining}</div>
          </div>
          {queue.length > 1 && (
            <div className="exec-queue-badge">{queue.length} pending</div>
          )}
        </div>
        <div className="exec-command">{active.request.command}</div>
        <div className="exec-meta">
          {active.request.host && (
            <MetaRow label="Host" value={active.request.host} />
          )}
          {active.request.cwd && (
            <MetaRow label="CWD" value={active.request.cwd} />
          )}
          {active.request.agentId && (
            <MetaRow label="Agent" value={active.request.agentId} />
          )}
          {active.request.resolvedPath && (
            <MetaRow label="Resolved" value={active.request.resolvedPath} />
          )}
        </div>
        {error && <div className="exec-error">{error}</div>}
        <div className="exec-actions">
          <button
            className="exec-btn exec-btn--primary"
            disabled={busy}
            onClick={() => resolve("allow-once")}
          >
            Allow once
          </button>
          <button
            className="exec-btn"
            disabled={busy}
            onClick={() => resolve("allow-always")}
          >
            Always allow
          </button>
          <button
            className="exec-btn exec-btn--danger"
            disabled={busy}
            onClick={() => resolve("deny")}
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="exec-meta-row">
      <span className="exec-meta-label">{label}</span>
      <span className="exec-meta-value">{value}</span>
    </div>
  );
}
