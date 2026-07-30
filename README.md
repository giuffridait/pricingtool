# Pricing Tool (prototype)

A pricing tool for a print-on-demand and marketplace business, built out of a
requirements sheet. This prototype implements the **Must-have** capabilities:

- **SKU pricing** — base prices/overrides at product-group, product, variant,
  and SKU level, per business unit and (optionally) per shop, with explicit
  inheritance and floor/ceiling safeguards.
- **Discount management** — discounts as reusable entities (percent/amount
  off, fixed price, volume tiers, BOGO) sharing one model: scope, eligibility,
  validity, stacking group, priority, badge.
- **Configuration & design price components** — typed components (print
  area/technique, personalisation, design premiums, fees) with parent/child
  inheritance and per-type calculation models (flat, per-stitch, percent).
- **Pricing rule model & resolution** — rules matching BU/shop/market/channel/
  product dimensions decide which price/component/discount/commission effect
  applies at runtime, resolved by priority + specificity, with stacking groups
  and exclusions.
- **Price consistency checks** — price-architecture rules (min gap, ordering,
  market parity) validated at save time, never at runtime.
- **Cross-SKU sanity checks** — built-in, detection-only anomaly scanners
  (size-ordering, sale-above-RRP, overlapping tiers, missing market price).
- **Version control & scheduling** — draft → approve → activate/schedule →
  revert workflow across every editable entity.
- **Alerts & notifications**, **pricing overview**, and a **price calculator**
  that runs a live pricing request through the engine and shows the full
  resolution trace.
- **Price experiments (A/B tests)** with a margin-floor gate before start.

Commission authoring is explicitly out of scope per the requirements sheet
(open scope conflict) — commissions are mocked as values *consumed* from an
external Payout System.

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
- `src/lib/store.ts` / `src/lib/repo.ts` — JSON file storage + typed accessors.
- `src/lib/engine/` — the pricing engine: base-price resolution, rule
  matching, discount stacking, consistency checks, sanity checks, alerts,
  and the version/scheduling workflow.
- `src/lib/actions/` — Server Actions (mutations) per domain.
- `src/app/` — one route per feature (catalog, components, discounts, rules,
  calculator, checks, alerts, versions, experiments).
