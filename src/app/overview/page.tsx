import Link from "next/link";
import { shops, priceOverrides, businessUnits } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { resolveBasePrice } from "@/lib/engine/base";
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

      <div className="flex gap-3 mb-4">
        <Card title="Open alerts">
          <div className="flex gap-3 text-sm">
            <Link href="/alerts"><Badge tone="critical">{bySeverity.critical} critical</Badge></Link>
            <Link href="/alerts"><Badge tone="warning">{bySeverity.warning} warning</Badge></Link>
            <Link href="/alerts"><Badge tone="info">{bySeverity.info} info</Badge></Link>
          </div>
        </Card>
      </div>

      <form className="flex items-center gap-2 mb-4 text-sm">
        <label htmlFor="shop" className="text-neutral-500">Shop / market context:</label>
        <select id="shop" name="shop" defaultValue={shopFilter ?? ""} className="border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent">
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

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5 text-left">
            <tr>
              <th className="p-2">BU</th>
              <th className="p-2">Product group</th>
              <th className="p-2">Product</th>
              <th className="p-2">Variant</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Authored base</th>
              <th className="p-2">Floor / Ceiling</th>
              <th className="p-2">Resolved (runtime)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sku, variant, product, productGroup, base, resolvedPrice, resolvedWarning }) => (
              <tr key={sku.id} className="border-t border-black/5 dark:border-white/5">
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
                <td className="p-2 text-neutral-500">
                  {base?.floor !== undefined ? `floor ${base.floor}` : "—"}
                  {base?.ceiling !== undefined ? ` / ceiling ${base.ceiling}` : ""}
                </td>
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
