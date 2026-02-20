import React from 'react';
import { Brain, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '../../../hooks/useTranslation';
import type { Fact, FactsStats } from './hooks/useMemory';

interface MemoryTabProps {
  facts: Fact[];
  stats: FactsStats | null;
  isAtCapacity: boolean;
  memoryEnabled: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  editingMemoryId: string | null;
  editingMemoryContent: string;
  isAddingMemory: boolean;
  newMemoryContent: string;
  isAddingLoading: boolean;
  addMemoryError: string;
  onMemoryToggle: (enabled: boolean) => void;
  onSetEditingMemoryId: (id: string | null) => void;
  onSetEditingMemoryContent: (v: string) => void;
  onMemoryEdit: (id: string) => void;
  onMemoryDelete: (id: string) => void;
  onSetIsAddingMemory: (v: boolean) => void;
  onSetNewMemoryContent: (v: string) => void;
  onMemoryAdd: () => void;
  onNavigateToBilling: () => void;
}

export function MemoryTab({
  facts, stats, isAtCapacity, memoryEnabled,
  subscriptionTier, subscriptionStatus,
  editingMemoryId, editingMemoryContent, isAddingMemory,
  newMemoryContent, isAddingLoading, addMemoryError,
  onMemoryToggle, onSetEditingMemoryId, onSetEditingMemoryContent,
  onMemoryEdit, onMemoryDelete, onSetIsAddingMemory,
  onSetNewMemoryContent, onMemoryAdd, onNavigateToBilling,
}: MemoryTabProps) {
  const { t } = useTranslation();
  const hasPro = subscriptionTier !== 'free' && subscriptionStatus === 'active';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Memory Toggle */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.memory.enable.title}</h3>
        <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-zinc-200">{t.memory.enable.subtitle}</h3>
            <p className="text-xs text-zinc-500">{t.memory.enable.description}</p>
            {!hasPro && (
              <p className="text-xs text-zinc-600 mt-0.5">
                Pro feature —{' '}
                <button
                  onClick={onNavigateToBilling}
                  className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                >
                  upgrade to unlock
                </button>
              </p>
            )}
          </div>
          <label className={`relative inline-flex items-center ${hasPro ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => hasPro && onMemoryToggle(e.target.checked)}
              disabled={!hasPro}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
          </label>
        </div>
      </section>

      {/* Capacity */}
      {stats && (
        <section className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.memory.capacity.title}</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${(stats.count / stats.max) * 100}%` }}
              />
            </div>
            <span className="text-sm text-zinc-400 tabular-nums">{stats.count} / {stats.max}</span>
          </div>
          {isAtCapacity && (
            <p className="text-xs text-amber-500">{t.memory.capacity.reached}</p>
          )}
        </section>
      )}

      {/* Memories List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.memory.list.title}</h3>
          {!isAddingMemory && !isAtCapacity && (
            <Button variant="outline" size="sm" onClick={() => onSetIsAddingMemory(true)}
              className="text-xs text-zinc-400 border-zinc-700 hover:text-zinc-200 h-7">
              <Plus className="w-3 h-3 mr-1" /> {t.memory.list.add_button}
            </Button>
          )}
        </div>

        {isAddingMemory && (
          <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800 space-y-3 mb-4">
            <Textarea
              value={newMemoryContent}
              onChange={(e) => onSetNewMemoryContent(e.target.value)}
              placeholder={t.memory.list.placeholder}
              className="w-full min-h-[60px] text-sm bg-zinc-800/50 border-zinc-700"
              maxLength={200}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{newMemoryContent.length}/200</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { onSetIsAddingMemory(false); onSetNewMemoryContent(''); }}
                  className="text-xs">{t.memory.list.cancel}</Button>
                <Button variant="default" size="sm" onClick={onMemoryAdd}
                  disabled={!newMemoryContent.trim() || isAddingLoading} className="text-xs">
                  {isAddingLoading ? 'Saving...' : t.memory.list.save}
                </Button>
              </div>
            </div>
            {addMemoryError && <p className="text-xs text-red-400">{addMemoryError}</p>}
          </div>
        )}

        {facts.length === 0 && !isAddingMemory ? (
          <div className="text-center py-12 px-4 bg-zinc-900/10 rounded-lg border border-zinc-800/50">
            <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 mb-1">{t.memory.list.empty.title}</p>
            <p className="text-xs text-zinc-600">{t.memory.list.empty.description}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {facts.map((fact, index) => (
              <div key={fact.id} className="flex flex-col py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
                {editingMemoryId === fact.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingMemoryContent}
                      onChange={(e) => onSetEditingMemoryContent(e.target.value)}
                      className="w-full min-h-[60px] text-sm"
                      maxLength={200}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{editingMemoryContent.length}/200</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onSetEditingMemoryId(null)} className="text-xs">{t.memory.list.cancel}</Button>
                        <Button variant="default" size="sm" onClick={() => onMemoryEdit(fact.id)} className="text-xs">{t.memory.list.save}</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-zinc-600 mt-0.5 w-4 text-right shrink-0">{index + 1}.</span>
                      <p className="text-sm text-zinc-300 leading-relaxed flex-1">{fact.content}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2 ml-7">
                      <span className="text-[10px] text-zinc-600">
                        {fact.source === 'auto' ? t.memory.list.auto : t.memory.list.manual} · {new Date(fact.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm"
                          onClick={() => { onSetEditingMemoryId(fact.id); onSetEditingMemoryContent(fact.content); }}
                          className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300">
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onMemoryDelete(fact.id)}
                          className="h-7 px-2 text-xs text-zinc-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
