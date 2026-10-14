import type {
  PriceComponent,
  PricingRule,
  Discount,
  PricingCalendar,
  PricingContext,
  ResolvedPrice,
  ResolutionStep,
  AppliedDiscount,
} from "../types";
import { priceOverrides, components, rules, discounts, pricingCalendars, priceLists } from "../repo";
import { loadCatalog, resolveNode, nodeIds, nodeDimensions } from "./catalog";
import { matchSpecificity, isWithinValidity } from "./match";
import { isWithinCalendar } from "./calendar";
import { scopeSpecificity } from "./scope";
import { resolveBasePrice } from "./base";

function ruleContextFor(ctx: PricingContext, dims: ReturnType<typeof nodeDimensions>) {
  return {
    businessUnitId: ctx.businessUnitId,
    shopId: ctx.shopId,
    market: ctx.market,
    channel: ctx.channel,
    customerGroup: ctx.customerGroup,
    account: ctx.account,
    productType: dims.productType,
    appearance: dims.appearance,
    size: dims.size,
    design: ctx.design,
    printArea: ctx.printArea,
    printTechnique: ctx.printTechnique,
    personalisation: ctx.personalisation,
  };
}

function volumeDiscountAmount(discount: Discount, unitSubtotal: number, qty: number): number {
  if (!discount.tiers || discount.tiers.length === 0) return 0;
  const applicable = [...discount.tiers].filter((t) => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  if (!applicable) return 0;
  if (applicable.fixedPrice !== undefined) return Math.max(0, unitSubtotal - applicable.fixedPrice);
  if (applicable.discountPercent) return (unitSubtotal * applicable.discountPercent) / 100;
  return 0;
}

// resolvePrice works in per-unit terms throughout, so a BOGO's free-item value
// (which applies across the whole order quantity) is averaged back down to a
// per-unit discount rather than subtracted wholesale from a single unit's price.
function bogoDiscountAmount(discount: Discount, unitSubtotal: number, qty: number): number {
  if (!discount.bogo) return 0;
  const { buyQty, payQty } = discount.bogo;
  if (buyQty <= 0 || qty < buyQty) return 0;
  const freeUnits = Math.floor(qty / buyQty) * (buyQty - payQty);
  return (freeUnits * unitSubtotal) / qty;
}

function flatDiscountAmount(discount: Discount, subtotal: number): number {
  switch (discount.type) {
    case "percentOff":
      return (subtotal * (discount.value ?? 0)) / 100;
    case "amountOff":
      return Math.min(discount.value ?? 0, subtotal);
    case "fixedPrice":
      return Math.max(0, subtotal - (discount.value ?? 0));
    default:
      return 0;
  }
}

export async function resolvePrice(ctx: PricingContext): Promise<ResolvedPrice> {
  const catalog = await loadCatalog();
  const node = resolveNode(catalog, ctx.skuId);
  if (!node) throw new Error(`Unknown SKU: ${ctx.skuId}`);
  const ids = nodeIds(node);
  const dims = nodeDimensions(node);
  const ruleCtx = ruleContextFor(ctx, dims);
  const qty = ctx.quantity && ctx.quantity > 0 ? ctx.quantity : 1;
  const trace: ResolutionStep[] = [];
  const warnings: string[] = [];
  if (qty > 1) {
    trace.push({
      label: "Quantity",
      detail: `${qty} units — all prices below are the effective per-unit price (quantity/BOGO discounts averaged across the order).`,
    });
  }

  // 1. Base price + floor/ceiling: walk catalog levels, most specific + most
  // specific context (shop beats BU-wide) wins; floor/ceiling separately take
  // the first defined value found while walking, independent of which level
  // supplied the winning base price.
  const allOverrides = await priceOverrides.all();
  const resolved = resolveBasePrice(allOverrides, ids, ctx);
  if (!resolved) {
    throw new Error(`No price defined anywhere in the catalog chain for SKU ${ctx.skuId} / BU ${ctx.businessUnitId}`);
  }
  let { price: basePrice, currency } = resolved;
  const { floor, ceiling } = resolved;
  if (ctx.overridePrice !== undefined) {
    basePrice = ctx.overridePrice;
    trace.push({
      label: "Base price",
      detail: `${currency} ${basePrice.toFixed(2)} - hypothetical override (what-if), replacing catalog/price-list resolution${
        floor !== undefined ? `, floor=${floor}` : ""
      }${ceiling !== undefined ? `, ceiling=${ceiling}` : ""}`,
    });
  } else {
    trace.push({
      label: "Base price",
      detail: `${currency} ${basePrice.toFixed(2)} from ${node.sku.name} chain, level="${resolved.level}"${
        resolved.shopSpecific ? " (shop-specific override)" : " (BU-wide)"
      }${floor !== undefined ? `, floor=${floor}` : ""}${ceiling !== undefined ? `, ceiling=${ceiling}` : ""}`,
    });
  }

  // 1b. B2B / customer-group price lists: a matching list replaces the
  // catalog base price outright (highest-priority match wins) before any
  // rule/discount resolution runs on top. Skipped entirely under a what-if
  // override - the whole point is pricing from the hypothetical number.
  let priceListApplied = false;
  if (ctx.overridePrice !== undefined && ctx.customerGroup) {
    trace.push({ label: "Price list", detail: "Skipped - a what-if override replaces price-list resolution too." });
  } else if (ctx.overridePrice === undefined && ctx.customerGroup) {
    const allPriceLists = await priceLists.all();
    const listMatch = allPriceLists
      .filter((l) => l.businessUnitId === ctx.businessUnitId)
      .filter((l) => l.customerGroup === ctx.customerGroup)
      .filter((l) => isWithinValidity(l.validFrom, l.validTo, ctx.date))
      .map((l) => ({ list: l, entry: l.entries.find((e) => e.skuId === ctx.skuId) }))
      .filter((x): x is { list: (typeof allPriceLists)[number]; entry: NonNullable<(typeof x)["entry"]> } => !!x.entry)
      .sort((a, b) => b.list.priority - a.list.priority)[0];
    if (listMatch) {
      basePrice = listMatch.entry.price;
      currency = listMatch.list.currency;
      priceListApplied = true;
      trace.push({
        label: "Price list",
        detail: `"${listMatch.list.name}" supplies ${currency} ${basePrice.toFixed(2)} for customer group "${ctx.customerGroup}", replacing the catalog base price.`,
      });
    }
  }

  // 2. Pricing rules of type setPrice: most specific scope + dimension match, highest priority wins.
  const allRules = await rules.all();
  const allCalendars = await pricingCalendars.all();
  const calendarById = new Map<string, PricingCalendar>(allCalendars.map((c) => [c.id, c]));
  const eligibleRules = allRules
    .filter((r) => isWithinValidity(r.validFrom, r.validTo, ctx.date))
    .filter((r) => isWithinCalendar(r.calendarId ? calendarById.get(r.calendarId) : undefined, ctx.date))
    .map((r) => {
      const scopeScore = scopeSpecificity(r.scope, ids);
      if (scopeScore === null) return null;
      const dimScore = matchSpecificity(r.dimensions, ruleCtx);
      if (dimScore === null) return null;
      return { rule: r, scopeScore, dimScore };
    })
    .filter((x): x is { rule: PricingRule; scopeScore: number; dimScore: number } => x !== null)
    .sort((a, b) => b.rule.priority - a.rule.priority || b.scopeScore - a.scopeScore || b.dimScore - a.dimScore);

  let ruleAdjustedPrice = basePrice;
  const setPriceMatch = priceListApplied || ctx.overridePrice !== undefined ? undefined : eligibleRules.find((m) => m.rule.effect.type === "setPrice");
  if (setPriceMatch) {
    ruleAdjustedPrice = setPriceMatch.rule.effect.price ?? basePrice;
    trace.push({
      label: "Pricing rule",
      detail: `"${setPriceMatch.rule.name}" (priority ${setPriceMatch.rule.priority}) replaces base price → ${currency} ${ruleAdjustedPrice.toFixed(2)}`,
    });
  } else if (priceListApplied) {
    trace.push({ label: "Pricing rule", detail: "Skipped - a price list already supplied the price for this customer group." });
  } else if (ctx.overridePrice !== undefined) {
    trace.push({ label: "Pricing rule", detail: "Skipped - a what-if override replaces setPrice rule resolution too." });
  } else {
    trace.push({ label: "Pricing rule", detail: "No setPrice rule matched; base price stands." });
  }

  // 3. Price components (configuration/design). Group by family (root ancestor),
  // only the most specific match per family applies - this is how a hoodie-specific
  // "back print" override beats the generic default without needing separate rules.
  const allComponents = await components.all();
  const familyOf = (c: PriceComponent): string => c.parentId ?? c.id;
  const familyBest = new Map<string, { component: PriceComponent; score: number }>();
  for (const c of allComponents) {
    const score = matchSpecificity(c.matches, ruleCtx);
    if (score === null) continue;
    const fam = familyOf(c);
    const existing = familyBest.get(fam);
    if (!existing || score > existing.score) familyBest.set(fam, { component: c, score });
  }
  let flatAndStitchTotal = 0;
  const percentComponents: PriceComponent[] = [];
  for (const { component } of familyBest.values()) {
    if (component.calcModel === "percentOfSubtotal") {
      percentComponents.push(component);
      continue;
    }
    const amount = component.calcModel === "perStitch" ? component.value * (component.stitchCount ?? 0) : component.value;
    flatAndStitchTotal += amount;
    trace.push({ label: "Component", detail: `"${component.name}" (${component.calcModel}) = +${currency} ${amount.toFixed(2)}` });
  }
  const preDiscountSubtotal = ruleAdjustedPrice + flatAndStitchTotal;
  let percentComponentsTotal = 0;
  for (const component of percentComponents) {
    const amount = (preDiscountSubtotal * component.value) / 100;
    percentComponentsTotal += amount;
    trace.push({ label: "Component", detail: `"${component.name}" (percentOfSubtotal) = +${currency} ${amount.toFixed(2)}` });
  }
  const componentsTotal = flatAndStitchTotal + percentComponentsTotal;
  const subtotal = preDiscountSubtotal + percentComponentsTotal;

  // 4. Discounts, reached either directly (matching rule effect=applyDiscount)
  // and gated by the discount's own validity/eligibility. Stacking: within a
  // stacking group only the highest-priority discount applies; a discount can
  // exclude other groups entirely (e.g. loyalty excludes coupons).
  const allDiscounts = await discounts.all();
  const discountRuleMatches = eligibleRules.filter((m) => m.rule.effect.type === "applyDiscount");
  const candidates = discountRuleMatches
    .map((m) => {
      const discount = allDiscounts.find((d) => d.id === m.rule.effect.discountId);
      if (!discount) return null;
      if (!isWithinValidity(discount.validFrom, discount.validTo, ctx.date)) return null;
      if (!isWithinCalendar(discount.calendarId ? calendarById.get(discount.calendarId) : undefined, ctx.date)) return null;
      if (discount.eligibility.markets && ctx.market && !discount.eligibility.markets.includes(ctx.market)) return null;
      if (
        discount.eligibility.customerGroups &&
        (!ctx.customerGroup || !discount.eligibility.customerGroups.includes(ctx.customerGroup))
      )
        return null;
      let amount = 0;
      if (discount.type === "volumeTier") amount = volumeDiscountAmount(discount, subtotal, qty);
      else if (discount.type === "bogo") amount = bogoDiscountAmount(discount, subtotal, qty);
      else amount = flatDiscountAmount(discount, subtotal);
      return { rule: m.rule, discount, amount };
    })
    .filter((x): x is { rule: PricingRule; discount: Discount; amount: number } => x !== null && x.amount > 0)
    .sort((a, b) => b.rule.priority - a.rule.priority);

  let discountTotal = 0;
  const appliedDiscounts: AppliedDiscount[] = [];
  const chosenGroups = new Set<string>();
  // Seeded by the basket engine when a basket-level discount already won a
  // stacking group this line's discounts also belong to.
  const excludedGroups = new Set<string>(ctx.excludedStackingGroups ?? []);
  for (const c of candidates) {
    const group = c.discount.stackingGroup;
    if (excludedGroups.has(group)) {
      trace.push({ label: "Discount excluded", detail: `"${c.discount.name}" skipped — stacking group "${group}" excluded by a higher-priority rule.` });
      continue;
    }
    if (chosenGroups.has(group)) {
      trace.push({ label: "Discount excluded", detail: `"${c.discount.name}" skipped — a higher-priority discount already won stacking group "${group}".` });
      continue;
    }
    chosenGroups.add(group);
    discountTotal += c.amount;
    appliedDiscounts.push({
      discountId: c.discount.id,
      name: c.discount.name,
      stackingGroup: group,
      priority: c.rule.priority,
      amount: c.amount,
      badge: c.discount.badge,
    });
    trace.push({
      label: "Discount applied",
      detail: `"${c.discount.name}"${c.discount.badge ? ` [${c.discount.badge}]` : ""} (stacking group "${group}") = -${currency} ${c.amount.toFixed(2)}`,
    });
    for (const excluded of c.rule.exclusionGroups ?? []) excludedGroups.add(excluded);
  }

  let finalPrice = subtotal - discountTotal;
  if (floor !== undefined && finalPrice < floor) {
    warnings.push(`Final price ${finalPrice.toFixed(2)} was below floor ${floor.toFixed(2)}; clamped to floor.`);
    trace.push({ label: "Floor safeguard", detail: `Clamped up to floor ${currency} ${floor.toFixed(2)}` });
    finalPrice = floor;
  }
  if (ceiling !== undefined && finalPrice > ceiling) {
    warnings.push(`Final price ${finalPrice.toFixed(2)} exceeded ceiling ${ceiling.toFixed(2)}; clamped to ceiling.`);
    trace.push({ label: "Ceiling safeguard", detail: `Clamped down to ceiling ${currency} ${ceiling.toFixed(2)}` });
    finalPrice = ceiling;
  }

  return {
    skuId: ctx.skuId,
    basePrice,
    basePriceSource: `${resolved.level}${resolved.shopSpecific ? " (shop override)" : ""}`,
    floor,
    ceiling,
    ruleAdjustedPrice,
    componentsTotal,
    discountTotal,
    appliedDiscounts,
    finalPrice,
    currency,
    trace,
    warnings,
  };
}
