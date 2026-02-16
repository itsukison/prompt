import React, { useState, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthPageProps {
  onNavigate: (page: string) => void;
}

export function AuthPage({ onNavigate }: AuthPageProps) {
  const promptOS = usePromptOS();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Derived text from isSignUp state (no separate state needed)
  const title = isSignUp ? 'Create account' : 'Welcome back';
  const subtitle = isSignUp
    ? 'Start your journey with a free account.'
    : 'Enter your credentials to access your workspace.';
  const submitText = isSignUp ? 'Create Account' : 'Continue';
  const toggleText = isSignUp
    ? 'Already have an account? Sign in'
    : 'No account? Sign up';

  // Stable toggle with functional setState
  const toggleMode = useCallback(() => {
    setIsSignUp(prev => !prev);
    setError('');
  }, []);

  // Form submission with loading state
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const credentials = {
      email: email.trim(),
      password,
    };

    try {
      const result = isSignUp
        ? await promptOS.auth.signUp(credentials)
        : await promptOS.auth.signIn(credentials);

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Navigate based on onboarding status
      if (isSignUp || result.needsOnboarding) {
        onNavigate('onboarding-1');
      } else {
        onNavigate('settings');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }, [isSignUp, email, password, promptOS, onNavigate]);

  return (
    <div className="page active flex-col items-center justify-center min-h-screen px-4 animate-fade-in w-full">
      <div className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 flex items-center justify-center mb-6">
            <img src="logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-zinc-500 text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="h-11 bg-zinc-900/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-11 bg-zinc-900/50"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-900/20 px-3 py-2 rounded-md border border-red-900/30">
              {error}
            </div>
          )}

          <Button
            variant="default"
            type="submit"
            disabled={isLoading}
            className="w-full h-12"
          >
            {isLoading ? 'Loading...' : submitText}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={toggleMode}
            className="text-sm"
          >
            {toggleText}
          </Button>
        </div>
      </div>
    </div>
  );
}
