// Seeds data/*.json with a representative dataset covering every Must-have
// capability, using the examples from the requirements sheet, across two
// business units (in-house POD apparel + third-party marketplace) and six
// product categories.
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const businessUnits = [
  { id: "bu_apparel", name: "Apparel BU" },
  { id: "bu_marketplace", name: "Marketplace BU" },
];

const shops = [
  { id: "shop_de", name: "Germany Store", businessUnitId: "bu_apparel", market: "DE", channel: "web", currency: "EUR" },
  { id: "shop_ch", name: "Swiss Store", businessUnitId: "bu_apparel", market: "CH", channel: "web", currency: "CHF" },
  { id: "shop_uk", name: "UK Store", businessUnitId: "bu_apparel", market: "UK", channel: "web", currency: "GBP" },
  { id: "shop_fr", name: "France Store", businessUnitId: "bu_apparel", market: "FR", channel: "web", currency: "EUR" },
  { id: "shop_mobile_de", name: "Mobile App (DE)", businessUnitId: "bu_apparel", market: "DE", channel: "mobile", currency: "EUR" },
  { id: "shop_us_mp", name: "US Marketplace", businessUnitId: "bu_marketplace", market: "US", channel: "web", currency: "USD" },
  { id: "shop_de_mp", name: "Germany Marketplace", businessUnitId: "bu_marketplace", market: "DE", channel: "web", currency: "EUR" },
];

const productGroups = [
  { id: "pg_tshirts", level: "productGroup", name: "T-Shirts", businessUnitId: "bu_apparel" },
  { id: "pg_hoodies", level: "productGroup", name: "Hoodies", businessUnitId: "bu_apparel" },
  { id: "pg_totes", level: "productGroup", name: "Tote Bags", businessUnitId: "bu_apparel" },
  { id: "pg_mugs", level: "productGroup", name: "Mugs", businessUnitId: "bu_apparel" },
  { id: "pg_phonecases", level: "productGroup", name: "Phone Cases", businessUnitId: "bu_marketplace" },
  { id: "pg_posters", level: "productGroup", name: "Fine Art Prints", businessUnitId: "bu_marketplace" },
];

const products = [
  { id: "prod_premium_tee", level: "product", name: "Premium Tee", productGroupId: "pg_tshirts", productType: "tee" },
  { id: "prod_core_tee", level: "product", name: "Core Tee", productGroupId: "pg_tshirts", productType: "tee" },
  { id: "prod_hoodie", level: "product", name: "Classic Hoodie", productGroupId: "pg_hoodies", productType: "hoodie" },
  { id: "prod_zip_hoodie", level: "product", name: "Zip Hoodie", productGroupId: "pg_hoodies", productType: "hoodie" },
  { id: "prod_tote", level: "product", name: "Canvas Tote", productGroupId: "pg_totes", productType: "tote" },
  { id: "prod_mug", level: "product", name: "Ceramic Mug", productGroupId: "pg_mugs", productType: "mug" },
  { id: "prod_phonecase", level: "product", name: "Slim Phone Case", productGroupId: "pg_phonecases", productType: "phonecase" },
  { id: "prod_poster", level: "product", name: "Fine Art Print", productGroupId: "pg_posters", productType: "poster" },
];

