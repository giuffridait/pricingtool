"use client";

import { useState, useTransition } from "react";
import type { MixAndMatchSet, BusinessUnit, ProductGroup, Product } from "@/lib/types";
import { saveMixAndMatchAction, deleteMixAndMatchAction } from "@/lib/actions/mixAndMatch";
import { Badge, Card } from "@/components/ui";

export default function MixAndMatchEditor({
  sets,
  productGroups,
  products,
  businessUnits,
}: {
  sets: MixAndMatchSet[];
  productGroups: ProductGroup[];
  products: Product[];
  businessUnits: BusinessUnit[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  function groupLabel(set: MixAndMatchSet): string {
    if (set.group.productGroupId) return `any from ${productGroups.find((g) => g.id === set.group.productGroupId)?.name ?? set.group.productGroupId}`;
    return `any from [${(set.group.productIds ?? []).map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}]`;
  }

  return (
    <Card
      title="Mix-and-match (any N from a group -> flat set price)"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New set
          </button>
        )
      }
    >
      {editing === "new" && <SetForm productGroups={productGroups} products={products} businessUnits={businessUnits} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {sets.map((s) =>
          editing === s.id ? (
            <SetForm key={s.id} productGroups={productGroups} products={products} businessUnits={businessUnits} initial={s} onDone={() => setEditing(null)} />
          ) : (
            <div key={s.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{s.name}</span> <Badge tone="approved">priority {s.priority}</Badge>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {groupLabel(s)}: any {s.requiredCount} for {s.currency} {s.setPrice.toFixed(2)}
                  {s.validFrom || s.validTo ? ` · valid ${s.validFrom ?? "…"} → ${s.validTo ?? "…"}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(s.id)}>
                  edit
                </button>
                <DeleteButton id={s.id} />
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
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteMixAndMatchAction(id))}>
      delete
    </button>
  );
}

function SetForm({
  productGroups,
  products,
  businessUnits,
  initial,
  onDone,
}: {
  productGroups: ProductGroup[];
  products: Product[];
  businessUnits: BusinessUnit[];
  initial?: MixAndMatchSet;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [groupMode, setGroupMode] = useState<"productGroup" | "products">(initial?.group.productGroupId ? "productGroup" : "products");
  const [productGroupId, setProductGroupId] = useState(initial?.group.productGroupId ?? productGroups[0]?.id ?? "");
  const [productIds, setProductIds] = useState<string[]>(initial?.group.productIds ?? []);
  const [requiredCount, setRequiredCount] = useState(initial?.requiredCount?.toString() ?? "3");
  const [setPrice, setSetPrice] = useState(initial?.setPrice?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [markets, setMarkets] = useState((initial?.eligibility.markets ?? []).join(", "));
  const [customerGroups, setCustomerGroups] = useState((initial?.eligibility.customerGroups ?? []).join(", "));
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "10");
  const [pending, startTransition] = useTransition();

  function toggleProduct(id: string) {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    startTransition(async () => {
      await saveMixAndMatchAction({
        id: initial?.id,
        name,
        businessUnitId,
        group: groupMode === "productGroup" ? { productGroupId } : { productIds },
        requiredCount: parseInt(requiredCount, 10),
        setPrice: parseFloat(setPrice),
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
        <input value={requiredCount} onChange={(e) => setRequiredCount(e.target.value)} type="number" min={2} placeholder="required count" className="border rounded px-1 py-0.5 bg-transparent w-24" />
        <input value={setPrice} onChange={(e) => setSetPrice(e.target.value)} type="number" step="0.01" placeholder="set price" className="border rounded px-1 py-0.5 bg-transparent w-24" />
        <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" placeholder="priority" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>

      <div className="space-y-1">
        <div className="flex gap-3 items-center">
          <label>
            <input type="radio" checked={groupMode === "productGroup"} onChange={() => setGroupMode("productGroup")} /> whole product group
          </label>
          <label>
            <input type="radio" checked={groupMode === "products"} onChange={() => setGroupMode("products")} /> specific products
          </label>
        </div>
        {groupMode === "productGroup" ? (
          <select value={productGroupId} onChange={(e) => setProductGroupId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
            {productGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <label key={p.id} className={`border rounded px-1.5 py-0.5 ${productIds.includes(p.id) ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`}>
                <input type="checkbox" className="hidden" checked={productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="markets (comma-separated)" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <input value={customerGroups} onChange={(e) => setCustomerGroups(e.target.value)} placeholder="customer groups" className="border rounded px-1 py-0.5 bg-transparent w-40" />
        <input value={validFrom} onChange={(e) => setValidFrom(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <input value={validTo} onChange={(e) => setValidTo(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
      </div>

      <div className="flex gap-2">
        <button disabled={pending || !name || !setPrice} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
