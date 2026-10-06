// date helpers for the weekly plan; dates are "YYYY-MM-DD" in the browser's local time

export function toDateText(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export const todayText = () => toDateText(new Date());

// the 7 days (Monday to Sunday) of the week containing `date`
export function getWeekDays(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return {
      date: toDateText(day),
      weekday: day.toLocaleDateString("en-GB", { weekday: "short" }), // "Mon"
      label: `${day.toLocaleDateString("en-GB", { weekday: "short" })} ${day.getDate()} ${day.toLocaleDateString("en-GB", { month: "short" })}`, // "Mon 5 Oct"
    };
  });
}

export const SLOTS = ["lunch", "dinner"];

// "YYYY-MM-DD" -> local Date (null if it isn't a real date)
export function parseDateText(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? "")) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return toDateText(date) === text ? date : null;
}

// the same weekday `weeks` weeks before (negative) or after (positive) `date`
export function addWeeks(date, weeks) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}

// whole weeks between the week containing `date` and the current week (0 = this week, 1 = next week)
export function weeksFromNow(date) {
  const thisMonday = getWeekDays()[0].date;
  const thatMonday = getWeekDays(date)[0].date;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  // Date.UTC avoids daylight-saving hours shifting the count
  const toUTC = (text) => Date.UTC(...text.split("-").map((n, i) => (i === 1 ? n - 1 : Number(n))));
  return Math.round((toUTC(thatMonday) - toUTC(thisMonday)) / msPerWeek);
}

export function weekTitle(offset, weekDays) {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Last week";
  return `Week of ${weekDays[0].label}`;
}
