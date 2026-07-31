"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop, ResolvedPrice } from "@/lib/types";
import { calculatePriceAction } from "@/lib/actions/calculator";
import { Badge, Card } from "@/components/ui";

export interface SkuOption {
  id: string;
  label: string;
}

export default function CalculatorForm({
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
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState("");
  const [market, setMarket] = useState("");
  const [channel, setChannel] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [printArea, setPrintArea] = useState("back");
  const [printTechnique, setPrintTechnique] = useState("flex");
  const [personalisation, setPersonalisation] = useState("");
  const [design, setDesign] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState<ResolvedPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const { result, error } = await calculatePriceAction({
        skuId,
        businessUnitId,
        shopId: shopId || undefined,
        market: market || undefined,
        channel: channel || undefined,
        customerGroup: customerGroup || undefined,
        quantity: quantity ? parseInt(quantity, 10) : 1,
        printArea: printArea || undefined,
        printTechnique: printTechnique || undefined,
        personalisation: personalisation || undefined,
        design: design || undefined,
        date: date ? `${date}:00Z` : undefined,
      });
      setResult(result ?? null);
      setError(error ?? null);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Pricing request">
        <div className="space-y-2 text-sm">
          <Field label="SKU">
            <select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
              {skuOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Market"><input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="DE" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Channel"><input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="web" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Customer group"><input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="loyalty-gold" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Quantity"><input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Print area"><input value={printArea} onChange={(e) => setPrintArea(e.target.value)} placeholder="back" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Print technique"><input value={printTechnique} onChange={(e) => setPrintTechnique(e.target.value)} placeholder="flex / embroidery" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Personalisation"><input value={personalisation} onChange={(e) => setPersonalisation(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="Design"><input value={design} onChange={(e) => setDesign(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
            <Field label="As-of date/time (UTC)"><input value={date} onChange={(e) => setDate(e.target.value)} type="datetime-local" className="border rounded px-2 py-1 bg-transparent w-full" /></Field>
          </div>
          <button disabled={pending} onClick={run} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 mt-2">
            {pending ? "Resolving…" : "Resolve price"}
          </button>
        </div>
      </Card>

      <Card title="Resolution trace">
        {error && <Badge tone="critical">{error}</Badge>}
        {result && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Base price</div>
              <div>{result.currency} {result.basePrice.toFixed(2)} ({result.basePriceSource})</div>
              <div>Rule-adjusted</div>
              <div>{result.currency} {result.ruleAdjustedPrice.toFixed(2)}</div>
              <div>Components total</div>
              <div>+{result.currency} {result.componentsTotal.toFixed(2)}</div>
              <div>Discount total</div>
              <div>-{result.currency} {result.discountTotal.toFixed(2)}</div>
              <div className="font-medium">Final price</div>
              <div className="font-medium">{result.currency} {result.finalPrice.toFixed(2)}</div>
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((w, i) => (
                  <Badge key={i} tone="warning">
                    {w}
                  </Badge>
                ))}
              </div>
            )}
            <ol className="space-y-1 text-xs border-t border-black/10 dark:border-white/10 pt-2">
              {result.trace.map((step, i) => (
                <li key={i}>
                  <span className="font-medium">{step.label}:</span> {step.detail}
                </li>
              ))}
            </ol>
          </div>
        )}
        {!result && !error && <p className="text-sm text-neutral-500 italic">Run a pricing request to see the trace.</p>}
      </Card>
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
