// Seeds data/*.json with a small but representative dataset covering every
// Must-have capability, using the examples from the requirements sheet.
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const businessUnits = [{ id: "bu_apparel", name: "Apparel BU" }];

const shops = [
  { id: "shop_de", name: "Germany Store", businessUnitId: "bu_apparel", market: "DE", channel: "web", currency: "EUR" },
  { id: "shop_ch", name: "Swiss Store", businessUnitId: "bu_apparel", market: "CH", channel: "web", currency: "CHF" },
  { id: "shop_uk", name: "UK Store", businessUnitId: "bu_apparel", market: "UK", channel: "web", currency: "GBP" },
  { id: "shop_mobile_de", name: "Mobile App (DE)", businessUnitId: "bu_apparel", market: "DE", channel: "mobile", currency: "EUR" },
];

const productGroups = [
  { id: "pg_tshirts", level: "productGroup", name: "T-Shirts", businessUnitId: "bu_apparel" },
  { id: "pg_hoodies", level: "productGroup", name: "Hoodies", businessUnitId: "bu_apparel" },
];

const products = [
  { id: "prod_premium_tee", level: "product", name: "Premium Tee", productGroupId: "pg_tshirts", productType: "tee" },
  { id: "prod_core_tee", level: "product", name: "Core Tee", productGroupId: "pg_tshirts", productType: "tee" },
  { id: "prod_hoodie", level: "product", name: "Classic Hoodie", productGroupId: "pg_hoodies", productType: "hoodie" },
];

const variants = [
  { id: "var_premium_tee_red", level: "variant", name: "Premium Tee red", productId: "prod_premium_tee", appearance: "red" },
  { id: "var_premium_tee_black", level: "variant", name: "Premium Tee black", productId: "prod_premium_tee", appearance: "black" },
  { id: "var_core_tee_white", level: "variant", name: "Core Tee white", productId: "prod_core_tee", appearance: "white" },
  { id: "var_hoodie_black", level: "variant", name: "Classic Hoodie black", productId: "prod_hoodie", appearance: "black" },
];

const skus = [
  { id: "sku_premium_tee_red_m", level: "sku", name: "red / M", variantId: "var_premium_tee_red", size: "M", costBasis: 10 },
  { id: "sku_premium_tee_red_xxl", level: "sku", name: "red / XXL", variantId: "var_premium_tee_red", size: "XXL", costBasis: 11 },
  { id: "sku_premium_tee_black_m", level: "sku", name: "black / M", variantId: "var_premium_tee_black", size: "M", costBasis: 10 },
  { id: "sku_core_tee_white_m", level: "sku", name: "white / M", variantId: "var_core_tee_white", size: "M", costBasis: 8 },
  { id: "sku_hoodie_black_m", level: "sku", name: "black / M", variantId: "var_hoodie_black", size: "M", costBasis: 15 },
  { id: "sku_hoodie_black_l", level: "sku", name: "black / L", variantId: "var_hoodie_black", size: "L", costBasis: 15 },
  { id: "sku_hoodie_black_xl", level: "sku", name: "black / XL", variantId: "var_hoodie_black", size: "XL", costBasis: 15.5 },
];

// Prices are authored per BU (and optionally per shop). Resolution walks the
// catalog from SKU up to product group, preferring the most specific + most
// specific context (shop beats BU-wide) match.
const priceOverrides = [
  { id: "po_pg_tshirts", level: "productGroup", refId: "pg_tshirts", businessUnitId: "bu_apparel", price: 20, currency: "EUR", floor: 15, versionId: "v_seed" },
  { id: "po_pg_hoodies", level: "productGroup", refId: "pg_hoodies", businessUnitId: "bu_apparel", price: 30, currency: "EUR", floor: 20, versionId: "v_seed" },
  { id: "po_prod_core_tee", level: "product", refId: "prod_core_tee", businessUnitId: "bu_apparel", price: 20, currency: "EUR", versionId: "v_seed" },
  { id: "po_var_premium_tee_red", level: "variant", refId: "var_premium_tee_red", businessUnitId: "bu_apparel", price: 22, currency: "EUR", versionId: "v_seed" },
  { id: "po_sku_premium_tee_red_xxl", level: "sku", refId: "sku_premium_tee_red_xxl", businessUnitId: "bu_apparel", price: 24, currency: "EUR", versionId: "v_seed" },
  // shop-specific override: "shop X can override to €21"
  { id: "po_prod_premium_tee_shop_de", level: "product", refId: "prod_premium_tee", businessUnitId: "bu_apparel", shopId: "shop_de", price: 21, currency: "EUR", versionId: "v_seed" },
  // deliberately cheaper than sibling L (30) to trip the cross-SKU sanity check
  { id: "po_sku_hoodie_black_xl", level: "sku", refId: "sku_hoodie_black_xl", businessUnitId: "bu_apparel", price: 24, currency: "EUR", versionId: "v_seed" },
  // sits close to its inherited floor (15) to trip the margin-floor-risk alert
  { id: "po_sku_core_tee_white_m", level: "sku", refId: "sku_core_tee_white_m", businessUnitId: "bu_apparel", price: 16, currency: "EUR", versionId: "v_seed" },
];

