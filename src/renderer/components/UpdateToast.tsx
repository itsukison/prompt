import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePromptOS } from '../contexts/PromptOSContext';
import type { UpdateInfo, UpdateProgress, UpdateError } from '../types/promptos';

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'downloading'; info: UpdateInfo }
  | { kind: 'progress'; info: UpdateInfo; percent: number }
  | { kind: 'preparing'; info: UpdateInfo }
  | { kind: 'ready'; info: UpdateInfo }
  | { kind: 'error'; message: string };

export function UpdateToast() {
  const promptOS = usePromptOS();
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  // Track the latest version so progress events can reference it even if
  // update:available fires before this component has mounted
  const versionRef = useRef<string | null>(null);

  const handleAvailable = useCallback((info: UpdateInfo) => {
    versionRef.current = info.version;
    setState({ kind: 'downloading', info });
    setDismissed(false);
  }, []);

  const handleProgress = useCallback((data: UpdateProgress) => {
    const version = data.version ?? versionRef.current ?? '';
    const syntheticInfo: UpdateInfo = { version };
    setState(prev => {
      const info = prev.kind !== 'idle' && prev.kind !== 'error'
        ? (prev as { info: UpdateInfo }).info
        : syntheticInfo;
      if (data.percent >= 100) {
        return { kind: 'preparing', info };
      }
      return { kind: 'progress', info, percent: Math.floor(data.percent) };
    });
  }, []);

  const handleReady = useCallback((info: UpdateInfo) => {
    versionRef.current = info.version;
    setState({ kind: 'ready', info });
    setDismissed(false);
  }, []);

  const handleError = useCallback((data: UpdateError) => {
    setState({ kind: 'error', message: data.message });
    setDismissed(false);
  }, []);

  useEffect(() => {
    const cleanupAvailable = promptOS.update.onAvailable(handleAvailable);
    const cleanupProgress = promptOS.update.onProgress(handleProgress);
    const cleanupReady = promptOS.update.onReady(handleReady);
    const cleanupError = promptOS.update.onError(handleError);
    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupReady();
      cleanupError();
    };
  }, [promptOS, handleAvailable, handleProgress, handleReady, handleError]);

  const handleInstall = useCallback(() => {
    promptOS.update.install();
  }, [promptOS]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (state.kind === 'idle' || dismissed) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-72 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="bg-claude-sidebar border border-zinc-800/50 rounded-xl p-4 shadow-xl shadow-black/40">
        {state.kind === 'downloading' && (
          <DownloadingView version={state.info.version} percent={null} onDismiss={handleDismiss} />
        )}
        {state.kind === 'progress' && (
          <DownloadingView version={state.info.version} percent={state.percent} onDismiss={handleDismiss} />
        )}
        {state.kind === 'preparing' && (
          <PreparingView version={state.info.version} onDismiss={handleDismiss} />
        )}
        {state.kind === 'ready' && (
          <ReadyView version={state.info.version} onInstall={handleInstall} onDismiss={handleDismiss} />
        )}
        {state.kind === 'error' && (
          <ErrorView message={state.message} onDismiss={handleDismiss} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function ToastHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
      {label}
    </p>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-3 h-[2px] w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full bg-zinc-400 rounded-full transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface DownloadingViewProps {
  version: string;
  percent: number | null;
  onDismiss: () => void;
}

function DownloadingView({ version, percent, onDismiss }: DownloadingViewProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <ToastHeader label="Update available" />
          <p className="text-sm font-medium text-zinc-200">v{version}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {percent !== null ? `Downloading… ${percent}%` : 'Starting download…'}
          </p>
        </div>
        <DismissButton onClick={onDismiss} />
      </div>
      {percent !== null && <ProgressBar percent={percent} />}
    </>
  );
}

interface PreparingViewProps {
  version: string;
  onDismiss: () => void;
}

function PreparingView({ version, onDismiss }: PreparingViewProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <ToastHeader label="Update available" />
        <p className="text-sm font-medium text-zinc-200">v{version}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Preparing update…</p>
      </div>
      <DismissButton onClick={onDismiss} />
    </div>
  );
}

interface ReadyViewProps {
  version: string;
  onInstall: () => void;
  onDismiss: () => void;
}

function ReadyView({ version, onInstall, onDismiss }: ReadyViewProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <ToastHeader label="Update ready" />
          <p className="text-sm font-medium text-zinc-200">v{version} is ready to install</p>
          <p className="text-xs text-zinc-500 mt-0.5">The app will restart to apply the update.</p>
        </div>
        <DismissButton onClick={onDismiss} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onInstall}
          className="flex-1 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-medium text-zinc-100 transition-colors duration-150"
        >
          Restart &amp; Update
        </button>
        <button
          onClick={onDismiss}
          className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors duration-150"
        >
          Later
        </button>
      </div>
    </>
  );
}

interface ErrorViewProps {
  message: string;
  onDismiss: () => void;
}

function ErrorView({ message, onDismiss }: ErrorViewProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <ToastHeader label="Update failed" />
        <p className="text-xs text-zinc-500 mt-0.5 truncate" title={message}>
          {message}
        </p>
      </div>
      <DismissButton onClick={onDismiss} />
    </div>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Dismiss"
      className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors duration-150"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
