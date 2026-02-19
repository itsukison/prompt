import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { usePromptOS } from '../../contexts/PromptOSContext';

interface OnboardingLanguageProps {
    onNavigate: (page: string) => void;
}

export function OnboardingLanguage({ onNavigate }: OnboardingLanguageProps) {
    const promptOS = usePromptOS();
    const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ja' | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleLanguageSelect = (lang: 'en' | 'ja') => {
        setSelectedLanguage(lang);
    };

    const handleContinue = async () => {
        if (!selectedLanguage) return;

        setIsSaving(true);
        try {
            // Update profile in Supabase
            await promptOS.profile.update({ language: selectedLanguage });
            localStorage.setItem('app_language', selectedLanguage);
            // Reload profile context to reflect change immediately across app
            await promptOS.profile.get();
            onNavigate('onboarding-1');
        } catch (error) {
            console.error('Failed to save language:', error);
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800">
            <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full px-8 animate-fade-in relative z-10">

                <div className="mb-8 text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 shadow-sm">
                        <span className="text-xl">🌐</span>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white/90">
                        Choose your language
                        <br />
                        <span className="text-2xl text-zinc-400 font-normal mt-1 block">言語を選択してください</span>
                    </h1>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* English Option */}
                    <button
                        onClick={() => handleLanguageSelect('en')}
                        className={`group relative p-6 rounded-2xl border transition-all duration-200 text-left hover:border-zinc-600 ${selectedLanguage === 'en'
                            ? 'bg-zinc-800/80 border-orange-500/50 ring-1 ring-orange-500/50'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-2xl">🇺🇸</span>
                            {selectedLanguage === 'en' && (
                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className={`font-medium ${selectedLanguage === 'en' ? 'text-white' : 'text-zinc-300'}`}>English</p>
                            <p className="text-xs text-zinc-500">Fast, accurate responses in English.</p>
                        </div>
                    </button>

                    {/* Japanese Option */}
                    <button
                        onClick={() => handleLanguageSelect('ja')}
                        className={`group relative p-6 rounded-2xl border transition-all duration-200 text-left hover:border-zinc-600 ${selectedLanguage === 'ja'
                            ? 'bg-zinc-800/80 border-orange-500/50 ring-1 ring-orange-500/50'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-2xl">🇯🇵</span>
                            {selectedLanguage === 'ja' && (
                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className={`font-medium ${selectedLanguage === 'ja' ? 'text-white' : 'text-zinc-300'}`}>日本語</p>
                            <p className="text-xs text-zinc-500">日本語での正確な応答。</p>
                        </div>
                    </button>
                </div>

                <Button
                    className="w-full h-12 text-base font-medium bg-white text-black hover:bg-zinc-200 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleContinue}
                    disabled={!selectedLanguage || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Continue / 次へ'}
                </Button>

            </div>

            {/* Background Gradient */}
            <div className="fixed inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/20 pointer-events-none z-0" />
        </div>
    );
}
