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
      label: day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), // "Mon 5 Oct"
    };
  });
}

export const SLOTS = ["lunch", "dinner"];
