import { PageHeader, Card } from "@/components/ui";

export default function BulkOperationsPage() {
  return (
    <div>
      <PageHeader
        title="Bulk and scheduled price operations"
        description="Author bulk operations (e.g. raise a product group by 3%, apply a new markup to a market) as previewable, schedulable jobs — dry-run diff, validation against price-consistency rules, and rollback via versioning."
        path="/bulk-operations"
      />
      <Card>
        <p className="text-sm text-neutral-500 italic">Not implemented in this prototype.</p>
      </Card>
    </div>
  );
}
