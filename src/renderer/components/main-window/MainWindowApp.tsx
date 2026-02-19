import React, { useState, useEffect, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import { AuthPage } from './AuthPage';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingLanguage } from './OnboardingLanguage';
import { OnboardingStep2 } from './OnboardingStep2';
import { OnboardingStep3 } from './OnboardingStep3';
import { SettingsPage } from './SettingsPage';
import { UpdateToast } from '../UpdateToast';

// ...

// Init-once guard for session check
let sessionCheckDone = false;

export function MainWindowApp() {
  const promptOS = usePromptOS();
  const [currentPage, setCurrentPage] = useState<string>('auth');

  // Listen for navigation from main process with stable callback
  useEffect(() => {
    const cleanup = promptOS.onNavigate((route) => {
      setCurrentPage(route);
    });
    return cleanup;
  }, [promptOS]); // Narrow dependency

  // Check session on mount - init once pattern
  useEffect(() => {
    if (sessionCheckDone) return;

    (async () => {
      try {
        const result = await promptOS.auth.getSession();
        if (result.success && result.session) {
          const profileResult = await promptOS.profile.get();
          if (profileResult.success && profileResult.profile?.onboarding_completed) {
            setCurrentPage('settings');
          } else if (profileResult.success) {
            setCurrentPage('onboarding-language');
          }
        }
        sessionCheckDone = true;
      } catch (err) {
        // Stay on auth page
        sessionCheckDone = true;
      }
    })();
  }, [promptOS]);

  // Stable navigation callback passed to children
  const navigate = useCallback((page: string) => {
    setCurrentPage(page);
  }, []);

  return (
    <>
      {currentPage === 'auth' && <AuthPage onNavigate={navigate} />}
      {currentPage === 'onboarding-language' && <OnboardingLanguage onNavigate={navigate} />}
      {currentPage === 'onboarding-1' && <OnboardingStep1 onNavigate={navigate} />}
      {currentPage === 'onboarding-2' && <OnboardingStep2 onNavigate={navigate} />}
      {currentPage === 'onboarding-3' && <OnboardingStep3 onNavigate={navigate} />}
      {currentPage === 'settings' && <SettingsPage />}
      <UpdateToast />
    </>
  );
}
