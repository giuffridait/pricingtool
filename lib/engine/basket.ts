import type { PricingContext, ResolvedPrice, ResolutionStep, Discount, BasketTier } from "../types";
import { bundles as bundlesRepo, mixAndMatchSets as setsRepo, discounts as discountsRepo, pricingCalendars } from "../repo";
import { resolvePrice } from "./price";
import { isWithinValidity } from "./match";
import { isWithinCalendar } from "./calendar";
import { loadCatalog } from "./catalog";

export interface BasketLine {
  skuId: string;
  quantity: number;
}

export interface BasketLineResult {
  skuId: string;
  quantity: number;
  resolved: ResolvedPrice;
  lineTotal: number;
}

export interface BundleApplication {
  bundleId: string;
  name: string;
  timesApplied: number;
  bundleTotal: number;
  individualTotal: number;
  savedAmount: number;
}

export interface MixAndMatchApplication {
  setId: string;
  name: string;
  timesApplied: number;
  setTotal: number;
  individualTotal: number;
  savedAmount: number;
}

export interface BasketDiscountApplication {
  discountId: string;
  name: string;
  amount: number;
}

export interface BasketResult {
  lines: BasketLineResult[];
  bundleApplications: BundleApplication[];
  mixAndMatchApplications: MixAndMatchApplication[];
  basketDiscount?: BasketDiscountApplication;
  lineSubtotal: number;
  total: number;
  currency: string;
  trace: ResolutionStep[];
}

type SharedContext = Omit<PricingContext, "skuId" | "quantity">;

function basketTierAmount(tiers: BasketTier[], orderValue: number): number {
  const applicable = [...tiers].filter((t) => orderValue >= t.minOrderValue).sort((a, b) => b.minOrderValue - a.minOrderValue)[0];
  if (!applicable) return 0;
  if (applicable.fixedDiscount !== undefined) return Math.min(applicable.fixedDiscount, orderValue);
  if (applicable.discountPercent) return (orderValue * applicable.discountPercent) / 100;
  return 0;
}

function eligibleForBasket(
  eligibility: Discount["eligibility"],
  validFrom: string | undefined,
  validTo: string | undefined,
  ctx: SharedContext,
): boolean {
  if (!isWithinValidity(validFrom, validTo, ctx.date)) return false;
  if (eligibility.markets && ctx.market && !eligibility.markets.includes(ctx.market)) return false;
  if (eligibility.customerGroups && (!ctx.customerGroup || !eligibility.customerGroups.includes(ctx.customerGroup))) return false;
  return true;
}

