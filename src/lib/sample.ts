import { uid, type Board, type Card, type ColumnId } from '../types'

/*
 * A filled-in board for first-time visitors, so they can see how a retro
 * looks and try voting, editing and sharing straight away. The "Tip" cards
 * double as a short guide. Opened with ?demo, or from the empty screen.
 */

const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const card = (column: ColumnId, text: string, votes = 0): Card => ({ id: uid(), column, text, votes })

export function sampleBoard(): Board {
  const now = Date.now()
  return {
    id: uid(),
    title: 'Sample retro: try me',
    createdAt: now,
    updatedAt: now,
    cards: [
      card('well', 'Release went out two days early', 4),
      card('well', 'Pair debugging the flaky test saved hours', 2),
      card('well', 'Tip: click ▲ to vote. The most-voted cards rise to the top.'),
      card('improve', 'API changed mid-sprint without notice', 5),
      card('improve', 'Too many meetings on Wednesday', 3),
      card('improve', 'Tip: click any card to edit it, or ✕ to remove it.'),
      card('ideas', 'Agree API contracts before sprint planning', 4),
      card('ideas', 'Try a no-meeting afternoon each week', 2),
      card('ideas', 'Tip: "Share link" sends this whole board to your team. No sign-up, no server.'),
    ],
    actions: [
      { id: uid(), text: '15-min API contract review with backend before planning', owner: 'Asha', due: inDays(5), done: false },
      { id: uid(), text: 'Move Wednesday stand-up to async updates', owner: 'Rahul', due: inDays(2), done: true },
    ],
  }
}
