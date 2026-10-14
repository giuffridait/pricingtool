import { compositionDefinitions, businessUnits, shops } from "@/lib/repo";
import { PageHeader } from "@/components/ui";
import CompositionDefinitionEditor from "@/components/CompositionDefinitionEditor";

export default async function ComposerPage() {
  const [definitions, bus, allShops] = await Promise.all([compositionDefinitions.all(), businessUnits.all(), shops.all()]);

  return (
    <div>
      <PageHeader
        title="Final-price composer"
        description="Configure how a final price is composed from typed components: base price, configuration components, discounts, commissions, markup, tax, shipping, and fees - which participate, in what order, and with what calculation semantics, per BU/shop."
        path="/composer"
      />
      <CompositionDefinitionEditor definitions={definitions} businessUnits={bus} shops={allShops} />
    </div>
  );
}
