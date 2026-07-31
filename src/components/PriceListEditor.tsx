"use client";

import { useState, useTransition } from "react";
import type { PriceList, PriceListEntry, BusinessUnit } from "@/lib/types";
import { savePriceListAction, deletePriceListAction } from "@/lib/actions/priceLists";
import { Badge, Card } from "@/components/ui";
import type { SkuOption } from "@/components/CalculatorForm";

export default function PriceListEditor({
  priceLists,
  skuOptions,
  businessUnits,
}: {
  priceLists: PriceList[];
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="B2B / customer-group price lists"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New price list
          </button>
        )
      }
    >
      {editing === "new" && <ListForm skuOptions={skuOptions} businessUnits={businessUnits} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {priceLists.map((l) =>
          editing === l.id ? (
            <ListForm key={l.id} skuOptions={skuOptions} businessUnits={businessUnits} initial={l} onDone={() => setEditing(null)} />
          ) : (
            <div key={l.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{l.name}</span> <Badge>{l.customerGroup}</Badge> <Badge tone="approved">priority {l.priority}</Badge>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {businessUnits.find((bu) => bu.id === l.businessUnitId)?.name ?? l.businessUnitId} · {l.entries.length} SKU override
                  {l.entries.length === 1 ? "" : "s"}
                  {l.validFrom || l.validTo ? ` · valid ${l.validFrom ?? "…"} → ${l.validTo ?? "…"}` : ""}
                </div>
                <div className="text-xs text-neutral-500">
                  {l.entries
                    .slice(0, 4)
                    .map((e) => `${skuOptions.find((s) => s.id === e.skuId)?.label ?? e.skuId} = ${l.currency} ${e.price.toFixed(2)}`)
                    .join(", ")}
                  {l.entries.length > 4 ? ", …" : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(l.id)}>
                  edit
                </button>
                <DeleteButton id={l.id} />
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
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deletePriceListAction(id))}>
      delete
    </button>
  );
}

function ListForm({
  skuOptions,
  businessUnits,
  initial,
  onDone,
}: {
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
  initial?: PriceList;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [customerGroup, setCustomerGroup] = useState(initial?.customerGroup ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "10");
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [entries, setEntries] = useState<PriceListEntry[]>(initial?.entries ?? [{ skuId: skuOptions[0]?.id ?? "", price: 0 }]);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await savePriceListAction({
        id: initial?.id,
        name,
        businessUnitId,
        customerGroup,
        currency,
        priority: parseInt(priority, 10),
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        entries,
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
        <input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="customer group, e.g. wholesale-partner" className="border rounded px-1 py-0.5 bg-transparent w-56" />
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CCY" className="border rounded px-1 py-0.5 bg-transparent w-16" />
        <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" placeholder="priority" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>

      <div className="space-y-1">
        <div className="text-neutral-500">SKU price overrides:</div>
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <select
              value={entry.skuId}
              onChange={(e) => setEntries(entries.map((en, ei) => (ei === i ? { ...en, skuId: e.target.value } : en)))}
              className="border rounded px-1 py-0.5 bg-transparent"
            >
              {skuOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              value={entry.price}
              onChange={(e) => setEntries(entries.map((en, ei) => (ei === i ? { ...en, price: parseFloat(e.target.value) || 0 } : en)))}
              type="number"
              step="0.01"
              className="border rounded px-1 py-0.5 bg-transparent w-24"
            />
            <button onClick={() => setEntries(entries.filter((_, ei) => ei !== i))} className="text-red-600">
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => setEntries([...entries, { skuId: skuOptions[0]?.id ?? "", price: 0 }])} className="underline text-neutral-500">
          + entry
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input value={validFrom} onChange={(e) => setValidFrom(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <input value={validTo} onChange={(e) => setValidTo(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
      </div>

      <div className="flex gap-2">
        <button disabled={pending || !name || !customerGroup} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
