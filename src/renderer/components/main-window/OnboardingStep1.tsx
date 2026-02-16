import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OnboardingStep1Props {
  onNavigate: (page: string) => void;
}

export function OnboardingStep1({ onNavigate }: OnboardingStep1Props) {
  const [displayName, setDisplayName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived state - button enabled when name is valid
  const isValid = displayName.trim().length > 0;

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;

    // Store name in sessionStorage to pass to step 2
    sessionStorage.setItem('onboarding-name', name);
    onNavigate('onboarding-2');
  }, [displayName, onNavigate]);

  return (
    <div className="page active flex-col items-center justify-center min-h-screen px-4 animate-fade-in w-full">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-2">
            What should we call you?
          </h2>
          <p className="text-zinc-500 text-base">Your name will be visible in your team workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Type your name..."
            required
            className="w-full text-2xl py-5 px-0 border-0 border-b rounded-none text-center"
          />

          <div className="flex justify-center mt-10">
            <Button
              variant="default"
              type="submit"
              disabled={!isValid}
              className="px-10 py-2.5 rounded-full flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
