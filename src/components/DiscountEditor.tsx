"use client";

import { useState, useTransition } from "react";
import type { Discount, DiscountType, VolumeTier, BasketTier, PricingCalendar } from "@/lib/types";
import { saveDiscountAction, deleteDiscountAction } from "@/lib/actions/discounts";
import { Badge, Card } from "@/components/ui";

const TYPES: DiscountType[] = ["percentOff", "amountOff", "fixedPrice", "volumeTier", "bogo", "basketValue"];

export interface ScopeOption {
  label: string;
  level: "productGroup" | "product" | "variant" | "sku";
  id: string;
}

export default function DiscountEditor({
  discounts,
  scopeOptions,
  calendars,
}: {
  discounts: Discount[];
  scopeOptions: ScopeOption[];
  calendars: PricingCalendar[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Discounts"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New discount
          </button>
        )
      }
    >
      {editing === "new" && <DiscountForm scopeOptions={scopeOptions} calendars={calendars} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {discounts.map((d) =>
          editing === d.id ? (
            <DiscountForm key={d.id} scopeOptions={scopeOptions} calendars={calendars} initial={d} onDone={() => setEditing(null)} />
          ) : (
            <div key={d.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{d.name}</span>{" "}
                <Badge>{d.type}</Badge> <Badge tone="draft">stack: {d.stackingGroup}</Badge>{" "}
                <Badge tone="approved">priority {d.priority}</Badge>
                {d.badge && <Badge tone="warning">{d.badge}</Badge>}
                <div className="text-xs text-neutral-500 mt-0.5">
                  scope: {scopeLabel(d, scopeOptions)} · eligibility:{" "}
                  {[...(d.eligibility.markets ?? []), ...(d.eligibility.customerGroups ?? [])].join(", ") || "everyone"} · valid:{" "}
                  {d.validFrom ?? "always"} → {d.validTo ?? "always"}
                  {d.calendarId && ` · calendar: ${calendars.find((c) => c.id === d.calendarId)?.name ?? d.calendarId}`}
                  {d.type === "volumeTier" && d.tiers && ` · tiers: ${d.tiers.map((t) => `${t.minQty}+`).join(", ")}`}
                  {d.type === "bogo" && d.bogo && ` · buy ${d.bogo.buyQty} pay ${d.bogo.payQty}`}
                  {d.type === "basketValue" && d.basketTiers && ` · tiers: ${d.basketTiers.map((t) => `${t.minOrderValue}+`).join(", ")}`}
                  {(d.type === "percentOff" || d.type === "amountOff" || d.type === "fixedPrice") && ` · value ${d.value}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(d.id)}>
                  edit
                </button>
                <DeleteButton id={d.id} />
              </div>
            </div>
          ),
        )}
      </div>
    </Card>
  );
}

function scopeLabel(d: Discount, options: ScopeOption[]) {
  const id = d.scope.skuId ?? d.scope.variantId ?? d.scope.productId ?? d.scope.productGroupId;
  if (!id) return "global";
  return options.find((o) => o.id === id)?.label ?? id;
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteDiscountAction(id))}>
      delete
    </button>
  );
}

function DiscountForm({
  scopeOptions,
  calendars,
  initial,
  onDone,
}: {
  scopeOptions: ScopeOption[];
  calendars: PricingCalendar[];
  initial?: Discount;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<DiscountType>(initial?.type ?? "percentOff");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [tiers, setTiers] = useState<VolumeTier[]>(initial?.tiers ?? [{ minQty: 1 }]);
  const [buyQty, setBuyQty] = useState(initial?.bogo?.buyQty?.toString() ?? "3");
  const [payQty, setPayQty] = useState(initial?.bogo?.payQty?.toString() ?? "2");
  const [basketTiers, setBasketTiers] = useState<BasketTier[]>(initial?.basketTiers ?? [{ minOrderValue: 0 }]);
  const [scopeId, setScopeId] = useState(initial?.scope.skuId ?? initial?.scope.variantId ?? initial?.scope.productId ?? initial?.scope.productGroupId ?? "");
  const [markets, setMarkets] = useState((initial?.eligibility.markets ?? []).join(", "));
  const [customerGroups, setCustomerGroups] = useState((initial?.eligibility.customerGroups ?? []).join(", "));
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [calendarId, setCalendarId] = useState(initial?.calendarId ?? "");
  const [stackingGroup, setStackingGroup] = useState(initial?.stackingGroup ?? "");
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "10");
  const [badge, setBadge] = useState(initial?.badge ?? "");
  const [pending, startTransition] = useTransition();

  function scopeFromId(id: string) {
    const opt = scopeOptions.find((o) => o.id === id);
    if (!opt) return {};
    return { [`${opt.level}Id`]: opt.id };
  }

  function submit() {
    startTransition(async () => {
      await saveDiscountAction({
        id: initial?.id,
        name,
        type,
        value: ["percentOff", "amountOff", "fixedPrice"].includes(type) ? parseFloat(value) : undefined,
        tiers: type === "volumeTier" ? tiers : undefined,
        bogo: type === "bogo" ? { buyQty: parseInt(buyQty, 10), payQty: parseInt(payQty, 10), cheapestFree: true } : undefined,
        basketTiers: type === "basketValue" ? basketTiers : undefined,
        scope: scopeFromId(scopeId),
        eligibility: {
          markets: markets ? markets.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
          customerGroups: customerGroups ? customerGroups.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
        },
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        calendarId: calendarId || undefined,
        stackingGroup,
        priority: parseInt(priority, 10),
        badge: badge || undefined,
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-40" />
        <select value={type} onChange={(e) => setType(e.target.value as DiscountType)} className="border rounded px-1 py-0.5 bg-transparent">
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">global (all catalog)</option>
          {scopeOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input value={stackingGroup} onChange={(e) => setStackingGroup(e.target.value)} placeholder="stacking group" className="border rounded px-1 py-0.5 bg-transparent w-28" />
        <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" placeholder="priority" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="badge" className="border rounded px-1 py-0.5 bg-transparent w-24" />
      </div>

      {["percentOff", "amountOff", "fixedPrice"].includes(type) && (
        <div className="flex gap-1.5">
          <input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="0.01" placeholder="value" className="border rounded px-1 py-0.5 bg-transparent w-24" />
        </div>
      )}

      {type === "volumeTier" && (
        <div className="space-y-1">
          {tiers.map((t, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                value={t.minQty}
                onChange={(e) => setTiers(tiers.map((tt, ti) => (ti === i ? { ...tt, minQty: parseInt(e.target.value, 10) || 0 } : tt)))}
                type="number"
                placeholder="min qty"
                className="border rounded px-1 py-0.5 bg-transparent w-20"
              />
              <input
                value={t.discountPercent ?? ""}
                onChange={(e) => setTiers(tiers.map((tt, ti) => (ti === i ? { ...tt, discountPercent: e.target.value ? parseFloat(e.target.value) : undefined } : tt)))}
                type="number"
                placeholder="% off"
                className="border rounded px-1 py-0.5 bg-transparent w-20"
              />
              <button onClick={() => setTiers(tiers.filter((_, ti) => ti !== i))} className="text-red-600">
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => setTiers([...tiers, { minQty: 0 }])} className="underline text-neutral-500">
            + tier
          </button>
        </div>
      )}

      {type === "bogo" && (
        <div className="flex gap-1.5">
          <span>buy</span>
          <input value={buyQty} onChange={(e) => setBuyQty(e.target.value)} type="number" className="border rounded px-1 py-0.5 bg-transparent w-14" />
          <span>pay</span>
          <input value={payQty} onChange={(e) => setPayQty(e.target.value)} type="number" className="border rounded px-1 py-0.5 bg-transparent w-14" />
          <span>(cheapest item free)</span>
        </div>
      )}

      {type === "basketValue" && (
        <div className="space-y-1">
          <div className="text-neutral-500">order-value thresholds (scope/eligibility above are ignored - this applies to the whole basket):</div>
          {basketTiers.map((t, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                value={t.minOrderValue}
                onChange={(e) => setBasketTiers(basketTiers.map((tt, ti) => (ti === i ? { ...tt, minOrderValue: parseFloat(e.target.value) || 0 } : tt)))}
                type="number"
                placeholder="min order value"
                className="border rounded px-1 py-0.5 bg-transparent w-28"
              />
              <input
                value={t.discountPercent ?? ""}
                onChange={(e) => setBasketTiers(basketTiers.map((tt, ti) => (ti === i ? { ...tt, discountPercent: e.target.value ? parseFloat(e.target.value) : undefined } : tt)))}
                type="number"
                placeholder="% off"
                className="border rounded px-1 py-0.5 bg-transparent w-20"
              />
              <button onClick={() => setBasketTiers(basketTiers.filter((_, ti) => ti !== i))} className="text-red-600">
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => setBasketTiers([...basketTiers, { minOrderValue: 0 }])} className="underline text-neutral-500">
            + tier
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <input value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="markets (comma-separated)" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <input value={customerGroups} onChange={(e) => setCustomerGroups(e.target.value)} placeholder="customer groups" className="border rounded px-1 py-0.5 bg-transparent w-40" />
        <input value={validFrom} onChange={(e) => setValidFrom(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <input value={validTo} onChange={(e) => setValidTo(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">no recurring calendar</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button disabled={pending || !name || !stackingGroup} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
