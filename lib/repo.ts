import { readCollection, upsert, remove } from "./store";
import type {
  BusinessUnit,
  Shop,
  ProductGroup,
  Product,
  Variant,
  Sku,
  PriceOverride,
  PriceComponent,
  Discount,
  Commission,
  PricingRule,
  ConsistencyRule,
  EntityVersion,
  Alert,
  Experiment,
  Bundle,
  MixAndMatchSet,
  PricingCalendar,
  PresentationPolicy,
  CompositionDefinition,
  PriceList,
  HistoricalMetric,
} from "./types";

// Thin typed accessors over the generic JSON store. Each function maps 1:1 to a
// "collection" (a data/<name>.json file).

export const businessUnits = {
  all: () => readCollection<BusinessUnit>("businessUnits"),
};

export const shops = {
  all: () => readCollection<Shop>("shops"),
};

export const productGroups = {
  all: () => readCollection<ProductGroup>("productGroups"),
  save: (x: ProductGroup) => upsert("productGroups", x),
};

export const products = {
  all: () => readCollection<Product>("products"),
  save: (x: Product) => upsert("products", x),
  remove: (id: string) => remove("products", id),
};

export const variants = {
  all: () => readCollection<Variant>("variants"),
  save: (x: Variant) => upsert("variants", x),
};

export const skus = {
  all: () => readCollection<Sku>("skus"),
  save: (x: Sku) => upsert("skus", x),
};

export const priceOverrides = {
  all: () => readCollection<PriceOverride>("priceOverrides"),
  save: (x: PriceOverride) => upsert("priceOverrides", x),
  remove: (id: string) => remove("priceOverrides", id),
};

export const components = {
  all: () => readCollection<PriceComponent>("components"),
  save: (x: PriceComponent) => upsert("components", x),
  remove: (id: string) => remove("components", id),
};

export const discounts = {
  all: () => readCollection<Discount>("discounts"),
  save: (x: Discount) => upsert("discounts", x),
  remove: (id: string) => remove("discounts", id),
};

export const commissions = {
  all: () => readCollection<Commission>("commissions"),
};

export const rules = {
  all: () => readCollection<PricingRule>("rules"),
  save: (x: PricingRule) => upsert("rules", x),
  remove: (id: string) => remove("rules", id),
};

export const consistencyRules = {
  all: () => readCollection<ConsistencyRule>("consistencyRules"),
  save: (x: ConsistencyRule) => upsert("consistencyRules", x),
  remove: (id: string) => remove("consistencyRules", id),
};

export const versions = {
  all: () => readCollection<EntityVersion>("versions"),
  save: (x: EntityVersion) => upsert("versions", x),
};

export const alerts = {
  all: () => readCollection<Alert>("alerts"),
  save: (x: Alert) => upsert("alerts", x),
};

export const experiments = {
  all: () => readCollection<Experiment>("experiments"),
  save: (x: Experiment) => upsert("experiments", x),
};

export const bundles = {
  all: () => readCollection<Bundle>("bundles"),
  save: (x: Bundle) => upsert("bundles", x),
  remove: (id: string) => remove("bundles", id),
};

export const mixAndMatchSets = {
  all: () => readCollection<MixAndMatchSet>("mixAndMatchSets"),
  save: (x: MixAndMatchSet) => upsert("mixAndMatchSets", x),
  remove: (id: string) => remove("mixAndMatchSets", id),
};

export const pricingCalendars = {
  all: () => readCollection<PricingCalendar>("pricingCalendars"),
  save: (x: PricingCalendar) => upsert("pricingCalendars", x),
  remove: (id: string) => remove("pricingCalendars", id),
};

export const presentationPolicies = {
  all: () => readCollection<PresentationPolicy>("presentationPolicies"),
  save: (x: PresentationPolicy) => upsert("presentationPolicies", x),
  remove: (id: string) => remove("presentationPolicies", id),
};

export const compositionDefinitions = {
  all: () => readCollection<CompositionDefinition>("compositionDefinitions"),
  save: (x: CompositionDefinition) => upsert("compositionDefinitions", x),
  remove: (id: string) => remove("compositionDefinitions", id),
};

export const priceLists = {
  all: () => readCollection<PriceList>("priceLists"),
  save: (x: PriceList) => upsert("priceLists", x),
  remove: (id: string) => remove("priceLists", id),
};

// Read-only analytics - no save/remove, no version workflow.
export const historicalMetrics = {
  all: () => readCollection<HistoricalMetric>("historicalMetrics"),
};
