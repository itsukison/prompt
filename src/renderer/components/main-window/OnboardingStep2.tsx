import React, { useState, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Briefcase, MessageCircle, Zap, Palette, Settings2, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface OnboardingStep2Props {
  onNavigate: (page: string) => void;
}

// Hoist style cards data outside component


export function OnboardingStep2({ onNavigate }: OnboardingStep2Props) {
  const promptOS = usePromptOS();
  const { t } = useTranslation();

  const STYLE_OPTIONS: {
    id: string;
    title: string;
    Icon: LucideIcon;
    description: string;
    example: string;
  }[] = [
      {
        id: 'professional',
        title: t.onboarding.style.options.professional.label,
        Icon: Briefcase,
        description: t.onboarding.style.options.professional.description,
        example: t.onboarding.style.options.professional.example,
      },
      {
        id: 'casual',
        title: t.onboarding.style.options.casual.label,
        Icon: MessageCircle,
        description: t.onboarding.style.options.casual.description,
        example: t.onboarding.style.options.casual.example,
      },
      {
        id: 'concise',
        title: t.onboarding.style.options.concise.label,
        Icon: Zap,
        description: t.onboarding.style.options.concise.description,
        example: t.onboarding.style.options.concise.example,
      },
      {
        id: 'creative',
        title: t.onboarding.style.options.creative.label,
        Icon: Palette,
        description: t.onboarding.style.options.creative.description,
        example: t.onboarding.style.options.creative.example,
      },
    ];

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [customGuide, setCustomGuide] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Derived state - button enabled when style is selected (and custom guide if custom)
  const isValid = selectedStyle && (selectedStyle !== 'custom' || customGuide.trim().length > 0);

  const handleStyleSelect = useCallback((styleId: string) => {
    setSelectedStyle(styleId);
    if (styleId !== 'custom') {
      setCustomGuide('');
    }
  }, []);

  const handleBack = useCallback(() => {
    onNavigate('onboarding-1');
  }, [onNavigate]);

  const handleComplete = useCallback(() => {
    if (!selectedStyle) return;

    if (selectedStyle === 'custom' && !customGuide.trim()) {
      alert(t.onboarding.style.options.custom.placeholder); // Using placeholder as alert message for now
      return;
    }

    // Store selections in sessionStorage
    sessionStorage.setItem('onboarding-style', selectedStyle);
    if (selectedStyle === 'custom') {
      sessionStorage.setItem('onboarding-style-guide', customGuide.trim());
    }

    // Navigate to Step 3 instead of completing
    onNavigate('onboarding-3');
  }, [selectedStyle, customGuide, onNavigate]);

  return (
    <div className="page active flex-col items-center justify-center min-h-screen px-4 py-8 animate-slide-up w-full">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-2">{t.onboarding.style.title}</h2>
          <p className="text-zinc-500 text-base">{t.onboarding.style.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => handleStyleSelect(style.id)}
              className={`text-left p-4 rounded-xl transition-all duration-300 group border relative overflow-hidden ${selectedStyle === style.id
                ? 'bg-zinc-800 border-zinc-500'
                : 'bg-[#1e1e20] border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 flex-shrink-0 ${selectedStyle === style.id
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-300'
                    }`}
                >
                  <style.Icon className="w-4 h-4" />
                </div>
                <h3 className={`text-base font-medium ${selectedStyle === style.id ? 'text-zinc-100' : 'text-zinc-300'
                  }`}>
                  {style.title}
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-3 leading-relaxed">{style.description}</p>
              <div
                className={`text-xs italic leading-relaxed pl-3 border-l-2 ${selectedStyle === style.id
                  ? 'text-zinc-300 border-zinc-500'
                  : 'text-zinc-600 border-zinc-800'
                  }`}
              >
                {style.example}
              </div>
            </button>
          ))}

          {/* Custom Option */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => handleStyleSelect('custom')}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 border relative overflow-hidden ${selectedStyle === 'custom'
                ? 'bg-zinc-800 border-zinc-500'
                : 'bg-[#1e1e20] border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${selectedStyle === 'custom'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-500'
                    }`}
                >
                  <Settings2 className="w-4 h-4" />
                </div>
                <h3 className={`text-base font-medium ${selectedStyle === 'custom' ? 'text-zinc-100' : 'text-zinc-300'
                  }`}>
                  Custom
                </h3>
              </div>
              <p className="text-sm text-zinc-500">Define your own system prompt instructions.</p>
            </button>

            {selectedStyle === 'custom' && (
              <div className="mt-3 animate-fade-in">
                <Textarea
                  value={customGuide}
                  onChange={(e) => setCustomGuide(e.target.value)}
                  className="w-full bg-[#121214] min-h-[80px] font-mono shadow-inner text-sm"
                  placeholder={t.onboarding.style.options.custom.placeholder}
                />
              </div>
            )}
          </div>
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
            variant="default"
            type="button"
            onClick={handleComplete}
            disabled={!isValid}
            className="px-8 py-2.5 rounded-full flex items-center gap-2"
          >
            {t.onboarding.name.next}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
