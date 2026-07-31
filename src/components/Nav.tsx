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
// default (Essentials + Storefront), while everything a power user needs
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
      { href: "/incentives", label: "Discounts & Incentives" },
      { href: "/calculator", label: "Price Calculator" },
    ],
  },
  {
    label: "Storefront",
    defaultOpen: true,
    links: [
      { href: "/calendars", label: "Sales Calendar" },
      { href: "/presentation", label: "Storefront Display" },
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

// The two collapsed-by-default groups behave as an accordion (opening one
// closes the other) so the nav's total height stays bounded - without this,
// groups only ever accumulate open state as you explore, and the sidebar
// keeps growing until you're scrolling to get back to the top.
const exclusiveLabels = groups.filter((g) => g.label && !g.defaultOpen).map((g) => g.label!);

export default function Nav() {
  const pathname = usePathname();
  const [openState, setOpenState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      if (!group.label) continue;
      initial[group.label] = group.defaultOpen || group.links.some((l) => isActive(pathname, l.href));
    }
    return initial;
  });

  // Keep the active page's group open (and, if it's one of the exclusive
  // groups, close the other one) whenever the route changes client-side.
  // Adjusting state during render (comparing against a ref-tracked previous
  // pathname) instead of in an effect avoids an extra render/commit cycle.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const activeGroup = groups.find((g) => g.label && g.links.some((l) => isActive(pathname, l.href)));
    if (activeGroup?.label && !openState[activeGroup.label]) {
      const next = { ...openState, [activeGroup.label]: true };
      if (exclusiveLabels.includes(activeGroup.label)) {
        for (const label of exclusiveLabels) {
          if (label !== activeGroup.label) next[label] = false;
        }
      }
      setOpenState(next);
    }
  }

  function toggle(label: string) {
    setOpenState((s) => {
      const next = { ...s, [label]: !s[label] };
      if (exclusiveLabels.includes(label) && next[label]) {
        for (const other of exclusiveLabels) {
          if (other !== label) next[other] = false;
        }
      }
      return next;
    });
  }

  return (
    <nav className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 p-4 flex flex-col gap-0.5 overflow-y-auto">
      <div className="font-semibold text-sm px-2 pb-3 tracking-wide text-neutral-500">PRICING TOOL</div>
      {groups.map((group, gi) => (
        <div key={group.label ?? `ungrouped-${gi}`} className={group.label ? "mt-1.5" : ""}>
          {group.label && (
            <button
              onClick={() => toggle(group.label!)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <span>{group.label}</span>
              <span className="text-neutral-400">{openState[group.label] ? "−" : "+"}</span>
            </button>
          )}
          {(!group.label || openState[group.label]) && (
            <div className="flex flex-col gap-0.5">
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
