"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GatewayBrowserClient,
  type GatewayEventFrame,
  type GatewayHelloOk,
} from "./gateway-client";
import { generateUUID } from "./uuid";

type EventListener = (evt: GatewayEventFrame) => void;

type GatewayContextValue = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  snapshot: unknown;
  sessionKey: string;
  assistantName: string;
  assistantAvatar: string | null;
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
  addEventListener: (event: string, listener: EventListener) => () => void;
};

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function useGateway(): GatewayContextValue {
  const ctx = useContext(GatewayContext);
  if (!ctx) {
    throw new Error("useGateway must be used within a GatewayProvider");
  }
  return ctx;
}

export function useGatewayEvent(event: string, listener: EventListener) {
  const { addEventListener } = useGateway();
  useEffect(() => {
    return addEventListener(event, listener);
  }, [addEventListener, event, listener]);
}

function resolveSessionKey(snapshot: unknown): string {
  if (
    snapshot &&
    typeof snapshot === "object" &&
    "sessionDefaults" in snapshot &&
    snapshot.sessionDefaults &&
    typeof snapshot.sessionDefaults === "object" &&
    "mainSessionKey" in snapshot.sessionDefaults &&
    typeof snapshot.sessionDefaults.mainSessionKey === "string"
  ) {
    return snapshot.sessionDefaults.mainSessionKey;
  }
  return "main";
}

type GatewayProviderProps = {
  gatewayUrl: string;
  gatewayToken: string;
  children: ReactNode;
};

export function GatewayProvider({ gatewayUrl, gatewayToken, children }: GatewayProviderProps) {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const [sessionKey, setSessionKey] = useState("main");
  const clientRef = useRef<GatewayBrowserClient | null>(null);
  const listenersRef = useRef(new Map<string, Set<EventListener>>());
  const instanceId = useRef(generateUUID());

  const [assistantName] = useState("Assistant");
  const [assistantAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!gatewayUrl || !gatewayToken) return;

    // Convert HTTP(S) endpoint to WSS.
    // Always use wss:// when served over HTTPS (mixed content blocked by browsers).
    let wsUrl = gatewayUrl;
    const useSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (wsUrl.startsWith('https://')) {
      wsUrl = 'wss://' + wsUrl.slice('https://'.length);
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = (useSecure ? 'wss://' : 'ws://') + wsUrl.slice('http://'.length);
    } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = (useSecure ? 'wss://' : 'ws://') + wsUrl;
    }

    console.log("[gateway-context] connecting to", wsUrl, "token?", !!gatewayToken);

    const client = new GatewayBrowserClient({
      url: wsUrl,
      token: gatewayToken,
      instanceId: instanceId.current,
      onHello: (hello: GatewayHelloOk) => {
        console.log("[gateway-context] connected!", hello.server);
        setConnected(true);
        setSnapshot(hello.snapshot ?? null);
        setSessionKey(resolveSessionKey(hello.snapshot));
      },
      onEvent: (evt: GatewayEventFrame) => {
        const listeners = listenersRef.current.get(evt.event);
        if (listeners) {
          for (const fn of listeners) {
            try { fn(evt); } catch (err) { console.error("[gateway-context] listener error:", err); }
          }
        }
        const wildcardListeners = listenersRef.current.get("*");
        if (wildcardListeners) {
          for (const fn of wildcardListeners) {
            try { fn(evt); } catch (err) { console.error("[gateway-context] wildcard listener error:", err); }
          }
        }
      },
      onClose: () => {
        setConnected(false);
      },
    });

    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, [gatewayUrl, gatewayToken]);

  const request = useCallback(<T = unknown,>(method: string, params?: unknown): Promise<T> => {
    if (!clientRef.current) {
      return Promise.reject(new Error("gateway not initialized"));
    }
    return clientRef.current.request<T>(method, params);
  }, []);

  const addEventListener = useCallback((event: string, listener: EventListener): (() => void) => {
    const map = listenersRef.current;
    if (!map.has(event)) {
      map.set(event, new Set());
    }
    map.get(event)!.add(listener);
    return () => {
      map.get(event)?.delete(listener);
      if (map.get(event)?.size === 0) {
        map.delete(event);
      }
    };
  }, []);

  const value: GatewayContextValue = {
    client: clientRef.current,
    connected,
    snapshot,
    sessionKey,
    assistantName,
    assistantAvatar,
    request,
    addEventListener,
  };

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}
