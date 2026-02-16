import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { useWindowEvents } from '../../hooks/useWindowEvents';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// Hoist static SVG outside component to avoid recreation
const sendIcon = (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
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

  // Derived state - no need for separate state
  const hasResult = !!result;
  const hasError = !!error;

  // Stable reset function using functional setState
  const handleReset = useCallback(() => {
    setPrompt('');
    setResult('');
    setError('');
    setRetryStatus('');
  }, []);

  // Stable callbacks using refs to avoid re-subscription
  const handleWindowShown = useCallback(() => {
    handleReset();
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

      const response = await promptOS.generate(currentPrompt);
      if (response.success && response.text) {
        setResult(response.text);
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
    if (e.isComposing || e.repeat) return;

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
        <div className="mb-3 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-[20px] p-5 shadow-lg animate-slide-up origin-bottom w-full max-h-[calc(100vh-100px)] overflow-y-auto">
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
        <div className="mb-3 p-3 px-4 bg-red-50 rounded-2xl border border-red-300 shadow-[0_4px_12px_rgba(220,38,38,0.1)] text-red-700 text-sm animate-slide-up w-full">
          <span>{error}</span>
        </div>
      )}

      {/* Retry Status Indicator */}
      {retryStatus && !hasResult && !hasError && (
        <div className="mb-3 p-2 px-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-200 text-xs animate-pulse w-fit mx-auto backdrop-blur-md">
          <span>{retryStatus}</span>
        </div>
      )}

      {/* Input Bar */}
      <div className="input-bar flex items-center gap-3.5 bg-[#252525] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-xl rounded-[28px] py-2.5 px-5 shadow-lg w-[92%]">
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
          onClick={handleGenerate}
          disabled={isGenerating || !!retryStatus}
          className="w-8 h-8 rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-900 disabled:opacity-50"
        >
          {isGenerating ? <span className="spinner"></span> : sendIcon}
        </Button>
      </div>
    </div>
  );
}
