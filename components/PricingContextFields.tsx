import type { BusinessUnit, Shop } from "@/lib/types";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-0.5">{label}</span>
      {children}
    </label>
  );
}

// The request-context fields shared by anything that runs a SKU through the
// pricing engine (Price Calculator, What-If & Break-Even) - kept in one place
// so they stay in sync rather than drifting into two slightly different forms.
export interface PricingContextValue {
  businessUnitId: string;
  shopId: string;
  market: string;
  channel: string;
  customerGroup: string;
  printArea: string;
  printTechnique: string;
  personalisation: string;
  design: string;
  date: string;
}

export function PricingContextFields({
  value,
  onChange,
  businessUnits,
  shops,
  note,
}: {
  value: PricingContextValue;
  onChange: (patch: Partial<PricingContextValue>) => void;
  businessUnits: BusinessUnit[];
  shops: Shop[];
  note?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <Field label="Business unit">
          <select value={value.businessUnitId} onChange={(e) => onChange({ businessUnitId: e.target.value })} className="border rounded px-2 py-1 bg-transparent w-full">
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shop">
          <select value={value.shopId} onChange={(e) => onChange({ shopId: e.target.value })} className="border rounded px-2 py-1 bg-transparent w-full">
            <option value="">none (BU-wide)</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Market">
          <input value={value.market} onChange={(e) => onChange({ market: e.target.value })} placeholder="DE" className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
        <Field label="Channel">
          <input value={value.channel} onChange={(e) => onChange({ channel: e.target.value })} placeholder="web" className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
        <Field label="Customer group">
          <input
            value={value.customerGroup}
            onChange={(e) => onChange({ customerGroup: e.target.value })}
            placeholder="loyalty-gold"
            className="border rounded px-2 py-1 bg-transparent w-full"
          />
        </Field>
        <Field label="As-of date/time (UTC)">
          <input value={value.date} onChange={(e) => onChange({ date: e.target.value })} type="datetime-local" className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
        <Field label="Print area">
          <input value={value.printArea} onChange={(e) => onChange({ printArea: e.target.value })} placeholder="back" className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
        <Field label="Print technique">
          <input
            value={value.printTechnique}
            onChange={(e) => onChange({ printTechnique: e.target.value })}
            placeholder="flex / embroidery"
            className="border rounded px-2 py-1 bg-transparent w-full"
          />
        </Field>
        <Field label="Personalisation">
          <input value={value.personalisation} onChange={(e) => onChange({ personalisation: e.target.value })} className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
        <Field label="Design">
          <input value={value.design} onChange={(e) => onChange({ design: e.target.value })} className="border rounded px-2 py-1 bg-transparent w-full" />
        </Field>
      </div>
      {note && <p className="text-xs text-neutral-400">{note}</p>}
    </>
  );
}
