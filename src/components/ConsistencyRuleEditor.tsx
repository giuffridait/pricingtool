"use client";

import { useState, useTransition } from "react";
import type { ConsistencyRule, ConsistencyCheckType } from "@/lib/types";
import { saveConsistencyRuleAction, deleteConsistencyRuleAction } from "@/lib/actions/consistencyRules";
import { Badge, Card } from "@/components/ui";

const TYPES: ConsistencyCheckType[] = ["minGapPercent", "minGapAbsolute", "ordering", "parityDeviation"];

export interface RefOption {
  id: string;
  label: string;
}

export default function ConsistencyRuleEditor({
  rules,
  refOptions,
  violationMessages,
}: {
  rules: ConsistencyRule[];
  refOptions: RefOption[];
  violationMessages: Record<string, string[]>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Price consistency (price-architecture) rules"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New rule
          </button>
        )
      }
    >
      {editing === "new" && <RuleForm refOptions={refOptions} onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {rules.map((r) =>
          editing === r.id ? (
            <RuleForm key={r.id} refOptions={refOptions} initial={r} onDone={() => setEditing(null)} />
          ) : (
            <div key={r.id} className="border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{r.name}</span> <Badge>{r.type}</Badge>{" "}
                  <Badge tone={r.severity}>{r.severity}</Badge>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    subject: {refOptions.find((o) => o.id === r.subjectRefId)?.label ?? r.subjectRefId} · comparator:{" "}
                    {refOptions.find((o) => o.id === r.comparatorRefId)?.label ?? r.comparatorRefId} · threshold {r.threshold}
                    {r.type.includes("Percent") || r.type === "parityDeviation" ? "%" : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="underline text-xs" onClick={() => setEditing(r.id)}>
                    edit
                  </button>
                  <DeleteButton id={r.id} />
                </div>
              </div>
              {violationMessages[r.id]?.map((m, i) => (
                <div key={i} className="mt-1">
                  <Badge tone={r.severity}>{m}</Badge>
                </div>
              ))}
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
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteConsistencyRuleAction(id))}>
      delete
    </button>
  );
}

function RuleForm({ refOptions, initial, onDone }: { refOptions: RefOption[]; initial?: ConsistencyRule; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ConsistencyCheckType>(initial?.type ?? "minGapPercent");
  const [subjectRefId, setSubjectRefId] = useState(initial?.subjectRefId ?? refOptions[0]?.id ?? "");
  const [comparatorRefId, setComparatorRefId] = useState(initial?.comparatorRefId ?? "");
  const [threshold, setThreshold] = useState(initial?.threshold?.toString() ?? "10");
  const [severity, setSeverity] = useState<"blocking" | "warning">(initial?.severity ?? "warning");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await saveConsistencyRuleAction({
        id: initial?.id,
        name,
        type,
        subjectRefId,
        comparatorRefId,
        threshold: parseFloat(threshold),
        severity,
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-56" />
        <select value={type} onChange={(e) => setType(e.target.value as ConsistencyCheckType)} className="border rounded px-1 py-0.5 bg-transparent">
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as "blocking" | "warning")} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="blocking">blocking</option>
          <option value="warning">warning</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-neutral-500">subject:</span>
        <select value={subjectRefId} onChange={(e) => setSubjectRefId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
          {refOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-neutral-500">comparator:</span>
        {type === "parityDeviation" ? (
          <input value={comparatorRefId} onChange={(e) => setComparatorRefId(e.target.value)} placeholder="market code, e.g. CH" className="border rounded px-1 py-0.5 bg-transparent w-32" />
        ) : (
          <select value={comparatorRefId} onChange={(e) => setComparatorRefId(e.target.value)} className="border rounded px-1 py-0.5 bg-transparent">
            <option value="">—</option>
            {refOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <span className="text-neutral-500">threshold:</span>
        <input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" step="0.1" className="border rounded px-1 py-0.5 bg-transparent w-20" />
      </div>
      <div className="flex gap-2">
        <button disabled={pending || !name || !comparatorRefId} onClick={submit} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-0.5">
          Save
        </button>
        <button onClick={onDone} className="text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
