import Link from "next/link";
import { shops, priceOverrides, businessUnits } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { resolveBasePrice, formatFloorCeiling } from "@/lib/engine/base";
import { resolvePrice } from "@/lib/engine/price";
import { generateAlerts } from "@/lib/engine/alerts";
import { Card, Badge, PageHeader } from "@/components/ui";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop: shopFilter } = await searchParams;
  const [allShops, catalog, overrides, alerts, bus] = await Promise.all([
    shops.all(),
    loadCatalog(),
    priceOverrides.all(),
    generateAlerts(),
    businessUnits.all(),
  ]);
  const selectedShop = shopFilter ? allShops.find((s) => s.id === shopFilter) : undefined;

  const openAlerts = alerts.filter((a) => !a.acknowledged);
  const bySeverity = {
    critical: openAlerts.filter((a) => a.severity === "critical").length,
    warning: openAlerts.filter((a) => a.severity === "warning").length,
    info: openAlerts.filter((a) => a.severity === "info").length,
  };
  const severityRank = { critical: 0, warning: 1, info: 2 };
  const topAlerts = [...openAlerts].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 4);

  const rows = await Promise.all(
    catalog.skus.map(async (sku) => {
      const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
      const product = catalog.products.find((p) => p.id === variant.productId)!;
      const productGroup = catalog.productGroups.find((g) => g.id === product.productGroupId)!;
      const ids = { productGroupId: productGroup.id, productId: product.id, variantId: variant.id, skuId: sku.id };
      // Each SKU belongs to exactly one BU (via its product group) - resolve
      // against that, not a page-wide default, now that the catalog spans
      // more than one business unit.
      const businessUnitId = productGroup.businessUnitId;
      const contextShop = selectedShop?.businessUnitId === businessUnitId ? selectedShop : undefined;
      const base = resolveBasePrice(overrides, ids, { businessUnitId, shopId: contextShop?.id });
      let resolvedPrice: number | null = null;
      let resolvedWarning: string | null = null;
      try {
        const resolved = await resolvePrice({
          skuId: sku.id,
          businessUnitId,
          shopId: contextShop?.id,
          market: contextShop?.market,
          channel: contextShop?.channel,
        });
        resolvedPrice = resolved.finalPrice;
      } catch (e) {
        resolvedWarning = (e as Error).message;
      }
      return { sku, variant, product, productGroup, base, resolvedPrice, resolvedWarning };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Pricing overview"
        description="Coverage across the catalog: what's priced, what falls back to an inherited default, and the fully-resolved runtime price for the selected context."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Card title="Open alerts">
          <div className="flex gap-3 text-sm mb-3">
            <Link href="/alerts"><Badge tone="critical">{bySeverity.critical} critical</Badge></Link>
            <Link href="/alerts"><Badge tone="warning">{bySeverity.warning} warning</Badge></Link>
            <Link href="/alerts"><Badge tone="info">{bySeverity.info} info</Badge></Link>
          </div>
          {topAlerts.length === 0 ? (
            <p className="text-sm text-neutral-500 italic">Nothing open right now.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {topAlerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2 border-t border-black/10 dark:border-white/10 pt-1.5">
                  <Badge tone={a.severity}>{a.severity}</Badge>
                  <span className="text-neutral-700 dark:text-neutral-300">{a.message}</span>
                </li>
              ))}
            </ul>
          )}
          {openAlerts.length > topAlerts.length && (
            <Link href="/alerts" className="text-xs underline decoration-dotted text-neutral-500 mt-2 inline-block">
              View all {openAlerts.length} open alerts
            </Link>
          )}
        </Card>

        <Card title="Getting started - recommended paths">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">New</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><Link href="/catalog" className="underline decoration-dotted">Catalog & Pricing</Link> - set your base prices</li>
                <li><Link href="/incentives" className="underline decoration-dotted">Discounts & Incentives</Link> - add a sale or bundle</li>
                <li><Link href="/calculator" className="underline decoration-dotted">Price Calculator</Link> - check what a customer pays</li>
              </ol>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Advanced pricing setup</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><Link href="/components" className="underline decoration-dotted">Components</Link> - reusable price add-ons</li>
                <li><Link href="/rules" className="underline decoration-dotted">Rules</Link> - scope-matched price/discount logic</li>
                <li><Link href="/price-lists" className="underline decoration-dotted">Price Lists</Link> - customer-group / B2B pricing</li>
                <li><Link href="/checks" className="underline decoration-dotted">Consistency & Sanity</Link> - catch pricing mistakes</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>

      <form className="flex items-center gap-2 mb-4 text-sm">
        <label htmlFor="shop" className="text-neutral-500">Shop / market context:</label>
        <select id="shop" name="shop" defaultValue={shopFilter ?? ""} className="border border-black/25 dark:border-white/25 rounded px-2 py-1 bg-white dark:bg-neutral-900">
          <option value="">BU-wide default (no shop)</option>
          {bus.map((bu) => (
            <optgroup key={bu.id} label={bu.name}>
              {allShops
                .filter((s) => s.businessUnitId === bu.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.market}/{s.channel}, {s.currency})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="text-neutral-400 text-xs">(only applies to rows in the matching business unit; others still show their own BU-wide default)</span>
        <button className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1" type="submit">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-black/20 dark:border-white/20">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-white/10 text-left">
            <tr>
              <th className="p-2">BU</th>
              <th className="p-2">Product group</th>
              <th className="p-2">Product</th>
              <th className="p-2">Variant</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Authored base</th>
              <th className="p-2">Guardrail</th>
              <th className="p-2">Resolved (runtime)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sku, variant, product, productGroup, base, resolvedPrice, resolvedWarning }) => (
              <tr key={sku.id} className="border-t border-black/10 dark:border-white/10">
                <td className="p-2 text-neutral-500 text-xs">{bus.find((b) => b.id === productGroup.businessUnitId)?.name}</td>
                <td className="p-2">{productGroup.name}</td>
                <td className="p-2">{product.name}</td>
                <td className="p-2">{variant.name}</td>
                <td className="p-2">
                  <Link href={`/calculator?skuId=${sku.id}`} className="underline decoration-dotted">
                    {sku.name}
                  </Link>
                </td>
                <td className="p-2">
                  {base ? (
                    <span>
                      {base.currency} {base.price.toFixed(2)}{" "}
                      <Badge tone={base.shopSpecific ? "active" : base.level === "sku" || base.level === "variant" ? "approved" : "draft"}>
                        {base.shopSpecific ? "shop override" : base.level}
                      </Badge>
                    </span>
                  ) : (
                    <Badge tone="critical">no price</Badge>
                  )}
                </td>
                <td className="p-2 text-neutral-500">{formatFloorCeiling(base?.floor, base?.ceiling)}</td>
                <td className="p-2">
                  {resolvedWarning ? (
                    <Badge tone="critical">{resolvedWarning}</Badge>
                  ) : resolvedPrice !== null ? (
                    <span className={resolvedPrice !== base?.price ? "font-medium" : ""}>
                      {base?.currency} {resolvedPrice.toFixed(2)}
                      {resolvedPrice !== base?.price && <span className="text-neutral-500"> (rules/discounts applied)</span>}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
