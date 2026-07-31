import type { Alert } from "../types";
import { businessUnits, shops, discounts, rules, consistencyRules, alerts as alertsRepo, skus, priceOverrides } from "../repo";
import { writeCollection } from "../store";
import { loadCatalog, resolveNode, nodeIds } from "./catalog";
import { resolveBasePrice } from "./base";
import { runConsistencyChecks, runParityChecks } from "./consistency";
import { runSanityChecks } from "./sanity";
import { runDueScheduledActivations, allVersions } from "./versions";

const EXPIRY_WINDOW_DAYS = 14;
const MARGIN_FLOOR_RISK_PERCENT = 10;

function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

// Recomputes the full alert set from current data (sanity findings,
// consistency violations, expiring entities, margin-floor risk, scheduled
// activations), preserving acknowledged state for alerts that still apply.
export async function generateAlerts(): Promise<Alert[]> {
  await runDueScheduledActivations();

  const [catalog, allShops, allDiscounts, allRules, allConsistencyRules, allBUs, allSkus] = await Promise.all([
    loadCatalog(),
    shops.all(),
    discounts.all(),
    rules.all(),
    consistencyRules.all(),
    businessUnits.all(),
    skus.all(),
  ]);
  const overrides = await priceOverrides.all();

  const fresh: Alert[] = [];
  const now = new Date().toISOString();

  for (const bu of allBUs) {
    const sanityFindings = runSanityChecks(catalog, overrides, allRules, allDiscounts, allShops, bu.id);
    for (const f of sanityFindings) {
      fresh.push({
        id: `sanity-${f.id}`,
        type: "sanityCheck",
        severity: f.severity,
        message: f.message,
        createdAt: now,
        acknowledged: false,
      });
    }

    const consistencyViolations = [
      ...runConsistencyChecks(catalog, overrides, allConsistencyRules, bu.id),
      ...runParityChecks(catalog, overrides, allConsistencyRules, bu.id, allShops),
    ];
    for (const v of consistencyViolations) {
      fresh.push({
        id: `consistency-${v.rule.id}-${bu.id}`,
        type: "consistencyViolation",
        severity: v.severity === "blocking" ? "critical" : "warning",
        message: v.message,
        relatedEntityType: "consistencyRule",
        relatedEntityId: v.rule.id,
        createdAt: now,
        acknowledged: false,
      });
    }

    for (const sku of allSkus) {
      const node = resolveNode(catalog, sku.id);
      if (!node) continue;
      const resolved = resolveBasePrice(overrides, nodeIds(node), { businessUnitId: bu.id });
      if (!resolved?.floor) continue;
      const headroomPercent = ((resolved.price - resolved.floor) / resolved.price) * 100;
      if (resolved.price <= resolved.floor) {
        fresh.push({
          id: `margin-floor-${sku.id}-${bu.id}`,
          type: "marginFloorRisk",
          severity: "critical",
          message: `${node.product.name} ${sku.name}: price ${resolved.price.toFixed(2)} is at or below its floor ${resolved.floor.toFixed(2)}.`,
          relatedEntityType: "sku",
          relatedEntityId: sku.id,
          createdAt: now,
          acknowledged: false,
        });
      } else if (headroomPercent < MARGIN_FLOOR_RISK_PERCENT) {
        fresh.push({
          id: `margin-floor-${sku.id}-${bu.id}`,
          type: "marginFloorRisk",
          severity: "warning",
          message: `${node.product.name} ${sku.name}: price ${resolved.price.toFixed(2)} is only ${headroomPercent.toFixed(1)}% above its floor ${resolved.floor.toFixed(2)}.`,
          relatedEntityType: "sku",
          relatedEntityId: sku.id,
          createdAt: now,
          acknowledged: false,
        });
      }
    }
  }

  for (const discount of allDiscounts) {
    if (!discount.validTo) continue;
    const days = daysUntil(discount.validTo);
    if (days > 0 && days <= EXPIRY_WINDOW_DAYS) {
      fresh.push({
        id: `expiring-discount-${discount.id}`,
        type: "expiringDiscount",
        severity: days <= 3 ? "warning" : "info",
        message: `Discount "${discount.name}" expires in ${Math.ceil(days)} day(s) (${discount.validTo}).`,
        relatedEntityType: "discount",
        relatedEntityId: discount.id,
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  for (const rule of allRules) {
    if (!rule.validTo) continue;
    const days = daysUntil(rule.validTo);
    if (days > 0 && days <= EXPIRY_WINDOW_DAYS) {
      fresh.push({
        id: `expiring-price-${rule.id}`,
        type: "expiringPrice",
        severity: days <= 3 ? "warning" : "info",
        message: `Pricing rule "${rule.name}" expires in ${Math.ceil(days)} day(s) (${rule.validTo}).`,
        relatedEntityType: "rule",
        relatedEntityId: rule.id,
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  const versionList = await allVersions();
  for (const v of versionList) {
    if (v.status !== "scheduled" || !v.scheduledFor) continue;
    const days = daysUntil(v.scheduledFor);
    if (days > 0 && days <= 1) {
      fresh.push({
        id: `scheduled-activation-${v.id}`,
        type: "scheduledActivation",
        severity: "info",
        message: `Scheduled activation for ${v.entityType} (${v.entityId}) is due within 24h (${v.scheduledFor}).`,
        relatedEntityType: v.entityType,
        relatedEntityId: v.entityId,
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  // Some checks (e.g. overlapping discount tiers) aren't BU-specific but still
  // run once per BU in the loop above, so the same alert id can surface twice;
  // dedupe by id (which already encodes the specific finding) before merging.
  const deduped = [...new Map(fresh.map((a) => [a.id, a])).values()];

  const existing = await alertsRepo.all();
  const merged = deduped.map((a) => {
    const prior = existing.find((e) => e.id === a.id);
    return prior ? { ...a, acknowledged: prior.acknowledged, createdAt: prior.createdAt } : a;
  });

  await writeCollection("alerts", merged);
  return merged;
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const existing = await alertsRepo.all();
  const updated = existing.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
  await writeCollection("alerts", updated);
}
