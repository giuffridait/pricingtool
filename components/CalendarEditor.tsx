"use client";

import { useState, useTransition } from "react";
import type { PricingCalendar, CalendarType } from "@/lib/types";
import { saveCalendarAction, deleteCalendarAction } from "@/lib/actions/calendars";
import { Badge, Card } from "@/components/ui";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describe(c: PricingCalendar): string {
  if (c.type === "dayOfWeek") {
    const days = c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek.map((d) => DAY_LABELS[d]).join(",") : "every day";
    const hours = c.startHour !== undefined && c.endHour !== undefined ? ` ${c.startHour}:00–${c.endHour}:00` : "";
    return `${days}${hours}`;
  }
  return `${c.seasonalStart ?? "?"} → ${c.seasonalEnd ?? "?"} (yearly)`;
}

export default function CalendarEditor({ calendars }: { calendars: PricingCalendar[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <Card
      title="Pricing calendars"
      action={
        editing === null && (
          <button className="text-xs underline" onClick={() => setEditing("new")}>
            + New calendar
          </button>
        )
      }
    >
      {editing === "new" && <CalendarForm onDone={() => setEditing(null)} />}
      <div className="space-y-2 mt-2">
        {calendars.map((c) =>
          editing === c.id ? (
            <CalendarForm key={c.id} initial={c} onDone={() => setEditing(null)} />
          ) : (
            <div key={c.id} className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-2 text-sm">
              <div>
                <span className="font-medium">{c.name}</span> <Badge>{c.type}</Badge>
                <div className="text-xs text-neutral-500 mt-0.5">{describe(c)}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="underline text-xs" onClick={() => setEditing(c.id)}>
                  edit
                </button>
                <DeleteButton id={c.id} />
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
    <button disabled={pending} className="underline text-xs text-red-600" onClick={() => startTransition(() => deleteCalendarAction(id))}>
      delete
    </button>
  );
}

function CalendarForm({ initial, onDone }: { initial?: PricingCalendar; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<CalendarType>(initial?.type ?? "dayOfWeek");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? [0, 6]);
  const [startHour, setStartHour] = useState(initial?.startHour?.toString() ?? "");
  const [endHour, setEndHour] = useState(initial?.endHour?.toString() ?? "");
  const [seasonalStart, setSeasonalStart] = useState(initial?.seasonalStart ?? "");
  const [seasonalEnd, setSeasonalEnd] = useState(initial?.seasonalEnd ?? "");
  const [pending, startTransition] = useTransition();

  function toggleDay(d: number) {
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function submit() {
    startTransition(async () => {
      await saveCalendarAction({
        id: initial?.id,
        name,
        type,
        daysOfWeek,
        startHour: startHour ? parseInt(startHour, 10) : undefined,
        endHour: endHour ? parseInt(endHour, 10) : undefined,
        seasonalStart: seasonalStart || undefined,
        seasonalEnd: seasonalEnd || undefined,
      });
      onDone();
    });
  }

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded p-2 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-1 py-0.5 bg-transparent w-48" />
        <select value={type} onChange={(e) => setType(e.target.value as CalendarType)} className="border rounded px-1 py-0.5 bg-transparent">
          <option value="dayOfWeek">recurring (day of week / hour window)</option>
          <option value="seasonal">seasonal (yearly date range)</option>
        </select>
      </div>

      {type === "dayOfWeek" && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {DAY_LABELS.map((label, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`rounded px-1.5 py-0.5 border ${daysOfWeek.includes(d) ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-neutral-500">hour window (optional, UTC):</span>
            <input value={startHour} onChange={(e) => setStartHour(e.target.value)} type="number" min={0} max={23} placeholder="start" className="border rounded px-1 py-0.5 bg-transparent w-16" />
            <span>–</span>
            <input value={endHour} onChange={(e) => setEndHour(e.target.value)} type="number" min={0} max={23} placeholder="end" className="border rounded px-1 py-0.5 bg-transparent w-16" />
          </div>
        </div>
      )}

      {type === "seasonal" && (
        <div className="flex gap-1.5 items-center">
          <span className="text-neutral-500">yearly range (MM-DD):</span>
          <input value={seasonalStart} onChange={(e) => setSeasonalStart(e.target.value)} placeholder="11-01" className="border rounded px-1 py-0.5 bg-transparent w-20" />
          <span>→</span>
          <input value={seasonalEnd} onChange={(e) => setSeasonalEnd(e.target.value)} placeholder="12-24" className="border rounded px-1 py-0.5 bg-transparent w-20" />
        </div>
      )}

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
