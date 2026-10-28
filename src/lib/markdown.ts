import { columnsOf, type Board, type Card } from '../types'
import { childrenOf, totalVotes } from './cards'

const votes = (n: number) => (n ? ` (${n} vote${n > 1 ? 's' : ''})` : '')

/** Meeting notes for the board, ready to paste into Slack, Jira or an email. */
export function toMarkdown(board: Board): string {
  const byId = new Map(board.cards.map(c => [c.id, c]))
  const related = (c: Card) => {
    const names = (c.links ?? []).map(id => byId.get(id)?.text).filter(Boolean)
    return names.length ? ` (related: ${names.map(n => `"${n}"`).join(', ')})` : ''
  }
  const lines = [`# ${board.title}`, '']
  for (const col of columnsOf(board)) {
    const top = board.cards
      .filter(c => c.column === col.id && !c.parentId)
      .sort((a, b) => totalVotes(board.cards, b) - totalVotes(board.cards, a))
    if (!top.length) continue
    lines.push(`## ${col.title}`)
    for (const c of top) {
      lines.push(`- ${c.text}${votes(totalVotes(board.cards, c))}${related(c)}`)
      for (const k of childrenOf(board.cards, c.id).sort((a, b) => b.votes - a.votes)) {
        lines.push(`  - ${k.text}${votes(k.votes)}${related(k)}`)
      }
    }
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
