import { historicalMetrics } from "@/lib/repo";
import { loadCatalog } from "@/lib/engine/catalog";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ productGroup?: string; product?: string; sku?: string }>;
}) {
  const { productGroup: pgFilter, product: productFilter, sku: skuFilter } = await searchParams;
  const [metrics, catalog] = await Promise.all([historicalMetrics.all(), loadCatalog()]);

  const skuMeta = new Map(
    catalog.skus.map((sku) => {
      const variant = catalog.variants.find((v) => v.id === sku.variantId)!;
      const product = catalog.products.find((p) => p.id === variant.productId)!;
      const productGroup = catalog.productGroups.find((g) => g.id === product.productGroupId)!;
      return [sku.id, { sku, variant, product, productGroup }];
    }),
  );

  const filtered = metrics.filter((m) => {
    const meta = skuMeta.get(m.skuId);
    if (!meta) return false;
    if (skuFilter && m.skuId !== skuFilter) return false;
    if (productFilter && meta.product.id !== productFilter) return false;
    if (pgFilter && meta.productGroup.id !== pgFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => (a.month === b.month ? a.skuId.localeCompare(b.skuId) : b.month.localeCompare(a.month)));

  return (
    <div>
      <PageHeader
        title="Historical price explorer"
        description="Month-by-month price by SKU. This prototype has no real order history, so prices are synthetically generated per SKU across the last 6 months (not broken out by market/channel). This is the same data the presentation engine checks against for EU Omnibus-compliant 'was' pricing — see Storefront Display."
        path="/history"
      />

      <form className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <select name="productGroup" defaultValue={pgFilter ?? ""} className="border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent">
          <option value="">All product groups</option>
          {catalog.productGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="product" defaultValue={productFilter ?? ""} className="border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent">
          <option value="">All products</option>
          {catalog.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="sku" defaultValue={skuFilter ?? ""} className="border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent">
          <option value="">All SKUs</option>
          {catalog.skus.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1" type="submit">
          Filter
        </button>
      </form>

      <Card>
        {sorted.length === 0 ? (
          <EmptyState>No historical data for this filter.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/5 text-left">
                <tr>
                  <th className="p-2">Month</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const meta = skuMeta.get(m.skuId)!;
                  return (
                    <tr key={`${m.skuId}-${m.month}`} className={`border-t border-black/5 dark:border-white/5 ${i % 2 === 1 ? "bg-black/[0.02] dark:bg-white/[0.02]" : ""}`}>
                      <td className="p-2 text-neutral-500">{m.month}</td>
                      <td className="p-2">{meta.product.name}</td>
                      <td className="p-2">{meta.variant.name} — {meta.sku.name}</td>
                      <td className="p-2">{m.currency} {m.price.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
