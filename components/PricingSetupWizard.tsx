"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type {
  BusinessUnit,
  Shop,
  PricingRule,
  Discount,
  PriceComponent,
  Commission,
  PricingCalendar,
  PriceOverride,
  Sku,
  ResolvedPrice,
} from "@/lib/types";
import type { PresentationResult } from "@/lib/engine/presentation";
import { resolveScopeAncestors, scopeAppliesToAncestors, skusUnderScope, pickDiverseSkus, type CatalogIndexLike } from "@/lib/engine/scopeTree";
import { calculatePriceAction } from "@/lib/actions/calculator";
import { Card, Badge } from "@/components/ui";
import RuleEditor from "@/components/RuleEditor";
import PriceOverrideEditor from "@/components/PriceOverrideEditor";
import PresentationTile from "@/components/PresentationTile";
import type { ScopeOption } from "@/components/DiscountEditor";

export default function PricingSetupWizard({
  catalog,
  scopeOptions,
  rules,
  discounts,
  components,
  commissions,
  priceOverrides,
  calendars,
  businessUnits,
  shops,
}: {
  catalog: CatalogIndexLike;
  scopeOptions: ScopeOption[];
  rules: PricingRule[];
  discounts: Discount[];
  components: PriceComponent[];
  commissions: Commission[];
  priceOverrides: PriceOverride[];
  calendars: PricingCalendar[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
}) {
  const [scopeId, setScopeId] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState("");

  const scope = scopeOptions.find((o) => o.id === scopeId) ?? null;

  const ancestors = useMemo(() => (scope ? resolveScopeAncestors(catalog, scope.level, scope.id) : null), [catalog, scope]);
  const relevantRules = useMemo(
    () => (ancestors ? rules.filter((r) => scopeAppliesToAncestors(r.scope, ancestors)) : []),
    [rules, ancestors],
  );
  const sampleSkus = useMemo(() => (scope ? skusUnderScope(catalog, scope.level, scope.id) : []), [catalog, scope]);
  const overridesHere = useMemo(
    () => (scope ? priceOverrides.filter((o) => o.level === scope.level && o.refId === scope.id) : []),
    [priceOverrides, scope],
  );

  return (
    <div className="space-y-4">
      <Card title="1. What are you pricing?">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Catalog scope</span>
            <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="border rounded px-2 py-1 bg-transparent min-w-64">
              <option value="">Choose a level to start…</option>
              {scopeOptions.map((o) => (
                <option key={`${o.level}-${o.id}`} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Business unit</span>
            <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Shop</span>
            <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-2 py-1 bg-transparent">
              <option value="">BU-wide</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Pick the broadest level that should share this pricing - most setups only need Group or Product; save Variant/SKU for genuine
          exceptions. Everything below walks through the real resolution order and applies to every SKU under whatever you pick here.
        </p>
      </Card>

      {scope && ancestors && (
        <>
          <Card title="2. Base price">
            <p className="text-xs text-neutral-500 mb-2">
              The price set here wins for every SKU under <strong>{scope.label}</strong> unless a more specific level (variant/SKU) or a
              pricing rule overrides it. Leave it unset to inherit from the parent instead.
            </p>
            <PriceOverrideEditor level={scope.level} refId={scope.id} businessUnits={businessUnits} shops={shops} overrides={overridesHere} defaultOpen />
          </Card>

          <Card title="3. Pricing rules">
            <p className="text-xs text-neutral-500 mb-2">
              Rules are how discounts, components, and commissions actually get attached to a scope - a component or discount only
              affects a price once a rule here references it. Showing every rule that already applies to <strong>{scope.label}</strong>{" "}
              (its own rules, plus anything inherited from a broader level).
            </p>
            <RuleEditor
              rules={relevantRules}
              scopeOptions={scopeOptions}
              businessUnits={businessUnits}
              shops={shops}
              discounts={discounts}
              components={components}
              commissions={commissions}
              calendars={calendars}
              initialScopeId={scope.id}
            />
          </Card>

          <Card title="4. Reusable building blocks">
            <p className="text-xs text-neutral-500 mb-2">
              Components and discounts are defined once, unscoped, then attached above via a rule. If the piece you want to attach
              doesn&apos;t exist yet, create it first.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/components" className="rounded border border-black/15 dark:border-white/15 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">
                Components <Badge>{components.length}</Badge>
              </Link>
              <Link href="/incentives" className="rounded border border-black/15 dark:border-white/15 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">
                Discounts &amp; Incentives <Badge>{discounts.length}</Badge>
              </Link>
            </div>
          </Card>

          <Card title="5. Live preview">
            <p className="text-xs text-neutral-500 mb-2">
              Runs the real pricing engine for {sampleSkus.length > 3 ? "a sample of " : ""}
              {Math.min(sampleSkus.length, 3)} of the {sampleSkus.length} SKU{sampleSkus.length === 1 ? "" : "s"} under{" "}
              <strong>{scope.label}</strong>, so you see the actual effect of what&apos;s configured above - not a separate estimate. Picked
              for variety by default; swap any slot to check a specific SKU.
            </p>
            <LivePreview key={scope.id} allSkus={sampleSkus} catalog={catalog} businessUnitId={businessUnitId} shopId={shopId} />
          </Card>

          <Card title="6. Scaling to the rest of the catalog">
            <p className="text-sm">
              Everything above was set once, at the <strong>{scope.label}</strong> level, and already applies to{" "}
              <strong>{sampleSkus.length}</strong> SKU{sampleSkus.length === 1 ? "" : "s"} through catalog inheritance - no per-SKU work
              needed. For repricing SKUs that already have their own overrides (e.g. an import from a cost feed), use{" "}
              <Link href="/bulk-operations" className="underline">
                Bulk Operations
              </Link>{" "}
              instead.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function LivePreview({
  allSkus,
  catalog,
  businessUnitId,
  shopId,
}: {
  allSkus: Sku[];
  catalog: CatalogIndexLike;
  businessUnitId: string;
  shopId: string;
}) {
  const defaultPicks = useMemo(() => pickDiverseSkus(allSkus, catalog, 3).map((s) => s.id), [allSkus, catalog]);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultPicks);
  const [results, setResults] = useState<Record<string, { result?: ResolvedPrice; presentation?: PresentationResult; error?: string }>>({});
  const [pending, startTransition] = useTransition();

  function swap(index: number, skuId: string) {
    setSelectedIds((ids) => ids.map((id, i) => (i === index ? skuId : id)));
    setResults({});
  }

  function run() {
    startTransition(async () => {
      const entries = await Promise.all(
        selectedIds.map(async (skuId) => {
          const r = await calculatePriceAction({ skuId, businessUnitId, shopId: shopId || undefined, quantity: 1 });
          return [skuId, r] as const;
        }),
      );
      setResults(Object.fromEntries(entries));
    });
  }

  if (allSkus.length === 0) {
    return <p className="text-xs text-neutral-500 italic">No SKUs under this scope yet.</p>;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={pending || !businessUnitId}
        className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {pending ? "Resolving…" : "Run live preview"}
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {selectedIds.map((skuId, i) => {
          const entry = results[skuId];
          return (
            <div key={i} className="space-y-1.5">
              <select
                value={skuId}
                onChange={(e) => swap(i, e.target.value)}
                className="w-full border rounded px-1 py-0.5 bg-transparent text-xs"
              >
                {allSkus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {labelForSku(catalog, s.id)}
                  </option>
                ))}
              </select>
              {entry?.error && <Badge tone="critical">{entry.error}</Badge>}
              {entry?.presentation && <PresentationTile presentation={entry.presentation} />}
              {entry?.result && (
                <Link href={`/calculator?skuId=${skuId}`} className="text-xs underline text-neutral-500 block text-center">
                  full trace →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelForSku(catalog: CatalogIndexLike, skuId: string): string {
  const sku = catalog.skus.find((s) => s.id === skuId);
  if (!sku) return skuId;
  const variant = catalog.variants.find((v) => v.id === sku.variantId);
  const product = variant && catalog.products.find((p) => p.id === variant.productId);
  return `${product?.name ?? "?"} — ${variant?.name ?? "?"} — ${sku.name}`;
}
