import React from 'react';
import { ShortcutsDisplay } from '../ShortcutsDisplay';

export function ShortcutsTab() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-6">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Keyboard Shortcuts
        </h3>
        <ShortcutsDisplay platform={typeof navigator !== 'undefined' ? navigator.platform : ''} />
        <div className="pt-4 border-t border-zinc-800/50">
          <p className="text-sm text-zinc-500">
            Use these shortcuts anywhere in your system to quickly access PromptOS.
          </p>
        </div>
      </section>
    </div>
  );
}
