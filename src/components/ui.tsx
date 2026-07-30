import type { ReactNode } from "react";

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="font-medium text-sm text-neutral-600 dark:text-neutral-300">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const severityClasses: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  blocking: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  approved: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  reverted: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${severityClasses[tone] ?? severityClasses.info}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-neutral-500 mt-1 max-w-3xl">{description}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-500 italic py-4">{children}</p>;
}
