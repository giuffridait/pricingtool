"use client";

import { useState, useTransition } from "react";
import type { PricingRule, RuleEffectType, BusinessUnit, Shop, Discount, PriceComponent, Commission, PricingCalendar } from "@/lib/types";
import { saveRuleAction, deleteRuleAction } from "@/lib/actions/rules";
import { Badge, Card } from "@/components/ui";
import type { ScopeOption } from "@/components/DiscountEditor";

const EFFECT_TYPES: RuleEffectType[] = ["setPrice", "applyDiscount", "applyComponent", "applyCommission"];

type RuleRole = "base" | "override" | "none";

export default function RuleEditor({
  rules,
  scopeOptions,
  businessUnits,
  shops,
  discounts,
  components,
  commissions,
  calendars,
  initialScopeId,
}: {
  rules: PricingRule[];
  scopeOptions: ScopeOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
  discounts: Discount[];
  components: PriceComponent[];
  commissions: Commission[];
  calendars: PricingCalendar[];
  initialScopeId?: string;
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
      {editing === "new" && <RuleForm {...refs} initialScopeId={initialScopeId} onDone={() => setEditing(null)} />}
      <div className="space-y-4 mt-2">
        {groupRules(rules, scopeOptions).map((group) => (
          <div key={group.key}>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 border-t border-black/5 dark:border-white/5 pt-2">
              {group.label}
            </div>
            <div className="space-y-2 mt-1">
              {group.rows.map(({ rule: r, role, indent }) =>
                editing === r.id ? (
                  <RuleForm key={r.id} {...refs} initial={r} onDone={() => setEditing(null)} />
                ) : (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between pt-1 text-sm ${
                      indent ? "ml-5 pl-3 border-l-2 border-black/10 dark:border-white/15" : ""
                    }`}
                  >
                    <div>
                      <span className="font-medium">{r.name}</span>{" "}
                      {role !== "none" && (
                        <Badge tone={role === "base" ? "active" : "scheduled"}>
                          {role === "base" ? "base" : "overrides when it matches"}
                        </Badge>
                      )}{" "}
                      <Badge tone="approved">priority {r.priority}</Badge> <Badge>{r.effect.type}</Badge>
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
          </div>
        ))}
      </div>
    </Card>
  );
}

// Rules that target the same catalog scope are the ones that actually
// compete with each other at runtime (see scopeSpecificity in the engine) -
// grouping by scope turns "Premium Tee base EU" + "Premium Tee DE sale" from
// two unrelated rows into a visible pair. Only setPrice rules get a base/
// override role: they're the one true single-winner slot (resolvePrice picks
// exactly one), whereas applyDiscount rules can legitimately co-apply across
// different stacking groups, so labeling one of them "base" over another
// would claim a competition that isn't actually happening. Within the
// setPrice set, the rule with the fewest dimension constraints is the base
// (eligible for every request in scope); the rest only win in narrower
// situations, which is why authors give them a *higher* priority than the
// base - that number is how an override beats the base when both are
// eligible, not a sign of which one is the base, so specificity (not
// priority) is what orders/labels this set.
function groupRules(rules: PricingRule[], scopeOptions: ScopeOption[]) {
  const dimSpecificity = (r: PricingRule) => Object.values(r.dimensions).filter((v) => v).length;
  const scopeKey = (r: PricingRule) => r.scope.skuId ?? r.scope.variantId ?? r.scope.productId ?? r.scope.productGroupId ?? "global";

  const byKey = new Map<string, PricingRule[]>();
  for (const r of rules) {
    const key = scopeKey(r);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }

  const groups = [...byKey.entries()].map(([key, groupRules]) => {
    const setPriceRules = groupRules
      .filter((r) => r.effect.type === "setPrice")
      .sort((a, b) => dimSpecificity(a) - dimSpecificity(b) || b.priority - a.priority);
    const otherRules = groupRules.filter((r) => r.effect.type !== "setPrice").sort((a, b) => b.priority - a.priority);

    const rows: { rule: PricingRule; role: RuleRole; indent: boolean }[] = [
      ...setPriceRules.map((r, i) => ({
        rule: r,
        role: (setPriceRules.length > 1 ? (i === 0 ? "base" : "override") : "none") as RuleRole,
        indent: i > 0,
      })),
      ...otherRules.map((r) => ({ rule: r, role: "none" as RuleRole, indent: false })),
    ];

    return {
      key,
      label: key === "global" ? "Global (all catalog)" : scopeLabel(groupRules[0], scopeOptions),
      rows,
    };
  });

  groups.sort((a, b) => (a.key === "global" ? -1 : b.key === "global" ? 1 : a.label.localeCompare(b.label)));
  return groups;
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
  initialScopeId,
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
  initialScopeId?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [scopeId, setScopeId] = useState(
    initial?.scope.skuId ?? initial?.scope.variantId ?? initial?.scope.productId ?? initial?.scope.productGroupId ?? initialScopeId ?? "",
  );
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
