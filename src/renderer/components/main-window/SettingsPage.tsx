import React, { useState, useEffect, useCallback } from 'react';
import { usePromptOS } from '../../contexts/PromptOSContext';
import {
  Menu,
  PanelLeftClose,
  Settings,
  User,
  CreditCard,
  BarChart3,
  LogOut,
  Keyboard,
  Check
} from 'lucide-react';
import { ShortcutsDisplay } from './ShortcutsDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ProfileData {
  id: string;
  display_name: string;
  writing_style: string;
  writing_style_guide?: string;
  tokens_used: number;
  tokens_remaining: number;
  subscription_tier: string;
  onboarding_completed: boolean;
}

export function SettingsPage() {
  const promptOS = usePromptOS();
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [customStyleInput, setCustomStyleInput] = useState('');

  // Sidebar collapse (lazy init from localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  // Derived state for usage percentage
  const usagePercentage = profile
    ? (profile.tokens_used / (profile.tokens_used + profile.tokens_remaining)) * 100
    : 0;

  // Sync sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Load profile data on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Load profile
        const profileResult = await promptOS.profile.get();
        if (!cancelled && profileResult.success) {
          const profileData = profileResult.profile;
          setProfile(profileData);
          setEditedName(profileData.display_name || '');
          setSelectedStyle(profileData.writing_style || 'professional');
          setCustomStyleInput(profileData.writing_style_guide || '');
        }

        // Load session for email
        const sessionResult = await promptOS.auth.getSession();
        if (!cancelled && sessionResult.success && sessionResult.session) {
          setUserEmail(sessionResult.session.user.email || '');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [promptOS]);



  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleEditName = useCallback(() => {
    setIsEditingName(true);
  }, []);

  const handleSaveName = useCallback(async () => {
    const newName = editedName.trim();
    if (!newName) return;

    try {
      const result = await promptOS.profile.update({
        display_name: newName,
      });

      if (result.success) {
        setProfile(result.profile);
        setIsEditingName(false);
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (err) {
      alert('Failed to save name');
    }
  }, [editedName, promptOS]);

  const handleStyleSelect = useCallback(async (styleId: string) => {
    setSelectedStyle(styleId);

    // If it's not custom, update immediately
    if (styleId !== 'custom') {
      try {
        const result = await promptOS.profile.update({ writing_style: styleId });
        if (result.success) {
          setProfile(result.profile);
        }
      } catch (err) {
        console.error('Failed to update style');
      }
    }
  }, [promptOS]);

  const handleSaveCustomStyle = useCallback(async () => {
    const text = customStyleInput.trim();
    if (!text) return;

    try {
      const result = await promptOS.profile.update({
        writing_style: 'custom',
        writing_style_guide: text,
      });
      if (result.success) {
        setProfile(result.profile);
        alert('Custom style saved!');
      }
    } catch (err) {
      alert('Failed to save style');
    }
  }, [customStyleInput, promptOS]);

  const handleLogout = useCallback(async () => {
    try {
      await promptOS.auth.signOut();
      // Main process handles transition to auth mode
    } catch (err) {
      alert('Failed to log out');
    }
  }, [promptOS]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-claude-bg text-zinc-200">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="page active flex h-screen bg-claude-bg text-zinc-200 overflow-hidden w-full">
      {/* Title bar drag region */}
      <div className="title-bar h-8 w-full fixed top-0 left-0 z-50"></div>

      {/* Hamburger menu button when sidebar is collapsed */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSidebarToggle}
          className="fixed top-10 left-4 z-50 p-2 rounded-lg bg-claude-sidebar border border-zinc-800/50"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Sidebar with smooth transition */}
      <aside className={`flex flex-col bg-claude-sidebar border-r border-zinc-800/50 pt-10 pb-4 h-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[260px] opacity-100'
        }`}>
        <div className="px-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="logo.png" alt="Logo" className="w-7 h-7 object-contain shrink-0" />
            <span className="text-xl font-semibold tracking-tight text-zinc-100">
              PromptOS
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSidebarToggle}
            className="text-zinc-500 hover:text-zinc-300 h-auto p-1"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        <TabsList className="flex-1 px-3">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">General</span>
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Account</span>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="shortcuts">
            <Keyboard className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Shortcuts</span>
          </TabsTrigger>
        </TabsList>

        <div className="px-3 mt-auto">
          <div className="p-3 rounded-lg bg-zinc-900/30 mb-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate text-zinc-200">
                  {profile?.display_name || 'User Name'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">
                  {profile?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full h-8 flex items-center gap-2 px-2 text-xs text-zinc-500 hover:text-zinc-300 justify-start"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-claude-bg h-full">
        <div className="max-w-3xl mx-auto px-12 py-16 animate-fade-in">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold mb-1 text-zinc-100 capitalize">
              {activeTab}
            </h1>
            <p className="text-zinc-500 text-sm">
              {activeTab === 'general' && 'Manage your workspace preferences and settings.'}
              {activeTab === 'account' && 'View and manage your account information.'}
              {activeTab === 'billing' && 'Manage your subscription and billing.'}
              {activeTab === 'usage' && 'View your usage statistics.'}
              {activeTab === 'shortcuts' && 'View keyboard shortcuts and get started.'}
            </p>
          </div>

          {/* Tab: General */}
          <TabsContent value="general" className="space-y-8">
            {/* Profile Section */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Profile</h3>
              <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium text-zinc-200">Display Name</h3>
                  <p className="text-xs text-zinc-500">Visible to other members of your workspace.</p>
                </div>
                {!isEditingName ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditName}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-48"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveName}
                      className="text-xs"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* Writing Style Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Intelligence</h3>

              <div className="space-y-3">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-zinc-200 mb-1">Response Style</h3>
                  <p className="text-xs text-zinc-500">
                    Choose how the AI communicates with you.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {['professional', 'casual', 'concise', 'creative', 'custom'].map((styleId) => (
                    <div
                      key={styleId}
                      onClick={() => handleStyleSelect(styleId)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedStyle === styleId
                        ? 'bg-zinc-800/50'
                        : 'hover:bg-zinc-900/30'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${selectedStyle === styleId ? 'text-zinc-100' : 'text-zinc-300'
                          }`}>
                          {styleId === 'custom' ? 'Custom Instructions' : styleId.charAt(0).toUpperCase() + styleId.slice(1)}
                        </span>
                        {selectedStyle === styleId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      {styleId !== 'custom' ? (
                        <p className="text-sm text-zinc-500">
                          {styleId === 'professional' && 'Clear, polished, and business-appropriate tone.'}
                          {styleId === 'casual' && 'Friendly, conversational, and approachable.'}
                          {styleId === 'concise' && 'Direct, minimal, no filler words.'}
                          {styleId === 'creative' && 'Expressive, varied sentence structure.'}
                        </p>
                      ) : selectedStyle === 'custom' ? (
                        <div className="mt-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <Textarea
                            value={customStyleInput}
                            onChange={(e) => setCustomStyleInput(e.target.value)}
                            className="w-full"
                            placeholder="e.g. Always answer in haikus..."
                            rows={3}
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveCustomStyle}
                            className="mt-2 w-full text-xs"
                          >
                            Save Custom Style
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">Define your own system prompt.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Tab: Account */}
          <TabsContent value="account" className="space-y-8">
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
                Account Information
              </h3>

              <div className="space-y-1">
                <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
                  <span className="text-sm text-zinc-400">Email</span>
                  <span className="text-sm text-zinc-200">{userEmail || 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
                  <span className="text-sm text-zinc-400">Account Status</span>
                  <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md">
                    Active
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Security</h3>
              <div className="py-3">
                <p className="text-sm text-zinc-500">
                  Password management is handled through your authentication provider.
                </p>
              </div>
            </section>
          </TabsContent>

          {/* Tab: Billing */}
          <TabsContent value="billing" className="space-y-8">
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Current Plan</h3>

              <div className="bg-zinc-900/20 rounded-lg p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-zinc-100 mb-1">
                      {profile?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                    </h4>
                    <p className="text-xs text-zinc-500">100,000 tokens per month</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">
                    Current
                  </span>
                </div>
                <Button variant="default" className="w-full text-sm">
                  Upgrade to Pro
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Pro Plan Benefits</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm text-zinc-300 py-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span>1,000,000 tokens per month</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300 py-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-300 py-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span>Advanced writing styles</span>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Tab: Usage */}
          <TabsContent value="usage" className="space-y-8 animate-fade-in">
            <section className="space-y-3">
              <h3 className="text-xs font-medium mb-6 text-zinc-500 uppercase tracking-wider">
                Current Usage
              </h3>

              <div className="space-y-6">
                {/* Monthly Tokens */}
                <div>
                  <div className="flex justify-between text-sm mb-2 text-zinc-400">
                    <span>Monthly Tokens</span>
                    <span className="text-zinc-500">Resets in 14 days</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-100 rounded-full transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>
                      {profile?.tokens_used.toLocaleString()} /{' '}
                      {(profile ? profile.tokens_used + profile.tokens_remaining : 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Fast Requests (Mock) */}
                <div>
                  <div className="flex justify-between text-sm mb-2 text-zinc-400">
                    <span>Fast Requests</span>
                    <span className="text-zinc-500">Daily limit</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-100 rounded-full transition-all duration-500"
                      style={{ width: '42%' }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>850 / 2000</span>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Tab: Shortcuts */}
          <TabsContent value="shortcuts" className="space-y-8 animate-fade-in">
            <section className="space-y-6">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
                Keyboard Shortcuts
              </h3>

              <ShortcutsDisplay platform={typeof navigator !== 'undefined' ? navigator.platform : ''} />

              <div className="pt-4 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  Use these shortcuts anywhere in your system to quickly access PromptOS.
                </p>
              </div>
            </section>
          </TabsContent>
        </div>
      </main>
    </Tabs>
  );
}
