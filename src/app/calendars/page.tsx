import { pricingCalendars } from "@/lib/repo";
import { PageHeader } from "@/components/ui";
import CalendarEditor from "@/components/CalendarEditor";

export default async function CalendarsPage() {
  const calendars = await pricingCalendars.all();
  return (
    <div>
      <PageHeader
        title="Time-based pricing (recurring calendars)"
        description="Recurring pricing windows - every weekend, Friday happy hour, or a yearly seasonal date range - that a discount or rule can reference instead of (or alongside) a one-off validity window. Attach a calendar to a discount on the Discounts page, or to a rule on the Rules page."
      />
      <CalendarEditor calendars={calendars} />
    </div>
  );
}