export async function resolveBasket(lines: BasketLine[], sharedCtx: SharedContext): Promise<BasketResult> {
  const trace: ResolutionStep[] = [];
  if (lines.length === 0) throw new Error("Basket has no lines");

  // Pass 1: resolve every line independently, exactly like a single-SKU request.
  let lineResults: BasketLineResult[] = await Promise.all(
    lines.map(async (line) => {
      const resolved = await resolvePrice({ ...sharedCtx, skuId: line.skuId, quantity: line.quantity });
      return { skuId: line.skuId, quantity: line.quantity, resolved, lineTotal: resolved.finalPrice * line.quantity };
    }),
  );
  const currency = lineResults[0].resolved.currency;
  if (lineResults.some((l) => l.resolved.currency !== currency)) {
    trace.push({ label: "Warning", detail: "Basket mixes currencies - totals below combine them without conversion." });
  }

  // Remaining consumable quantity per SKU, decremented as bundles/mix-and-match sets consume units.
  const remaining = new Map(lineResults.map((l) => [l.skuId, l.quantity]));
  const unitPrice = new Map(lineResults.map((l) => [l.skuId, l.resolved.finalPrice]));

  // Bundles: exact composition -> fixed price. Highest priority first.
  const allBundles = (await bundlesRepo.all()).filter((b) => b.businessUnitId === sharedCtx.businessUnitId);
  const bundleApplications: BundleApplication[] = [];
  for (const bundle of [...allBundles].sort((a, b) => b.priority - a.priority)) {
    if (!eligibleForBasket(bundle.eligibility, bundle.validFrom, bundle.validTo, sharedCtx)) continue;
    let timesApplied = Infinity;
    for (const comp of bundle.components) {
      const avail = remaining.get(comp.skuId) ?? 0;
      timesApplied = Math.min(timesApplied, Math.floor(avail / comp.quantity));
    }
    if (!Number.isFinite(timesApplied) || timesApplied <= 0) continue;
    let individualTotal = 0;
    for (const comp of bundle.components) {
      const price = unitPrice.get(comp.skuId) ?? 0;
      individualTotal += price * comp.quantity * timesApplied;
      remaining.set(comp.skuId, (remaining.get(comp.skuId) ?? 0) - comp.quantity * timesApplied);
    }
    const bundleTotal = bundle.bundlePrice * timesApplied;
    bundleApplications.push({
      bundleId: bundle.id,
      name: bundle.name,
      timesApplied,
      bundleTotal,
      individualTotal,
      savedAmount: individualTotal - bundleTotal,
    });
    trace.push({
      label: "Bundle applied",
      detail: `"${bundle.name}" x${timesApplied} = ${currency} ${bundleTotal.toFixed(2)} (individually ${currency} ${individualTotal.toFixed(2)}, saved ${currency} ${(individualTotal - bundleTotal).toFixed(2)})`,
    });
  }

  // Mix-and-match: any N units from a group -> flat set price. Highest priority first.
  const allSets = (await setsRepo.all()).filter((s) => s.businessUnitId === sharedCtx.businessUnitId);
  const catalog = await loadCatalog();
  const skuToProductId = new Map(
    catalog.skus.map((sku) => {
      const variant = catalog.variants.find((v) => v.id === sku.variantId);
      return [sku.id, variant?.productId ?? ""];
    }),
  );
  const mixAndMatchApplications: MixAndMatchApplication[] = [];
  for (const set of [...allSets].sort((a, b) => b.priority - a.priority)) {
    if (!eligibleForBasket(set.eligibility, set.validFrom, set.validTo, sharedCtx)) continue;
    const groupProductIds = new Set(
      set.group.productGroupId
        ? catalog.products.filter((p) => p.productGroupId === set.group.productGroupId).map((p) => p.id)
        : (set.group.productIds ?? []),
    );
    const eligibleSkuIds = lineResults.filter((l) => groupProductIds.has(skuToProductId.get(l.skuId) ?? "")).map((l) => l.skuId);
    const totalAvailable = eligibleSkuIds.reduce((sum, id) => sum + (remaining.get(id) ?? 0), 0);
    const timesApplied = Math.floor(totalAvailable / set.requiredCount);
    if (timesApplied <= 0) continue;
    let unitsToConsume = timesApplied * set.requiredCount;
    let individualTotal = 0;
    for (const skuId of eligibleSkuIds) {
      if (unitsToConsume <= 0) break;
      const avail = remaining.get(skuId) ?? 0;
      const take = Math.min(avail, unitsToConsume);
      if (take <= 0) continue;
      individualTotal += (unitPrice.get(skuId) ?? 0) * take;
      remaining.set(skuId, avail - take);
      unitsToConsume -= take;
    }
    const setTotal = set.setPrice * timesApplied;
    mixAndMatchApplications.push({
      setId: set.id,
      name: set.name,
      timesApplied,
      setTotal,
      individualTotal,
      savedAmount: individualTotal - setTotal,
    });
    trace.push({
      label: "Mix-and-match applied",
      detail: `"${set.name}" x${timesApplied} (${set.requiredCount} units each) = ${currency} ${setTotal.toFixed(2)} (individually ${currency} ${individualTotal.toFixed(2)}, saved ${currency} ${(individualTotal - setTotal).toFixed(2)})`,
    });
  }

  const remainingUnitsTotal = [...remaining.entries()].reduce((sum, [skuId, qty]) => sum + (unitPrice.get(skuId) ?? 0) * qty, 0);
  const bundleAndMixTotal =
    bundleApplications.reduce((s, b) => s + b.bundleTotal, 0) + mixAndMatchApplications.reduce((s, m) => s + m.setTotal, 0);
  const preBasketDiscountTotal = remainingUnitsTotal + bundleAndMixTotal;

  // Basket-value discount: order-value threshold, evaluated against the basket
  // total after bundles/mix-and-match. Stacking against line-level discounts:
  // if any line's same stacking-group discount outranks this one, the basket
  // discount doesn't apply at all; otherwise it wins and those lines are
  // re-resolved with that stacking group excluded.
  const allDiscounts = await discountsRepo.all();
  const allCalendars = await pricingCalendars.all();
  const calendarById = new Map(allCalendars.map((c) => [c.id, c]));
  const basketCandidates = allDiscounts
    .filter((d) => d.type === "basketValue" && d.basketTiers)
    .filter((d) => isWithinValidity(d.validFrom, d.validTo, sharedCtx.date))
    .filter((d) => isWithinCalendar(d.calendarId ? calendarById.get(d.calendarId) : undefined, sharedCtx.date))
    .filter((d) => eligibleForBasket(d.eligibility, undefined, undefined, sharedCtx))
    .map((d) => ({ discount: d, amount: basketTierAmount(d.basketTiers!, preBasketDiscountTotal) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.discount.priority - a.discount.priority);

  const chosenBasketGroups = new Set<string>();
  let basketDiscount: BasketDiscountApplication | undefined;
  for (const candidate of basketCandidates) {
    if (chosenBasketGroups.has(candidate.discount.stackingGroup)) continue;
    const conflictingLine = lineResults.find((l) =>
      l.resolved.appliedDiscounts.some((ad) => ad.stackingGroup === candidate.discount.stackingGroup && ad.priority >= candidate.discount.priority),
    );
    if (conflictingLine) {
      trace.push({
        label: "Basket discount excluded",
        detail: `"${candidate.discount.name}" did not apply — a higher (or equal) priority line-level discount already holds stacking group "${candidate.discount.stackingGroup}".`,
      });
      continue;
    }
    chosenBasketGroups.add(candidate.discount.stackingGroup);
    basketDiscount = { discountId: candidate.discount.id, name: candidate.discount.name, amount: candidate.amount };
    trace.push({
      label: "Basket discount applied",
      detail: `"${candidate.discount.name}" on order value ${currency} ${preBasketDiscountTotal.toFixed(2)} = -${currency} ${candidate.amount.toFixed(2)}`,
    });

    // Re-resolve any line that was holding the now-displaced stacking group.
    const group = candidate.discount.stackingGroup;
    const affectedIndices = lineResults
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.resolved.appliedDiscounts.some((ad) => ad.stackingGroup === group))
      .map(({ i }) => i);
    if (affectedIndices.length > 0) {
      lineResults = await Promise.all(
        lineResults.map(async (l, i) => {
          if (!affectedIndices.includes(i)) return l;
          const resolved = await resolvePrice({
            ...sharedCtx,
            skuId: l.skuId,
            quantity: l.quantity,
            excludedStackingGroups: [...(sharedCtx.excludedStackingGroups ?? []), group],
          });
          trace.push({ label: "Line re-resolved", detail: `${l.skuId}: stacking group "${group}" now reserved for the basket discount.` });
          return { skuId: l.skuId, quantity: l.quantity, resolved, lineTotal: resolved.finalPrice * l.quantity };
        }),
      );
    }
    break; // only one basket-value discount stacking group considered per basket for this prototype
  }

  const lineSubtotal = lineResults.reduce((s, l) => s + l.lineTotal, 0);
  const finalRemainingTotal = [...remaining.entries()].reduce((sum, [skuId, qty]) => {
    const line = lineResults.find((l) => l.skuId === skuId);
    return sum + (line ? line.resolved.finalPrice : unitPrice.get(skuId) ?? 0) * qty;
  }, 0);
  const total = finalRemainingTotal + bundleAndMixTotal - (basketDiscount?.amount ?? 0);

  return {
    lines: lineResults,
    bundleApplications,
    mixAndMatchApplications,
    basketDiscount,
    lineSubtotal,
    total,
    currency,
    trace,
  };
}