const variants = [
  { id: "var_premium_tee_red", level: "variant", name: "Premium Tee red", productId: "prod_premium_tee", appearance: "red" },
  { id: "var_premium_tee_black", level: "variant", name: "Premium Tee black", productId: "prod_premium_tee", appearance: "black" },
  { id: "var_premium_tee_blue", level: "variant", name: "Premium Tee blue", productId: "prod_premium_tee", appearance: "blue" },
  { id: "var_core_tee_white", level: "variant", name: "Core Tee white", productId: "prod_core_tee", appearance: "white" },
  { id: "var_core_tee_black", level: "variant", name: "Core Tee black", productId: "prod_core_tee", appearance: "black" },
  { id: "var_hoodie_black", level: "variant", name: "Classic Hoodie black", productId: "prod_hoodie", appearance: "black" },
  { id: "var_zip_hoodie_grey", level: "variant", name: "Zip Hoodie grey", productId: "prod_zip_hoodie", appearance: "grey" },
  { id: "var_tote_natural", level: "variant", name: "Canvas Tote natural", productId: "prod_tote", appearance: "natural" },
  { id: "var_tote_black", level: "variant", name: "Canvas Tote black", productId: "prod_tote", appearance: "black" },
  { id: "var_mug_white", level: "variant", name: "Ceramic Mug white", productId: "prod_mug", appearance: "white" },
  { id: "var_mug_black", level: "variant", name: "Ceramic Mug black", productId: "prod_mug", appearance: "black" },
  { id: "var_phonecase_clear", level: "variant", name: "Slim Phone Case clear", productId: "prod_phonecase", appearance: "clear" },
  { id: "var_phonecase_black", level: "variant", name: "Slim Phone Case black", productId: "prod_phonecase", appearance: "black" },
  { id: "var_poster_matte", level: "variant", name: "Fine Art Print matte", productId: "prod_poster", appearance: "matte" },
  { id: "var_poster_glossy", level: "variant", name: "Fine Art Print glossy", productId: "prod_poster", appearance: "glossy" },
];

const skus = [
  { id: "sku_premium_tee_red_s", level: "sku", name: "red / S", variantId: "var_premium_tee_red", size: "S", costBasis: 9.5 },
  { id: "sku_premium_tee_red_m", level: "sku", name: "red / M", variantId: "var_premium_tee_red", size: "M", costBasis: 10 },
  { id: "sku_premium_tee_red_l", level: "sku", name: "red / L", variantId: "var_premium_tee_red", size: "L", costBasis: 10.5 },
  { id: "sku_premium_tee_red_xxl", level: "sku", name: "red / XXL", variantId: "var_premium_tee_red", size: "XXL", costBasis: 11 },
  { id: "sku_premium_tee_black_m", level: "sku", name: "black / M", variantId: "var_premium_tee_black", size: "M", costBasis: 10 },
  { id: "sku_premium_tee_black_l", level: "sku", name: "black / L", variantId: "var_premium_tee_black", size: "L", costBasis: 10.5 },
  { id: "sku_premium_tee_blue_m", level: "sku", name: "blue / M", variantId: "var_premium_tee_blue", size: "M", costBasis: 10 },
  { id: "sku_core_tee_white_m", level: "sku", name: "white / M", variantId: "var_core_tee_white", size: "M", costBasis: 8 },
  { id: "sku_core_tee_black_m", level: "sku", name: "black / M", variantId: "var_core_tee_black", size: "M", costBasis: 8 },
  { id: "sku_hoodie_black_m", level: "sku", name: "black / M", variantId: "var_hoodie_black", size: "M", costBasis: 15 },
  { id: "sku_hoodie_black_l", level: "sku", name: "black / L", variantId: "var_hoodie_black", size: "L", costBasis: 15 },
  { id: "sku_hoodie_black_xl", level: "sku", name: "black / XL", variantId: "var_hoodie_black", size: "XL", costBasis: 15.5 },
  { id: "sku_zip_hoodie_grey_m", level: "sku", name: "grey / M", variantId: "var_zip_hoodie_grey", size: "M", costBasis: 16 },
  { id: "sku_zip_hoodie_grey_l", level: "sku", name: "grey / L", variantId: "var_zip_hoodie_grey", size: "L", costBasis: 16.5 },
  { id: "sku_tote_natural_os", level: "sku", name: "natural / OS", variantId: "var_tote_natural", size: "OS", costBasis: 4 },
  { id: "sku_tote_black_os", level: "sku", name: "black / OS", variantId: "var_tote_black", size: "OS", costBasis: 4.2 },
  { id: "sku_mug_white_11oz", level: "sku", name: "white / 11oz", variantId: "var_mug_white", size: "11oz", costBasis: 3 },
  { id: "sku_mug_white_15oz", level: "sku", name: "white / 15oz", variantId: "var_mug_white", size: "15oz", costBasis: 3.6 },
  { id: "sku_mug_black_11oz", level: "sku", name: "black / 11oz", variantId: "var_mug_black", size: "11oz", costBasis: 3.2 },
  { id: "sku_case_clear_iphone15", level: "sku", name: "clear / iPhone 15", variantId: "var_phonecase_clear", size: "iPhone15", costBasis: 4 },
  { id: "sku_case_clear_iphone15pro", level: "sku", name: "clear / iPhone 15 Pro", variantId: "var_phonecase_clear", size: "iPhone15Pro", costBasis: 4.5 },
  { id: "sku_case_black_iphone15", level: "sku", name: "black / iPhone 15", variantId: "var_phonecase_black", size: "iPhone15", costBasis: 4 },
  { id: "sku_case_black_galaxys24", level: "sku", name: "black / Galaxy S24", variantId: "var_phonecase_black", size: "GalaxyS24", costBasis: 4 },
  { id: "sku_poster_matte_a4", level: "sku", name: "matte / A4", variantId: "var_poster_matte", size: "A4", costBasis: 3 },
  { id: "sku_poster_matte_a3", level: "sku", name: "matte / A3", variantId: "var_poster_matte", size: "A3", costBasis: 5 },
  { id: "sku_poster_matte_a2", level: "sku", name: "matte / A2", variantId: "var_poster_matte", size: "A2", costBasis: 8 },
  { id: "sku_poster_glossy_a4", level: "sku", name: "glossy / A4", variantId: "var_poster_glossy", size: "A4", costBasis: 3.2 },
  { id: "sku_poster_glossy_a3", level: "sku", name: "glossy / A3", variantId: "var_poster_glossy", size: "A3", costBasis: 5.3 },
];

