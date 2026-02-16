import React, { createContext, useContext, useEffect, useState } from 'react';
import type { PromptOSAPI } from '../types/promptos';

const PromptOSContext = createContext<PromptOSAPI | null>(null);

export function PromptOSProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<PromptOSAPI | null>(null);

  useEffect(() => {
    if (window.promptOS) {
      setApi(window.promptOS);
    }
  }, []);

  if (!api) {
    return <div>Loading...</div>;
  }

  return <PromptOSContext.Provider value={api}>{children}</PromptOSContext.Provider>;
}

export function usePromptOS() {
  const context = useContext(PromptOSContext);
  if (!context) {
    throw new Error('usePromptOS must be used within PromptOSProvider');
  }
  return context;
}
