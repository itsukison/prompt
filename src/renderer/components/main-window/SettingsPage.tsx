import React, { useState, useCallback } from 'react';
import { Menu, PanelLeftClose, Settings, User, CreditCard, LogOut, Keyboard, Brain } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import { useProfile } from './settings/hooks/useProfile';
import { useMemory } from './settings/hooks/useMemory';
import { GeneralTab } from './settings/GeneralTab';
import { AccountTab } from './settings/AccountTab';
import { MemoryTab } from './settings/MemoryTab';
import { BillingTab } from './settings/BillingTab';
import { ShortcutsTab } from './settings/ShortcutsTab';
import { useTranslation } from '../../hooks/useTranslation';



export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  const {
    profile, setProfile, userEmail, isLoading,
    isEditingName, setIsEditingName, editedName, setEditedName,
    selectedStyle, customStyleInput, setCustomStyleInput,
    selectedModel, thinkingEnabled, language,
    handleSaveName, handleStyleSelect, handleSaveCustomStyle,
    handleScreenshotToggle, handleModelSelect, handleThinkingToggle, handleLanguageSelect, handleLogout,
  } = useProfile();

  const {
    facts, stats, isAtCapacity, memoryEnabled,
    editingMemoryId, setEditingMemoryId, editingMemoryContent, setEditingMemoryContent,
    isAddingMemory, setIsAddingMemory, newMemoryContent, setNewMemoryContent,
    isAddingLoading, addMemoryError,
    handleMemoryToggle, handleMemoryEdit, handleMemoryDelete, handleMemoryAdd,
  } = useMemory(activeTab, profile?.memory_enabled);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-claude-bg text-zinc-200">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="page active flex h-screen bg-claude-bg text-zinc-200 overflow-hidden w-full">
      <div className="title-bar h-8 w-full fixed top-0 left-0 z-50" />

      {sidebarCollapsed && (
        <Button variant="ghost" size="icon" onClick={handleSidebarToggle}
          className="fixed top-10 left-4 z-50 p-2 rounded-lg bg-claude-sidebar border border-zinc-800/50">
          <Menu className="w-5 h-5" />
        </Button>
      )}

      <aside className={`flex flex-col bg-claude-sidebar border-r border-zinc-800/50 pt-10 pb-4 h-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[260px] opacity-100'}`}>
        <div className="px-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-hidden">
            <img src="white_logo.png" alt="Logo" className="w-7 h-7 object-contain shrink-0" />
            <span className="text-xl font-semibold tracking-tight text-zinc-100">PromptOS</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSidebarToggle} className="text-zinc-500 hover:text-zinc-300 h-auto p-1">
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        <TabsList className="flex-1 px-3">
          <TabsTrigger value="general"><Settings className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">{t.settings.sidebar.general}</span></TabsTrigger>
          <TabsTrigger value="account"><User className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">{t.settings.sidebar.account}</span></TabsTrigger>
          <TabsTrigger value="memory"><Brain className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">{t.settings.sidebar.memory}</span></TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">{t.settings.sidebar.billing}</span></TabsTrigger>
          <TabsTrigger value="shortcuts"><Keyboard className="w-4 h-4 shrink-0" /><span className="whitespace-nowrap">{t.settings.sidebar.shortcuts}</span></TabsTrigger>
        </TabsList>

        <div className="px-3 mt-auto">
          <div className="p-3 rounded-lg bg-zinc-900/30 mb-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate text-zinc-200">{profile?.display_name || 'User Name'}</p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">
                  {profile?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="w-full h-8 flex items-center gap-2 px-2 text-xs text-zinc-500 hover:text-zinc-300 justify-start">
              <LogOut className="w-3.5 h-3.5" />
              {t.settings.sidebar.sign_out}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-claude-bg h-full">
        <div className="max-w-3xl mx-auto px-12 py-16 animate-fade-in">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold mb-1 text-zinc-100 capitalize">{t.settings.tabs[activeTab as keyof typeof t.settings.tabs]?.title}</h1>
            <p className="text-zinc-500 text-sm">{t.settings.tabs[activeTab as keyof typeof t.settings.tabs]?.description}</p>
          </div>

          <TabsContent value="general">
            <GeneralTab
              selectedStyle={selectedStyle}
              customStyleInput={customStyleInput}
              screenshotEnabled={profile?.screenshot_enabled !== false}
              selectedModel={selectedModel}
              thinkingEnabled={thinkingEnabled}
              language={language}
              onStyleSelect={handleStyleSelect}
              onCustomStyleChange={setCustomStyleInput}
              onSaveCustomStyle={handleSaveCustomStyle}
              onScreenshotToggle={handleScreenshotToggle}
              onModelSelect={handleModelSelect}
              onThinkingToggle={handleThinkingToggle}
              onLanguageSelect={handleLanguageSelect}
            />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab
              userEmail={userEmail}
              displayName={profile?.display_name}
              isEditingName={isEditingName}
              editedName={editedName}
              onEditName={() => setIsEditingName(true)}
              onSaveName={handleSaveName}
              onEditedNameChange={setEditedName}
            />
          </TabsContent>

          <TabsContent value="memory">
            <MemoryTab
              facts={facts}
              stats={stats}
              isAtCapacity={isAtCapacity}
              memoryEnabled={memoryEnabled}
              editingMemoryId={editingMemoryId}
              editingMemoryContent={editingMemoryContent}
              isAddingMemory={isAddingMemory}
              newMemoryContent={newMemoryContent}
              isAddingLoading={isAddingLoading}
              addMemoryError={addMemoryError}
              onMemoryToggle={handleMemoryToggle}
              onSetEditingMemoryId={setEditingMemoryId}
              onSetEditingMemoryContent={setEditingMemoryContent}
              onMemoryEdit={handleMemoryEdit}
              onMemoryDelete={handleMemoryDelete}
              onSetIsAddingMemory={setIsAddingMemory}
              onSetNewMemoryContent={setNewMemoryContent}
              onMemoryAdd={handleMemoryAdd}
            />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab profile={profile} />
          </TabsContent>

          <TabsContent value="shortcuts">
            <ShortcutsTab />
          </TabsContent>
        </div>
      </main>
    </Tabs>
  );
}
