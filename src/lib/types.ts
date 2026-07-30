// Core domain types for the Pricing Tool prototype.
// Storage is flat JSON collections (see lib/store.ts) rather than a relational DB.

export type ID = string;

export type CatalogLevel = "productGroup" | "product" | "variant" | "sku";

export interface BusinessUnit {
  id: ID;
  name: string;
}

export interface Shop {
  id: ID;
  name: string;
  businessUnitId: ID;
  market: string; // e.g. "DE", "CH", "UK"
  channel: string; // e.g. "web", "mobile"
  currency: string; // expected settlement currency for this shop/market
}

export interface ProductGroup {
  id: ID;
  level: "productGroup";
  name: string;
  businessUnitId: ID;
}

export interface Product {
  id: ID;
  level: "product";
  name: string;
  productGroupId: ID;
  productType: string; // rule-matching dimension, e.g. "tee"
}

export interface Variant {
  id: ID;
  level: "variant";
  name: string;
  productId: ID;
  appearance: string; // e.g. "red", "black" - rule-matching dimension
}

export interface Sku {
  id: ID;
  level: "sku";
  name: string; // e.g. "red / XXL"
  variantId: ID;
  size: string; // rule-matching dimension
  costBasis: number; // mocked - would come from an owning Cost system
}

// A price authored at any catalog level, scoped to a BU and optionally a specific shop.
// Resolution walks from SKU upward and takes the most specific match.
export interface PriceOverride {
  id: ID;
  level: CatalogLevel;
  refId: ID; // id of the productGroup/product/variant/sku
  businessUnitId: ID;
  shopId?: ID; // if set, only applies within this shop; else applies BU-wide
  price: number;
  currency: string;
  floor?: number;
  ceiling?: number;
  versionId: ID;
}

export type ComponentType =
  | "printArea"
  | "printTechnique"
  | "personalisation"
  | "designPremium"
  | "fee";

export type CalcModel = "flat" | "perStitch" | "percentOfSubtotal";

export interface PriceComponent {
  id: ID;
  type: ComponentType;
  name: string;
  parentId?: ID; // parent component this inherits defaults from
  calcModel: CalcModel;
  value: number; // meaning depends on calcModel (flat=amount, perStitch=amount per stitch, percentOfSubtotal=percent)
  stitchCount?: number; // used when calcModel = perStitch
  matches: {
    productType?: string;
    appearance?: string;
    size?: string;
    design?: string;
  };
  versionId: ID;
}

export type DiscountType =
  | "percentOff"
  | "amountOff"
  | "fixedPrice"
  | "volumeTier"
  | "bogo";

export interface VolumeTier {
  minQty: number;
  discountPercent?: number;
  fixedPrice?: number;
}

export interface BogoConfig {
  buyQty: number;
  payQty: number;
  cheapestFree: boolean;
}

export interface DiscountScope {
  productGroupId?: ID;
  productId?: ID;
  variantId?: ID;
  skuId?: ID;
  componentId?: ID; // discount can target a component instead of the base price
}

export interface DiscountEligibility {
  markets?: string[];
  customerGroups?: string[];
}

export interface Discount {
  id: ID;
  name: string;
  type: DiscountType;
  value?: number; // for percentOff / amountOff / fixedPrice
  tiers?: VolumeTier[]; // for volumeTier
  bogo?: BogoConfig; // for bogo
  scope: DiscountScope;
  eligibility: DiscountEligibility;
  validFrom?: string;
  validTo?: string;
  stackingGroup: string;
  priority: number;
  badge?: string;
  versionId: ID;
}

export type CommissionType = "designer" | "creator" | "partner";
export type CommissionCalc = "percentOfPremium" | "fixedPerItem" | "tieredPercent";

export interface CommissionTier {
  minUnitsPerMonth: number;
  percent: number;
}

