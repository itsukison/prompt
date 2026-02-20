# Stripe Billing — promptOS Implementation Notes

## Files

| File | Role |
|---|---|
| `src/renderer/components/main-window/settings/BillingTab.tsx` | All billing UI |
| `src/ipc/billing-handlers.js` | IPC: createCheckout, createPortal |
| `src/renderer/types/promptos.d.ts` | `window.promptOS.billing` type declarations |
| `src/preload.js` | Exposes `promptOS.billing` via contextBridge |

---

## Price IDs

```ts
const PRICE_IDS = {
  pro:   { usd: { month: 'price_...', year: 'price_...' }, jpy: { ... } },
  power: { usd: { month: 'price_...', year: 'price_...' }, jpy: { ... } },
}
```

Free tier has no price ID. Only `'pro' | 'power'` keys exist in PRICE_IDS.

---

## Subscription State (from DB / liveStats)

| Field | Type | Notes |
|---|---|---|
| `subscription_tier` | `'free' \| 'pro' \| 'power'` | Current plan |
| `subscription_status` | string | Stripe status (`active`, `incomplete`, etc.) |
| `subscription_interval` | `'month' \| 'year' \| null` | Billing cadence |
| `cancel_at_period_end` | boolean | True when user cancelled but access continues |
| `current_period_end` | ISO string or null | Null for `incomplete` subs (first payment never cleared) |
| `generations_used` | number | Resets each billing period |
| `generations_limit` | number | 100 / 1000 / 10000 by tier |

`current_period_end` being null is expected for `subscription_status = 'incomplete'`. All cancel-notice UI must handle `null` gracefully.

---

## Data Flow

```
mount → promptOS.usage.getStats() → liveStats
window focus → re-fetch (catches return from Stripe tab)
liveStats ?? profile prop   ← profile is the SSR/initial fallback
```

One-time sync: `selectedCard` initializes from `profile`, then snaps to `currentTier` when `liveStats` first arrives (guarded by `statsSynced` flag so user selections aren't overwritten).

---

## Tier Rank & Action Logic

```ts
const tierRank = { free: 0, pro: 1, power: 2 }

isCurrentSelected  →  no button
isUpgrade          →  "Upgrade to X"    →  createCheckout(priceId)
isDowngrade + paid →  "Switch to X"     →  createPortal()
isDowngrade + free →  "Cancel subscription" → createPortal()
```

Subtitle under button:
- Downgrade to Free + date available: `"Access continues until [date]"`
- Downgrade between paid tiers: `"Changes take effect at period end via the billing portal"`

---

## Cancellation State

When `cancelAtPeriodEnd = true`:
- Current plan card shows amber notice instead of normal subtitle
- Badge changes to `Cancelling` (amber)
- With date: `"⚠ Access until [date] — your plan won't renew"`
- Without date: `"⚠ Subscription cancelled — your plan won't renew"`
- Three-card picker stays fully interactive

When Stripe fires `customer.subscription.deleted` (period expires), webhook resets:
`subscription_tier → 'free'`, `cancel_at_period_end → false`, `current_period_end → null`

---

## Card Grid

Always-visible `grid grid-cols-3`. Each card:
- Shows plan name, price (dynamic via `getPrice(currency, interval)`), gen limit, feature bullets
- `border-zinc-400` when selected, `border-zinc-800` otherwise
- `Current` or `Cancelling` badge on the user's active plan card
- Clicking always updates `selectedCard` — no disabled states on cards

Currency/interval toggles only render when `selectedCard === 'pro' || 'power'`.

---

## IPC Handlers (billing-handlers.js)

```js
// createCheckout
ipcMain.handle('billing-create-checkout', async (_, priceId) => {
  // creates Stripe Checkout session, opens URL in browser
})

// createPortal
ipcMain.handle('billing-create-portal', async () => {
  // creates Stripe Billing Portal session, opens URL in browser
})
```

Both return `{ success: boolean, error?: string }`.

---

## Verification Checklist

- [ ] Free user: Free card = Current, click Pro → "Upgrade to Pro" → checkout
- [ ] Pro user: Pro card = Current, click Power → "Upgrade to Power"; click Free → "Cancel subscription" → portal
- [ ] Power user: Power card = Current, click Pro → "Switch to Pro" → portal
- [ ] `cancel_at_period_end = true`: amber notice shows with/without date; three cards still work
- [ ] `current_period_end = null`: no crash; generic cancel message shown
- [ ] Returning from Stripe tab triggers re-fetch via `window focus` listener
