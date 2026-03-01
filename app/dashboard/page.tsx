'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { GatewayProvider } from '@/lib/gateway-context';
import { useGateway } from '@/lib/gateway-context';
import { useTtsPlayer } from '@/lib/use-tts-player';
import { useVoiceInput } from '@/lib/use-voice-input';
import { Header } from '@/components/Header';
import { ChatView } from '@/components/ChatView';
import { StatusBar } from '@/components/StatusBar';
import { ExecApprovalDialog } from '@/components/ExecApprovalDialog';
import type { InstanceResponse } from '@/lib/types';

const POLL_INTERVAL = 3000;

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, loading, fetchInstance, logout } = useAuth();
  const [instance, setInstance] = useState<InstanceResponse | null>(null);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    pollInstance();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [loading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pollInstance() {
    setPolling(true);
    setError('');
    try {
      const inst = await fetchInstance();
      if (inst) {
        setInstance(inst);
        setPolling(false);
      } else {
        pollingRef.current = setTimeout(pollInstance, POLL_INTERVAL);
      }
    } catch {
      setError('Failed to connect to workspace');
      setPolling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button onClick={pollInstance} className="text-blue-400 underline hover:text-blue-300">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (polling || !instance) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p>Setting up your workspace…</p>
            <p className="text-sm text-gray-500">This usually takes just a few seconds.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GatewayProvider gatewayUrl={instance.endpoint} gatewayToken={instance.gateway_token}>
      <AwarePanel onLogout={logout} />
    </GatewayProvider>
  );
}

function AwarePanel({ onLogout }: { onLogout: () => void }) {
  const { connected, assistantName, request } = useGateway();
  const tts = useTtsPlayer();
  const [active, setActive] = useState(false);
  const sendTextRef = useRef<((text: string) => void) | null>(null);

  const handleTranscript = useCallback((text: string) => {
    sendTextRef.current?.(text);
  }, []);

  const voice = useVoiceInput(handleTranscript, request);

  const captureSendText = useCallback((fn: (text: string) => void) => {
    sendTextRef.current = fn;
  }, []);

  return (
    <div className="aware-viewport">
      <div className="aware-panel">
        <Header
          assistantName={assistantName}
          active={active}
          ttsEnabled={tts.enabled}
          onToggleTts={tts.toggle}
          onLogout={onLogout}
        />
        <ChatView
          onActiveChange={setActive}
          recording={voice.recording}
          transcribing={voice.transcribing}
          onRecordingStart={voice.start}
          onRecordingStop={voice.stop}
          onSendTextReady={captureSendText}
        />
        <StatusBar connected={connected} />
        <ExecApprovalDialog />
      </div>
    </div>
  );
}
