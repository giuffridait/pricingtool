"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop, CatalogLevel, PriceOverride } from "@/lib/types";
import { savePriceOverrideAction, deletePriceOverrideAction } from "@/lib/actions/catalog";
import { Badge, Button } from "@/components/ui";

export default function PriceOverrideEditor({
  level,
  refId,
  businessUnits,
  shops,
  overrides,
  defaultOpen = false,
}: {
  level: CatalogLevel;
  refId: string;
  businessUnits: BusinessUnit[];
  shops: Shop[];
  overrides: PriceOverride[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Button variant={overrides.length > 0 ? "secondary" : "primary"} onClick={() => setOpen(!open)}>
        {open ? "Hide price editor" : overrides.length > 0 ? `Edit price (${overrides.length} set)` : "Set price"}
      </Button>
      {open && (
        <div className="space-y-1.5 pl-2 border-l-2 border-black/15 dark:border-white/20 mt-1.5">
          {overrides.length === 0 && <div className="text-xs text-neutral-500 italic">No price set at this level — inheriting from parent.</div>}
          {overrides.map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-xs">
              {editingId === o.id ? (
                <OverrideForm
                  level={level}
                  refId={refId}
                  businessUnits={businessUnits}
                  shops={shops}
                  initial={o}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <>
                  <Badge tone={o.shopId ? "active" : "draft"}>{o.shopId ? shops.find((s) => s.id === o.shopId)?.name : "BU-wide"}</Badge>
                  <span>
                    {o.currency} {o.price.toFixed(2)}
                    {o.floor !== undefined ? ` · floor ${o.floor}` : ""}
                    {o.ceiling !== undefined ? ` · ceiling ${o.ceiling}` : ""}
                  </span>
                  <Button onClick={() => setEditingId(o.id)}>Edit</Button>
                  <Button variant="danger" disabled={pending} onClick={() => startTransition(() => deletePriceOverrideAction(o.id))}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          ))}
          {adding ? (
            <OverrideForm level={level} refId={refId} businessUnits={businessUnits} shops={shops} onDone={() => setAdding(false)} />
          ) : (
            <Button variant="primary" onClick={() => setAdding(true)}>
              + Add price
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function OverrideForm({
  level,
  refId,
  businessUnits,
  shops,
  initial,
  onDone,
}: {
  level: CatalogLevel;
  refId: string;
  businessUnits: BusinessUnit[];
  shops: Shop[];
  initial?: PriceOverride;
  onDone: () => void;
}) {
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState(initial?.shopId ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [floor, setFloor] = useState(initial?.floor?.toString() ?? "");
  const [ceiling, setCeiling] = useState(initial?.ceiling?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await savePriceOverrideAction({
        id: initial?.id,
        level,
        refId,
        businessUnitId,
        shopId: shopId || undefined,
        price: parseFloat(price),
        currency,
        floor: floor ? parseFloat(floor) : undefined,
        ceiling: ceiling ? parseFloat(ceiling) : undefined,
      });
      onDone();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 dark:bg-white/10 border border-black/15 dark:border-white/20 rounded p-1.5">
      <select
        value={businessUnitId}
        onChange={(e) => setBusinessUnitId(e.target.value)}
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 bg-white dark:bg-neutral-900"
      >
        {businessUnits.map((bu) => (
          <option key={bu.id} value={bu.id}>
            {bu.name}
          </option>
        ))}
      </select>
      <select
        value={shopId}
        onChange={(e) => setShopId(e.target.value)}
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 bg-white dark:bg-neutral-900"
      >
        <option value="">BU-wide</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 w-14 bg-white dark:bg-neutral-900"
        placeholder="CCY"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        step="0.01"
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 w-20 bg-white dark:bg-neutral-900"
        placeholder="price"
      />
      <input
        value={floor}
        onChange={(e) => setFloor(e.target.value)}
        type="number"
        step="0.01"
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 w-16 bg-white dark:bg-neutral-900"
        placeholder="floor"
      />
      <input
        value={ceiling}
        onChange={(e) => setCeiling(e.target.value)}
        type="number"
        step="0.01"
        className="border border-black/20 dark:border-white/25 rounded px-1 py-0.5 w-16 bg-white dark:bg-neutral-900"
        placeholder="ceiling"
      />
      <Button variant="primary" disabled={pending || !price} onClick={submit}>
        Save
      </Button>
      <Button onClick={onDone}>Cancel</Button>
    </div>
  );
}
