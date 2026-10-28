import { uid, TEMPLATES, type Board, type Card } from '../types'

/*
 * A filled-in board for first-time visitors, so they can see how a retro
 * looks and try voting, grouping, linking and sharing straight away. The
 * "Tip" cards double as a short guide. Opened with ?demo, or from the
 * empty screen.
 */

const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function sampleBoard(title = 'Sample retro: try me'): Board {
  const card = (column: string, text: string, votes = 0): Card => ({ id: uid(), column, text, votes })

  const api = card('improve', 'API changed mid-sprint without notice', 5)
  const deploy = card('improve', 'Backend deployed a breaking change on Friday', 2)
  deploy.parentId = api.id
  const contracts = card('ideas', 'Agree API contracts before sprint planning', 4)
  api.links = [contracts.id]
  contracts.links = [api.id]

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
      card('well', 'Tip: click ▲ to vote. The most-voted cards rise to the top.'),
      api,
      deploy,
      card('improve', 'Too many meetings on Wednesday', 3),
      card('improve', 'Tip: drag a card onto another to group or link them, or use ⋯ on any card.'),
      contracts,
      card('ideas', 'Try a no-meeting afternoon each week', 2),
      card('ideas', 'Tip: "Share link" sends this whole board to your team. No sign-up, no server.'),
    ],
    actions: [
      { id: uid(), text: '15-min API contract review with backend before planning', owner: 'Asha', due: inDays(5), done: false },
      { id: uid(), text: 'Move Wednesday stand-up to async updates', owner: 'Rahul', due: inDays(2), done: true },
      { id: uid(), text: 'Add a release checklist to the team wiki', owner: 'Soumya', due: inDays(-1), done: false },
    ],
  }
}