// Prices are authored per BU (and optionally per shop). Resolution walks the
// catalog from SKU up to product group, preferring the most specific + most
// specific context (shop beats BU-wide) match.
const priceOverrides = [
  { id: "po_pg_tshirts", level: "productGroup", refId: "pg_tshirts", businessUnitId: "bu_apparel", price: 20, currency: "EUR", floor: 15, versionId: "v_seed" },
  { id: "po_pg_hoodies", level: "productGroup", refId: "pg_hoodies", businessUnitId: "bu_apparel", price: 30, currency: "EUR", floor: 20, versionId: "v_seed" },
  { id: "po_pg_totes", level: "productGroup", refId: "pg_totes", businessUnitId: "bu_apparel", price: 12, currency: "EUR", floor: 8, versionId: "v_seed" },
  { id: "po_pg_mugs", level: "productGroup", refId: "pg_mugs", businessUnitId: "bu_apparel", price: 9, currency: "EUR", floor: 6, versionId: "v_seed" },
  { id: "po_pg_phonecases", level: "productGroup", refId: "pg_phonecases", businessUnitId: "bu_marketplace", price: 15, currency: "EUR", floor: 10, versionId: "v_seed" },
  { id: "po_pg_posters", level: "productGroup", refId: "pg_posters", businessUnitId: "bu_marketplace", price: 18, currency: "EUR", floor: 12, versionId: "v_seed" },
  { id: "po_prod_core_tee", level: "product", refId: "prod_core_tee", businessUnitId: "bu_apparel", price: 20, currency: "EUR", versionId: "v_seed" },
  { id: "po_prod_zip_hoodie", level: "product", refId: "prod_zip_hoodie", businessUnitId: "bu_apparel", price: 34, currency: "EUR", versionId: "v_seed" },
  { id: "po_prod_poster", level: "product", refId: "prod_poster", businessUnitId: "bu_marketplace", price: 20, currency: "EUR", versionId: "v_seed" },
  { id: "po_var_premium_tee_red", level: "variant", refId: "var_premium_tee_red", businessUnitId: "bu_apparel", price: 22, currency: "EUR", versionId: "v_seed" },
  { id: "po_var_tote_black", level: "variant", refId: "var_tote_black", businessUnitId: "bu_apparel", price: 13, currency: "EUR", versionId: "v_seed" },
  { id: "po_var_mug_black", level: "variant", refId: "var_mug_black", businessUnitId: "bu_apparel", price: 9.5, currency: "EUR", versionId: "v_seed" },
  { id: "po_sku_premium_tee_red_xxl", level: "sku", refId: "sku_premium_tee_red_xxl", businessUnitId: "bu_apparel", price: 24, currency: "EUR", versionId: "v_seed" },
  { id: "po_sku_case_clear_iphone15pro", level: "sku", refId: "sku_case_clear_iphone15pro", businessUnitId: "bu_marketplace", price: 17, currency: "EUR", versionId: "v_seed" },
  // shop-specific override: "shop X can override to €21"
  { id: "po_prod_premium_tee_shop_de", level: "product", refId: "prod_premium_tee", businessUnitId: "bu_apparel", shopId: "shop_de", price: 21, currency: "EUR", versionId: "v_seed" },
  // properly-covered market in its native currency, contrasted with phone cases (no USD override -> flagged by sanity checks)
  { id: "po_pg_posters_shop_us_mp", level: "productGroup", refId: "pg_posters", businessUnitId: "bu_marketplace", shopId: "shop_us_mp", price: 22, currency: "USD", versionId: "v_seed" },
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
  { id: "comp_print_pod_default", type: "printTechnique", name: "DTG print (default)", calcModel: "flat", value: 3, matches: { printTechnique: "dtg" }, versionId: "v_seed" },
  { id: "comp_print_pod_mug", type: "printTechnique", name: "DTG print, mug wrap", parentId: "comp_print_pod_default", calcModel: "flat", value: 2, matches: { printTechnique: "dtg", productType: "mug" }, versionId: "v_seed" },
  { id: "comp_case_uv_print", type: "printTechnique", name: "UV print, phone case", calcModel: "flat", value: 4, matches: { printTechnique: "uv" }, versionId: "v_seed" },
  { id: "comp_poster_giclee", type: "printTechnique", name: "Giclée print", calcModel: "percentOfSubtotal", value: 15, matches: { printTechnique: "giclee" }, versionId: "v_seed" },
  { id: "comp_personalisation_engraving", type: "personalisation", name: "Laser engraving", calcModel: "flat", value: 3, matches: { personalisation: "engraving" }, versionId: "v_seed" },
];

