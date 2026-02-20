import { useState, useEffect, useCallback } from 'react';
import { usePromptOS } from '@/contexts/PromptOSContext';

export interface ProfileData {
  id: string;
  display_name: string;
  writing_style: string;
  writing_style_guide?: string;
  tokens_used: number;
  tokens_remaining: number;
  subscription_tier: string;
  onboarding_completed: boolean;
  memory_enabled?: boolean;
  screenshot_enabled?: boolean;
  selected_model?: string;
  thinking_enabled?: boolean;
  language?: string;
  // Billing fields
  generations_used: number;
  generations_limit: number;
  subscription_status: string;
  subscription_interval?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
}

export function useProfile() {
  const promptOS = usePromptOS();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profileResult = await promptOS.profile.get();
        if (!cancelled && profileResult.success) {
          const p = profileResult.profile;
          setProfile(p);
          setEditedName(p.display_name || '');
          setSelectedStyle(p.writing_style || 'professional');
          setCustomStyleInput(p.writing_style_guide || '');
          setSelectedModel(p.selected_model || 'gemini-2.5-flash');
          setThinkingEnabled(p.thinking_enabled || false);
          setThinkingEnabled(p.thinking_enabled || false);
          const lang = p.language || 'en';
          setLanguage(lang);
          localStorage.setItem('app_language', lang);
        }
        const sessionResult = await promptOS.auth.getSession();
        if (!cancelled && sessionResult.success && sessionResult.session) {
          setUserEmail(sessionResult.session.user.email || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [promptOS]);

  const handleSaveName = useCallback(async () => {
    const newName = editedName.trim();
    if (!newName) return;
    try {
      const result = await promptOS.profile.update({ display_name: newName });
      if (result.success) { setProfile(result.profile); setIsEditingName(false); }
      else alert('Failed to save: ' + result.error);
    } catch { alert('Failed to save name'); }
  }, [editedName, promptOS]);

  const handleStyleSelect = useCallback(async (styleId: string) => {
    setSelectedStyle(styleId);
    if (styleId !== 'custom') {
      try {
        const result = await promptOS.profile.update({ writing_style: styleId });
        if (result.success) setProfile(result.profile);
      } catch { console.error('Failed to update style'); }
    }
  }, [promptOS]);

  const handleSaveCustomStyle = useCallback(async () => {
    const text = customStyleInput.trim();
    if (!text) return;
    try {
      const result = await promptOS.profile.update({ writing_style: 'custom', writing_style_guide: text });
      if (result.success) { setProfile(result.profile); alert('Custom style saved!'); }
    } catch { alert('Failed to save style'); }
  }, [customStyleInput, promptOS]);

  const handleScreenshotToggle = useCallback(async (enabled: boolean) => {
    try {
      const result = await promptOS.profile.update({ screenshot_enabled: enabled });
      if (result.success) setProfile(result.profile);
    } catch { console.error('Failed to update screenshot setting'); }
  }, [promptOS]);

  const handleModelSelect = useCallback(async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      const result = await promptOS.profile.update({ selected_model: modelId });
      if (result.success) setProfile(result.profile);
    } catch { console.error('Failed to update model selection'); }
  }, [promptOS]);

  const handleThinkingToggle = useCallback(async (enabled: boolean) => {
    setThinkingEnabled(enabled);
    try {
      const result = await promptOS.profile.update({ thinking_enabled: enabled });
      if (result.success) setProfile(result.profile);
    } catch { console.error('Failed to update thinking setting'); }
  }, [promptOS]);

  const handleLanguageSelect = useCallback(async (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
    try {
      const result = await promptOS.profile.update({ language: lang });
      if (result.success) setProfile(result.profile);
    } catch { console.error('Failed to update language'); }
  }, [promptOS]);

  const handleLogout = useCallback(async () => {
    try { await promptOS.auth.signOut(); }
    catch { alert('Failed to log out'); }
  }, [promptOS]);

  return {
    profile, setProfile, userEmail, isLoading,
    isEditingName, setIsEditingName, editedName, setEditedName,
    selectedStyle, customStyleInput, setCustomStyleInput,
    selectedModel, thinkingEnabled, language,
    handleSaveName, handleStyleSelect, handleSaveCustomStyle,
    handleScreenshotToggle, handleModelSelect, handleThinkingToggle, handleLanguageSelect, handleLogout,
  };
}
