import React from 'react';
import { ShortcutsDisplay } from '../ShortcutsDisplay';
import { useTranslation } from '../../../hooks/useTranslation';

export function ShortcutsTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-6">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t.shortcuts.title}
        </h3>
        <ShortcutsDisplay platform={typeof navigator !== 'undefined' ? navigator.platform : ''} />
        <div className="pt-4 border-t border-zinc-800/50">
          <p className="text-sm text-zinc-500">
            {t.shortcuts.description}
          </p>
        </div>
      </section>
    </div>
  );
}
