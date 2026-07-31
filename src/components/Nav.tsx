"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  label: string | null; // null = ungrouped, always shown flat at the top
  defaultOpen: boolean;
  links: NavLink[];
}

// Grouped so a newbie running a small store sees a short, obvious list by
// default (Essentials + Merchandising), while everything a power user needs
// is one click away behind two labeled, collapsed sections - never removed,
// just not shoved in their face on day one.
const groups: NavGroup[] = [
  {
    label: null,
    defaultOpen: true,
    links: [{ href: "/overview", label: "Overview" }],
  },
  {
    label: "Essentials",
    defaultOpen: true,
    links: [
      { href: "/catalog", label: "Catalog & Pricing" },
      { href: "/discounts", label: "Discounts" },
      { href: "/calculator", label: "Price Calculator" },
    ],
  },
  {
    label: "Merchandising",
    defaultOpen: true,
    links: [
      { href: "/bundles", label: "Bundles & Mix-and-Match" },
      { href: "/calendars", label: "Pricing Calendars" },
      { href: "/presentation", label: "Presentation" },
      { href: "/basket", label: "Basket Calculator" },
    ],
  },
  {
    label: "Advanced Configuration",
    defaultOpen: false,
    links: [
      { href: "/components", label: "Components" },
      { href: "/rules", label: "Rules" },
      { href: "/composer", label: "Final-Price Composer" },
      { href: "/price-lists", label: "Price Lists" },
      { href: "/bulk-operations", label: "Bulk Operations" },
    ],
  },
  {
    label: "Monitoring & Insights",
    defaultOpen: false,
    links: [
      { href: "/alerts", label: "Alerts" },
      { href: "/checks", label: "Consistency & Sanity" },
      { href: "/versions", label: "Versions" },
      { href: "/experiments", label: "Experiments" },
      { href: "/history", label: "Historical Prices" },
    ],
  },
];

function isActive(pathname: string | null, href: string) {
  return pathname === href || (pathname?.startsWith(href + "/") ?? false);
}

export default function Nav() {
  const pathname = usePathname();
  const [openState, setOpenState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      if (!group.label) continue;
      // Auto-expand a collapsed group if the current page lives inside it,
      // so deep-linking (or a refresh) never hides where you actually are.
      initial[group.label] = group.defaultOpen || group.links.some((l) => isActive(pathname, l.href));
    }
    return initial;
  });

  function toggle(label: string) {
    setOpenState((s) => ({ ...s, [label]: !s[label] }));
  }

  return (
    <nav className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 p-4 flex flex-col gap-1 overflow-y-auto">
      <div className="font-semibold text-sm px-2 pb-3 tracking-wide text-neutral-500">PRICING TOOL</div>
      {groups.map((group, gi) => (
        <div key={group.label ?? `ungrouped-${gi}`} className={group.label ? "mt-2" : ""}>
          {group.label && (
            <button
              onClick={() => toggle(group.label!)}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <span>{group.label}</span>
              <span className="text-neutral-400">{openState[group.label] ? "−" : "+"}</span>
            </button>
          )}
          {(!group.label || openState[group.label]) && (
            <div className="flex flex-col gap-1 mt-0.5">
              {group.links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        : "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
