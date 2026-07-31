"use client";

import { useState, useTransition } from "react";
import type { PresentationPolicy, RoundingMode, BusinessUnit, Shop } from "@/lib/types";
import { savePresentationPolicyAction, deletePresentationPolicyAction } from "@/lib/actions/presentation";
import { Badge, Card } from "@/components/ui";

const ROUNDING_MODES: RoundingMode[] = ["none", "charm", "nearestInteger", "nearestHalf"];

export default function PresentationPolicyEditor({
  policies,
  businessUnits,
  shops,
}: {
  policies: PresentationPolicy[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Presentation policies"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New policy
          </button>
        )
      }
    >
      {editing === "new" && <PolicyForm businessUnits={businessUnits} shops={shops} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {policies.map((p) =>
          editing === p.id ? (
            <PolicyForm key={p.id} businessUnits={businessUnits} shops={shops} initial={p} onDone={() => setEditing(null)} />
          ) : (
            <div key={p.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{p.name}</span> <Badge>{p.currency}</Badge> <Badge tone="draft">{p.roundingMode}</Badge>
                {p.roundingMode === "charm" && <Badge tone="approved">.{Math.round((p.charmEnding ?? 0.9) * 100)}</Badge>}
                <div className="text-xs text-neutral-500 mt-0.5">
                  {businessUnits.find((bu) => bu.id === p.businessUnitId)?.name ?? p.businessUnitId}
                  {p.shopId ? ` · ${shops.find((s) => s.id === p.shopId)?.name ?? p.shopId}` : " · BU-wide"} ·{" "}
                  {[
                    p.showRrpStrikethrough && "strikethrough",
                    p.showDiscountBadge && "badge",
                    p.showFromPrice && "from-price",
                    p.showNextTierMessage && "savings messages",
                  ]
                    .filter(Boolean)
                    .join(", ") || "no presentation extras"}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(p.id)}>
                  edit
                </button>
                <DeleteButton id={p.id} />
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
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deletePresentationPolicyAction(id))}>
      delete
    </button>
  );
}

function PolicyForm({
  businessUnits,
  shops,
  initial,
  onDone,
}: {
  businessUnits: BusinessUnit[];
  shops: Shop[];
  initial?: PresentationPolicy;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState(initial?.shopId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [roundingMode, setRoundingMode] = useState<RoundingMode>(initial?.roundingMode ?? "charm");
  const [charmEnding, setCharmEnding] = useState(initial?.charmEnding?.toString() ?? "0.9");
  const [showRrpStrikethrough, setShowRrpStrikethrough] = useState(initial?.showRrpStrikethrough ?? true);
  const [showDiscountBadge, setShowDiscountBadge] = useState(initial?.showDiscountBadge ?? true);
  const [showFromPrice, setShowFromPrice] = useState(initial?.showFromPrice ?? true);
  const [showNextTierMessage, setShowNextTierMessage] = useState(initial?.showNextTierMessage ?? true);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await savePresentationPolicyAction({
        id: initial?.id,
        name,
        businessUnitId,
        shopId: shopId || undefined,
        currency,
        roundingMode,
        charmEnding: roundingMode === "charm" ? parseFloat(charmEnding) : undefined,
        showRrpStrikethrough,
        showDiscountBadge,
        showFromPrice,
        showNextTierMessage,
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
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="">BU-wide</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CCY" className="border rounded px-1 py-0.5 bg-transparent w-16" />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">rounding:</span>
        <select value={roundingMode} onChange={(e) => setRoundingMode(e.target.value as RoundingMode)} className="border rounded px-1 py-0.5 bg-transparent">
          {ROUNDING_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {roundingMode === "charm" && (
          <input value={charmEnding} onChange={(e) => setCharmEnding(e.target.value)} type="number" step="0.01" min={0} max={0.99} placeholder="0.90" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showRrpStrikethrough} onChange={(e) => setShowRrpStrikethrough(e.target.checked)} /> RRP strikethrough
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showDiscountBadge} onChange={(e) => setShowDiscountBadge(e.target.checked)} /> discount badge
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showFromPrice} onChange={(e) => setShowFromPrice(e.target.checked)} /> &quot;from&quot; price
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showNextTierMessage} onChange={(e) => setShowNextTierMessage(e.target.checked)} /> savings messages
        </label>
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
