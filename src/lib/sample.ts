import { uid, TEMPLATES, type ActionItem, type Board, type Card } from '../types'

/*
 * Sample data for first-time visitors, so they can see every part of the app
 * straight away: votes, groups (a parent with children), linked cards,
 * templates, action items with owners and due dates (some overdue, some
 * done), and the open actions overview across more than one board.
 * The "Tip" cards double as a short guide. Opened with ?demo (the link shared
 * on LinkedIn), or from the empty screen.
 */

const DAY = 864e5

const inDays = (n: number) => {
  const d = new Date(Date.now() + n * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const card = (column: string, text: string, votes = 0): Card => ({ id: uid(), column, text, votes })
const action = (text: string, owner: string, due: number | null, doneDaysAgo?: number): ActionItem => ({
  id: uid(), text, owner, due: due === null ? '' : inDays(due),
  done: doneDaysAgo !== undefined,
  ...(doneDaysAgo !== undefined && { doneAt: Date.now() - doneDaysAgo * DAY }),
})

/** Group `children` under `parent` (one level deep). */
const group = (parent: Card, ...children: Card[]) => children.forEach(c => { c.parentId = parent.id })
/** Link two cards as related siblings (kept on both). */
const link = (a: Card, b: Card) => {
  a.links = [...(a.links ?? []), b.id]
  b.links = [...(b.links ?? []), a.id]
}

/** This sprint's retro: the board a visitor lands on. */
export function sampleBoard(title = 'Sample retro: try me'): Board {
  const api = card('improve', 'API changed mid-sprint without notice', 5)
  const deploy = card('improve', 'Backend deployed a breaking change on Friday', 2)
  const crash = card('improve', 'Mobile app crashed for a day after the API change', 1)
  group(api, deploy, crash)
  const contracts = card('ideas', 'Agree API contracts before sprint planning', 4)
  link(api, contracts)

  const meetings = card('improve', 'Too many meetings on Wednesday', 3)
  const noMeeting = card('ideas', 'Try a no-meeting afternoon each week', 2)
  link(meetings, noMeeting)

  const now = Date.now()
  return {
    id: uid(),
    title,
    createdAt: now,
    updatedAt: now,
    columns: TEMPLATES[0].columns,
    cards: [
      card('well', 'Release went out two days early', 4),
      card('well', 'Pair debugging the flaky test saved hours', 2),
      card('well', 'Design and dev reviewed screens together, zero rework', 3),
      card('well', 'Tip: click ▲ to vote. The most-voted cards rise to the top.'),
      api,
      deploy,
      crash,
      meetings,
      card('improve', 'Tip: drag a card onto another to group or link them, or use ⋯ on any card.'),
      contracts,
      noMeeting,
      card('ideas', 'Rotate who runs the retro each sprint', 1),
      card('ideas', 'Tip: "Share link" sends this whole board to your team. No sign-up, no server.'),
    ],
    actions: [
      action('15-min API contract review with backend before planning', 'Asha', 5),
      action('Add a release checklist to the team wiki', 'Soumya', -1),
      action('Set up an alert for breaking API changes', 'Rahul', 3),
      action('Block Thursday afternoons as no-meeting time', 'Meera', 9),
      action('Write a rollback guide for mobile releases', 'Asha', 20),
      action('Pick next retro facilitator', '', null),
      action('Move Wednesday stand-up to async updates', 'Rahul', -2, 1),
    ],
  }
}

/** Last sprint's retro, on a different template: shows actions carried over. */
function lastSprintBoard(): Board {
  const [start, stop, cont] = TEMPLATES[1].columns.map(c => c.id)
  const reviews = card(cont, 'Small pull requests, reviewed the same day', 4)
  const pairing = card(start, 'Pair on tricky tickets', 3)
  link(reviews, pairing)
  const scope = card(stop, 'Adding scope after the sprint starts', 5)
  const lateTickets = card(stop, 'Tickets added on day 8 of 10', 2)
  group(scope, lateTickets)

  const then = Date.now() - 14 * DAY
  return {
    id: uid(),
    title: 'Sprint 41 retro',
    createdAt: then,
    updatedAt: then,
    columns: TEMPLATES[1].columns,
    cards: [
      pairing,
      card(start, 'Demo work in progress mid-sprint', 2),
      scope,
      lateTickets,
      card(stop, 'Skipping the test plan for small fixes', 3),
      reviews,
      card(cont, 'Friday knowledge-share sessions', 2),
    ],
    actions: [
      action('Freeze sprint scope after planning', 'Meera', -4),
      action('Write a test plan template', 'Rahul', 2),
      action('Book a mid-sprint demo slot', 'Soumya', -10, 9),
      action('Share PR size guidelines', 'Asha', -7, 8),
    ],
  }
}

/** The boards a first-time visitor sees with ?demo: newest first. */
export const sampleBoards = (): Board[] => [sampleBoard(), lastSprintBoard()]
