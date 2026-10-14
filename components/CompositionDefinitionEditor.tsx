"use client";

import { useState, useTransition } from "react";
import type { CompositionDefinition, CompositionStep, CompositionStepType, CompositionCalcMode, BusinessUnit, Shop } from "@/lib/types";
import { saveCompositionDefinitionAction, deleteCompositionDefinitionAction } from "@/lib/actions/composer";
import { Badge, Card } from "@/components/ui";

const DEFAULT_STEPS: CompositionStep[] = [
  { type: "basePrice", included: true, calcMode: "additive" },
  { type: "configComponents", included: true, calcMode: "additive" },
  { type: "discounts", included: true, calcMode: "additive" },
  { type: "commissions", included: false, calcMode: "percentOfSubtotal" },
  { type: "markup", included: false, calcMode: "percentOfSubtotal" },
  { type: "tax", included: false, calcMode: "percentOfSubtotal", taxInclusive: true },
  { type: "shipping", included: false, calcMode: "additive" },
  { type: "fees", included: false, calcMode: "additive" },
];

const STEP_LABELS: Record<CompositionStepType, string> = {
  basePrice: "Base price",
  configComponents: "Configuration components",
  discounts: "Discounts",
  commissions: "Commissions",
  markup: "Markup",
  tax: "Tax",
  shipping: "Shipping",
  fees: "Fees",
};

export default function CompositionDefinitionEditor({
  definitions,
  businessUnits,
  shops,
}: {
  definitions: CompositionDefinition[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Final-price composer"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New definition
          </button>
        )
      }
    >
      <p className="text-xs text-neutral-500 mb-2">
        This authors the intended composition order and semantics per BU/shop. In this prototype the live pricing engine still computes
        base price → configuration components → discounts in its own fixed (equivalent) order; commissions/markup/tax/shipping/fees here
        are documentation of intent, not wired into a live calculation yet.
      </p>
      {editing === "new" && <DefinitionForm businessUnits={businessUnits} shops={shops} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {definitions.map((d) =>
          editing === d.id ? (
            <DefinitionForm key={d.id} businessUnits={businessUnits} shops={shops} initial={d} onDone={() => setEditing(null)} />
          ) : (
            <div key={d.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{d.name}</span>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {businessUnits.find((bu) => bu.id === d.businessUnitId)?.name ?? d.businessUnitId}
                  {d.shopId ? ` · ${shops.find((s) => s.id === d.shopId)?.name ?? d.shopId}` : " · BU-wide"}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {d.steps.map((s, i) => (
                    <Badge key={i} tone={s.included ? "approved" : "draft"}>
                      {i + 1}. {STEP_LABELS[s.type]} {s.included ? `(${s.calcMode})` : "(off)"}
                    </Badge>
                  ))}
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

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteCompositionDefinitionAction(id))}>
      delete
    </button>
  );
}

function DefinitionForm({
  businessUnits,
  shops,
  initial,
  onDone,
}: {
  businessUnits: BusinessUnit[];
  shops: Shop[];
  initial?: CompositionDefinition;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState(initial?.shopId ?? "");
  const [steps, setSteps] = useState<CompositionStep[]>(initial?.steps ?? DEFAULT_STEPS.map((s) => ({ ...s })));
  const [pending, startTransition] = useTransition();

  function move(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[i], next[target]] = [next[target], next[i]];
    setSteps(next);
  }

  function updateStep(i: number, patch: Partial<CompositionStep>) {
    setSteps(steps.map((s, si) => (si === i ? { ...s, ...patch } : s)));
  }

  function submit() {
    startTransition(async () => {
      await saveCompositionDefinitionAction({
        id: initial?.id,
        name,
        businessUnitId,
        shopId: shopId || undefined,
        steps,
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
      </div>

      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={step.type} className="flex items-center gap-1.5 bg-white/50 dark:bg-black/20 rounded px-1.5 py-1">
            <span className="w-4 text-neutral-500">{i + 1}.</span>
            <span className="w-40">{STEP_LABELS[step.type]}</span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={step.included} onChange={(e) => updateStep(i, { included: e.target.checked })} /> included
            </label>
            <select
              value={step.calcMode}
              onChange={(e) => updateStep(i, { calcMode: e.target.value as CompositionCalcMode })}
              className="border rounded px-1 py-0.5 bg-transparent"
              disabled={!step.included}
            >
              <option value="additive">additive</option>
              <option value="percentOfSubtotal">percent of subtotal</option>
            </select>
            {step.type === "tax" && (
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={step.taxInclusive ?? false} onChange={(e) => updateStep(i, { taxInclusive: e.target.checked })} /> tax-inclusive
              </label>
            )}
            <div className="ml-auto flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                ↑
              </button>
              <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="disabled:opacity-30">
                ↓
              </button>
            </div>
          </div>
        ))}
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
