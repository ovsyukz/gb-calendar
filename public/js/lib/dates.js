/**
 * Date helpers. Pure functions — no DOM, no state, no side effects — so they
 * are the easiest part of the app to test and the safest to change.
 *
 * Dates are handled as 'YYYY-MM-DD' strings throughout. String comparison on
 * that format is the same as chronological comparison, which is why range
 * checks below can just use < and >.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDate(text) {
  return text.split('-').map(Number);
}

export function today(now = new Date()) {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Weeks of seven days covering the whole month, padded with the surrounding
 * days so every row is full. Returns [[{ date, dayOfMonth, inMonth }, ...]].
 */
export function buildMonthGrid(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const weeks = [];
  for (let cell = 0; cell < cellCount; cell += 1) {
    const date = new Date(year, monthIndex, 1 - firstWeekday + cell);
    if (cell % 7 === 0) weeks.push([]);
    weeks.at(-1).push({
      date: formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()),
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    });
  }
  return weeks;
}

/** True when `date` falls anywhere in a tournament's run, inclusive. */
export function coversDate(tournament, date) {
  return date >= tournament.date && date <= (tournament.endDate || tournament.date);
}

/**
 * The day label on an upcoming card: '25' for one day, '8–9' within a month,
 * '30 Nov–2 Dec' when it straddles two.
 */
export function formatDayRange(date, endDate) {
  const [, startMonth, startDay] = parseDate(date);
  if (!endDate) return String(startDay);

  const [, endMonth, endDay] = parseDate(endDate);
  if (endMonth === startMonth) return `${startDay}–${endDay}`;

  return `${startDay} ${MONTH_ABBR[startMonth - 1]}–${endDay} ${MONTH_ABBR[endMonth - 1]}`;
}
