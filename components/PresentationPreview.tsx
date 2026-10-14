"use client";

import { useState, useTransition } from "react";
import type { BusinessUnit, Shop } from "@/lib/types";
import { calculatePriceAction } from "@/lib/actions/calculator";
import { previewFromPriceAction } from "@/lib/actions/presentation";
import type { PresentationResult } from "@/lib/engine/presentation";
import { Card, Badge } from "@/components/ui";
import PresentationTile from "@/components/PresentationTile";
import type { SkuOption } from "@/components/PriceCalculatorForm";

export interface ProductOption {
  id: string;
  label: string;
}

export default function PresentationPreview({
  skuOptions,
  productOptions,
  businessUnits,
  shops,
}: {
  skuOptions: SkuOption[];
  productOptions: ProductOption[];
  businessUnits: BusinessUnit[];
  shops: Shop[];
}) {
  const [mode, setMode] = useState<"sku" | "product">("sku");
  const [skuId, setSkuId] = useState(skuOptions[0]?.id ?? "");
  const [productId, setProductId] = useState(productOptions[0]?.id ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [shopId, setShopId] = useState("");
  const [market, setMarket] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [presentation, setPresentation] = useState<PresentationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const shared = {
        businessUnitId,
        shopId: shopId || undefined,
        market: market || undefined,
        customerGroup: customerGroup || undefined,
        quantity: quantity ? parseInt(quantity, 10) : 1,
      };
      if (mode === "sku") {
        const { presentation, error } = await calculatePriceAction({ ...shared, skuId });
        setPresentation(presentation ?? null);
        setError(error ?? null);
      } else {
        const { presentation, error } = await previewFromPriceAction(productId, shared);
        setPresentation(presentation ?? null);
        setError(error ?? null);
      }
    });
  }

  return (
    <Card title="Customer-facing preview">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 text-sm">
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "sku"} onChange={() => setMode("sku")} /> single SKU
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "product"} onChange={() => setMode("product")} /> product tile (&quot;from&quot; price)
            </label>
          </div>
          {mode === "sku" ? (
            <select value={skuId} onChange={(e) => setSkuId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
              {skuOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
              {productOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
            <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="border rounded px-2 py-1 bg-transparent w-full">
              <option value="">no shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="market" className="border rounded px-2 py-1 bg-transparent w-full" />
            <input value={customerGroup} onChange={(e) => setCustomerGroup(e.target.value)} placeholder="customer group" className="border rounded px-2 py-1 bg-transparent w-full" />
            {mode === "sku" && (
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} placeholder="quantity" className="border rounded px-2 py-1 bg-transparent w-full" />
            )}
          </div>
          <button disabled={pending} onClick={run} className="rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5">
            {pending ? "Resolving…" : "Preview"}
          </button>
        </div>
        <div>
          {error && <Badge tone="critical">{error}</Badge>}
          {presentation && <PresentationTile presentation={presentation} fromLabel={mode === "product"} />}
          {!presentation && !error && <p className="text-sm text-neutral-500 italic">Pick a SKU or product and preview.</p>}
        </div>
      </div>
    </Card>
  );
}
