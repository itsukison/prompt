import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../../../hooks/useTranslation';
import { Input } from '@/components/ui/input';

interface AccountTabProps {
  userEmail: string;
  displayName: string | undefined;
  isEditingName: boolean;
  editedName: string;
  onEditName: () => void;
  onSaveName: () => void;
  onEditedNameChange: (v: string) => void;
}

export function AccountTab({
  userEmail,
  displayName,
  isEditingName,
  editedName,
  onEditName,
  onSaveName,
  onEditedNameChange,
}: AccountTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      {/* Profile section */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.account.profile.title}</h3>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium text-zinc-200">{t.account.profile.name.label}</h4>
              <p className="text-xs text-zinc-500">{t.account.profile.name.description}</p>
              {!isEditingName && (
                <p className="text-sm text-zinc-400">{displayName || t.account.profile.name.not_set}</p>
              )}
            </div>
            {!isEditingName ? (
              <Button variant="ghost" size="sm" onClick={onEditName} className="text-xs">{t.account.profile.name.edit}</Button>
            ) : (
              <div className="flex gap-2 items-center">
                <Input
                  value={editedName}
                  onChange={(e) => onEditedNameChange(e.target.value)}
                  className="w-48"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') onSaveName(); }}
                />
                <Button variant="default" size="sm" onClick={onSaveName} className="text-xs">{t.account.profile.name.save}</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Account Information section */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t.account.info.title}
        </h3>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
            <span className="text-sm text-zinc-400">{t.account.info.email}</span>
            <span className="text-sm text-zinc-200">{userEmail || 'Loading...'}</span>
          </div>
          <div className="flex justify-between items-center py-3 hover:bg-zinc-900/20 -mx-3 px-3 rounded-md transition-colors">
            <span className="text-sm text-zinc-400">{t.account.info.status.label}</span>
            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md">{t.account.info.status.active}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.account.security.title}</h3>
        <div className="py-3">
          <p className="text-sm text-zinc-500">
            {t.account.security.description}
          </p>
        </div>
      </section>
    </div>
  );
}
