import { useState, useEffect } from 'react';
import { usePromptOS } from '../contexts/PromptOSContext';
import { en } from '../translations/en';
import { ja } from '../translations/ja';
import { Translation } from '../translations/types';

export function useTranslation() {
    const promptOS = usePromptOS();
    // Default to 'en' or cached value if we had one (though typically we don't in this simple hook w/o context)
    // We'll use a simple state here.
    // We init with 'en' to avoid undefined, but we'll try to read from localStorage immediately if possible
    // to avoid flash of wrong content (even before the effect runs).
    // Note: This assumes this hook is used in a component where window is defined.
    const [language, setLanguage] = useState<string>(() => {
        try {
            return localStorage.getItem('app_language') || 'en';
        } catch {
            return 'en';
        }
    });

    useEffect(() => {
        let mounted = true;
        const fetchLanguage = async () => {
            try {
                const result = await promptOS.profile.get();
                if (mounted && result.success && result.profile?.language) {
                    setLanguage(result.profile.language);
                }
            } catch (err) {
                console.error('Failed to load language for translation:', err);
            }
        };
        fetchLanguage();
        return () => { mounted = false; };
    }, [promptOS]);

    useEffect(() => {
        // Listen for live language updates from other windows/settings
        const cleanup = promptOS.profile.onLanguageChanged((newLang) => {
            setLanguage(newLang);
            localStorage.setItem('app_language', newLang);
        });
        return cleanup;
    }, [promptOS]);

    const t: Translation = language === 'ja' ? ja : en;

    return { t, language };
}
