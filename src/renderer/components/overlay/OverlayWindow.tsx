import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { useWindowEvents } from '../../hooks/useWindowEvents';
import { Button } from '@/components/ui/button';


// Hoist static SVGs outside component to avoid recreation
const ArrowUpIcon = (
  <div className="w-7 h-7 rounded-full bg-[#EA580C]/90 flex items-center justify-center shadow-md hover:bg-[#c2410c] transition-colors">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  </div>
);

const StopIcon = (
  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 hover:bg-zinc-700 transition-colors">
    <div className="w-2 h-2 bg-white rounded-[1px]" />
  </div>
);

export function OverlayWindow() {
  const promptOS = usePromptOS();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isGeneratingRef = useRef(false);
  const [retryStatus, setRetryStatus] = useState('');
  const [selectionContext, setSelectionContext] = useState('');

  // Derived state - no need for separate state
  const hasResult = !!result;
  const hasError = !!error;

  // Stable reset function using functional setState
  const handleReset = useCallback(() => {
    setPrompt('');
    setResult('');
    setError('');
    setRetryStatus('');
    setSelectionContext('');
  }, []);

  // Stable callbacks using refs to avoid re-subscription
  const handleWindowShown = useCallback((payload?: { selection?: string }) => {
    handleReset();
    if (payload?.selection) {
      setSelectionContext(payload.selection);
    }
    inputRef.current?.focus();
  }, [handleReset]);

  const handleWindowHidden = useCallback(() => {
    handleReset();
  }, [handleReset]);

  useWindowEvents(handleWindowShown, handleWindowHidden);

  // Listen for retry status updates
  useEffect(() => {
    // @ts-ignore
    if (window.promptOS && window.promptOS.onGenerationStatus) {
      // @ts-ignore
      return window.promptOS.onGenerationStatus((status) => {
        setRetryStatus(status);
      });
    }
  }, [promptOS]);

  // Listen for context updates (Refine Selection Enhancement)
  useEffect(() => {
    // @ts-ignore
    if (window.promptOS && window.promptOS.onContextUpdated) {
      // @ts-ignore
      return window.promptOS.onContextUpdated((payload) => {
        if (payload?.selection) {
          setSelectionContext(payload.selection);
          inputRef.current?.focus();
          // We intentionally do NOT reset prompt/result here to allow refining
        }
      });
    }
  }, [promptOS]);

  // Generate with stable reference
  const handleGenerate = useCallback(async () => {
    // Access latest prompt value directly
    const currentPrompt = inputRef.current?.value.trim() || '';

    // 1. Synchronous Lock Check
    if (!currentPrompt || isGeneratingRef.current) return;

    try {
      // Set lock and local state
      isGeneratingRef.current = true;
      setIsGenerating(true);
      setError('');
      setRetryStatus('');

      // Build prompt with text selection context
      let finalPrompt = currentPrompt;
      if (selectionContext) {
        finalPrompt = `Context:\n"""\n${selectionContext}\n"""\n\nUser Request:\n${currentPrompt}`;
      }

      // Check if visual context is needed — skip if text is already selected
      let includeScreenshot = false;
      if (!selectionContext) {
        try {
          const contextCheck = await promptOS.checkContextNeed(currentPrompt);
          includeScreenshot = contextCheck.needsContext;
          if (includeScreenshot) {
            console.log('[Overlay] Including screenshot (source:', contextCheck.source, ')');
            setRetryStatus('Capturing context...');
          }
        } catch {
          // Context check failed, continue without screenshot
          console.warn('[Overlay] Context check failed, continuing without screenshot');
        }
      }

      // Generate with optional screenshot
      const response = await promptOS.generate(finalPrompt, { includeScreenshot });

      if (response.success && response.text) {
        setResult(response.text);
      } else if (response.error === 'screen_recording_permission') {
        setError('screen_recording_permission');
      } else if (response.error === 'Cancelled') {
        // User cancelled, do nothing or show toast (optional)
        console.log('Generation cancelled by user');
      } else {
        setError(response.error || 'Failed to generate text');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      // 2. GUARANTEED UNLOCK
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setRetryStatus('');
    }
  }, [promptOS, selectionContext]);

  const handleStop = useCallback(async () => {
    if (!isGeneratingRef.current) return;
    // We don't manually set isGenerating(false) here, we let the handleGenerate finally block do it
    // when the promise rejects/resolves
    await promptOS.cancelGeneration();
  }, [promptOS]);

  // Stable insert using functional setState
  const handleInsert = useCallback(async () => {
    // Use functional access to avoid dependency
    const currentResult = result;
    if (!currentResult) return;

    try {
      await promptOS.insert(currentResult);
      handleReset();
    } catch (err) {
      setError('Failed to insert text');
    }
  }, [promptOS, result, handleReset]);

  const handleRefine = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleDismiss = useCallback(() => {
    promptOS.dismiss();
    handleReset();
  }, [promptOS, handleReset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.repeat) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    } else if (e.key === 'Escape') {
      handleDismiss();
    }
  }, [handleGenerate, handleDismiss]);

  // Global escape handler with ref to avoid re-subscription
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        promptOS.dismiss();
        handleReset();
      }
    };
    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [promptOS, handleReset]); // Narrow dependencies


  return (
    <div className="bg-transparent h-screen flex flex-col justify-end items-center p-3 pb-6 font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Oxygen,Ubuntu,sans-serif]">
      {/* Result Section - conditional render based on derived state */}
      {hasResult && (
        <div className="mb-3 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-[20px] p-5 shadow-lg animate-slide-up origin-bottom w-full max-h-[calc(100vh-100px)] overflow-y-auto grainy-texture">
          <div className="result-text text-[15px] leading-relaxed text-gray-200 max-h-[350px] overflow-y-auto whitespace-pre-wrap pr-1">
            {result}
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefine}
              className="text-[13px] text-gray-400 px-2.5 py-1.5 rounded-xl hover:text-gray-200 active:scale-95"
            >
              Refine
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInsert}
              className="bg-[#FF6B00] hover:bg-[#ff8533] text-white rounded-xl px-3.5 py-1.5 text-[13px] font-medium active:scale-95"
            >
              Insert
            </Button>
          </div>
        </div>
      )}

      {/* Error Section - conditional render based on derived state */}
      {hasError && (
        error === 'screen_recording_permission' ? (
          <div className="mb-3 p-4 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-[20px] shadow-lg animate-slide-up w-[92%] grainy-texture">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-zinc-200 mb-1">Screen Recording required</p>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">
                  Enable promptOS in System Settings → Privacy &amp; Security → Screen Recording
                </p>
                <button
                  onClick={() => promptOS.openSystemSettings('screen-recording')}
                  className="text-[12px] text-[#FF6B00] hover:text-[#ff8533] transition-colors"
                >
                  Open System Settings →
                </button>
              </div>
              <button
                onClick={() => setError('')}
                className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 p-3 px-4 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-xl animate-slide-up w-[92%] grainy-texture">
            <span className="text-[12px] text-zinc-400">{error}</span>
          </div>
        )
      )}

      {/* Retry Status Indicator */}
      {retryStatus && !hasResult && !hasError && (
        <div className="mb-3 flex items-center gap-2 p-2 px-3 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-xl animate-slide-up w-fit mx-auto grainy-texture">
          <span className="text-xs text-gray-300 italic">{retryStatus}</span>
        </div>
      )}

      {/* Selection Context Chip */}
      {selectionContext && !hasResult && (
        <div className="mb-3 max-w-[90%] flex items-center gap-2 p-2 px-3 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-xl animate-slide-up grainy-texture">
          <div className="text-xs text-gray-300 italic truncate max-w-[300px]">
            "{selectionContext}"
          </div>
          <button
            onClick={() => setSelectionContext('')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="input-bar flex items-center gap-3.5 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-[28px] py-2.5 px-5 shadow-lg w-[92%] grainy-texture">
        <img src="logo.png" className="w-6 h-6 object-contain flex-shrink-0 opacity-80" alt="Logo" />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={retryStatus || "Ask AI..."}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent border-none text-base text-gray-100 outline-none font-normal placeholder:text-gray-500"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={isGenerating ? handleStop : handleGenerate}
          disabled={!!retryStatus && !isGenerating}
          className="w-7 h-7 rounded-full hover:bg-transparent p-0"
        >
          {isGenerating ? StopIcon : ArrowUpIcon}
        </Button>
      </div>
    </div>
  );
}
