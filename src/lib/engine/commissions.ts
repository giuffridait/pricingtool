import type { Commission } from "../types";

// Commission authoring is out of scope per the requirements sheet ("open scope
// decision"); this app only *consumes* commission values from the mocked
// owning Payout System and shows how they'd feed off the same price
// calculation, so a real integration can be dropped in later without
// reshaping the pricing engine.

export interface CommissionResult {
  commission: Commission;
  amount: number;
  basis: string;
}

export function computeCommissions(
  commissions: Commission[],
  designPremiumAmount: number,
  unitsSoldThisMonth: number,
): CommissionResult[] {
  return commissions.map((c) => {
    if (c.calc === "percentOfPremium") {
      const amount = (designPremiumAmount * (c.value ?? 0)) / 100;
      return { commission: c, amount, basis: `${c.value}% of design premium (${designPremiumAmount.toFixed(2)})` };
    }
    if (c.calc === "fixedPerItem") {
      return { commission: c, amount: c.value ?? 0, basis: "fixed per item" };
    }
    // tieredPercent
    const tier = [...(c.tiers ?? [])].sort((a, b) => b.minUnitsPerMonth - a.minUnitsPerMonth).find((t) => unitsSoldThisMonth >= t.minUnitsPerMonth);
    if (!tier) return { commission: c, amount: 0, basis: `below lowest tier threshold (${unitsSoldThisMonth} units this month)` };
    const amount = (designPremiumAmount * tier.percent) / 100;
    return { commission: c, amount, basis: `${tier.percent}% tier at ${unitsSoldThisMonth} units/month (≥${tier.minUnitsPerMonth})` };
  });
}
