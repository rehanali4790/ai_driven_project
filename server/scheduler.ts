import type { WorkingCalendar } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

function parseYmd(s: string): Date {
  const d = new Date(s + "T12:00:00");
  return d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayOfWeekMon0(d: Date): number {
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  return dow === 0 ? 6 : dow - 1;
}

export function isWorkingDay(date: Date, cal: WorkingCalendar): boolean {
  const exc = cal.exceptions.find((e) => e.date === ymd(date));
  if (exc?.type === "holiday") return false;
  const idx = dayOfWeekMon0(date);
  return Boolean(cal.workWeek[idx]);
}

/** Whole calendar days between start (inclusive) and end (inclusive) that are working days. */
export function countWorkingDaysInclusive(start: string, end: string, cal: WorkingCalendar): number {
  let a = parseYmd(start);
  const b = parseYmd(end);
  if (b.getTime() < a.getTime()) return 0;
  let n = 0;
  for (let t = a.getTime(); t <= b.getTime(); t += MS_DAY) {
    const d = new Date(t);
    if (isWorkingDay(d, cal)) n += 1;
  }
  return n;
}

/** Add N whole working days starting from startDate (inclusive). N >= 1 returns at least start if it's working. */
export function addWorkingDays(startDate: string, workingDays: number, cal: WorkingCalendar): string {
  if (workingDays <= 0) return startDate;
  let cur = parseYmd(startDate);
  let left = workingDays;
  while (left > 0) {
    if (isWorkingDay(cur, cal)) left -= 1;
    if (left === 0) break;
    cur = new Date(cur.getTime() + MS_DAY);
  }
  return ymd(cur);
}

/** Calendar-day span (exclusive end convention): days between start and end dates as whole days. */
export function calendarDayDiffInclusive(start: string, end: string): number {
  const a = parseYmd(start).getTime();
  const b = parseYmd(end).getTime();
  if (b < a) return 0;
  return Math.round((b - a) / MS_DAY) + 1;
}

export function defaultWorkingCalendar(): WorkingCalendar {
  return {
    id: "cal-standard",
    name: "Standard (Mon–Fri)",
    workWeek: [true, true, true, true, true, false, false],
    dailyHours: 8,
    exceptions: [],
  };
}
