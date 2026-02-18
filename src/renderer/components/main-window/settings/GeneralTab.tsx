import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STYLE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Clear, polished, and business-appropriate tone.' },
  { id: 'casual', label: 'Casual', description: 'Friendly, conversational, and approachable.' },
  { id: 'concise', label: 'Concise', description: 'Direct, minimal, no filler words.' },
  { id: 'creative', label: 'Creative', description: 'Expressive, varied sentence structure.' },
  { id: 'custom', label: 'Custom Instructions', description: 'Define your own system prompt.' },
];

interface GeneralTabProps {
  displayName: string | undefined;
  isEditingName: boolean;
  editedName: string;
  selectedStyle: string;
  customStyleInput: string;
  screenshotEnabled: boolean;
  onEditName: () => void;
  onSaveName: () => void;
  onEditedNameChange: (v: string) => void;
  onStyleSelect: (id: string) => void;
  onCustomStyleChange: (v: string) => void;
  onSaveCustomStyle: () => void;
  onScreenshotToggle: (enabled: boolean) => void;
}

export function GeneralTab({
  displayName, isEditingName, editedName, selectedStyle,
  customStyleInput, screenshotEnabled, onEditName, onSaveName, onEditedNameChange,
  onStyleSelect, onCustomStyleChange, onSaveCustomStyle, onScreenshotToggle,
}: GeneralTabProps) {
  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Profile</h3>
        <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-zinc-200">Display Name</h3>
            <p className="text-sm text-zinc-400">{displayName || 'Not set'}</p>
          </div>
          {!isEditingName ? (
            <Button variant="ghost" size="sm" onClick={onEditName} className="text-xs">Edit</Button>
          ) : (
            <div className="flex gap-2 items-center">
              <Input value={editedName} onChange={(e) => onEditedNameChange(e.target.value)} className="w-48" />
              <Button variant="default" size="sm" onClick={onSaveName} className="text-xs">Save</Button>
            </div>
          )}
        </div>
      </section>

      {/* Writing Style Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Intelligence</h3>
        <div className="space-y-3">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-zinc-200 mb-1">Response Style</h3>
            <p className="text-xs text-zinc-500">Choose how the AI communicates with you.</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {STYLE_OPTIONS.map(({ id, label, description }) => (
              <div
                key={id}
                onClick={() => onStyleSelect(id)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedStyle === id ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/30'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${selectedStyle === id ? 'text-zinc-100' : 'text-zinc-300'}`}>
                    {label}
                  </span>
                  {selectedStyle === id && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </div>
                {id === 'custom' && selectedStyle === 'custom' ? (
                  <div className="mt-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <Textarea
                      value={customStyleInput}
                      onChange={(e) => onCustomStyleChange(e.target.value)}
                      className="w-full"
                      placeholder="e.g. Always answer in haikus..."
                      rows={3}
                    />
                    <Button variant="default" size="sm" onClick={onSaveCustomStyle} className="mt-2 w-full text-xs">
                      Save Custom Style
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">{description}</p>
                )}
              </div>
            ))}
          </div>

          {/* Screenshot Context */}
          <div
            className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors cursor-pointer mt-2"
            onClick={() => onScreenshotToggle(!screenshotEnabled)}
          >
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-zinc-200">Screen Context</h3>
              <p className="text-xs text-zinc-500">Automatically capture a screenshot when you reference on-screen content.</p>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${screenshotEnabled ? 'bg-orange-500' : 'bg-zinc-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${screenshotEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
