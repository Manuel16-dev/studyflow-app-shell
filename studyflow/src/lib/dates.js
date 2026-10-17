// Shared local-calendar date helpers. "Today" and "a day" always mean the
// student's own day (client local time), never UTC, so studying late at
// night or planning near midnight lands on the right date. Day arithmetic
// uses calendar dates (setDate), not 24h of milliseconds, so daylight
// saving changes can't skip or repeat a day.
const MS_PER_DAY = 86400000

// Local calendar-day key, e.g. "2026-08-22".
export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayKey() {
  return dayKey(new Date())
}

// Local midnight at the start of the given day (default: today).
export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Calendar-based: addDays(d, 1) is the same wall-clock time tomorrow.
export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Oldest-to-newest local midnights for the last n days, including today.
// Midnight-aligned, so a window query covers whole days (the oldest bucket
// isn't a partial day).
export function lastNDays(n) {
  const today = startOfDay()
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)))
}

// "YYYY-MM-DD" -> local midnight Date (new Date("YYYY-MM-DD") would be UTC).
export function parseDayKey(str) {
  return new Date(`${str}T00:00:00`)
}

// Whole days from today to the given "YYYY-MM-DD" (negative if past).
export function daysUntilKey(str) {
  return Math.round((parseDayKey(str).getTime() - startOfDay().getTime()) / MS_PER_DAY)
}

// First and last "YYYY-MM-DD" of a month (month is 0-indexed).
export function monthRangeKeys(year, month) {
  return { start: dayKey(new Date(year, month, 1)), end: dayKey(new Date(year, month + 1, 0)) }
}
