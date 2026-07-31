import type { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { WORKFLOW } from "@/lib/workflow";

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-sm p-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="font-medium text-sm text-neutral-700 dark:text-neutral-200">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const buttonVariants: Record<string, string> = {
  primary: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border border-transparent hover:opacity-90",
  secondary:
    "bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-100 border border-black/15 dark:border-white/20 hover:bg-neutral-200 dark:hover:bg-white/15",
  danger:
    "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900",
};

export function Button({
  children,
  variant = "secondary",
  size = "sm",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";
  return (
    <button
      className={`rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
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

export function PageHeader({ title, description, path }: { title: string; description?: string; path?: string }) {
  const workflow = path ? WORKFLOW[path] : undefined;
  const hasWorkflow = workflow && (workflow.before.length > 0 || workflow.after.length > 0);
  return (
    <div className="mb-5 rounded-lg bg-neutral-100 dark:bg-white/5 px-4 py-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 max-w-5xl">{description}</p>}
      {hasWorkflow && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 inline-block">
            Where this fits in the workflow
          </summary>
          <div className="mt-1.5 space-y-1 text-neutral-600 dark:text-neutral-400">
            {workflow.before.length > 0 && (
              <div>
                Usually comes after:{" "}
                {workflow.before.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && ", "}
                    <Link href={l.href} className="underline decoration-dotted hover:text-neutral-900 dark:hover:text-white">
                      {l.label}
                    </Link>
                  </span>
                ))}
              </div>
            )}
            {workflow.after.length > 0 && (
              <div>
                Often followed by:{" "}
                {workflow.after.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && ", "}
                    <Link href={l.href} className="underline decoration-dotted hover:text-neutral-900 dark:hover:text-white">
                      {l.label}
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-500 italic py-4">{children}</p>;
}
