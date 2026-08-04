import type { PresentationPolicy, Discount, ResolvedPrice, HistoricalMetric } from "../types";
import { scopeSpecificity } from "./scope";
import { isWithinValidity } from "./match";
import { isWithinCalendar } from "./calendar";
import { pricingCalendars } from "../repo";
import type { nodeIds } from "./catalog";

// Presentation is configured separately from the paid price (per the
// requirements sheet): this module only ever *derives a view* from an
// already-resolved price - it never changes what the engine charges.

export interface PresentationResult {
  currency: string;
  rrp: number;
  displayPrice: number;
  strikethrough?: number;
  badge?: string;
  percentOff?: number;
  // EU Omnibus: the lowest recorded price in the reference window, and
  // whether the naive RRP-based strikethrough had to be corrected or
  // dropped to keep the "was" claim compliant with it.
  omnibusReference?: number;
  omnibusAdjusted?: boolean;
  messages: string[];
}

// EU Omnibus Directive: a "was X now Y" claim must reference the lowest
// price charged in the preceding 30 days, not an arbitrary RRP. Price
// history here is monthly, not daily - each entry already represents "the
// price during that month," so the most recent month at or before the
// as-of date is the honest proxy for "lowest price in the last 30 days"
// (a wider lookback would overstate the window Omnibus actually asks for).
function computeOmnibusReference(metrics: HistoricalMetric[], skuId: string, asOfDate?: string): number | undefined {
  const asOfMonth = (asOfDate ?? new Date().toISOString()).slice(0, 7);
  const priorMonths = metrics
    .filter((m) => m.skuId === skuId && m.month <= asOfMonth)
    .sort((a, b) => b.month.localeCompare(a.month));
  return priorMonths[0]?.price;
}

export function roundForDisplay(price: number, policy?: PresentationPolicy): number {
  if (!policy || policy.roundingMode === "none") return Math.round(price * 100) / 100;
  if (policy.roundingMode === "nearestInteger") return Math.round(price);
  if (policy.roundingMode === "nearestHalf") return Math.round(price * 2) / 2;
  if (policy.roundingMode === "charm") {
    const charm = policy.charmEnding ?? 0.9;
    const floor = Math.floor(price);
    let candidate = floor + charm;
    if (candidate < price) candidate = floor + 1 + charm;
    return Math.round(candidate * 100) / 100;
  }
  return price;
}

async function scopedDiscountFor(
  discounts: Discount[],
  ids: ReturnType<typeof nodeIds>,
  ctx: { market?: string; customerGroup?: string; date?: string },
  type: Discount["type"],
): Promise<Discount | null> {
  const calendars = await pricingCalendars.all();
  const calendarById = new Map(calendars.map((c) => [c.id, c]));
  const matches = discounts
    .filter((d) => d.type === type)
    .filter((d) => isWithinValidity(d.validFrom, d.validTo, ctx.date))
    .filter((d) => isWithinCalendar(d.calendarId ? calendarById.get(d.calendarId) : undefined, ctx.date))
    .filter((d) => !d.eligibility.markets || (ctx.market && d.eligibility.markets.includes(ctx.market)))
    .filter((d) => !d.eligibility.customerGroups || (ctx.customerGroup && d.eligibility.customerGroups.includes(ctx.customerGroup)))
    .map((d) => ({ discount: d, score: scopeSpecificity(d.scope, ids) }))
    .filter((x): x is { discount: Discount; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score);
  return matches[0]?.discount ?? null;
}

export async function buildPresentation(
  resolved: ResolvedPrice,
  ids: ReturnType<typeof nodeIds>,
  allDiscounts: Discount[],
  historicalMetrics: HistoricalMetric[],
  ctx: { market?: string; customerGroup?: string; date?: string; quantity?: number },
  policy?: PresentationPolicy,
): Promise<PresentationResult> {
  const qty = ctx.quantity && ctx.quantity > 0 ? ctx.quantity : 1;
  const rrp = roundForDisplay(resolved.ruleAdjustedPrice + resolved.componentsTotal, policy);
  const displayPrice = roundForDisplay(resolved.finalPrice, policy);
  const messages: string[] = [];

  const showStrike = policy?.showRrpStrikethrough ?? true;
  const showBadge = policy?.showDiscountBadge ?? true;
  const showMessages = policy?.showNextTierMessage ?? true;
  const showOmnibus = policy?.showOmnibusReference ?? true;

  let strikethrough = showStrike && displayPrice < rrp ? rrp : undefined;
  let percentOff = strikethrough ? ((rrp - displayPrice) / rrp) * 100 : undefined;

  let omnibusReference: number | undefined;
  let omnibusAdjusted = false;
  if (showOmnibus && strikethrough !== undefined) {
    omnibusReference = computeOmnibusReference(historicalMetrics, ids.skuId, ctx.date);
    if (omnibusReference !== undefined && omnibusReference < strikethrough) {
      if (displayPrice < omnibusReference) {
        // Genuine discount vs. the true recent low - just correct the "was" price.
        strikethrough = roundForDisplay(omnibusReference, policy);
        percentOff = ((strikethrough - displayPrice) / strikethrough) * 100;
      } else {
        // Not actually below the lowest recent price - no compliant claim to make.
        // (Explained via omnibusReference/omnibusAdjusted rather than pushed into
        // `messages`, which is reserved for celebratory savings/next-tier copy.)
        strikethrough = undefined;
        percentOff = undefined;
      }
      omnibusAdjusted = true;
    }
  }

  let badge: string | undefined;
  if (showBadge) {
    const topDiscount = [...resolved.appliedDiscounts].sort((a, b) => b.priority - a.priority)[0];
    if (topDiscount?.badge) badge = topDiscount.badge;
    else if (percentOff && percentOff >= 1) badge = `-${Math.round(percentOff)}%`;
  }

  if (showMessages) {
    const volumeDiscount = await scopedDiscountFor(allDiscounts, ids, ctx, "volumeTier");
    if (volumeDiscount?.tiers) {
      const nextTier = [...volumeDiscount.tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty);
      if (nextTier) {
        const unitSubtotal = resolved.ruleAdjustedPrice + resolved.componentsTotal;
        const currentUnitPrice = resolved.finalPrice;
        const nextUnitPrice = nextTier.fixedPrice !== undefined ? nextTier.fixedPrice : unitSubtotal * (1 - (nextTier.discountPercent ?? 0) / 100);
        const moreNeeded = nextTier.minQty - qty;
        const savingsAtNextTier = (currentUnitPrice - nextUnitPrice) * nextTier.minQty;
        if (savingsAtNextTier > 0) {
          messages.push(`Add ${moreNeeded} more, save ${resolved.currency} ${savingsAtNextTier.toFixed(2)}`);
        }
      }
    }

    const bogoDiscount = await scopedDiscountFor(allDiscounts, ids, ctx, "bogo");
    if (bogoDiscount?.bogo) {
      const { buyQty, payQty } = bogoDiscount.bogo;
      // buyQty is the bundle size, payQty is how many of those are charged - e.g.
      // buyQty=3/payQty=2 means 1 of every 3 is free, phrased as "buy 2, get 1 free".
      const free = buyQty - payQty;
      messages.push(free === 1 ? `Buy ${payQty}, get 1 free` : `Buy ${buyQty}, pay for ${payQty}`);
    }
  }

  return {
    currency: resolved.currency,
    rrp,
    displayPrice,
    strikethrough,
    badge,
    percentOff,
    omnibusReference,
    omnibusAdjusted,
    messages,
  };
}
