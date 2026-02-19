import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../../../hooks/useTranslation';

interface ProfileData {
  tokens_used: number;
  tokens_remaining: number;
  subscription_tier: string;
}

interface BillingTabProps {
  profile: ProfileData | null;
}

export function BillingTab({ profile }: BillingTabProps) {
  const { t } = useTranslation();
  const usagePercentage = profile
    ? (profile.tokens_used / (profile.tokens_used + profile.tokens_remaining)) * 100
    : 0;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.billing.current_plan.title}</h3>
        <div className="bg-zinc-900/20 rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-base font-semibold text-zinc-100 mb-1">
                {profile?.subscription_tier === 'pro' ? t.billing.current_plan.pro : t.billing.current_plan.free}
              </h4>
              <p className="text-xs text-zinc-500">100,000 tokens per month</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">{t.billing.current_plan.current_badge}</span>
          </div>
          <Button variant="default" className="w-full text-sm">{t.billing.current_plan.upgrade_button}</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.billing.benefits.title}</h3>
        <div className="space-y-2">
          {t.billing.benefits.features.map(benefit => (
            <div key={benefit} className="flex items-center gap-2.5 text-sm text-zinc-300 py-2">
              <Check className="w-4 h-4 text-green-400 shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 pt-6 border-t border-zinc-800/50">
        <h3 className="text-xs font-medium mb-6 text-zinc-500 uppercase tracking-wider">{t.billing.usage.title}</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2 text-zinc-400">
              <span>{t.billing.usage.tokens.label}</span>
              <span className="text-zinc-500">{t.billing.usage.tokens.reset}</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-100 rounded-full transition-all duration-500" style={{ width: `${usagePercentage}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>
                {profile?.tokens_used.toLocaleString()} /{' '}
                {(profile ? profile.tokens_used + profile.tokens_remaining : 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2 text-zinc-400">
              <span>{t.billing.usage.fast_requests.label}</span>
              <span className="text-zinc-500">{t.billing.usage.fast_requests.limit}</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-100 rounded-full transition-all duration-500" style={{ width: '42%' }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>850 / 2000</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
