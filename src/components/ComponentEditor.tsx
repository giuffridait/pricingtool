"use client";

import { useState, useTransition } from "react";
import type { PriceComponent, ComponentType, CalcModel } from "@/lib/types";
import { saveComponentAction, deleteComponentAction } from "@/lib/actions/components";
import { Badge, Card } from "@/components/ui";

const TYPES: ComponentType[] = ["printArea", "printTechnique", "personalisation", "designPremium", "fee"];
const CALC_MODELS: CalcModel[] = ["flat", "perStitch", "percentOfSubtotal"];

export default function ComponentEditor({ components }: { components: PriceComponent[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Price components"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New component
          </button>
        )
      }
    >
      {editing === "new" && <ComponentForm components={components} onDone={() => setEditing(null)} />}
      <table className="w-full text-sm mt-2">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="p-1">Name</th>
            <th className="p-1">Type</th>
            <th className="p-1">Parent</th>
            <th className="p-1">Calc</th>
            <th className="p-1">Value</th>
            <th className="p-1">Matches</th>
            <th className="p-1" />
          </tr>
        </thead>
        <tbody>
          {components.map((c) =>
            editing === c.id ? (
              <tr key={c.id}>
                <td colSpan={7} className="p-1">
                  <ComponentForm components={components} initial={c} onDone={() => setEditing(null)} />
                </td>
              </tr>
            ) : (
              <tr key={c.id} className="border-t border-black/5 dark:border-white/5">
                <td className="p-1">{c.name}</td>
                <td className="p-1">
                  <Badge>{c.type}</Badge>
                </td>
                <td className="p-1 text-neutral-500">{components.find((p) => p.id === c.parentId)?.name ?? "—"}</td>
                <td className="p-1">{c.calcModel}</td>
                <td className="p-1">
                  {c.value}
                  {c.calcModel === "perStitch" ? ` × ${c.stitchCount ?? 0} stitches` : c.calcModel === "percentOfSubtotal" ? "%" : ""}
                </td>
                <td className="p-1 text-neutral-500 text-xs">
                  {Object.entries(c.matches)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ") || "any"}
                </td>
                <td className="p-1 flex gap-2">
                  <button className="underline text-xs" onClick={() => setEditing(c.id)}>
                    edit
                  </button>
                  <DeleteButton id={c.id} />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </Card>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteComponentAction(id))}>
      delete
    </button>
  );
}

function ComponentForm({ components, initial, onDone }: { components: PriceComponent[]; initial?: PriceComponent; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ComponentType>(initial?.type ?? "printTechnique");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [calcModel, setCalcModel] = useState<CalcModel>(initial?.calcModel ?? "flat");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [stitchCount, setStitchCount] = useState(initial?.stitchCount?.toString() ?? "");
  const [productType, setProductType] = useState(initial?.matches.productType ?? "");
  const [appearance, setAppearance] = useState(initial?.matches.appearance ?? "");
  const [size, setSize] = useState(initial?.matches.size ?? "");
  const [design, setDesign] = useState(initial?.matches.design ?? "");
  const [printArea, setPrintArea] = useState(initial?.matches.printArea ?? "");
  const [printTechnique, setPrintTechnique] = useState(initial?.matches.printTechnique ?? "");
  const [personalisation, setPersonalisation] = useState(initial?.matches.personalisation ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await saveComponentAction({
        id: initial?.id,
        name,
        type,
        parentId: parentId || undefined,
        calcModel,
        value: parseFloat(value),
        stitchCount: calcModel === "perStitch" ? parseFloat(stitchCount) : undefined,
        matches: {
          productType: productType || undefined,
          appearance: appearance || undefined,
          size: size || undefined,
          printArea: printArea || undefined,
          printTechnique: printTechnique || undefined,
          personalisation: personalisation || undefined,
          design: design || undefined,
        },
      });
      onDone();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded p-2 text-xs">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-40" />
      <select value={type} onChange={(e) => setType(e.target.value as ComponentType)} className="border rounded px-1 py-0.5 bg-transparent">
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
        <option value="">no parent</option>
        {components
          .filter((c) => c.id !== initial?.id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <select value={calcModel} onChange={(e) => setCalcModel(e.target.value as CalcModel)} className="border rounded px-1 py-0.5 bg-transparent">
        {CALC_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="0.01" placeholder="value" className="border rounded px-1 py-0.5 w-20 bg-transparent" />
      {calcModel === "perStitch" && (
        <input value={stitchCount} onChange={(e) => setStitchCount(e.target.value)} type="number" placeholder="stitches" className="border rounded px-1 py-0.5 w-20 bg-transparent" />
      )}
      <input value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="productType" className="border rounded px-1 py-0.5 w-24 bg-transparent" />
      <input value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="appearance" className="border rounded px-1 py-0.5 w-24 bg-transparent" />
      <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="size" className="border rounded px-1 py-0.5 w-16 bg-transparent" />
      <input value={design} onChange={(e) => setDesign(e.target.value)} placeholder="design" className="border rounded px-1 py-0.5 w-20 bg-transparent" />
      <input value={printArea} onChange={(e) => setPrintArea(e.target.value)} placeholder="printArea" className="border rounded px-1 py-0.5 w-24 bg-transparent" />
      <input value={printTechnique} onChange={(e) => setPrintTechnique(e.target.value)} placeholder="printTechnique" className="border rounded px-1 py-0.5 w-28 bg-transparent" />
      <input value={personalisation} onChange={(e) => setPersonalisation(e.target.value)} placeholder="personalisation" className="border rounded px-1 py-0.5 w-28 bg-transparent" />
      <button disabled={pending || !name || !value} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
        Save
      </button>
      <button onClick={onDone} className="text-neutral-500">
        Cancel
      </button>
    </div>
  );
}
