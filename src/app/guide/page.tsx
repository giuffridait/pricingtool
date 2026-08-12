import Link from "next/link";
import { Card, Badge } from "@/components/ui";

interface PageEntry {
  href: string;
  label: string;
  description: string;
  note?: string;
}

interface GroupEntry {
  title: string;
  description: string;
  pages: PageEntry[];
}

const groups: GroupEntry[] = [
  {
    title: "Price Setting",
    description: "Where prices are set and calculated - from a product's base price down to what a specific customer actually pays.",
    pages: [
      {
        href: "/catalog",
        label: "Catalog & Pricing",
        description: "Set the base price for a product group, product, variant, or SKU - plus optional minimum/maximum limits.",
      },
      {
        href: "/components",
        label: "Components",
        description: "Reusable price add-ons (a print technique, a personalisation fee) that can be attached to a price.",
      },
      {
        href: "/rules",
        label: "Rules",
        description: "The connective tissue - decides which price, add-on, or discount actually applies to a given order, and when.",
      },
      {
        href: "/composer",
        label: "Final-Price Composer",
        description: "A reference view of how a final price is meant to combine (base, add-ons, discounts, fees, tax...).",
        note: "Documentation only - not yet connected to live pricing.",
      },
      {
        href: "/price-lists",
        label: "Price Lists",
        description: "Special fixed prices for a specific group of customers, like wholesale or B2B buyers.",
      },
      {
        href: "/calculator",
        label: "Price Calculator",
        description: "Test what a specific product costs a specific customer, with a full step-by-step breakdown of how that price was reached.",
      },
      {
        href: "/bulk-operations",
        label: "Bulk Operations",
        description: "Change many prices at once.",
        note: "Planned for a future version - not built yet.",
      },
    ],
  },
  {
    title: "Discounts & Merchandising",
    description: "Everything that makes a shopper's price cheaper, and how that price is actually shown to them.",
    pages: [
      {
        href: "/incentives",
        label: "Discounts & Incentives",
        description: "Sales, buy-more-save-more, buy-X-get-Y-free, bundles, and combo deals.",
      },
      {
        href: "/calendars",
        label: "Sales Calendar",
        description: "Recurring time windows - every weekend, or a yearly holiday sale - that a discount can be tied to.",
      },
      {
        href: "/presentation",
        label: "Storefront Display",
        description: "How a price actually looks to a shopper: rounding style, a crossed-out \"was\" price, discount badges - and a built-in check that keeps \"was\" prices legally honest.",
      },
    ],
  },
  {
    title: "Monitoring & Insights",
    description: "Keeping an eye on pricing health, history, and performance over time.",
    pages: [
      {
        href: "/alerts",
        label: "Alerts",
        description: "Automatic warnings when something looks wrong, like a sale price that's higher than the regular price.",
      },
      {
        href: "/checks",
        label: "Consistency & Sanity",
        description: "Rules and automatic scans that catch pricing mistakes across the catalog.",
      },
      {
        href: "/versions",
        label: "Versions",
        description: "A full history of every pricing change, with the ability to schedule changes ahead of time or undo them.",
      },
      {
        href: "/experiments",
        label: "Experiments",
        description: "Simple A/B price tests - compare two prices for the same product.",
      },
      {
        href: "/history",
        label: "Historical Prices",
        description: "Past prices by month - also what keeps the \"was\" price on the storefront honest.",
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">How this tool works</h1>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 max-w-2xl">
          This is a pricing tool for a print-on-demand and marketplace business. A price for a single product usually starts from a base
          value, gets adjusted by rules and discounts, and is then formatted for how it&apos;s shown to a shopper. Everything below is
          organized around that flow.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/setup"
          className="rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-sm p-4 hover:border-black/30 dark:hover:border-white/30 transition-colors"
        >
          <div className="font-medium text-sm mb-1">Guided Setup <Badge tone="active">start here</Badge></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The recommended way to set up pricing for a product - walks you through it step by step, in the same order the tool actually
            uses it.
          </p>
        </Link>
        <Link
          href="/overview"
          className="rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-sm p-4 hover:border-black/30 dark:hover:border-white/30 transition-colors"
        >
          <div className="font-medium text-sm mb-1">Overview</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            A live dashboard - coverage across the whole catalog, current prices, and any open alerts.
          </p>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">What each part of the tool does</h2>
        {groups.map((group) => (
          <Card key={group.title} title={group.title}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{group.description}</p>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {group.pages.map((page) => (
                <div key={page.href} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={page.href} className="font-medium text-sm underline decoration-dotted">
                    {page.label}
                  </Link>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                    {page.description}
                    {page.note && <span className="text-neutral-500 dark:text-neutral-500"> {page.note}</span>}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
