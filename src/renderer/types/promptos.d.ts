export interface PromptOSAPI {
  generate: (prompt: string) => Promise<{ success: boolean; text?: string; error?: string }>;
  insert: (text: string) => Promise<{ success: boolean; error?: string }>;
  dismiss: () => void;
  setHeight: (height: number) => void;
  onWindowShown: (callback: () => void) => () => void;
  onWindowHidden: (callback: () => void) => () => void;
  auth: {
    signUp: (credentials: { email: string; password: string }) => Promise<any>;
    signIn: (credentials: { email: string; password: string }) => Promise<any>;
    signOut: () => Promise<any>;
    getSession: () => Promise<any>;
  };
  profile: {
    get: () => Promise<any>;
    update: (updates: any) => Promise<any>;
  };
  onboarding: {
    complete: (data: any) => Promise<any>;
    analyzeStyle: (sampleText: string) => Promise<any>;
  };
  usage: {
    getStats: () => Promise<any>;
  };
  onNavigate: (callback: (route: string) => void) => () => void;
}

declare global {
  interface Window {
    promptOS: PromptOSAPI;
  }
}
