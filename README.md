# Pricing Tool (prototype)

A pricing tool for a print-on-demand and marketplace business, built out of a
requirements sheet. It covers all **Must-have** capabilities plus a number of
**Should/Could-have** items:

## Core (Must-have)

- **SKU pricing** (`/catalog`) — base prices/overrides at product-group,
  product, variant, and SKU level, per business unit and (optionally) per
  shop, with explicit inheritance and floor/ceiling safeguards.
- **Discount management** (`/incentives`) — discounts as reusable entities
  (percent/amount off, fixed price, volume tiers, BOGO, basket-value) sharing
  one model: scope, eligibility, validity, stacking group, priority, badge.
- **Configuration & design price components** (`/components`) — typed
  components (print area/technique, personalisation, design premiums, fees)
  with parent/child inheritance and per-type calculation models (flat,
  per-stitch, percent).
- **Pricing rule model & resolution** (`/rules`) — rules matching
  BU/shop/market/channel/product dimensions decide which price/component/
  discount/commission effect applies at runtime, resolved by priority +
  specificity, with stacking groups and exclusions.
- **Price consistency checks** (`/checks`) — price-architecture rules (min
  gap, ordering, market parity) validated at save time, never at runtime.
- **Cross-SKU sanity checks** (`/checks`) — built-in, detection-only anomaly
  scanners (size-ordering, sale-above-RRP, overlapping tiers, missing market
  price).
- **Version control & scheduling** (`/versions`) — draft → approve →
  activate/schedule → revert workflow across every editable entity.
- **Alerts & notifications** (`/alerts`), a **pricing overview** dashboard
  (`/overview`), and a **price & basket calculator** (`/calculator`) that
  runs a live pricing request through the engine and shows the full
  resolution trace — one line resolves a single SKU, adding lines resolves
  a basket (bundles, mix-and-match, basket discounts).
- **Price experiments (A/B tests)** (`/experiments`) with a margin-floor gate
  before start.

Commission authoring is explicitly out of scope per the requirements sheet
(open scope conflict) — commissions are mocked as values *consumed* from an
external Payout System.

## Additional (Should/Could-have)

- **Bundles & mix-and-match** — cross-SKU basket composition matching
  (fixed-price bundles, "any N from a group" sets), managed alongside
  discounts on `/incentives`, resolved by the basket engine.
- **Time-based pricing** (`/calendars`, "Sales Calendar") — recurring
  day-of-week/hour windows or yearly seasonal date ranges, attachable to
  discounts or rules instead of (or alongside) a one-off validity window.
- **Presentation policies** (`/presentation`, "Storefront Display") — RRP
  strikethrough, discount badges, psychological rounding, and savings
  messaging, computed from an already-resolved price. Display-only — never
  changes what's actually charged.
- **Final-price composer** (`/composer`) — configurable build order for how
  a final price is composed from base price, components, discounts,
  commissions, markup, tax, shipping, and fees, per BU/shop.
- **B2B / customer-group price lists** (`/price-lists`) — reusable price
  lists that override the catalog base price for a customer group, with
  validity dates and priority vs. standard pricing.
- **Historical price explorer** (`/history`) — price, units, revenue,
  discount rate, contribution, margin, returns, and commissions by SKU.
  This prototype has no real order history, so the numbers are
  synthetically generated.
- **Bulk operations** (`/bulk-operations`) — placeholder page only, no logic
  behind it yet (intentionally out of scope for this pass).

## Stack

Next.js (App Router) + TypeScript + Tailwind, with a flat JSON-file
"database" under `data/*.json` (no external DB needed for this prototype).
Server Actions handle all mutations.

## Getting started

```bash
npm install
npm run seed   # writes data/*.json from scripts/seed.mjs (no-ops if files already exist; pass --force to reset)
npm run dev
```

Open http://localhost:3000 — it redirects to `/overview`.

## Layout

- `src/lib/types.ts` — domain types.
- `src/lib/store.ts` / `src/lib/repo.ts` — JSON file storage + typed
  accessors.
- `src/lib/engine/` — the pricing engine: base-price resolution
  (`base.ts`), rule matching (`match.ts`, `scope.ts`), full resolution
  (`price.ts`), basket/bundle/mix-and-match resolution (`basket.ts`),
  recurring pricing calendars (`calendar.ts`), commission calculation
  (`commissions.ts`), consistency checks (`consistency.ts`) and sanity
  checks (`sanity.ts`), alerts (`alerts.ts`), catalog inheritance
  (`catalog.ts`), customer-facing presentation (`presentation.ts`), and the
  generic version/scheduling workflow (`versions.ts`).
- `src/lib/actions/` — Server Actions (mutations) per domain.
- `src/lib/workflow.ts` — "what usually comes before/after this page" hints
  shown on each page header.
- `src/app/` — one route per feature: `overview`, `catalog`, `incentives`
  (discounts, bundles, mix-and-match), `calculator` (price + basket),
  `calendars`, `presentation`, `components`, `rules`, `composer`,
  `price-lists`, `bulk-operations`, `alerts`, `checks`, `versions`,
  `experiments`, `history`.
