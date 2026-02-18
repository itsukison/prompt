import React from 'react';

interface AccountTabProps {
  userEmail: string;
}

export function AccountTab({ userEmail }: AccountTabProps) {
  return (
    <div className="space-y-8">
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
            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md">Active</span>
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
    </div>
  );
}
