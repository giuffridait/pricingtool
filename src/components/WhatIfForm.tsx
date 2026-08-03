"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop, ResolvedPrice } from "@/lib/types";
import type { SkuOption } from "@/components/PriceCalculatorForm";
import { PricingContextFields, Field, type PricingContextValue } from "@/components/PricingContextFields";
import { loadCurrentPriceAction, checkWorstCaseAction, draftPriceChangeAction } from "@/lib/actions/whatif";
import { computeBreakEven, STANDARD_DISCOUNT_DEPTHS_PERCENT } from "@/lib/engine/breakeven";
import { Badge, Card } from "@/components/ui";

export default function WhatIfForm({
  skuOptions,
  businessUnits,
  shops,
  initialSkuId,
}: {
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
  initialSkuId?: string;
}) {
  const [skuId, setSkuId] = useState(initialSkuId ?? skuOptions[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [ctx, setCtx] = useState<PricingContextValue>({
    businessUnitId: businessUnits[0]?.id ?? "",
    shopId: "",
    market: "",
    channel: "",
    customerGroup: "",
    printArea: "",
    printTechnique: "",
    personalisation: "",
    design: "",
    date: "",
  });
  const [current, setCurrent] = useState<ResolvedPrice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, startLoad] = useTransition();

  const [manualCost, setManualCost] = useState(""); // session-only: never sent anywhere but the break-even math below
  const [sliderPrice, setSliderPrice] = useState<number | null>(null);

  const [worstCase, setWorstCase] = useState<ResolvedPrice | null>(null);
  const [worstCaseError, setWorstCaseError] = useState<string | null>(null);
  const [worstCasePending, startWorstCase] = useTransition();

  const [draftResult, setDraftResult] = useState<{ versionId: string } | null>(null);
  const [draftPending, startDraft] = useTransition();

  function updateCtx(patch: Partial<PricingContextValue>) {
    setCtx((c) => ({ ...c, ...patch }));
  }

  function buildContext(overridePrice?: number) {
    return {
      skuId,
      businessUnitId: ctx.businessUnitId,
      shopId: ctx.shopId || undefined,
      market: ctx.market || undefined,
      channel: ctx.channel || undefined,
      customerGroup: ctx.customerGroup || undefined,
      printArea: ctx.printArea || undefined,
      printTechnique: ctx.printTechnique || undefined,
      personalisation: ctx.personalisation || undefined,
      design: ctx.design || undefined,
      date: ctx.date ? `${ctx.date}:00Z` : undefined,
      quantity: parseInt(quantity, 10) || 1,
      overridePrice,
    };
  }

  function load() {
    startLoad(async () => {
      const { result, error } = await loadCurrentPriceAction(buildContext());
      setCurrent(result ?? null);
      setLoadError(error ?? null);
      setWorstCase(null);
      setWorstCaseError(null);
      setDraftResult(null);
      if (result) setSliderPrice(result.finalPrice);
    });
  }

  function checkWorstCase() {
    if (sliderPrice === null) return;
    startWorstCase(async () => {
      const { result, error } = await checkWorstCaseAction(buildContext(), sliderPrice);
      setWorstCase(result ?? null);
      setWorstCaseError(error ?? null);
    });
  }

  function draftChange() {
    if (sliderPrice === null || !current) return;
    startDraft(async () => {
      const result = await draftPriceChangeAction({
        skuId,
        businessUnitId: ctx.businessUnitId,
        shopId: ctx.shopId || undefined,
        price: sliderPrice,
        currency: current.currency,
      });
      setDraftResult(result);
    });
  }

  const parsedManualCost = manualCost ? parseFloat(manualCost) : undefined;
  const costProxy = parsedManualCost !== undefined && !Number.isNaN(parsedManualCost) ? parsedManualCost : current?.floor;
  const usingManualCost = parsedManualCost !== undefined && !Number.isNaN(parsedManualCost);
  const currentPrice = current?.finalPrice;

  const liveBreakEven = currentPrice !== undefined && sliderPrice !== null && costProxy !== undefined ? computeBreakEven(currentPrice, sliderPrice, costProxy) : null;
  const currentMarginPercent = currentPrice !== undefined && costProxy !== undefined && currentPrice > 0 ? ((currentPrice - costProxy) / currentPrice) * 100 : null;
  const newMarginPercent = sliderPrice !== null && costProxy !== undefined && sliderPrice > 0 ? ((sliderPrice - costProxy) / sliderPrice) * 100 : null;

  const sliderMin = currentPrice !== undefined ? Math.max(0, currentPrice * 0.5) : 0;
  const sliderMax = currentPrice !== undefined ? currentPrice * 1.5 : 100;

  return (
    <div className="space-y-4">
      <Card title="SKU & context">
        <div className="space-y-2 text-sm">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="border rounded px-2 py-1 bg-transparent flex-1 min-w-[16rem]">
              {skuOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                  {o.kvi ? " (KVI)" : ""}
                </option>
              ))}
            </select>
            <Field label="Quantity">
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} className="border rounded px-2 py-1 bg-transparent w-24" />
            </Field>
          </div>
          <PricingContextFields value={ctx} onChange={updateCtx} businessUnits={businessUnits} shops={shops} />
          <button disabled={loadPending} onClick={load} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 mt-2">
            {loadPending ? "Loading…" : "Load current price"}
          </button>
          {loadError && (
            <div className="mt-1">
              <Badge tone="critical">{loadError}</Badge>
            </div>
          )}
        </div>
      </Card>

      {current && sliderPrice !== null && (
        <>
          <Card title="Margin basis">
            {costProxy === undefined ? (
              <div className="space-y-2 text-sm">
                <Badge tone="critical">No floor set for this SKU - margin math can&apos;t compute without a cost basis.</Badge>
                <p className="text-xs text-neutral-500">
                  Set a floor on <span className="underline">Catalog &amp; Pricing</span>, or enter a cost below if you know the real number.
                </p>
                <Field label="Manual cost override (session only - never saved)">
                  <input value={manualCost} onChange={(e) => setManualCost(e.target.value)} type="number" step="0.01" placeholder="e.g. 8.50" className="border rounded px-2 py-1 bg-transparent w-40" />
                </Field>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-xs text-neutral-500">
                  {usingManualCost ? (
                    <>Using your entered cost <span className="font-medium text-neutral-700 dark:text-neutral-300">{costProxy.toFixed(2)}</span> instead of the floor proxy.</>
                  ) : (
                    <>
                      Using this SKU&apos;s floor (<span className="font-medium text-neutral-700 dark:text-neutral-300">{costProxy.toFixed(2)}</span>) as a proxy for cost - there&apos;s no
                      real cost data source yet.
                    </>
                  )}
                </p>
                <Field label="Manual cost override (session only - never saved)">
                  <input value={manualCost} onChange={(e) => setManualCost(e.target.value)} type="number" step="0.01" placeholder="overrides the floor proxy" className="border rounded px-2 py-1 bg-transparent w-40" />
                </Field>
              </div>
            )}
          </Card>

          <Card title="What if the price were…">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={0.01}
                  value={sliderPrice}
                  onChange={(e) => setSliderPrice(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={sliderPrice}
                  onChange={(e) => setSliderPrice(parseFloat(e.target.value) || 0)}
                  className="border rounded px-2 py-1 bg-transparent w-28"
                />
                <span className="text-xs text-neutral-500">{current.currency}</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Current price</div>
                <div className="font-medium">{current.currency} {currentPrice?.toFixed(2)}</div>
                <div>Margin $ delta</div>
                <div className={sliderPrice - (currentPrice ?? 0) < 0 ? "text-red-600" : "text-emerald-600"}>
                  {sliderPrice - (currentPrice ?? 0) >= 0 ? "+" : ""}
                  {(sliderPrice - (currentPrice ?? 0)).toFixed(2)}
                </div>
                {currentMarginPercent !== null && newMarginPercent !== null && (
                  <>
                    <div>Margin %</div>
                    <div>
                      {currentMarginPercent.toFixed(1)}% → {newMarginPercent.toFixed(1)}%
                    </div>
                  </>
                )}
                {current.floor !== undefined ? (
                  <>
                    <div>Distance to floor</div>
                    <div className={sliderPrice < current.floor ? "text-red-600 font-medium" : ""}>
                      {(sliderPrice - current.floor).toFixed(2)} ({(((sliderPrice - current.floor) / current.floor) * 100).toFixed(0)}% above floor)
                    </div>
                  </>
                ) : (
                  <>
                    <div>Distance to floor</div>
                    <div className="text-neutral-400 italic">no floor set</div>
                  </>
                )}
                <div>Required volume uplift to break even</div>
                <div>
                  {costProxy === undefined ? (
                    <span className="text-neutral-400 italic">no cost basis</span>
                  ) : liveBreakEven === null ? (
                    <span className="text-red-600 font-medium">this price sits at/below cost - no volume increase breaks even on a loss</span>
                  ) : (
                    `${liveBreakEven.requiredVolumeUpliftPercent >= 0 ? "+" : ""}${liveBreakEven.requiredVolumeUpliftPercent.toFixed(0)}%`
                  )}
                </div>
              </div>

              <div className="border-t border-black/10 dark:border-white/10 pt-2">
                <button disabled={worstCasePending} onClick={checkWorstCase} className="text-xs underline">
                  {worstCasePending ? "Checking…" : "Check worst-case stacking (runs the real engine)"}
                </button>
                {worstCaseError && (
                  <div className="mt-1">
                    <Badge tone="critical">{worstCaseError}</Badge>
                  </div>
                )}
                {worstCase && (
                  <div className="mt-2 text-xs space-y-1">
                    <div>
                      Realized price after every eligible discount stacks:{" "}
                      <span className="font-medium">{worstCase.currency} {worstCase.finalPrice.toFixed(2)}</span>
                      {worstCase.appliedDiscounts.length > 0 && ` (${worstCase.appliedDiscounts.map((d) => d.name).join(", ")})`}
                    </div>
                    {current.floor !== undefined && worstCase.finalPrice < current.floor && (
                      <Badge tone="critical">Worst case realized price is below the floor ({current.floor.toFixed(2)}).</Badge>
                    )}
                    {worstCase.warnings.map((w, i) => (
                      <Badge key={i} tone="warning">
                        {w}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-black/10 dark:border-white/10 pt-2">
                <button disabled={draftPending} onClick={draftChange} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5">
                  {draftPending ? "Drafting…" : "Draft this change"}
                </button>
                {draftResult && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Drafted (not yet live) - review and activate it on the <span className="underline">Version control &amp; scheduling</span> page.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {costProxy !== undefined && currentPrice !== undefined && (
            <Card title="Break-even at standard promo depths">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-neutral-500">
                  <tr>
                    <th className="pb-1">Depth</th>
                    <th className="pb-1">New price</th>
                    <th className="pb-1">Required volume uplift</th>
                  </tr>
                </thead>
                <tbody>
                  {STANDARD_DISCOUNT_DEPTHS_PERCENT.map((depth) => {
                    const newPrice = currentPrice * (1 - depth / 100);
                    const result = computeBreakEven(currentPrice, newPrice, costProxy);
                    return (
                      <tr key={depth} className="border-t border-black/5 dark:border-white/5">
                        <td className="py-1">{depth}% off</td>
                        <td className="py-1">{current.currency} {newPrice.toFixed(2)}</td>
                        <td className="py-1">
                          {result === null ? (
                            <span className="text-red-600">below cost</span>
                          ) : (
                            `+${result.requiredVolumeUpliftPercent.toFixed(0)}%`
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <Card title="What this panel doesn't do">
        <p className="text-xs text-neutral-500">
          This shows what volume change would be needed to break even on a price move - it does not estimate demand, predict elasticity, or forecast
          what will actually happen to sales. No elasticity model exists in this prototype; treat the uplift numbers above as a bar to clear, not a
          prediction.
        </p>
      </Card>
    </div>
  );
}
