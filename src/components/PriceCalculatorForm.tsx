"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop, ResolvedPrice } from "@/lib/types";
import { calculatePriceAction } from "@/lib/actions/calculator";
import { calculateBasketAction } from "@/lib/actions/basket";
import type { PresentationResult } from "@/lib/engine/presentation";
import type { BasketResult } from "@/lib/engine/basket";
import { Badge, Card } from "@/components/ui";
import PresentationTile from "@/components/PresentationTile";

export interface SkuOption {
  id: string;
  label: string;
}

export default function PriceCalculatorForm({
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
  const [lines, setLines] = useState<{ skuId: string; quantity: number }[]>([
    { skuId: initialSkuId ?? skuOptions[0]?.id ?? "", quantity: 1 },
  ]);
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState("");
  const [market, setMarket] = useState("");
  const [channel, setChannel] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [printArea, setPrintArea] = useState("back");
  const [printTechnique, setPrintTechnique] = useState("flex");
  const [personalisation, setPersonalisation] = useState("");
  const [design, setDesign] = useState("");
  const [date, setDate] = useState("");
  const [singleResult, setSingleResult] = useState<ResolvedPrice | null>(null);
  const [presentation, setPresentation] = useState<PresentationResult | null>(null);
  const [basketResult, setBasketResult] = useState<BasketResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isBasket = lines.length > 1;

  function addLine() {
    setLines([...lines, { skuId: skuOptions[0]?.id ?? "", quantity: 1 }]);
  }
  function updateLine(i: number, patch: Partial<{ skuId: string; quantity: number }>) {
    setLines(lines.map((l, li) => (li === i ? { ...l, ...patch } : l)));
  }

  function run() {
    startTransition(async () => {
      const shared = {
        businessUnitId,
        shopId: shopId || undefined,
        market: market || undefined,
        channel: channel || undefined,
        customerGroup: customerGroup || undefined,
        printArea: printArea || undefined,
        printTechnique: printTechnique || undefined,
        personalisation: personalisation || undefined,
        design: design || undefined,
        date: date ? `${date}:00Z` : undefined,
      };

      if (isBasket) {
        const { result, error } = await calculateBasketAction({ lines, shared });
        setBasketResult(result ?? null);
        setSingleResult(null);
        setPresentation(null);
        setError(error ?? null);
      } else {
        const { result, presentation, error } = await calculatePriceAction({
          ...shared,
          skuId: lines[0].skuId,
          quantity: lines[0].quantity,
        });
        setSingleResult(result ?? null);
        setPresentation(presentation ?? null);
        setBasketResult(null);
        setError(error ?? null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Pricing request">
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
              {lines.length > 1 && (
                <button onClick={() => setLines(lines.filter((_, li) => li !== i))} className="text-red-600 text-xs">
                  remove
                </button>
              )}
            </div>
          ))}
          <button onClick={addLine} className="text-xs underline text-neutral-500">
            + add line {lines.length === 1 && "(turns this into a basket)"}
          </button>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <Field label="Business unit">
              <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Shop">
              <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
                <option value="">none (BU-wide)</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Market"><input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="DE" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Channel"><input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="web" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Customer group"><input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="loyalty-gold" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="As-of date/time (UTC)"><input value={date} onChange={(e) => setDate(e.target.value)} type="datetime-local" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Print area"><input value={printArea} onChange={(e) => setPrintArea(e.target.value)} placeholder="back" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Print technique"><input value={printTechnique} onChange={(e) => setPrintTechnique(e.target.value)} placeholder="flex / embroidery" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Personalisation"><input value={personalisation} onChange={(e) => setPersonalisation(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Design"><input value={design} onChange={(e) => setDesign(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
          </div>
          {lines.length > 1 && (
            <p className="text-xs text-neutral-400">Print area/technique/personalisation/design apply to every line in a basket request.</p>
          )}
          <button disabled={pending} onClick={run} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 mt-2">
            {pending ? "Resolving…" : isBasket ? "Resolve basket" : "Resolve price"}
          </button>
        </div>
      </Card>

      {error && (
        <Card>
          <Badge tone="critical">{error}</Badge>
        </Card>
      )}

      {!isBasket && (singleResult || (!error && !basketResult)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Resolution trace">
            {singleResult ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>Base price</div>
                  <div>{singleResult.currency} {singleResult.basePrice.toFixed(2)} ({singleResult.basePriceSource})</div>
                  <div>Rule-adjusted</div>
                  <div>{singleResult.currency} {singleResult.ruleAdjustedPrice.toFixed(2)}</div>
                  <div>Components total</div>
                  <div>+{singleResult.currency} {singleResult.componentsTotal.toFixed(2)}</div>
                  <div>Discount total</div>
                  <div>-{singleResult.currency} {singleResult.discountTotal.toFixed(2)}</div>
                  <div className="font-medium">Final price</div>
                  <div className="font-medium">{singleResult.currency} {singleResult.finalPrice.toFixed(2)}</div>
                </div>
                {singleResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    {singleResult.warnings.map((w, i) => (
                      <Badge key={i} tone="warning">
                        {w}
                      </Badge>
                    ))}
                  </div>
                )}
                <ol className="space-y-1 text-xs border-t border-black/10 dark:border-white/10 pt-2">
                  {singleResult.trace.map((step, i) => (
                    <li key={i}>
                      <span className="font-medium">{step.label}:</span> {step.detail}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">Run a pricing request to see the trace.</p>
            )}
          </Card>

          <Card title="Customer-facing view">
            {presentation ? (
              <PresentationTile presentation={presentation} />
            ) : (
              <p className="text-sm text-neutral-500 italic">Shows how this price would render on a product page - RRP strikethrough, badge, and savings messaging.</p>
            )}
          </Card>
        </div>
      )}

      {isBasket && (
        <Card title="Basket result">
          {basketResult ? (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                {basketResult.lines.map((l) => (
                  <div key={l.skuId} className="flex justify-between text-xs">
                    <span>
                      {l.quantity}x {skuOptions.find((o) => o.id === l.skuId)?.label ?? l.skuId}
                    </span>
                    <span>
                      {basketResult.currency} {l.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              {basketResult.bundleApplications.length > 0 && (
                <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
                  {basketResult.bundleApplications.map((b) => (
                    <div key={b.bundleId} className="text-xs flex justify-between">
                      <span>
                        Bundle &quot;{b.name}&quot; x{b.timesApplied}
                      </span>
                      <span>
                        {basketResult.currency} {b.bundleTotal.toFixed(2)} (saved {basketResult.currency} {b.savedAmount.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {basketResult.mixAndMatchApplications.length > 0 && (
                <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
                  {basketResult.mixAndMatchApplications.map((m) => (
                    <div key={m.setId} className="text-xs flex justify-between">
                      <span>
                        Mix-and-match &quot;{m.name}&quot; x{m.timesApplied}
                      </span>
                      <span>
                        {basketResult.currency} {m.setTotal.toFixed(2)} (saved {basketResult.currency} {m.savedAmount.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {basketResult.basketDiscount && (
                <div className="text-xs flex justify-between border-t border-black/10 dark:border-white/10 pt-2">
                  <span>Basket discount &quot;{basketResult.basketDiscount.name}&quot;</span>
                  <span>
                    -{basketResult.currency} {basketResult.basketDiscount.amount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-black/10 dark:border-white/10 pt-2">
                <span>Order total</span>
                <span>
                  {basketResult.currency} {basketResult.total.toFixed(2)}
                </span>
              </div>
              <ol className="space-y-1 text-xs border-t border-black/10 dark:border-white/10 pt-2">
                {basketResult.trace.map((step, i) => (
                  <li key={i}>
                    <span className="font-medium">{step.label}:</span> {step.detail}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-neutral-500 italic">Resolve to see the basket breakdown.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-0.5">{label}</span>
      {children}
    </label>
  );
}
