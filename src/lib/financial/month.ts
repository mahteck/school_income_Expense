import { addMonths, format, subMonths } from "date-fns";

export function monthKeyFromDate(d: Date) {
  return format(d, "yyyy-MM");
}

export function dateKeyFromDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function parseDateKey(dateKey: string) {
  // Expects YYYY-MM-DD, kept strict to avoid surprising Date parsing.
  const [y, m, day] = dateKey.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

export function getMonthOptions({
  center = new Date(),
  pastMonths = 12,
  futureMonths = 12,
}: {
  center?: Date;
  pastMonths?: number;
  futureMonths?: number;
} = {}) {
  const start = subMonths(center, pastMonths);
  const options: string[] = [];
  for (let i = 0; i <= pastMonths + futureMonths; i += 1) {
    options.push(monthKeyFromDate(addMonths(start, i)));
  }
  return options;
}

