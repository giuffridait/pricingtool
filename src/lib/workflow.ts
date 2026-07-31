export interface WorkflowLink {
  href: string;
  label: string;
}

export interface WorkflowEntry {
  before: WorkflowLink[];
  after: WorkflowLink[];
}

// Suggested "what usually comes before/after this page" hints, shown as a
// collapsible tip under the page header. Purely advisory - nothing here is
// enforced, it just helps someone find the next sensible page.
export const WORKFLOW: Record<string, WorkflowEntry> = {
  "/catalog": {
    before: [],
    after: [
      { href: "/incentives", label: "Discounts & Incentives" },
      { href: "/calculator", label: "Price Calculator" },
    ],
  },
  "/incentives": {
    before: [{ href: "/catalog", label: "Catalog & Pricing" }],
    after: [
      { href: "/calendars", label: "Sales Calendar" },
      { href: "/calculator", label: "Price Calculator" },
    ],
  },
  "/calculator": {
    before: [
      { href: "/catalog", label: "Catalog & Pricing" },
      { href: "/incentives", label: "Discounts & Incentives" },
    ],
    after: [{ href: "/presentation", label: "Storefront Display" }],
  },
  "/calendars": {
    before: [
      { href: "/incentives", label: "Discounts & Incentives" },
      { href: "/rules", label: "Rules" },
    ],
    after: [{ href: "/calculator", label: "Price Calculator" }],
  },
  "/presentation": {
    before: [{ href: "/calculator", label: "Price Calculator" }],
    after: [],
  },
  "/components": {
    before: [{ href: "/catalog", label: "Catalog & Pricing" }],
    after: [{ href: "/rules", label: "Rules" }],
  },
  "/rules": {
    before: [
      { href: "/components", label: "Components" },
      { href: "/catalog", label: "Catalog & Pricing" },
    ],
    after: [
      { href: "/calendars", label: "Sales Calendar" },
      { href: "/calculator", label: "Price Calculator" },
    ],
  },
  "/composer": {
    before: [{ href: "/components", label: "Components" }],
    after: [{ href: "/calculator", label: "Price Calculator" }],
  },
  "/price-lists": {
    before: [{ href: "/catalog", label: "Catalog & Pricing" }],
    after: [{ href: "/calculator", label: "Price Calculator" }],
  },
  "/bulk-operations": {
    before: [{ href: "/catalog", label: "Catalog & Pricing" }],
    after: [],
  },
  "/alerts": {
    before: [],
    after: [{ href: "/checks", label: "Consistency & Sanity" }],
  },
  "/checks": {
    before: [],
    after: [{ href: "/alerts", label: "Alerts" }],
  },
  "/versions": {
    before: [],
    after: [],
  },
  "/experiments": {
    before: [{ href: "/calculator", label: "Price Calculator" }],
    after: [{ href: "/history", label: "Historical Prices" }],
  },
  "/history": {
    before: [],
    after: [{ href: "/experiments", label: "Experiments" }],
  },
};