const components = [
  { id: "comp_print", type: "printTechnique", name: "Print (default)", calcModel: "flat", value: 4.5, matches: { printArea: "back", printTechnique: "flex" }, versionId: "v_seed" },
  { id: "comp_print_embroidery", type: "printTechnique", name: "Back print, embroidery", parentId: "comp_print", calcModel: "perStitch", value: 0.02, stitchCount: 400, matches: { printArea: "back", printTechnique: "embroidery" }, versionId: "v_seed" },
  { id: "comp_print_hoodie_override", type: "printTechnique", name: "Hoodie back print override", parentId: "comp_print", calcModel: "flat", value: 5.5, matches: { printArea: "back", printTechnique: "flex", productType: "hoodie" }, versionId: "v_seed" },
  { id: "comp_design_premium", type: "designPremium", name: "Design premium", calcModel: "flat", value: 2, matches: {}, versionId: "v_seed" },
];

const discounts = [
  {
    id: "disc_summer_sale", name: "Summer Sale", type: "percentOff", value: 15,
    scope: { productGroupId: "pg_hoodies" }, eligibility: { markets: ["DE", "FR"] },
    validFrom: "2026-07-01", validTo: "2026-07-31", stackingGroup: "seasonal", priority: 50, badge: "SALE", versionId: "v_seed",
  },
  {
    id: "disc_volume_tee", name: "Tee volume discount", type: "volumeTier",
    tiers: [{ minQty: 1 }, { minQty: 10, discountPercent: 5 }, { minQty: 50, discountPercent: 10 }],
    scope: { productId: "prod_premium_tee" }, eligibility: {}, stackingGroup: "volume", priority: 10, versionId: "v_seed",
  },
  {
    id: "disc_bogo_tee", name: "Buy 3 tees, pay for 2", type: "bogo",
    bogo: { buyQty: 3, payQty: 2, cheapestFree: true },
    scope: { productId: "prod_premium_tee" }, eligibility: {}, stackingGroup: "multibuy", priority: 20, versionId: "v_seed",
  },
  {
    id: "disc_loyalty_gold", name: "Loyalty Gold", type: "percentOff", value: 5,
    scope: {}, eligibility: { customerGroups: ["loyalty-gold"] },
    stackingGroup: "loyalty", priority: 90, badge: "LOYALTY", versionId: "v_seed",
  },
  // Overlapping tiers (both start at qty 10) - left in deliberately so the
  // cross-SKU sanity check has something to detect.
  {
    id: "disc_volume_core_tee", name: "Core tee volume discount", type: "volumeTier",
    tiers: [{ minQty: 1 }, { minQty: 10, discountPercent: 5 }, { minQty: 10, discountPercent: 8 }],
    scope: { productId: "prod_core_tee" }, eligibility: {}, stackingGroup: "volume", priority: 10, versionId: "v_seed",
  },
];

// Mocked: in production these values would be read from an external Payout System.
const commissions = [
  { id: "comm_designer", name: "Designer commission", type: "designer", calc: "percentOfPremium", value: 20, scope: {}, source: "payout-system-mock" },
  { id: "comm_partner", name: "Marketplace partner fee", type: "partner", calc: "fixedPerItem", value: 2, scope: {}, source: "payout-system-mock" },
  { id: "comm_topseller", name: "Top-seller tier", type: "creator", calc: "tieredPercent", tiers: [{ minUnitsPerMonth: 1000, percent: 25 }], scope: {}, source: "payout-system-mock" },
];

