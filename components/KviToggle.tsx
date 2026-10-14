"use client";

import { useTransition } from "react";
import type { PriceRole } from "@/lib/types";
import { setProductPriceRoleAction } from "@/lib/actions/catalog";
import { Badge } from "@/components/ui";

// A Key Value Item is a SKU customers use to judge whether the whole store is
// cheap or expensive - toggled per product, inherited by every SKU under it.
export default function KviToggle({ productId, priceRole }: { productId: string; priceRole: PriceRole }) {
  const [pending, startTransition] = useTransition();
  const isKvi = priceRole === "kvi";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setProductPriceRoleAction(productId, isKvi ? "standard" : "kvi"))}
      title={isKvi ? "Key Value Item - click to unmark" : "Mark as a Key Value Item (a price customers judge the whole store by)"}
    >
      {isKvi ? (
        <Badge tone="warning">KVI</Badge>
      ) : (
        <span className="text-xs text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400">+ KVI</span>
      )}
    </button>
  );
}
