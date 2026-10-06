// dates travel as plain "YYYY-MM-DD" text so no time zone can shift a meal to another day
function parseDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  // rejects impossible dates like 2026-02-31
  return date.toISOString().slice(0, 10) === text ? date : null;
}

const toDateText = (date) => date.toISOString().slice(0, 10);

// Monday and Sunday of the week containing the given date
function weekRange(date) {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: toDateText(monday), end: toDateText(sunday) };
}

module.exports = { parseDate, toDateText, weekRange };
