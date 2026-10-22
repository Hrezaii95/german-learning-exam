const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Arithmetic on calendar labels, never elapsed local 24-hour intervals (DST safe). */
export function shiftCalendarDate(value: string, days: number): string {
  if (!isCalendarDate(value) || !Number.isInteger(days)) throw new Error("Invalid calendar date or offset");
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarDaysBetween(earlier: string, later: string): number {
  if (!isCalendarDate(earlier) || !isCalendarDate(later)) throw new Error("Invalid calendar date");
  return Math.round((Date.parse(`${later}T12:00:00Z`) - Date.parse(`${earlier}T12:00:00Z`)) / DAY);
}

function localParts(now: Date, timeZone: string): { date: string; hour: number } {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid instant");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const field = (name: string): string => parts.find(part => part.type === name)?.value ?? "";
  return { date: `${field("year")}-${field("month")}-${field("day")}`, hour: Number(field("hour")) };
}

export function calendarDate(now: Date, timeZone: string): string {
  return localParts(now, timeZone).date;
}

/** Before 03:00, meaningful study belongs to the preceding study day. */
export function studyDate(now: Date, timeZone: string): string {
  const parts = localParts(now, timeZone);
  return parts.hour < 3 ? shiftCalendarDate(parts.date, -1) : parts.date;
}
