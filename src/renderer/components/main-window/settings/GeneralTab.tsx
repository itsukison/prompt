import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, MessageCircle, AlignLeft, Palette, Settings2, Monitor, LucideIcon } from 'lucide-react';

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

const STYLE_OPTIONS: {
  id: string;
  label: string;
  Icon: LucideIcon;
  description: string;
  example: string;
}[] = [
    {
      id: 'professional',
      label: 'Professional',
      Icon: Briefcase,
      description: 'Clear, polished, and business-appropriate tone.',
      example: '"I wanted to follow up and confirm next steps."',
    },
    {
      id: 'casual',
      label: 'Casual',
      Icon: MessageCircle,
      description: 'Friendly, conversational, and approachable.',
      example: '"Hey! Just checking in about earlier—let me know!"',
    },
    {
      id: 'concise',
      label: 'Concise',
      Icon: AlignLeft,
      description: 'Direct, minimal, no filler words.',
      example: '"Following up. Please confirm."',
    },
    {
      id: 'creative',
      label: 'Creative',
      Icon: Palette,
      description: 'Expressive, varied sentence structure.',
      example: '"Circling back—I\'ve been mulling it over!"',
    },
  ];

interface GeneralTabProps {
  selectedStyle: string;
  customStyleInput: string;
  screenshotEnabled: boolean;
  selectedModel: string;
  thinkingEnabled: boolean;
  onStyleSelect: (id: string) => void;
  onCustomStyleChange: (v: string) => void;
  onSaveCustomStyle: () => void;
  onScreenshotToggle: (enabled: boolean) => void;
  onModelSelect: (id: string) => void;
  onThinkingToggle: (enabled: boolean) => void;
}

export function GeneralTab({
  selectedStyle,
  customStyleInput, screenshotEnabled, selectedModel, thinkingEnabled,
  onStyleSelect, onCustomStyleChange, onSaveCustomStyle, onScreenshotToggle,
  onModelSelect, onThinkingToggle,
}: GeneralTabProps) {
  return (
    <div className="space-y-10">

      {/* Writing Style Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Response Style</h3>
          <p className="text-xs text-zinc-600">Choose how the AI communicates with you.</p>
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
                Custom Instructions
              </span>
            </div>
            <p className="text-xs text-zinc-500 pl-11">Define your own system prompt instructions.</p>
          </button>

          {selectedStyle === 'custom' && (
            <div className="mt-3 animate-fade-in space-y-2">
              <Textarea
                value={customStyleInput}
                onChange={(e) => onCustomStyleChange(e.target.value)}
                className="w-full bg-[#121214] text-sm"
                placeholder="e.g. Always answer in haikus..."
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
              <Button variant="default" size="sm" onClick={onSaveCustomStyle} className="w-full text-xs">
                Save Custom Style
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Screen Recording — separate section */}
      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Screen Recording</h3>
          <p className="text-xs text-zinc-600">Capture your screen to give the AI visual context.</p>
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
              <p className="text-sm font-medium text-zinc-200">Screen Context</p>
              <p className="text-xs text-zinc-500 mt-0.5">Automatically capture a screenshot when you open the overlay.</p>
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
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">AI Model</h3>
          <p className="text-xs text-zinc-600">Select the model powering your responses.</p>
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
                  <span className="text-xs text-zinc-400">Thinking mode</span>
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
