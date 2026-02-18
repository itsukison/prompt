import { useState, useEffect, useCallback } from 'react';
import { usePromptOS } from '@/contexts/PromptOSContext';
import type { Fact, FactsStats } from '@/types/promptos';

// Re-export types for components
export type { Fact, FactsStats };

// Legacy type alias for compatibility
export type Memory = Fact;
export interface MemoryStats {
  total: number;
  by_category: Record<string, number>;
  last_session?: string;
}

export function useMemory(activeTab: string, memoryEnabledFromProfile: boolean | undefined) {
  const promptOS = usePromptOS();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [stats, setStats] = useState<FactsStats | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState(memoryEnabledFromProfile !== false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFactContent, setEditingFactContent] = useState('');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [newFactContent, setNewFactContent] = useState('');
  const [isAddingLoading, setIsAddingLoading] = useState(false);
  const [addFactError, setAddFactError] = useState('');

  // Load facts when tab becomes active
  useEffect(() => {
    if (activeTab !== 'memory') return;
    let cancelled = false;
    (async () => {
      try {
        const [factsResult, statsResult] = await Promise.all([
          promptOS.facts.getAll(),
          promptOS.facts.getStats(),
        ]);
        if (!cancelled && factsResult.success) setFacts(factsResult.facts || []);
        if (!cancelled && statsResult.success) setStats(statsResult.stats || null);
        if (!cancelled) setMemoryEnabled(memoryEnabledFromProfile !== false);
      } catch (err) {
        console.error('Failed to load facts:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, promptOS, memoryEnabledFromProfile]);

  const refreshStats = useCallback(async () => {
    const statsResult = await promptOS.facts.getStats();
    if (statsResult.success) setStats(statsResult.stats || null);
  }, [promptOS]);

  const handleToggle = useCallback(async (enabled: boolean) => {
    try {
      const result = await promptOS.facts.toggle(enabled);
      if (result.success) setMemoryEnabled(enabled);
      else alert('Failed to update setting');
    } catch { alert('Failed to update setting'); }
  }, [promptOS]);

  const handleEdit = useCallback(async (factId: string) => {
    if (!editingFactContent.trim()) return;
    try {
      const result = await promptOS.facts.update(factId, editingFactContent.trim());
      if (result.success) {
        setFacts(prev => prev.map(f => f.id === factId ? { ...f, content: editingFactContent.trim() } : f));
        setEditingFactId(null);
        setEditingFactContent('');
      } else alert('Failed to update fact');
    } catch { alert('Failed to update fact'); }
  }, [editingFactContent, promptOS]);

  const handleDelete = useCallback(async (factId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      const result = await promptOS.facts.delete(factId);
      if (result.success) {
        setFacts(prev => prev.filter(f => f.id !== factId));
        await refreshStats();
      } else alert('Failed to delete fact');
    } catch { alert('Failed to delete fact'); }
  }, [promptOS, refreshStats]);

  const handleAdd = useCallback(async () => {
    if (!newFactContent.trim()) return;
    setIsAddingLoading(true);
    setAddFactError('');
    try {
      const result = await promptOS.facts.add(newFactContent.trim());
      if (result.success && result.fact) {
        setFacts(prev => [...prev, result.fact!]);
        setNewFactContent('');
        setIsAddingFact(false);
        await refreshStats();
      } else setAddFactError(result.error || 'Failed to add fact');
    } catch { setAddFactError('Failed to add fact'); }
    finally { setIsAddingLoading(false); }
  }, [newFactContent, promptOS, refreshStats]);

  const isAtCapacity = stats ? stats.remaining <= 0 : false;

  // Return with legacy naming for compatibility with existing MemoryTab props
  return {
    // New naming
    facts,
    stats,
    isAtCapacity,
    // Legacy naming for MemoryTab props (mapped to new values)
    memories: facts,
    memoryStats: stats ? {
      total: stats.count,
      by_category: { facts: stats.count },
      last_session: undefined,
    } : null,
    memoryEnabled,
    editingMemoryId: editingFactId,
    setEditingMemoryId: setEditingFactId,
    editingMemoryContent: editingFactContent,
    setEditingMemoryContent: setEditingFactContent,
    isAddingMemory: isAddingFact,
    setIsAddingMemory: setIsAddingFact,
    newMemoryContent: newFactContent,
    setNewMemoryContent: setNewFactContent,
    newMemoryCategory: 'personal_info', // Not used anymore
    setNewMemoryCategory: () => {}, // Not used anymore
    isAddingLoading,
    addMemoryError: addFactError,
    handleMemoryToggle: handleToggle,
    handleMemoryEdit: handleEdit,
    handleMemoryDelete: handleDelete,
    handleMemoryAdd: handleAdd,
  };
}
