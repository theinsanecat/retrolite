import { COLUMNS, type Board } from '../types'

/** Meeting notes for the board, ready to paste into Slack, Jira or an email. */
export function toMarkdown(board: Board): string {
  const lines = [`# ${board.title}`, '']
  for (const col of COLUMNS) {
    const cards = board.cards.filter(c => c.column === col.id).sort((a, b) => b.votes - a.votes)
    if (!cards.length) continue
    lines.push(`## ${col.title}`)
    for (const c of cards) lines.push(`- ${c.text}${c.votes ? ` (${c.votes} vote${c.votes > 1 ? 's' : ''})` : ''}`)
    lines.push('')
  }
  if (board.actions.length) {
    lines.push('## Action items')
    for (const a of board.actions) {
      const meta = [a.owner && `@${a.owner}`, a.due && `due ${a.due}`].filter(Boolean).join(', ')
      lines.push(`- [${a.done ? 'x' : ' '}] ${a.text}${meta ? ` (${meta})` : ''}`)
    }
  }
  return lines.join('\n').trim() + '\n'
}
