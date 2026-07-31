"use client";

import { useState, useTransition } from "react";
import type { Bundle, BundleComponent, BusinessUnit } from "@/lib/types";
import { saveBundleAction, deleteBundleAction } from "@/lib/actions/bundles";
import { Badge, Card } from "@/components/ui";
import type { SkuOption } from "@/components/CalculatorForm";

export default function BundleEditor({
  bundles,
  skuOptions,
  businessUnits,
}: {
  bundles: Bundle[];
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Bundles (fixed composition -> fixed price)"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New bundle
          </button>
        )
      }
    >
      {editing === "new" && <BundleForm skuOptions={skuOptions} businessUnits={businessUnits} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {bundles.map((b) =>
          editing === b.id ? (
            <BundleForm key={b.id} skuOptions={skuOptions} businessUnits={businessUnits} initial={b} onDone={() => setEditing(null)} />
          ) : (
            <div key={b.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{b.name}</span> <Badge tone="approved">priority {b.priority}</Badge>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {b.components.map((c) => `${c.quantity}x ${skuOptions.find((s) => s.id === c.skuId)?.label ?? c.skuId}`).join(" + ")} = {b.currency}{" "}
                  {b.bundlePrice.toFixed(2)}
                  {b.validFrom || b.validTo ? ` · valid ${b.validFrom ?? "…"} → ${b.validTo ?? "…"}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(b.id)}>
                  edit
                </button>
                <DeleteButton id={b.id} />
              </div>
            </div>
          ),
        )}
      </div>
    </Card>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteBundleAction(id))}>
      delete
    </button>
  );
}

function BundleForm({
  skuOptions,
  businessUnits,
  initial,
  onDone,
}: {
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
  initial?: Bundle;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [components, setComponents] = useState<BundleComponent[]>(initial?.components ?? [{ skuId: skuOptions[0]?.id ?? "", quantity: 1 }]);
  const [bundlePrice, setBundlePrice] = useState(initial?.bundlePrice?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [markets, setMarkets] = useState((initial?.eligibility.markets ?? []).join(", "));
  const [customerGroups, setCustomerGroups] = useState((initial?.eligibility.customerGroups ?? []).join(", "));
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "10");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await saveBundleAction({
        id: initial?.id,
        name,
        businessUnitId,
        components,
        bundlePrice: parseFloat(bundlePrice),
        currency,
        eligibility: {
          markets: markets ? markets.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
          customerGroups: customerGroups ? customerGroups.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
        },
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        priority: parseInt(priority, 10),
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          {businessUnits.map((bu) => (
            <option key={bu.id} value={bu.id}>
              {bu.name}
            </option>
          ))}
        </select>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CCY" className="border rounded px-1 py-0.5 bg-transparent w-14" />
        <input value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} type="number" step="0.01" placeholder="bundle price" className="border rounded px-1 py-0.5 bg-transparent w-24" />
        <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" placeholder="priority" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>

      <div className="space-y-1">
        <div className="text-neutral-500">composition (exact quantities required):</div>
        {components.map((c, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              value={c.quantity}
              onChange={(e) => setComponents(components.map((cc, ci) => (ci === i ? { ...cc, quantity: parseInt(e.target.value, 10) || 1 } : cc)))}
              type="number"
              min={1}
              className="border rounded px-1 py-0.5 bg-transparent w-14"
            />
            <span>x</span>
            <select
              value={c.skuId}
              onChange={(e) => setComponents(components.map((cc, ci) => (ci === i ? { ...cc, skuId: e.target.value } : cc)))}
              className="border rounded px-1 py-0.5 bg-transparent"
            >
              {skuOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button onClick={() => setComponents(components.filter((_, ci) => ci !== i))} className="text-red-600">
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => setComponents([...components, { skuId: skuOptions[0]?.id ?? "", quantity: 1 }])} className="underline text-neutral-500">
          + item
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="markets (comma-separated)" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <input value={customerGroups} onChange={(e) => setCustomerGroups(e.target.value)} placeholder="customer groups" className="border rounded px-1 py-0.5 bg-transparent w-40" />
        <input value={validFrom} onChange={(e) => setValidFrom(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <input value={validTo} onChange={(e) => setValidTo(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
      </div>

      <div className="flex gap-2">
        <button disabled={pending || !name || !bundlePrice || components.length === 0} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
