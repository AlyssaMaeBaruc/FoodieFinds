import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from './Icon';
import { getWeekDays, parseDateText, addWeeks, weeksFromNow } from '../week';

// the week chosen with ?week=YYYY-MM-DD (current week when missing),
// so going Back from another page returns to the same week
export function useSelectedWeek() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shownDate = parseDateText(searchParams.get("week")) ?? new Date();
  const weekDays = getWeekDays(shownDate);
  const offset = weeksFromNow(shownDate);

  const goToWeek = (weeks) => {
    const target = addWeeks(shownDate, weeks);
    // the current week keeps a clean address
    setSearchParams(weeksFromNow(target) === 0 ? {} : { week: getWeekDays(target)[0].date });
  };

  return {
    weekDays,
    weekStart: weekDays[0].date,
    offset,
    goToWeek,
    goToThisWeek: () => setSearchParams({}),
  };
}

// Previous / Back to this week / Next buttons
function WeekNav({ offset, goToWeek, goToThisWeek }) {
  return (
    <nav className="week-nav" aria-label="Choose week">
      <button className="btn btn-ghost" onClick={() => goToWeek(-1)}><Icon name="arrowLeft" size={16} /> Previous</button>
      {offset !== 0 && (
        <button className="btn" onClick={goToThisWeek}>Back to this week</button>
      )}
      <button className="btn btn-ghost" onClick={() => goToWeek(1)}>Next <Icon name="arrowRight" size={16} /></button>
    </nav>
  );
}

export default WeekNav;
