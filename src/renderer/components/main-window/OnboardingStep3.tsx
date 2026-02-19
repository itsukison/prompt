import React, { useEffect, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { ShortcutsDisplay } from './ShortcutsDisplay';

interface OnboardingStep3Props {
  onNavigate: (page: string) => void;
}

export function OnboardingStep3({ onNavigate }: OnboardingStep3Props) {
  const promptOS = usePromptOS();
  const { t } = useTranslation();

  const handleComplete = useCallback(async () => {
    // Get stored data
    const displayName = sessionStorage.getItem('onboarding-name') || '';
    const selectedStyle = sessionStorage.getItem('onboarding-style') || 'professional';
    const customGuide = sessionStorage.getItem('onboarding-style-guide') || null;

    try {
      const result = await promptOS.onboarding.complete({
        displayName,
        writingStyle: selectedStyle,
        writingStyleGuide: customGuide,
      });

      if (!result.success) {
        console.error('Failed to complete onboarding:', result.error);
        alert('Failed to complete setup: ' + result.error);
        return;
      }

      // Clear storage
      sessionStorage.removeItem('onboarding-name');
      sessionStorage.removeItem('onboarding-style');
      sessionStorage.removeItem('onboarding-style-guide');

      // Main process handles transition
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      alert('Failed to complete setup');
    }
  }, [promptOS]);

  const handleBack = useCallback(() => {
    onNavigate('onboarding-2');
  }, [onNavigate]);

  // Listen for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+/ or Ctrl+/
      if (cmdOrCtrl && e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        handleComplete();
      }

      // Cmd+Shift+/ or Ctrl+Shift+/
      if (cmdOrCtrl && e.shiftKey && e.key === '/') {
        e.preventDefault();
        handleComplete(); // Both shortcuts complete the tutorial
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleComplete]);

  return (
    <div className="page active flex-col items-center justify-center min-h-screen px-4 animate-slide-up w-full">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-2">
            {t.onboarding.finish.title}
          </h2>
          <p className="text-zinc-500 text-base">
            {t.onboarding.finish.subtitle}
          </p>
        </div>

        <div className="mb-8">
          <ShortcutsDisplay platform={navigator.platform} />
        </div>

        <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
          <Button
            variant="ghost"
            type="button"
            onClick={handleBack}
            className="px-0 hover:bg-transparent flex items-center gap-2 text-zinc-400 hover:text-zinc-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>

          <Button
            variant="ghost"
            type="button"
            onClick={handleComplete}
            className="text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
