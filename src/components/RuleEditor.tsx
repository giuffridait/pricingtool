"use client";

import { useState, useTransition } from "react";
import type { PricingRule, RuleEffectType, BusinessUnit, Shop, Discount, PriceComponent, Commission, PricingCalendar } from "@/lib/types";
import { saveRuleAction, deleteRuleAction } from "@/lib/actions/rules";
import { Badge, Card } from "@/components/ui";
import type { ScopeOption } from "@/components/DiscountEditor";

const EFFECT_TYPES: RuleEffectType[] = ["setPrice", "applyDiscount", "applyComponent", "applyCommission"];

export default function RuleEditor({
  rules,
  scopeOptions,
  businessUnits,
  shops,
  discounts,
  components,
  commissions,
  calendars,
}: {
  rules: PricingRule[];
  scopeOptions: ScopeOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
  discounts: Discount[];
  components: PriceComponent[];
  commissions: Commission[];
  calendars: PricingCalendar[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const refs = { scopeOptions, businessUnits, shops, discounts, components, commissions, calendars };

  return (
    <Card
      title="Pricing rules"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New rule
          </button>
        )
      }
    >
      {editing === "new" && <RuleForm {...refs} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {[...rules]
          .sort((a, b) => b.priority - a.priority)
          .map((r) =>
            editing === r.id ? (
              <RuleForm key={r.id} {...refs} initial={r} onDone={() => setEditing(null)} />
            ) : (
              <div key={r.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
                <div>
                  <span className="font-medium">{r.name}</span> <Badge tone="approved">priority {r.priority}</Badge>{" "}
                  <Badge>{r.effect.type}</Badge>
                  {r.stackingGroup && <Badge tone="draft">stack: {r.stackingGroup}</Badge>}
                  <div className="text-xs text-neutral-500 mt-0.5">
                    scope: {scopeLabel(r, scopeOptions)} · dims:{" "}
                    {Object.entries(r.dimensions)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ") || "any"}{" "}
                    · effect: {effectLabel(r, discounts, components, commissions)}
                    {r.validFrom || r.validTo ? ` · valid ${r.validFrom ?? "…"} → ${r.validTo ?? "…"}` : ""}
                    {r.calendarId ? ` · calendar: ${calendars.find((c) => c.id === r.calendarId)?.name ?? r.calendarId}` : ""}
                    {r.exclusionGroups?.length ? ` · excludes: ${r.exclusionGroups.join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="underline text-xs" onClick={() => setEditing(r.id)}>
                    edit
                  </button>
                  <DeleteButton id={r.id} />
                </div>
              </div>
            ),
          )}
      </div>
    </Card>
  );
}

function scopeLabel(r: PricingRule, options: ScopeOption[]) {
  const id = r.scope.skuId ?? r.scope.variantId ?? r.scope.productId ?? r.scope.productGroupId;
  if (!id) return "global";
  return options.find((o) => o.id === id)?.label ?? id;
}

function effectLabel(r: PricingRule, discounts: Discount[], components: PriceComponent[], commissions: Commission[]) {
  if (r.effect.type === "setPrice") return `set price → ${r.effect.price}`;
  if (r.effect.type === "applyDiscount") return `apply "${discounts.find((d) => d.id === r.effect.discountId)?.name ?? r.effect.discountId}"`;
  if (r.effect.type === "applyComponent") return `apply "${components.find((c) => c.id === r.effect.componentId)?.name ?? r.effect.componentId}"`;
  return `apply "${commissions.find((c) => c.id === r.effect.commissionId)?.name ?? r.effect.commissionId}"`;
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteRuleAction(id))}>
      delete
    </button>
  );
}

function RuleForm({
  scopeOptions,
  businessUnits,
  shops,
  discounts,
  components,
  commissions,
  calendars,
  initial,
  onDone,
}: {
  scopeOptions: ScopeOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
  discounts: Discount[];
  components: PriceComponent[];
  commissions: Commission[];
  calendars: PricingCalendar[];
  initial?: PricingRule;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [scopeId, setScopeId] = useState(initial?.scope.skuId ?? initial?.scope.variantId ?? initial?.scope.productId ?? initial?.scope.productGroupId ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.dimensions.businessUnitId ?? "");
  const [shopId, setShopId] = useState(initial?.dimensions.shopId ?? "");
  const [market, setMarket] = useState(initial?.dimensions.market ?? "");
  const [channel, setChannel] = useState(initial?.dimensions.channel ?? "");
  const [customerGroup, setCustomerGroup] = useState(initial?.dimensions.customerGroup ?? "");
  const [effectType, setEffectType] = useState<RuleEffectType>(initial?.effect.type ?? "setPrice");
  const [price, setPrice] = useState(initial?.effect.price?.toString() ?? "");
  const [discountId, setDiscountId] = useState(initial?.effect.discountId ?? discounts[0]?.id ?? "");
  const [componentId, setComponentId] = useState(initial?.effect.componentId ?? components[0]?.id ?? "");
  const [commissionId, setCommissionId] = useState(initial?.effect.commissionId ?? commissions[0]?.id ?? "");
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? "10");
  const [stackingGroup, setStackingGroup] = useState(initial?.stackingGroup ?? "");
  const [exclusionGroups, setExclusionGroups] = useState((initial?.exclusionGroups ?? []).join(", "));
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initial?.validTo ?? "");
  const [calendarId, setCalendarId] = useState(initial?.calendarId ?? "");
  const [pending, startTransition] = useTransition();

  function scopeFromId(id: string) {
    const opt = scopeOptions.find((o) => o.id === id);
    if (!opt) return {};
    return { [`${opt.level}Id`]: opt.id };
  }

  function submit() {
    startTransition(async () => {
      await saveRuleAction({
        id: initial?.id,
        name,
        scope: scopeFromId(scopeId),
        dimensions: {
          businessUnitId: businessUnitId || undefined,
          shopId: shopId || undefined,
          market: market || undefined,
          channel: channel || undefined,
          customerGroup: customerGroup || undefined,
        },
        effect: {
          type: effectType,
          price: effectType === "setPrice" ? parseFloat(price) : undefined,
          discountId: effectType === "applyDiscount" ? discountId : undefined,
          componentId: effectType === "applyComponent" ? componentId : undefined,
          commissionId: effectType === "applyCommission" ? commissionId : undefined,
        },
        priority: parseInt(priority, 10),
        stackingGroup: stackingGroup || undefined,
        exclusionGroups: exclusionGroups ? exclusionGroups.split(",").map((g) => g.trim()).filter(Boolean) : undefined,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        calendarId: calendarId || undefined,
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-44" />
        <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">global (all catalog)</option>
          {scopeOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" placeholder="priority" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">matches:</span>
        <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">any BU</option>
          {businessUnits.map((bu) => (
            <option key={bu.id} value={bu.id}>
              {bu.name}
            </option>
          ))}
        </select>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">any shop</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="market" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="channel" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="customer group" className="border rounded px-1 py-0.5 bg-transparent w-28" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">effect:</span>
        <select value={effectType} onChange={(e) => setEffectType(e.target.value as RuleEffectType)} className="border rounded px-1 py-0.5 bg-transparent">
          {EFFECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {effectType === "setPrice" && (
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" placeholder="price" className="border rounded px-1 py-0.5 bg-transparent w-24" />
        )}
        {effectType === "applyDiscount" && (
          <select value={discountId} onChange={(e) => setDiscountId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
            {discounts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        {effectType === "applyComponent" && (
          <select value={componentId} onChange={(e) => setComponentId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {effectType === "applyCommission" && (
          <select value={commissionId} onChange={(e) => setCommissionId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <input value={stackingGroup} onChange={(e) => setStackingGroup(e.target.value)} placeholder="stacking group" className="border rounded px-1 py-0.5 bg-transparent w-28" />
        <input value={exclusionGroups} onChange={(e) => setExclusionGroups(e.target.value)} placeholder="excludes groups (comma)" className="border rounded px-1 py-0.5 bg-transparent w-40" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">validity:</span>
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
        <button disabled={pending || !name} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
