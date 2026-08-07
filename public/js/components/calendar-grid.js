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

/**
 * `onAddOn(date)` and `onEdit(tournament)` are supplied by the tournament
 * modal. They are wired up only while an admin is logged in — a visitor's
 * calendar has no click targets beyond the registration links.
 */
export function mountCalendar({ onAddOn, onEdit }) {
  const body = $('#calendar-body');
  const label = $('#month-label');
  const prev = $('#prev-month');
  const next = $('#next-month');

  prev.addEventListener('click', () => stepMonth(-1));
  next.addEventListener('click', () => stepMonth(1));

  function render() {
    label.textContent = `${MONTH_NAMES[state.monthIndex]} ${BOUNDS.year}`;
    prev.disabled = !canStepBack();
    next.disabled = !canStepForward();

    const rows = buildMonthGrid(BOUNDS.year, state.monthIndex).map((week) => {
      const row = document.createElement('tr');
      replaceChildren(
        row,
        week.map((day) => dayCell(day, { onAddOn, onEdit }))
      );
      return row;
    });
    replaceChildren(body, rows);
  }

  subscribe(render);
  render();
}

function dayCell(day, handlers) {
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

  if (state.isAdmin) {
    cell.classList.add('is-clickable');
    cell.title = 'Add a tournament on this day';
    cell.addEventListener('click', (event) => {
      // Ignore clicks that landed on a chip; those mean "edit that one".
      if (event.target.closest('.chip')) return;
      handlers.onAddOn(day.date);
    });
  }

  const events = state.tournaments.filter((t) => coversDate(t, day.date));
  replaceChildren(
    cell.querySelector('.chips'),
    events.map((t) => eventChip(t, handlers.onEdit))
  );
  return cell;
}