// Consumed as read-only values from a mocked owning "Payout System".
export interface Commission {
  id: ID;
  name: string;
  type: CommissionType;
  calc: CommissionCalc;
  value?: number; // percent or fixed amount depending on calc
  tiers?: CommissionTier[];
  scope: DiscountScope;
  source: "payout-system-mock";
}

export type RuleEffectType = "setPrice" | "applyDiscount" | "applyComponent" | "applyCommission";

export interface RuleDimensions {
  businessUnitId?: ID;
  shopId?: ID;
  market?: string;
  channel?: string;
  productType?: string;
  appearance?: string;
  size?: string;
  design?: string;
  printArea?: string;
  printTechnique?: string;
  personalisation?: string;
  customerGroup?: string;
  account?: string;
}

export interface PricingRule {
  id: ID;
  name: string;
  scope: DiscountScope; // which catalog node(s) this rule can apply to
  dimensions: RuleDimensions;
  effect: {
    type: RuleEffectType;
    price?: number; // for setPrice
    discountId?: ID; // for applyDiscount
    componentId?: ID; // for applyComponent
    commissionId?: ID; // for applyCommission
  };
  priority: number;
  stackingGroup?: string;
  exclusionGroups?: string[]; // stacking groups this rule excludes when active
  validFrom?: string;
  validTo?: string;
  versionId: ID;
}

export type ConsistencyCheckType =
  | "minGapAbsolute"
  | "minGapPercent"
  | "ordering"
  | "parityDeviation";

export interface ConsistencyRule {
  id: ID;
  name: string;
  type: ConsistencyCheckType;
  subjectRefId: ID; // e.g. premium tee product id
  comparatorRefId: ID; // e.g. core tee product id, or market code for parity
  threshold: number; // absolute amount, percent, or deviation percent
  severity: "blocking" | "warning";
}

export type VersionStatus =
  | "draft"
  | "inReview"
  | "approved"
  | "scheduled"
  | "active"
  | "reverted";

export interface EntityVersion {
  id: ID;
  entityType: string; // "priceOverride" | "discount" | "rule" | "component" | ...
  entityId: ID;
  status: VersionStatus;
  payload: unknown;
  createdAt: string;
  createdBy: string;
  activatedAt?: string;
  scheduledFor?: string;
  previousVersionId?: ID;
  note?: string;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: ID;
  type:
    | "sanityCheck"
    | "consistencyViolation"
    | "expiringDiscount"
    | "expiringPrice"
    | "marginFloorRisk"
    | "scheduledActivation"
    | "experimentEvent";
  severity: AlertSeverity;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  acknowledged: boolean;
}

export type ExperimentStatus = "draft" | "running" | "completed" | "stopped";

export interface Experiment {
  id: ID;
  name: string;
  hypothesis: string;
  skuId: ID;
  businessUnitId: ID;
  market: string;
  controlPrice: number;
  controlTrafficPercent: number;
  challengerPrice: number;
  challengerTrafficPercent: number;
  startDate: string;
  endDate: string;
  status: ExperimentStatus;
  marginFloor: number;
}

export interface PricingContext {
  skuId: ID;
  businessUnitId: ID;
  shopId?: ID;
  market?: string;
  channel?: string;
  customerGroup?: string;
  account?: string;
  quantity?: number;
  date?: string; // ISO date, defaults to now
  // Configuration selections - not derivable from the catalog, chosen at request time
  printArea?: string;
  printTechnique?: string;
  personalisation?: string;
  design?: string;
}

export interface ResolutionStep {
  label: string;
  detail: string;
}

export interface ResolvedPrice {
  skuId: ID;
  basePrice: number;
  basePriceSource: string; // e.g. "SKU override (shop X)" or "inherited from Product Group"
  floor?: number;
  ceiling?: number;
  ruleAdjustedPrice: number;
  componentsTotal: number;
  discountTotal: number;
  finalPrice: number;
  currency: string;
  trace: ResolutionStep[];
  warnings: string[];
}
