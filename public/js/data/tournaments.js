/**
 * ═══════════════════════════════════════════════════════════════════════
 *  THE TOURNAMENT LIST — this is the only file you need to edit to add,
 *  change, or remove a tournament.
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  HOW TO ADD ONE
 *    1. Copy an example below and paste it into the list.
 *    2. Edit the values. Save the file.
 *    3. git commit + git push  →  Netlify redeploys in about 30 seconds.
 *
 *  THE FIELDS
 *    id        required   short unique nickname, lowercase, no spaces.
 *                         Never change it after people have signed up —
 *                         sign-ups are stored against this id.
 *    name      required   shown on the calendar and in the sign-up dropdown
 *    date      required   'YYYY-MM-DD', the first (or only) day
 *    location  optional   e.g. 'Chicago, IL'. Omit if you don't know yet.
 *    endDate   optional   'YYYY-MM-DD' for multi-day events. The tournament
 *                         then appears on every day from date to endDate.
 *    links     optional   list of { label, url }. The first one is the
 *                         button people see first.
 *
 *  IF SOMETHING LOOKS WRONG
 *    Open the page, then open the browser console (F12). A bad entry prints
 *    a message naming the tournament and the problem.
 */

export const TOURNAMENTS = [
  // ── A simple one-day tournament with a single registration link ──
  {
    id: 'gi-jul',
    name: 'Grappling Industries',
    date: '2026-07-25',
    links: [
      {
        label: 'Register',
        url: 'https://grapplingindustries.smoothcomp.com/en/event/25435',
      },
    ],
  },

  // ── A two-day tournament with separate adult and kids registration ──
  {
    id: 'ibjjf',
    name: 'IBJJF Chicago Open',
    location: 'Chicago, IL',
    date: '2026-08-08',
    endDate: '2026-08-09',
    links: [
      {
        label: 'Adults',
        url: 'https://ibjjf.com/events/chicago-summer-international-open-ibjjf-jiu-jitsu-championship-2026',
      },
      {
        label: 'Kids',
        url: 'https://ibjjf.com/events/chicago-summer-kids-international-open-ibjjf-jiu-jitsu-championship-2026',
      },
    ],
  },

  {
    id: 'fallgames',
    name: '2026 Chicago Fall Games',
    location: 'Chicago, IL',
    date: '2026-09-05',
    links: [
      { label: 'Register', url: 'https://grappling-games.smoothcomp.com/en/event/33399' },
    ],
  },

  {
    id: 'tapcancer',
    name: 'Tap Cancer Out',
    date: '2026-10-10',
    links: [{ label: 'Register', url: 'https://smoothcomp.com/en/event/28602' }],
  },

  {
    id: 'gi-nov',
    name: 'Grappling Industries',
    date: '2026-11-07',
    links: [
      {
        label: 'Register',
        url: 'https://grapplingindustries.smoothcomp.com/en/event/25436',
      },
    ],
  },
];
