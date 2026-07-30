import { components } from "@/lib/repo";
import { PageHeader } from "@/components/ui";
import ComponentEditor from "@/components/ComponentEditor";

export default async function ComponentsPage() {
  const all = await components.all();
  return (
    <div>
      <PageHeader
        title="Configuration & design price components"
        description="Typed components (print area, print technique, personalisation, design premiums, fees) that price effects attach to. Matching dimensions (product type, appearance, size, design) decide which component applies; a child component with a matching dimension the parent doesn't have wins - that's how a hoodie-specific override beats the generic default."
      />
      <ComponentEditor components={all} />
    </div>
  );
}
