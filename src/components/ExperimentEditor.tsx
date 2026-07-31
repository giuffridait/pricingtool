"use client";

import { useState, useTransition } from "react";
import type { Experiment, BusinessUnit } from "@/lib/types";
import { saveExperimentAction, setExperimentStatusAction } from "@/lib/actions/experiments";
import { Badge, Card } from "@/components/ui";
import type { SkuOption } from "@/components/PriceCalculatorForm";

export default function ExperimentEditor({
  experiments,
  skuOptions,
  businessUnits,
}: {
  experiments: Experiment[];
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Price experiments (A/B tests)"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New experiment
          </button>
        )
      }
    >
      {editing === "new" && <ExperimentForm skuOptions={skuOptions} businessUnits={businessUnits} onDone={() => setEditing(null)} />}
      <div className="space-y-3 mt-2">
        {experiments.map((exp) =>
          editing === exp.id ? (
            <ExperimentForm key={exp.id} skuOptions={skuOptions} businessUnits={businessUnits} initial={exp} onDone={() => setEditing(null)} />
          ) : (
            <ExperimentRow key={exp.id} exp={exp} skuOptions={skuOptions} onEdit={() => setEditing(exp.id)} />
          ),
        )}
      </div>
    </Card>
  );
}

function ExperimentRow({ exp, skuOptions, onEdit }: { exp: Experiment; skuOptions: SkuOption[]; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const skuLabel = skuOptions.find((s) => s.id === exp.skuId)?.label ?? exp.skuId;

  function setStatus(status: Experiment["status"]) {
    startTransition(async () => {
      const { error } = await setExperimentStatusAction(exp.id, status);
      setError(error ?? null);
    });
  }

  return (
    <div className="border-t border-black/5 dark:border-white/5 pt-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{exp.name}</span> <Badge tone={exp.status === "running" ? "active" : "draft"}>{exp.status}</Badge>
          <div className="text-xs text-neutral-500 mt-0.5">
            {skuLabel} · {exp.market} · control {exp.controlPrice.toFixed(2)} ({exp.controlTrafficPercent}%) vs challenger{" "}
            {exp.challengerPrice.toFixed(2)} ({exp.challengerTrafficPercent}%) · {exp.startDate} → {exp.endDate} · margin floor {exp.marginFloor}
          </div>
          <div className="text-xs text-neutral-500">{exp.hypothesis}</div>
        </div>
        <div className="flex gap-2 text-xs shrink-0">
          <button className="underline" onClick={onEdit}>
            edit
          </button>
          {exp.status === "draft" && (
            <button disabled={pending} className="underline" onClick={() => setStatus("running")}>
              start
            </button>
          )}
          {exp.status === "running" && (
            <button disabled={pending} className="underline text-amber-600" onClick={() => setStatus("stopped")}>
              stop
            </button>
          )}
          {exp.status === "running" && (
            <button disabled={pending} className="underline" onClick={() => setStatus("completed")}>
              complete
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-1">
          <Badge tone="critical">{error}</Badge>
        </div>
      )}
    </div>
  );
}

function ExperimentForm({
  skuOptions,
  businessUnits,
  initial,
  onDone,
}: {
  skuOptions: SkuOption[];
  businessUnits: BusinessUnit[];
  initial?: Experiment;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [hypothesis, setHypothesis] = useState(initial?.hypothesis ?? "");
  const [skuId, setSkuId] = useState(initial?.skuId ?? skuOptions[0]?.id ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initial?.businessUnitId ?? businessUnits[0]?.id ?? "");
  const [market, setMarket] = useState(initial?.market ?? "DE");
  const [controlPrice, setControlPrice] = useState(initial?.controlPrice?.toString() ?? "");
  const [controlTrafficPercent, setControlTrafficPercent] = useState(initial?.controlTrafficPercent?.toString() ?? "90");
  const [challengerPrice, setChallengerPrice] = useState(initial?.challengerPrice?.toString() ?? "");
  const [challengerTrafficPercent, setChallengerTrafficPercent] = useState(initial?.challengerTrafficPercent?.toString() ?? "10");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [marginFloor, setMarginFloor] = useState(initial?.marginFloor?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await saveExperimentAction({
        id: initial?.id,
        name,
        hypothesis,
        skuId,
        businessUnitId,
        market,
        controlPrice: parseFloat(controlPrice),
        controlTrafficPercent: parseFloat(controlTrafficPercent),
        challengerPrice: parseFloat(challengerPrice),
        challengerTrafficPercent: parseFloat(challengerTrafficPercent),
        startDate,
        endDate,
        marginFloor: parseFloat(marginFloor),
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          {skuOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          {businessUnits.map((bu) => (
            <option key={bu.id} value={bu.id}>
              {bu.name}
            </option>
          ))}
        </select>
        <input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="market" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>
      <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="hypothesis" className="border rounded px-1 py-0.5 bg-transparent w-full" rows={2} />
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">control:</span>
        <input value={controlPrice} onChange={(e) => setControlPrice(e.target.value)} type="number" step="0.01" placeholder="price" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <input value={controlTrafficPercent} onChange={(e) => setControlTrafficPercent(e.target.value)} type="number" placeholder="% traffic" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <span className="text-neutral-500">challenger:</span>
        <input value={challengerPrice} onChange={(e) => setChallengerPrice(e.target.value)} type="number" step="0.01" placeholder="price" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <input value={challengerTrafficPercent} onChange={(e) => setChallengerTrafficPercent(e.target.value)} type="number" placeholder="% traffic" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        <span className="text-neutral-500">margin floor:</span>
        <input value={marginFloor} onChange={(e) => setMarginFloor(e.target.value)} type="number" step="0.01" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">window:</span>
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
        <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="border rounded px-1 py-0.5 bg-transparent" />
      </div>
      <div className="flex gap-2">
        <button disabled={pending || !name || !skuId} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
