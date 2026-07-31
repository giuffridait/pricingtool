"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop } from "@/lib/types";
import { calculateBasketAction } from "@/lib/actions/basket";
import type { BasketResult } from "@/lib/engine/basket";
import { Badge, Card } from "@/components/ui";
import type { SkuOption } from "@/components/CalculatorForm";

export default function BasketCalculatorForm({
  skuOptions,
  businessUnits,
  shops,
}: {
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
}) {
  const [lines, setLines] = useState<{ skuId: string; quantity: number }[]>([{ skuId: skuOptions[0]?.id ?? "", quantity: 1 }]);
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState("");
  const [market, setMarket] = useState("");
  const [channel, setChannel] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState<BasketResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addLine() {
    setLines([...lines, { skuId: skuOptions[0]?.id ?? "", quantity: 1 }]);
  }
  function updateLine(i: number, patch: Partial<{ skuId: string; quantity: number }>) {
    setLines(lines.map((l, li) => (li === i ? { ...l, ...patch } : l)));
  }

  function run() {
    startTransition(async () => {
      const { result, error } = await calculateBasketAction({
        lines,
        shared: {
          businessUnitId,
          shopId: shopId || undefined,
          market: market || undefined,
          channel: channel || undefined,
          customerGroup: customerGroup || undefined,
          date: date ? `${date}:00Z` : undefined,
        },
      });
      setResult(result ?? null);
      setError(error ?? null);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Basket">
        <div className="space-y-2 text-sm">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={line.skuId} onChange={(e) => updateLine(i, { skuId: e.target.value })} className="border rounded px-2 py-1 bg-transparent flex-1">
                {skuOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value, 10) || 1 })}
                type="number"
                min={1}
                className="border rounded px-2 py-1 bg-transparent w-20"
              />
              <button onClick={() => setLines(lines.filter((_, li) => li !== i))} className="text-red-600 text-xs">
                remove
              </button>
            </div>
          ))}
          <button onClick={addLine} className="text-xs underline text-neutral-500">
            + add line
          </button>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">Business unit</span>
              <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">Shop</span>
              <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
                <option value="">none (BU-wide)</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">Market</span>
              <input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="DE" className="border rounded px-2 py-1 bg-transparent w-full" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">Channel</span>
              <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="web" className="border rounded px-2 py-1 bg-transparent w-full" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">Customer group</span>
              <input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="loyalty-gold" className="border rounded px-2 py-1 bg-transparent w-full" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-0.5">As-of date/time (UTC)</span>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="datetime-local" className="border rounded px-2 py-1 bg-transparent w-full" />
            </label>
          </div>
          <button disabled={pending || lines.length === 0} onClick={run} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 mt-2">
            {pending ? "Resolving…" : "Resolve basket"}
          </button>
        </div>
      </Card>

      <Card title="Basket result">
        {error && <Badge tone="critical">{error}</Badge>}
        {result && (
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              {result.lines.map((l) => (
                <div key={l.skuId} className="flex justify-between text-xs">
                  <span>
                    {l.quantity}x {skuOptions.find((o) => o.id === l.skuId)?.label ?? l.skuId}
                  </span>
                  <span>
                    {result.currency} {l.lineTotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {result.bundleApplications.length > 0 && (
              <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
                {result.bundleApplications.map((b) => (
                  <div key={b.bundleId} className="text-xs flex justify-between">
                    <span>
                      Bundle &quot;{b.name}&quot; x{b.timesApplied}
                    </span>
                    <span>
                      {result.currency} {b.bundleTotal.toFixed(2)} (saved {result.currency} {b.savedAmount.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.mixAndMatchApplications.length > 0 && (
              <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
                {result.mixAndMatchApplications.map((m) => (
                  <div key={m.setId} className="text-xs flex justify-between">
                    <span>
                      Mix-and-match &quot;{m.name}&quot; x{m.timesApplied}
                    </span>
                    <span>
                      {result.currency} {m.setTotal.toFixed(2)} (saved {result.currency} {m.savedAmount.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.basketDiscount && (
              <div className="text-xs flex justify-between border-t border-black/10 dark:border-white/10 pt-2">
                <span>Basket discount &quot;{result.basketDiscount.name}&quot;</span>
                <span>
                  -{result.currency} {result.basketDiscount.amount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t border-black/10 dark:border-white/10 pt-2">
              <span>Order total</span>
              <span>
                {result.currency} {result.total.toFixed(2)}
              </span>
            </div>
            <ol className="space-y-1 text-xs border-t border-black/10 dark:border-white/10 pt-2">
              {result.trace.map((step, i) => (
                <li key={i}>
                  <span className="font-medium">{step.label}:</span> {step.detail}
                </li>
              ))}
            </ol>
          </div>
        )}
        {!result && !error && <p className="text-sm text-neutral-500 italic">Add lines and resolve to see the basket breakdown.</p>}
      </Card>
    </div>
  );
}
