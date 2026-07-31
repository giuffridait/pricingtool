"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/catalog", label: "Catalog & Pricing" },
  { href: "/components", label: "Components" },
  { href: "/discounts", label: "Discounts" },
  { href: "/bundles", label: "Bundles & Mix-and-Match" },
  { href: "/calendars", label: "Pricing Calendars" },
  { href: "/rules", label: "Rules" },
  { href: "/presentation", label: "Presentation" },
  { href: "/composer", label: "Final-Price Composer" },
  { href: "/price-lists", label: "Price Lists" },
  { href: "/calculator", label: "Price Calculator" },
  { href: "/basket", label: "Basket Calculator" },
  { href: "/checks", label: "Consistency & Sanity" },
  { href: "/alerts", label: "Alerts" },
  { href: "/versions", label: "Versions" },
  { href: "/experiments", label: "Experiments" },
  { href: "/history", label: "Historical Prices" },
  { href: "/bulk-operations", label: "Bulk Operations" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 p-4 flex flex-col gap-1">
      <div className="font-semibold text-sm px-2 pb-3 tracking-wide text-neutral-500">
        PRICING TOOL
      </div>
      {links.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
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
    </nav>
  );
}
