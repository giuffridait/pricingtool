import type { PresentationResult } from "@/lib/engine/presentation";

export default function PresentationTile({ presentation, fromLabel }: { presentation: PresentationResult; fromLabel?: boolean }) {
  const { currency, displayPrice, strikethrough, badge, messages, omnibusReference, omnibusAdjusted } = presentation;
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 max-w-xs mx-auto text-center bg-white dark:bg-neutral-900">
      <div className="h-20 rounded bg-black/5 dark:bg-white/5 mb-3 flex items-center justify-center text-neutral-400 text-xs">
        product image
      </div>
      {badge && (
        <div className="inline-block rounded bg-red-600 text-white text-xs font-semibold px-1.5 py-0.5 mb-1.5">{badge}</div>
      )}
      <div className="space-y-0.5">
        {strikethrough !== undefined && (
          <div className="text-sm text-neutral-400 line-through">
            {currency} {strikethrough.toFixed(2)}
          </div>
        )}
        <div className="text-2xl font-semibold">
          {fromLabel && <span className="text-sm font-normal text-neutral-500">from </span>}
          {currency} {displayPrice.toFixed(2)}
        </div>
      </div>
      {messages.length > 0 && (
        <div className="mt-2 space-y-1">
          {messages.map((m, i) => (
            <div key={i} className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {m}
            </div>
          ))}
        </div>
      )}
      {omnibusAdjusted && (
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {strikethrough !== undefined
            ? `"Was" price adjusted to the lowest price in the last 30 days (EU Omnibus).`
            : `No "was" price shown: ${currency} ${displayPrice.toFixed(2)} isn't below the lowest price in the last 30 days (${currency} ${omnibusReference?.toFixed(2)}), per EU Omnibus rules.`}
        </div>
      )}
    </div>
  );
}