// Recurring pricing windows: "every weekend", "Fridays 18-20h", and a yearly seasonal range.
const pricingCalendars = [
  { id: "cal_weekend", name: "Weekend", type: "dayOfWeek", daysOfWeek: [0, 6], versionId: "v_seed" },
  { id: "cal_friday_happy_hour", name: "Friday happy hour (18-20h UTC)", type: "dayOfWeek", daysOfWeek: [5], startHour: 18, endHour: 20, versionId: "v_seed" },
  { id: "cal_christmas", name: "Christmas season", type: "seasonal", seasonalStart: "11-01", seasonalEnd: "12-24", versionId: "v_seed" },
];

const discounts = [
  {
    id: "disc_summer_sale", name: "Summer Sale", type: "percentOff", value: 15,
    scope: { productGroupId: "pg_hoodies" }, eligibility: { markets: ["DE", "FR"] },
    validFrom: "2026-07-01", validTo: "2026-07-31", stackingGroup: "seasonal", priority: 50, badge: "SALE", versionId: "v_seed",
  },
  {
    id: "disc_weekend_hoodie", name: "Weekend hoodie discount", type: "percentOff", value: 10,
    scope: { productGroupId: "pg_hoodies" }, eligibility: {}, calendarId: "cal_weekend",
    stackingGroup: "weekend", priority: 15, badge: "WEEKEND", versionId: "v_seed",
  },
  {
    id: "disc_friday_happy_hour", name: "Friday happy hour -20%", type: "percentOff", value: 20,
    scope: { productGroupId: "pg_mugs" }, eligibility: {}, calendarId: "cal_friday_happy_hour",
    stackingGroup: "happy_hour", priority: 25, badge: "HAPPY HOUR", versionId: "v_seed",
  },
  // Deliberately shares the "volume" stacking group with the per-line tee
  // volume-tier discounts (priority 10) at a lower priority (8), so the basket
  // calculator can show either outcome depending on which one is more specific:
  // a big order without any single line hitting its own volume tier gets the
  // basket discount, but a line that already won "volume" on its own excludes it.
  {
    id: "disc_basket_value", name: "Order value discount", type: "basketValue",
    basketTiers: [{ minOrderValue: 500, discountPercent: 5 }, { minOrderValue: 1000, discountPercent: 8 }],
    scope: {}, eligibility: {}, stackingGroup: "volume", priority: 8, versionId: "v_seed",
  },
  {
    id: "disc_christmas_tshirts", name: "Christmas T-Shirts sale", type: "percentOff", value: 20,
    scope: { productGroupId: "pg_tshirts" }, eligibility: {}, calendarId: "cal_christmas",
    stackingGroup: "christmas", priority: 60, badge: "HOLIDAY", versionId: "v_seed",
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
  // Overlapping tiers (both start at qty 10) - left in deliberately so the
  // cross-SKU sanity check has something to detect.
  {
    id: "disc_volume_core_tee", name: "Core tee volume discount", type: "volumeTier",
    tiers: [{ minQty: 1 }, { minQty: 10, discountPercent: 5 }, { minQty: 10, discountPercent: 8 }],
    scope: { productId: "prod_core_tee" }, eligibility: {}, stackingGroup: "volume", priority: 10, versionId: "v_seed",
  },
  {
    id: "disc_mug_bogo", name: "Buy 3 mugs, pay for 2", type: "bogo",
    bogo: { buyQty: 3, payQty: 2, cheapestFree: true },
    scope: { productId: "prod_mug" }, eligibility: {}, stackingGroup: "multibuy_mugs", priority: 20, versionId: "v_seed",
  },
  {
    id: "disc_poster_promo", name: "US launch promo", type: "percentOff", value: 10,
    scope: { productGroupId: "pg_posters" }, eligibility: { markets: ["US"] },
    stackingGroup: "poster_promo", priority: 30, badge: "10% OFF", versionId: "v_seed",
  },
  {
    id: "disc_tote_promo", name: "Tote intro discount", type: "amountOff", value: 2,
    scope: { productId: "prod_tote" }, eligibility: {}, stackingGroup: "tote_promo", priority: 15, versionId: "v_seed",
  },
  // Variant-level example - every other discount here is scoped at productGroup
  // or product; this is the one demonstrating "narrower than product" scoping.
  {
    id: "disc_phonecase_launch", name: "Clear case launch discount", type: "percentOff", value: 15,
    scope: { variantId: "var_phonecase_clear" }, eligibility: {}, stackingGroup: "launch", priority: 20, badge: "LAUNCH", versionId: "v_seed",
  },
  // Catalog-scope stays empty on purpose - reached only through the rule's
  // businessUnitId dimension, not through product/variant/sku matching.
  {
    id: "disc_marketplace_launch", name: "Marketplace BU launch discount", type: "percentOff", value: 10,
    scope: {}, eligibility: {}, stackingGroup: "bu_launch", priority: 12, badge: "NEW", versionId: "v_seed",
  },
  // Same idea, one dimension narrower - shopId targets one storefront instead
  // of "market": Germany Marketplace only, not the whole DE market (which
  // also includes the Apparel BU's separate German store).
  {
    id: "disc_de_marketplace_kickoff", name: "Germany Marketplace kickoff discount", type: "percentOff", value: 12,
    scope: {}, eligibility: {}, stackingGroup: "shop_kickoff", priority: 18, badge: "KICKOFF", versionId: "v_seed",
  },
  // Second SKU-level example, this time an applyDiscount rather than
  // setPrice - a one-off clearance on a single slow-moving size.
  {
    id: "disc_hoodie_xl_clearance", name: "Classic Hoodie black XL clearance", type: "amountOff", value: 5,
    scope: { skuId: "sku_hoodie_black_xl" }, eligibility: {}, stackingGroup: "clearance", priority: 30, badge: "CLEARANCE", versionId: "v_seed",
  },
];

// Mocked: in production these values would be read from an external Payout System.
const commissions = [
  { id: "comm_designer", name: "Designer commission", type: "designer", calc: "percentOfPremium", value: 20, scope: {}, source: "payout-system-mock" },
  { id: "comm_partner", name: "Marketplace partner fee", type: "partner", calc: "fixedPerItem", value: 2, scope: {}, source: "payout-system-mock" },
  { id: "comm_topseller", name: "Top-seller tier", type: "creator", calc: "tieredPercent", tiers: [{ minUnitsPerMonth: 1000, percent: 25 }], scope: {}, source: "payout-system-mock" },
  { id: "comm_poster_partner", name: "Fine art print partner fee", type: "partner", calc: "fixedPerItem", value: 3, scope: { productGroupId: "pg_posters" }, source: "payout-system-mock" },
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
  // Directly contradicts "Premium Tee base EU" below: same product, no
  // narrower dimension than customerGroup, so a loyalty-gold shopper is
  // eligible for both setPrice rules at once - priority (95 > 10) is the
  // only thing deciding which one actually wins. (A loyalty-gold shopper
  // in DE during the June sale window is eligible for three at once - see
  // "Premium Tee DE sale" further down, priority 100.)
  {
    id: "rule_premium_tee_loyalty_price", name: "Premium Tee loyalty gold price", scope: { productId: "prod_premium_tee" },
    dimensions: { customerGroup: "loyalty-gold" }, effect: { type: "setPrice", price: 20 }, priority: 95, versionId: "v_seed",
  },
  {
    id: "rule_hoodie_seasonal_sale", name: "Hoodie Summer Sale", scope: { productGroupId: "pg_hoodies" },
    dimensions: { market: "DE" }, effect: { type: "applyDiscount", discountId: "disc_summer_sale" },
    priority: 50, stackingGroup: "seasonal", versionId: "v_seed",
  },
  {
    id: "rule_weekend_hoodie", name: "Weekend hoodie discount", scope: { productGroupId: "pg_hoodies" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_weekend_hoodie" },
    priority: 15, stackingGroup: "weekend", calendarId: "cal_weekend", versionId: "v_seed",
  },
  {
    id: "rule_friday_happy_hour", name: "Friday happy hour mugs", scope: { productGroupId: "pg_mugs" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_friday_happy_hour" },
    priority: 25, stackingGroup: "happy_hour", calendarId: "cal_friday_happy_hour", versionId: "v_seed",
  },
  {
    id: "rule_christmas_tshirts", name: "Christmas T-Shirts sale", scope: { productGroupId: "pg_tshirts" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_christmas_tshirts" },
    priority: 60, stackingGroup: "christmas", calendarId: "cal_christmas", versionId: "v_seed",
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
  {
    id: "rule_mug_bogo", name: "Mug BOGO", scope: { productId: "prod_mug" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_mug_bogo" },
    priority: 20, stackingGroup: "multibuy_mugs", versionId: "v_seed",
  },
  {
    id: "rule_poster_promo", name: "Poster US launch promo", scope: { productGroupId: "pg_posters" },
    dimensions: { market: "US" }, effect: { type: "applyDiscount", discountId: "disc_poster_promo" },
    priority: 30, stackingGroup: "poster_promo", versionId: "v_seed",
  },
  {
    id: "rule_tote_promo", name: "Tote intro promo", scope: { productId: "prod_tote" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_tote_promo" },
    priority: 15, stackingGroup: "tote_promo", versionId: "v_seed",
  },
  {
    id: "rule_phonecase_launch", name: "Clear case launch promo", scope: { variantId: "var_phonecase_clear" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_phonecase_launch" },
    priority: 20, stackingGroup: "launch", versionId: "v_seed",
  },
  // SKU-level override example - viewing the "red / XXL" SKU in Guided Setup
  // shows both this and the inherited product-level "Premium Tee base EU"
  // rule together.
  {
    id: "rule_premium_tee_xxl_upcharge", name: "Premium Tee XXL upcharge", scope: { skuId: "sku_premium_tee_red_xxl" },
    dimensions: {}, effect: { type: "setPrice", price: 27 }, priority: 10, versionId: "v_seed",
  },
  // Second SKU-level example, and an applyDiscount rather than setPrice -
  // shows a rule can be scoped this narrowly for any effect type, not just
  // price overrides.
  {
    id: "rule_hoodie_xl_clearance", name: "Classic Hoodie black XL clearance", scope: { skuId: "sku_hoodie_black_xl" },
    dimensions: {}, effect: { type: "applyDiscount", discountId: "disc_hoodie_xl_clearance" },
    priority: 30, stackingGroup: "clearance", versionId: "v_seed",
  },
  // businessUnitId dimension example - global catalog scope, reached only
  // through the BU filter. No other rule in this seed uses businessUnitId
  // or an empty catalog scope until this pair.
  {
    id: "rule_marketplace_bu_launch", name: "Marketplace BU launch discount", scope: {},
    dimensions: { businessUnitId: "bu_marketplace" }, effect: { type: "applyDiscount", discountId: "disc_marketplace_launch" },
    priority: 12, stackingGroup: "bu_launch", versionId: "v_seed",
  },
  // shopId dimension example - narrower than businessUnitId or market alone:
  // this shop is the only one of the marketplace BU's two stores it applies to.
  {
    id: "rule_de_marketplace_kickoff", name: "Germany Marketplace kickoff discount", scope: {},
    dimensions: { shopId: "shop_de_mp" }, effect: { type: "applyDiscount", discountId: "disc_de_marketplace_kickoff" },
    priority: 18, stackingGroup: "shop_kickoff", versionId: "v_seed",
  },
];

// Composition-based: exactly 1 hoodie + 2 tees for a fixed price (a third tee prices normally).
const bundles = [
  {
    id: "bundle_team_starter", name: "Team starter set", businessUnitId: "bu_apparel",
    components: [{ skuId: "sku_hoodie_black_m", quantity: 1 }, { skuId: "sku_premium_tee_red_m", quantity: 2 }],
    bundlePrice: 55, currency: "EUR", eligibility: {}, priority: 10, versionId: "v_seed",
  },
];

// Group-based: any 3 tees from the T-Shirts group for a flat price (a 4th tee prices normally).
const mixAndMatchSets = [
  {
    id: "mnm_tee_group", name: "Any 3 Premium Tees for €45", businessUnitId: "bu_apparel",
    group: { productIds: ["prod_premium_tee"] }, requiredCount: 3, setPrice: 45, currency: "EUR",
    eligibility: {}, priority: 10, versionId: "v_seed",
  },
];

// Presentation is configured separately from the paid price: how a resolved
// price is displayed (rounding, strikethrough, badges, messaging), not how
// it's calculated.
const presentationPolicies = [
  {
    id: "pp_apparel", name: "Apparel (EUR, charm pricing)", businessUnitId: "bu_apparel", currency: "EUR",
    roundingMode: "charm", charmEnding: 0.9,
    showRrpStrikethrough: true, showDiscountBadge: true, showFromPrice: true, showNextTierMessage: true, showOmnibusReference: true, versionId: "v_seed",
  },
  {
    id: "pp_marketplace", name: "Marketplace (EUR, whole numbers)", businessUnitId: "bu_marketplace", currency: "EUR",
    roundingMode: "nearestInteger",
    showRrpStrikethrough: true, showDiscountBadge: true, showFromPrice: true, showNextTierMessage: false, showOmnibusReference: true, versionId: "v_seed",
  },
];

// Final-price composer: authored composition intent per BU (documentation only in this prototype - see CompositionDefinitionEditor).
const compositionDefinitions = [
  {
    id: "cd_apparel_default", name: "Apparel default composition", businessUnitId: "bu_apparel",
    steps: [
      { type: "basePrice", included: true, calcMode: "additive" },
      { type: "configComponents", included: true, calcMode: "additive" },
      { type: "discounts", included: true, calcMode: "additive" },
      { type: "commissions", included: false, calcMode: "percentOfSubtotal" },
      { type: "markup", included: false, calcMode: "percentOfSubtotal" },
      { type: "tax", included: true, calcMode: "percentOfSubtotal", taxInclusive: true },
      { type: "shipping", included: false, calcMode: "additive" },
      { type: "fees", included: false, calcMode: "additive" },
    ],
    versionId: "v_seed",
  },
];

// B2B / customer-group price lists: replacement prices for a named customer group, ranked by priority vs. standard pricing.
const priceLists = [
  {
    id: "plist_wholesale", name: "Wholesale partners", businessUnitId: "bu_apparel", customerGroup: "wholesale-partner",
    currency: "EUR", priority: 50,
    entries: [
      { skuId: "sku_premium_tee_red_m", price: 14 },
      { skuId: "sku_hoodie_black_m", price: 20 },
    ],
    versionId: "v_seed",
  },
];

const consistencyRules = [
  { id: "cr_premium_gap", name: "Premium tee ≥ core tee +10%", type: "minGapPercent", subjectRefId: "prod_premium_tee", comparatorRefId: "prod_core_tee", threshold: 10, severity: "blocking" },
  { id: "cr_ch_parity", name: "CH price within ±15% of EU", type: "parityDeviation", subjectRefId: "pg_tshirts", comparatorRefId: "CH", threshold: 15, severity: "warning" },
  { id: "cr_ziphoodie_gap", name: "Zip Hoodie ≥ Classic Hoodie +10%", type: "minGapPercent", subjectRefId: "prod_zip_hoodie", comparatorRefId: "prod_hoodie", threshold: 10, severity: "warning" },
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

// Synthetic historical analytics (last 6 months per SKU) - this prototype has
// no real order history, so numbers are generated deterministically from a
// seeded hash rather than pulled from a live system.
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return h / 0xffffffff;
  };
}

const HISTORY_MONTHS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

const historicalMetrics = skus.flatMap((sku) => {
  const assumedPrice = Math.round(sku.costBasis * 2.2 * 100) / 100;
  const rand = seededRandom(sku.id);
  return HISTORY_MONTHS.map((month) => {
    const priceVariance = 0.95 + rand() * 0.1;
    const price = Math.round(assumedPrice * priceVariance * 100) / 100;
    return { skuId: sku.id, month, currency: "EUR", price };
  });
});

const collections = {
  businessUnits, shops, productGroups, products, variants, skus,
  priceOverrides, components, discounts, commissions, rules,
  pricingCalendars, bundles, mixAndMatchSets, presentationPolicies,
  compositionDefinitions, priceLists, historicalMetrics,
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
