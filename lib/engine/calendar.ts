import type { PricingCalendar } from "../types";

// Recurring pricing windows: "every weekend", "Fridays 18-20h", or a yearly
// seasonal date range (month-day only, so it recurs every year).
export function isWithinCalendar(calendar: PricingCalendar | undefined, atDate?: string): boolean {
  if (!calendar) return true;
  const at = atDate ? new Date(atDate) : new Date();

  if (calendar.type === "dayOfWeek") {
    if (calendar.daysOfWeek && calendar.daysOfWeek.length > 0 && !calendar.daysOfWeek.includes(at.getUTCDay())) {
      return false;
    }
    if (calendar.startHour !== undefined && calendar.endHour !== undefined) {
      const hour = at.getUTCHours();
      if (calendar.startHour <= calendar.endHour) {
        if (hour < calendar.startHour || hour >= calendar.endHour) return false;
      } else {
        // window wraps past midnight, e.g. 22-2
        if (hour < calendar.startHour && hour >= calendar.endHour) return false;
      }
    }
    return true;
  }

  // seasonal: "MM-DD" range, recurs every year, may wrap past year-end (e.g. Nov-Feb)
  if (calendar.seasonalStart && calendar.seasonalEnd) {
    const mmdd = `${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
    if (calendar.seasonalStart <= calendar.seasonalEnd) {
      return mmdd >= calendar.seasonalStart && mmdd <= calendar.seasonalEnd;
    }
    return mmdd >= calendar.seasonalStart || mmdd <= calendar.seasonalEnd;
  }

  return true;
}
