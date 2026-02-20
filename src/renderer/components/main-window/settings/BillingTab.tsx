import React, { useState, useCallback, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePromptOS } from '@/contexts/PromptOSContext';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProfileData } from './hooks/useProfile';

// Price ID map: tier × currency × interval
const PRICE_IDS = {
  pro: {
    usd: { month: 'price_1T2qy2CZmA6ItMhqLwNE04e4', year: 'price_1T2qy2CZmA6ItMhqC4wjt5G1' },
    jpy: { month: 'price_1T2qy3CZmA6ItMhqwuzBUMqg', year: 'price_1T2qy4CZmA6ItMhqyda8SbLf' },
  },
  power: {
    usd: { month: 'price_1T2qy5CZmA6ItMhqzJrkPbdd', year: 'price_1T2qy5CZmA6ItMhqpvUL8RBZ' },
    jpy: { month: 'price_1T2qy6CZmA6ItMhqYLHrfJpi', year: 'price_1T2qy6CZmA6ItMhqd6FTw8Bp' },
  },
} as const;

type AllTier = 'free' | 'pro' | 'power';
type Currency = 'usd' | 'jpy';
type Interval = 'month' | 'year';

const tierRank: Record<AllTier, number> = { free: 0, pro: 1, power: 2 };

interface BillingTabProps {
  profile: ProfileData | null;
}