const rules = [
  {
    id: "rule_premium_eu_base", name: "Premium Tee base EU", scope: { productId: "prod_premium_tee" },
    dimensions: {}, effect: { type: "setPrice", price: 25 }, priority: 10, versionId: "v_seed",
  },
  {
    id: "rule_premium_de_sale", name: "Premium Tee DE sale", scope: { productId: "prod_premium_tee" },
    dimensions: { market: "DE" }, effect: { type: "setPrice", price: 22 }, priority: 100,
    validFrom: "2026-06-01", validTo: "2026-06-15", versionId: "v_seed",
  },
  {
    id: "rule_loyalty_gold", name: "Loyalty Gold -5%", scope: {},
    dimensions: { customerGroup: "loyalty-gold" }, effect: { type: "applyDiscount", discountId: "disc_loyalty_gold" },
    priority: 90, stackingGroup: "loyalty", exclusionGroups: ["seasonal"], versionId: "v_seed",
  },
  {
    id: "rule_hoodie_seasonal_sale", name: "Hoodie Summer Sale", scope: { productGroupId: "pg_hoodies" },
    dimensions: { market: "DE" }, effect: { type: "applyDiscount", discountId: "disc_summer_sale" },
    priority: 50, stackingGroup: "seasonal", versionId: "v_seed",
  },
  {
    id: "rule_tee_volume", name: "Tee volume tiers", scope: { productId: "prod_premium_tee" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_volume_tee" },
    priority: 10, stackingGroup: "volume", versionId: "v_seed",
  },
  {
    id: "rule_tee_bogo", name: "Tee BOGO", scope: { productId: "prod_premium_tee" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_bogo_tee" },
    priority: 20, stackingGroup: "multibuy", versionId: "v_seed",
  },
  {
    id: "rule_core_tee_volume", name: "Core tee volume tiers", scope: { productId: "prod_core_tee" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_volume_core_tee" },
    priority: 10, stackingGroup: "volume", versionId: "v_seed",
  },
  // Mobile-channel price glitch, set higher than the €30 group default - left in
  // deliberately so the "sale price above RRP" sanity check has something to catch.
  {
    id: "rule_hoodie_mobile_glitch", name: "Hoodie mobile channel price", scope: { productId: "prod_hoodie" },
    dimensions: { channel: "mobile" }, effect: { type: "setPrice", price: 32 }, priority: 5, versionId: "v_seed",
  },
];

const consistencyRules = [
  { id: "cr_premium_gap", name: "Premium tee ≥ core tee +10%", type: "minGapPercent", subjectRefId: "prod_premium_tee", comparatorRefId: "prod_core_tee", threshold: 10, severity: "blocking" },
  { id: "cr_ch_parity", name: "CH price within ±15% of EU", type: "parityDeviation", subjectRefId: "pg_tshirts", comparatorRefId: "EU", threshold: 15, severity: "warning" },
];

const experiments = [
  {
    id: "exp_hoodie_price_test", name: "Hoodie price test", hypothesis: "A slightly lower price increases hoodie conversion enough to grow revenue",
    skuId: "sku_hoodie_black_m", businessUnitId: "bu_apparel", market: "DE",
    controlPrice: 34.9, controlTrafficPercent: 90, challengerPrice: 32.9, challengerTrafficPercent: 10,
    startDate: "2026-08-01", endDate: "2026-08-29", status: "draft", marginFloor: 20,
  },
];

const versions = [
  {
    id: "v_seed", entityType: "seed", entityId: "seed", status: "active",
    payload: { note: "initial seed data" }, createdAt: new Date().toISOString(), createdBy: "seed-script", activatedAt: new Date().toISOString(),
  },
];

const alerts = [];

const collections = {
  businessUnits, shops, productGroups, products, variants, skus,
  priceOverrides, components, discounts, commissions, rules,
  consistencyRules, experiments, versions, alerts,
};

const force = process.argv.includes("--force");

await fs.mkdir(DATA_DIR, { recursive: true });
for (const [name, data] of Object.entries(collections)) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!force) {
    try {
      await fs.access(file);
      console.log(`skip ${name}.json (already exists, use --force to overwrite)`);
      continue;
    } catch {
      // doesn't exist, fall through to write
    }
  }
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
  console.log(`wrote ${name}.json (${data.length} records)`);
}
