import React from 'react';

interface ShortcutsDisplayProps {
  platform: string;
}

export function ShortcutsDisplay({ platform }: ShortcutsDisplayProps) {
  const isMac = platform === 'darwin' || (typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const shiftKey = isMac ? '⇧' : 'Shift';

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overlay Shortcut */}
        <div className="bg-[#1e1e20] border border-zinc-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center group hover:bg-zinc-800/50 hover:border-zinc-700 transition-all duration-300">
          <div className="flex items-center gap-2">
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              {cmdKey}
            </kbd>
            <span className="text-zinc-600 font-light text-2xl">+</span>
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              /
            </kbd>
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium mb-1">Toggle AI Assistant</h3>
            <p className="text-zinc-500 text-sm">Open/close overlay (captures selected text when opening)</p>
          </div>
        </div>

        {/* Update Context Shortcut - NEW */}
        <div className="bg-[#1e1e20] border border-zinc-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center group hover:bg-zinc-800/50 hover:border-zinc-700 transition-all duration-300">
          <div className="flex items-center gap-2">
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              {cmdKey}
            </kbd>
            <span className="text-zinc-600 font-light text-2xl">+</span>
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              .
            </kbd>
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium mb-1">Update Context</h3>
            <p className="text-zinc-500 text-sm">Capture newly selected text when overlay is open</p>
          </div>
        </div>

        {/* Settings Shortcut */}
        <div className="bg-[#1e1e20] border border-zinc-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center group hover:bg-zinc-800/50 hover:border-zinc-700 transition-all duration-300">
          <div className="flex items-center gap-2">
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              {cmdKey}
            </kbd>
            <span className="text-zinc-600 font-light text-2xl">+</span>
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              {shiftKey}
            </kbd>
            <span className="text-zinc-600 font-light text-2xl">+</span>
            <kbd className="h-12 min-w-[48px] px-3 flex items-center justify-center bg-zinc-900 border-b-4 border-zinc-950 rounded-lg text-zinc-100 font-mono text-xl shadow-lg group-hover:translate-y-[2px] group-hover:border-b-2 group-hover:shadow-md transition-all duration-200">
              /
            </kbd>
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium mb-1">Open Settings</h3>
            <p className="text-zinc-500 text-sm">Manage your preferences</p>
          </div>
        </div>
      </div>

      {/* Usage Tips Section */}
      <div className="mt-8 space-y-4">
        <h4 className="text-sm font-medium text-zinc-300">Usage Tips</h4>
        
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex gap-3">
            <span className="text-zinc-500 shrink-0">1.</span>
            <p>
              <strong className="text-zinc-300">Quick refine:</strong> Highlight text first, 
              then press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono">{cmdKey}+/</kbd> to open with context. 
              Type "refine this" or "fix grammar".
            </p>
          </div>
          
          <div className="flex gap-3">
            <span className="text-zinc-500 shrink-0">2.</span>
            <p>
              <strong className="text-zinc-300">Update context:</strong> While overlay is open, 
              select different text and press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono">{cmdKey}+.</kbd> to update the context without closing.
            </p>
          </div>
          
          <div className="flex gap-3">
            <span className="text-zinc-500 shrink-0">3.</span>
            <p>
              <strong className="text-zinc-300">Clean toggle:</strong> Press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono">{cmdKey}+/</kbd> again 
              to close the overlay - simple and predictable.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
