export interface GenerateOptions {
  includeScreenshot?: boolean;
}

export interface ContextCheckResult {
  needsContext: boolean;
  source: 'heuristics' | 'llm';
}

// Facts system types (simplified 10-fact memory)
export interface Fact {
  id: string;
  content: string;
  position: number;
  source: 'auto' | 'manual';
  created_at: string;
}

export interface FactsStats {
  count: number;
  max: number;
  remaining: number;
}

export interface FactsResponse {
  success: boolean;
  facts?: Fact[];
  error?: string;
}

export interface FactResponse {
  success: boolean;
  fact?: Fact;
  error?: string;
}

export interface FactsStatsResponse {
  success: boolean;
  stats?: FactsStats;
  error?: string;
}

export interface PromptOSAPI {
  generate: (prompt: string, options?: GenerateOptions) => Promise<{ success: boolean; text?: string; error?: string }>;
  cancelGeneration: () => Promise<void>;
  insert: (text: string) => Promise<{ success: boolean; error?: string }>;
  dismiss: () => void;
  setHeight: (height: number) => void;
  onWindowShown: (callback: (payload?: { selection?: string }) => void) => () => void;
  onWindowHidden: (callback: () => void) => () => void;
  onContextUpdated: (callback: (payload?: { selection?: string }) => void) => () => void;

  // Context awareness
  checkContextNeed: (prompt: string) => Promise<ContextCheckResult>;

  // Screenshot
  screenshot: {
    capture: () => Promise<string | null>;
  };
  auth: {
    signUp: (credentials: { email: string; password: string }) => Promise<any>;
    signIn: (credentials: { email: string; password: string }) => Promise<any>;
    signOut: () => Promise<any>;
    getSession: () => Promise<any>;
  };
  profile: {
    get: () => Promise<any>;
    update: (updates: any) => Promise<any>;
    onLanguageChanged: (callback: (lang: string) => void) => () => void;
  };
  onboarding: {
    complete: (data: any) => Promise<any>;
    analyzeStyle: (sampleText: string) => Promise<any>;
  };
  usage: {
    getStats: () => Promise<any>;
  };
  // Facts system (simplified 10-fact memory)
  facts: {
    getAll: () => Promise<FactsResponse>;
    add: (content: string) => Promise<FactResponse>;
    update: (factId: string, content: string) => Promise<FactResponse>;
    delete: (factId: string) => Promise<{ success: boolean; error?: string }>;
    toggle: (enabled: boolean) => Promise<{ success: boolean; profile?: any; error?: string }>;
    getStats: () => Promise<FactsStatsResponse>;
  };
  // Memory (deprecated - use facts instead)
  memory: {
    getAll: () => Promise<any>;
    add: (content: string, category: string) => Promise<any>;
    update: (memoryId: string, content: string) => Promise<any>;
    delete: (memoryId: string) => Promise<any>;
    toggle: (enabled: boolean) => Promise<any>;
    getStats: () => Promise<any>;
  };
  onNavigate: (callback: (route: string) => void) => () => void;
  openSystemSettings: (pane: 'screen-recording') => Promise<void>;

  update: {
    onAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onProgress: (callback: (data: UpdateProgress) => void) => () => void;
    onReady: (callback: (info: UpdateInfo) => void) => () => void;
    onError: (callback: (data: UpdateError) => void) => () => void;
    install: () => Promise<void>;
  };
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseName?: string;
}

export interface UpdateProgress {
  percent: number;
  version: string | null;
}

export interface UpdateError {
  message: string;
}

declare global {
  interface Window {
    promptOS: PromptOSAPI;
  }
}
