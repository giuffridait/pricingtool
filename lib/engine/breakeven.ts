// Break-even volume analysis for a price change: to hold total gross margin
// dollars flat, volume must move by (oldMargin / newMargin - 1). A price cut
// needs *more* volume to break even; a price rise tolerates losing some
// volume before margin-$ falls. Two consumers share this: the What-If &
// Break-Even page, and the sanity check below that flags configured
// discounts whose depth would need an unrealistic volume increase.
//
// `cost` is always a proxy here, never a real cost figure - this prototype
// has no cost feed (see the roadmap). Callers are expected to source it from
// a SKU's floor (a real, authored business signal) or a manual override, and
// to treat "no floor" as "can't compute this" rather than guessing.

export interface BreakEvenResult {
  marginBefore: number;
  marginAfter: number;
  requiredVolumeUpliftPercent: number;
}

export function computeBreakEven(currentPrice: number, newPrice: number, cost: number): BreakEvenResult | null {
  const marginBefore = currentPrice - cost;
  const marginAfter = newPrice - cost;
  // Once either side no longer clears cost, "required uplift" would describe
  // a trade that doesn't exist (you can't break even on a loss with volume).
  if (marginBefore <= 0 || marginAfter <= 0) return null;
  return {
    marginBefore,
    marginAfter,
    requiredVolumeUpliftPercent: (marginBefore / marginAfter - 1) * 100,
  };
}

// Standard promo depths shown on the What-If page's break-even table.
export const STANDARD_DISCOUNT_DEPTHS_PERCENT = [5, 10, 15, 20, 25, 30];

// Above this required uplift, a configured discount is flagged by the sanity
// check as needing an unrealistic volume increase to break even.
export const UNREALISTIC_UPLIFT_THRESHOLD_PERCENT = 75;
