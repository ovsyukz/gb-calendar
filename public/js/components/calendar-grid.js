import { $, clone, fill, replaceChildren } from '../lib/dom.js';
import { buildMonthGrid, coversDate, today, MONTH_NAMES } from '../lib/dates.js';
import {
  state,
  subscribe,
  stepMonth,
  canStepBack,
  canStepForward,
  BOUNDS,
} from '../state/store.js';
import { eventChip } from './event-chip.js';

export function mountCalendar(tournaments) {
  const body = $('#calendar-body');
  const label = $('#month-label');
  const prev = $('#prev-month');
  const next = $('#next-month');

  prev.addEventListener('click', () => stepMonth(-1));
  next.addEventListener('click', () => stepMonth(1));

  function render() {
    const { monthIndex } = state;
    label.textContent = `${MONTH_NAMES[monthIndex]} ${BOUNDS.year}`;
    prev.disabled = !canStepBack();
    next.disabled = !canStepForward();

    const rows = buildMonthGrid(BOUNDS.year, monthIndex).map((week) => {
      const row = document.createElement('tr');
      replaceChildren(
        row,
        week.map((day) => dayCell(day, tournaments))
      );
      return row;
    });
    replaceChildren(body, rows);
  }

  subscribe(render);
  render();
}

function dayCell(day, tournaments) {
  const cell = clone('tpl-day-cell');
  fill(cell, { '.day-number': day.dayOfMonth });

  if (!day.inMonth) {
    cell.classList.add('is-outside-month');
    // Days spilling in from the neighbouring month are decoration; hide them
    // from screen readers rather than announcing empty cells.
    cell.setAttribute('aria-hidden', 'true');
    return cell;
  }

  if (day.date === today()) {
    cell.classList.add('is-today');
    cell.setAttribute('aria-current', 'date');
  }

  const events = tournaments.filter((t) => coversDate(t, day.date));
  replaceChildren(cell.querySelector('.chips'), events.map(eventChip));
  return cell;
}