export function BillingTab({ profile }: BillingTabProps) {
  const promptOS = usePromptOS();
  const { t, language } = useTranslation();

  const selectedCurrency: Currency = language === 'ja' ? 'jpy' : 'usd';

  const [selectedCard, setSelectedCard] = useState<AllTier>(
    () => (profile?.subscription_tier ?? 'free') as AllTier
  );
  // Default interval changed to 'year' as requested
  const [selectedInterval, setSelectedInterval] = useState<Interval>('year');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  const [liveStats, setLiveStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsSynced, setStatsSynced] = useState(false);

  const fetchStats = useCallback(() => {
    setIsRefreshing(true);
    promptOS.usage.getStats()
      .then((result) => {
        if (result.success && result.stats) setLiveStats(result.stats);
      })
      .catch(() => { })
      .finally(() => setIsRefreshing(false));
  }, [promptOS]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    window.addEventListener('focus', fetchStats);
    return () => window.removeEventListener('focus', fetchStats);
  }, [fetchStats]);

  // Derived values: prefer liveStats, fall back to profile prop for initial render
  const currentTier = (liveStats?.subscription_tier ?? profile?.subscription_tier ?? 'free') as AllTier;
  const isActive = currentTier !== 'free';
  const cancelAtPeriodEnd = liveStats?.cancel_at_period_end ?? profile?.cancel_at_period_end ?? false;
  const periodEndRaw = liveStats?.current_period_end ?? profile?.current_period_end;
  const periodEndDate = periodEndRaw ? new Date(periodEndRaw).toLocaleDateString() : null;
  const subscriptionInterval = liveStats?.subscription_interval ?? profile?.subscription_interval;
  const generationsUsed = liveStats?.generations_used ?? profile?.generations_used ?? 0;
  const generationsLimit = liveStats?.generations_limit ?? profile?.generations_limit ?? 100;
  const usagePct = Math.min(100, (generationsUsed / generationsLimit) * 100);

  // Sync selectedCard once when liveStats first arrives
  useEffect(() => {
    if (liveStats && !statsSynced) {
      setStatsSynced(true);
      setSelectedCard(currentTier);
    }
  }, [liveStats, statsSynced, currentTier]);

  const handleUpgrade = useCallback(async () => {
    if (selectedCard === 'free') return;
    setCheckoutError('');
    setIsLoading(true);
    try {
      const priceId = PRICE_IDS[selectedCard as 'pro' | 'power'][selectedCurrency][selectedInterval];
      const result = await promptOS.billing.createCheckout(priceId);
      if (!result.success) {
        setCheckoutError(result.error || 'Failed to open checkout');
      }
    } catch {
      setCheckoutError('Failed to open checkout');
    } finally {
      setIsLoading(false);
    }
  }, [promptOS, selectedCard, selectedCurrency, selectedInterval]);

  const handleManageSubscription = useCallback(async () => {
    setPortalError('');
    setPortalLoading(true);
    try {
      const result = await promptOS.billing.createPortal();
      if (!result.success) setPortalError(result.error || 'Failed to open portal');
    } catch {
      setPortalError('Failed to open portal');
    } finally {
      setPortalLoading(false);
    }
  }, [promptOS]);

  // Action button logic
  const isCurrentSelected = selectedCard === currentTier;
  const isUpgrade = tierRank[selectedCard] > tierRank[currentTier];
  const isDowngrade = tierRank[selectedCard] < tierRank[currentTier];

  const actionLabel = (() => {
    if (isCurrentSelected) return null;
    if (isUpgrade) return t.billing.actions.upgrade_to.replace('{plan}', t.billing.plans[selectedCard]);
    if (isDowngrade && selectedCard === 'free') return t.billing.actions.cancel_subscription;
    if (isDowngrade) return t.billing.actions.switch_to.replace('{plan}', t.billing.plans[selectedCard]);
    return null;
  })();

  const actionSubtitle = (() => {
    if (isDowngrade && selectedCard === 'free' && periodEndDate) {
      return t.billing.notices.access_until.replace('{date}', periodEndDate);
    }
    if (isDowngrade && selectedCard !== 'free') {
      return t.billing.notices.take_effect_at_period_end;
    }
    return null;
  })();

  const handleAction = isUpgrade ? handleUpgrade : handleManageSubscription;
  const actionLoading = isUpgrade ? isLoading : portalLoading;

  // Current plan card subtitle
  const currentPlanSubtitle = (() => {
    if (cancelAtPeriodEnd) return null; // amber notice handles this
    const billing = subscriptionInterval === 'month'
      ? t.billing.interval.billed_monthly
      : subscriptionInterval === 'year'
        ? t.billing.interval.billed_annually
        : null;
    if (billing && periodEndDate) return `${billing} · ${t.billing.notices.renews.replace('{date}', periodEndDate)}`;
    if (billing) return billing;
    return currentTier === 'free' ? t.billing.plans.features.free[0] : null;
  })();

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{t.billing.current_plan.title}</h3>
          {isRefreshing && (
            <span className="text-[10px] text-zinc-600 animate-pulse">{t.billing.notices.checking}</span>
          )}
        </div>
        <div className="bg-zinc-900/20 rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-base font-semibold text-zinc-100 capitalize mb-0.5">
                {t.billing.plans[currentTier]}
              </h4>
              {currentPlanSubtitle && (
                <p className="text-xs text-zinc-500">{currentPlanSubtitle}</p>
              )}
            </div>
            <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">
              {t.billing.notices.current}
            </span>
          </div>

          {/* Cancel notice — exact dates or generic if date is missing */}
          {isActive && cancelAtPeriodEnd && (
            <p className="text-xs text-amber-400">
              {periodEndDate
                ? `⚠ ${t.billing.notices.subscription_ending_on.replace('{date}', periodEndDate)}`
                : t.billing.notices.subscription_cancelled}
            </p>
          )}

          {/* Features for current plan */}
          <div className="pt-1 space-y-1">
            {t.billing.plans.features[currentTier]?.map((f: string) => (
              <div key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                <Check className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Usage */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t.billing.usage.title}
        </h3>
        <div>
          <div className="flex justify-between text-sm mb-2 text-zinc-400">
            <span>{t.billing.usage.generations}</span>
            <span className="text-zinc-500">
              {generationsUsed.toLocaleString()} / {generationsLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-100 rounded-full transition-all duration-500"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-600">
            {currentTier === 'free'
              ? t.billing.notices.resets_on_1st
              : (periodEndDate ? t.billing.notices.resets_on_date.replace('{date}', periodEndDate) : t.billing.usage.tokens.reset)}
          </p>
        </div>
      </section>

      {/* Always-visible plan picker */}
      <section className="pt-6 border-t border-zinc-800/50">

        {/* Interval toggle (moved above cards) */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-1 bg-zinc-900/40 rounded-full p-1 border border-zinc-800/50">
            {(['month', 'year'] as Interval[]).map((i) => (
              <button
                key={i}
                onClick={() => setSelectedInterval(i)}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all duration-300 ${selectedInterval === i
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {i === 'month' ? t.billing.interval.monthly : t.billing.interval.annual}
              </button>
            ))}
          </div>
        </div>

        {/* Three plan cards */}
        <div className="grid grid-cols-3 gap-2">
          {(['free', 'pro', 'power'] as AllTier[]).map((tier) => {
            const isSelected = selectedCard === tier;
            const isCurrent = currentTier === tier;
            const isCancelling = isCurrent && cancelAtPeriodEnd;
            const features = t.billing.plans.features[tier];

            // Determine price display based on exact language/tier/interval combination
            let priceMain = '';
            let priceSub: string | null = null;

            if (tier === 'free') {
              priceMain = selectedCurrency === 'usd' ? '$0' : '¥0';
            } else {
              const isMonth = selectedInterval === 'month';
              if (tier === 'pro') {
                if (selectedCurrency === 'usd') {
                  priceMain = isMonth ? '$9/mo' : '$7/mo';
                  if (!isMonth) priceSub = t.billing.interval.billed_annually_total.replace('{price}', '$84');
                } else {
                  priceMain = isMonth ? '¥980/mo' : '¥800/mo';
                  if (!isMonth) priceSub = t.billing.interval.billed_annually_total.replace('{price}', '¥9,600');
                }
              } else if (tier === 'power') {
                if (selectedCurrency === 'usd') {
                  priceMain = isMonth ? '$19/mo' : '$15/mo';
                  if (!isMonth) priceSub = t.billing.interval.billed_annually_total.replace('{price}', '$180');
                } else {
                  priceMain = isMonth ? '¥2,480/mo' : '¥2,000/mo';
                  if (!isMonth) priceSub = t.billing.interval.billed_annually_total.replace('{price}', '¥24,000');
                }
              }
            }

            return (
              <button
                key={tier}
                onClick={() => setSelectedCard(tier)}
                className={`text-left p-3 rounded-lg border transition-colors ${isSelected
                  ? 'border-zinc-400 bg-zinc-900/30'
                  : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-sm font-medium text-zinc-200">{t.billing.plans[tier]}</span>
                  {isCurrent && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded leading-tight ${isCancelling
                      ? 'bg-amber-900/40 text-amber-400'
                      : 'bg-zinc-800 text-zinc-400'
                      }`}>
                      {isCancelling ? t.billing.notices.cancelling : t.billing.notices.current}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-zinc-100 mb-0.5">{priceMain}</p>
                {/* Fixed height placeholder for sub price to keep cards aligned */}
                <p className="text-[10px] text-zinc-500 mb-1.5 h-3">
                  {priceSub}
                </p>

                {features.length > 0 && (
                  <div className="space-y-0.5 pt-1">
                    {features.map((f: string) => (
                      <div key={f} className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Check className="w-2.5 h-2.5 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action button */}
        {!isCurrentSelected && actionLabel && (
          <div className="space-y-1.5 mt-4">
            {(checkoutError || portalError) && (
              <p className="text-xs text-red-400">{checkoutError || portalError}</p>
            )}
            <Button
              variant={isUpgrade ? 'default' : 'outline'}
              className="w-full text-sm"
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading
                ? (isUpgrade ? t.billing.actions.opening_checkout : t.billing.actions.opening_portal)
                : actionLabel}
            </Button>
            {actionSubtitle && (
              <p className="text-xs text-zinc-500 text-center">{actionSubtitle}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
