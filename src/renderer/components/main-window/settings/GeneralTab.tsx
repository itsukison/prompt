import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, MessageCircle, AlignLeft, Palette, Settings2, Monitor, LucideIcon, Globe } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

const MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google',
    description: 'Fast, efficient. Recommended for most tasks.'
  },
  {
    id: 'gemini-3.0-flash', label: 'Gemini 3.0 Flash', provider: 'Google',
    description: 'Next-gen speed and quality.'
  },
  {
    id: 'gemini-3.0-pro', label: 'Gemini 3.0 Pro', provider: 'Google',
    description: 'Most capable Google model.'
  },
  {
    id: 'grok-3', label: 'Grok 3', provider: 'xAI',
    description: 'xAI\'s smart model. Text-only (no screenshots).'
  },
  {
    id: 'grok-4-0709', label: 'Grok 4', provider: 'xAI',
    description: 'xAI\'s best model. Supports screenshot context.'
  },
];



interface GeneralTabProps {
  selectedStyle: string;
  customStyleInput: string;
  screenshotEnabled: boolean;
  selectedModel: string;
  thinkingEnabled: boolean;
  language: string;
  onStyleSelect: (id: string) => void;
  onCustomStyleChange: (v: string) => void;
  onSaveCustomStyle: () => void;
  onScreenshotToggle: (enabled: boolean) => void;
  onModelSelect: (id: string) => void;
  onThinkingToggle: (enabled: boolean) => void;
  onLanguageSelect: (lang: string) => void;
}

export function GeneralTab({
  selectedStyle,
  customStyleInput, screenshotEnabled, selectedModel, thinkingEnabled, language,
  onStyleSelect, onCustomStyleChange, onSaveCustomStyle, onScreenshotToggle,
  onModelSelect, onThinkingToggle, onLanguageSelect,
}: GeneralTabProps) {
  const { t } = useTranslation();

  const STYLE_OPTIONS: {
    id: string;
    label: string;
    Icon: LucideIcon;
    description: string;
    example: string;
  }[] = [
      {
        id: 'professional',
        label: t.onboarding.style.options.professional.label,
        Icon: Briefcase,
        description: t.onboarding.style.options.professional.description,
        example: t.onboarding.style.options.professional.example,
      },
      {
        id: 'casual',
        label: t.onboarding.style.options.casual.label,
        Icon: MessageCircle,
        description: t.onboarding.style.options.casual.description,
        example: t.onboarding.style.options.casual.example,
      },
      {
        id: 'concise',
        label: t.onboarding.style.options.concise.label,
        Icon: AlignLeft,
        description: t.onboarding.style.options.concise.description,
        example: t.onboarding.style.options.concise.example,
      },
      {
        id: 'creative',
        label: t.onboarding.style.options.creative.label,
        Icon: Palette,
        description: t.onboarding.style.options.creative.description,
        example: t.onboarding.style.options.creative.example,
      },
    ];

  return (
    <div className="space-y-10">

      {/* Language Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{t.settings.general.language.title}</h3>
          <p className="text-xs text-zinc-600">{t.settings.general.language.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['en', 'ja'].map((langCode) => (
            <button
              key={langCode}
              onClick={() => onLanguageSelect(langCode)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border ${language === langCode
                ? 'bg-zinc-800/50 border-zinc-700'
                : 'bg-[#1e1e20] border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${language === langCode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 text-zinc-500'
                }`}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${language === langCode ? 'text-zinc-200' : 'text-zinc-400'}`}>
                  {langCode === 'en' ? 'English' : '日本語'}
                </p>
              </div>
              {language === langCode && (
                <div className="ml-auto w-2 h-2 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Writing Style Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{t.settings.general.style.title}</h3>
          <p className="text-xs text-zinc-600">{t.settings.general.style.description}</p>
        </div>

        {/* 2-column icon cards */}
        <div className="grid grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onStyleSelect(style.id)}
                className={`text-left p-4 rounded-xl transition-all duration-200 border group ${isSelected
                  ? 'bg-zinc-800/50 border-zinc-700'
                  : 'bg-[#1e1e20] border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${isSelected
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-400'
                      }`}
                  >
                    <style.Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-2 leading-relaxed">{style.description}</p>
                <div
                  className={`text-xs italic leading-relaxed pl-3 border-l-2 ${isSelected ? 'text-zinc-400 border-zinc-600' : 'text-zinc-600 border-zinc-800'
                    }`}
                >
                  {style.example}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom — spans full width */}
        <div>
          <button
            type="button"
            onClick={() => onStyleSelect('custom')}
            className={`w-full text-left p-4 rounded-xl transition-all duration-200 border group ${selectedStyle === 'custom'
              ? 'bg-zinc-800/50 border-zinc-700'
              : 'bg-[#1e1e20] border-zinc-800/50 hover:bg-zinc-800/70 hover:border-zinc-700'
              }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${selectedStyle === 'custom'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-400'
                  }`}
              >
                <Settings2 className="w-4 h-4" />
              </div>
              <span className={`text-sm font-medium ${selectedStyle === 'custom' ? 'text-zinc-200' : 'text-zinc-400'}`}>
                {t.onboarding.style.options.custom.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 pl-11">{t.onboarding.style.options.custom.description}</p>
          </button>

          {selectedStyle === 'custom' && (
            <div className="mt-3 animate-fade-in space-y-2">
              <Textarea
                value={customStyleInput}
                onChange={(e) => onCustomStyleChange(e.target.value)}
                className="w-full bg-[#121214] text-sm"
                placeholder={t.onboarding.style.options.custom.placeholder}
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
              <Button variant="default" size="sm" onClick={onSaveCustomStyle} className="w-full text-xs">
                {t.onboarding.style.options.custom.save}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Screen Recording — separate section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{t.settings.general.screen_recording.title}</h3>
          <p className="text-xs text-zinc-600">{t.settings.general.screen_recording.description}</p>
        </div>
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-[#1e1e20] border border-zinc-800/50 cursor-pointer hover:bg-zinc-800/30 transition-colors"
          onClick={() => onScreenshotToggle(!screenshotEnabled)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{t.settings.general.screen_recording.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t.settings.general.screen_recording.sublabel}</p>
            </div>
          </div>
          <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${screenshotEnabled ? 'bg-orange-500' : 'bg-zinc-700'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${screenshotEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </div>
      </section>

      {/* AI Model Section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{t.settings.general.model.title}</h3>
          <p className="text-xs text-zinc-600">{t.settings.general.model.description}</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {MODEL_OPTIONS.map(({ id, label, provider, description }) => (
            <div key={id} onClick={() => onModelSelect(id)}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${selectedModel === id ? 'bg-zinc-800/50 border-zinc-700' : 'border-transparent hover:bg-zinc-900/30'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-medium ${selectedModel === id ? 'text-zinc-100' : 'text-zinc-300'}`}>
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{provider}</span>
                  {selectedModel === id && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </div>
              </div>
              <p className="text-xs text-zinc-500">{description}</p>
              {id === 'gemini-2.5-flash' && selectedModel === 'gemini-2.5-flash' && (
                <div className="mt-3 flex justify-between items-center"
                  onClick={(e) => { e.stopPropagation(); onThinkingToggle(!thinkingEnabled); }}>
                  <span className="text-xs text-zinc-400">{t.settings.general.model.thinking_mode}</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${thinkingEnabled ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${thinkingEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
