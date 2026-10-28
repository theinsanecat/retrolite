import { useState } from 'react'
import type { ActionItem, Board } from '../types'
import { localDate, today } from './Actions'
import { Button } from './ui/Button'
import { Select } from './ui/Select'

/*
 * Every unfinished action item from every board in one place, so actions
 * from last sprint's retro don't quietly disappear. Overdue first.
 */

interface Row { board: Board; action: ActionItem }

const inDays = (n: number) => {
  const x = new Date()
  x.setDate(x.getDate() + n)
  return localDate(x)
}

export const openActions = (boards: Board[]): Row[] =>
  boards.flatMap(board => board.actions.filter(a => !a.done).map(action => ({ board, action })))

export function OpenActions({ boards, onToggle, onOpen }: {
  boards: Board[]
  onToggle: (boardId: string, actionId: string) => void
  onOpen: (boardId: string) => void
}) {
  const [owner, setOwner] = useState('')
  const all = openActions(boards)
  const owners = [...new Set(all.map(r => r.action.owner).filter(Boolean))].sort()
  const rows = all.filter(r => !owner || r.action.owner === owner)
  const t = today(), week = inDays(7)
  const groups: [string, Row[]][] = [
    ['Overdue', rows.filter(r => r.action.due && r.action.due < t)],
    ['Due in the next 7 days', rows.filter(r => r.action.due && r.action.due >= t && r.action.due <= week)],
    ['Later', rows.filter(r => r.action.due && r.action.due > week)],
    ['No due date', rows.filter(r => !r.action.due)],
  ]
  groups.forEach(([, g]) => g.sort((a, b) => a.action.due.localeCompare(b.action.due)))
  const count = (o: string) => all.filter(r => r.action.owner === o).length

  return (
    <section className="open-actions">
      <header className="board-head">
        <div>
          <h1>Open actions</h1>
          <p className="text-secondary">Everything your retros agreed to do and haven't finished yet, across {boards.length} board{boards.length === 1 ? '' : 's'}.</p>
        </div>
        {owners.length > 0 && (
          <Select
            label="Owner"
            value={owner}
            onChange={setOwner}
            options={[{ value: '', label: 'Everyone', hint: `· ${all.length}` }, ...owners.map(o => ({ value: o, label: `@${o}`, hint: `· ${count(o)}` }))]}
          />
        )}
      </header>
      {rows.length === 0 && <p className="empty-note text-secondary">Nothing open. Every action is done 🎉</p>}
      {groups.filter(([, g]) => g.length).map(([name, g]) => (
        <div key={name} className={`actions ${name === 'Overdue' ? 'overdue' : ''}`}>
          <h2>{name} <span className="count">{g.length}</span></h2>
          <ul>
            {g.map(({ board, action: a }) => (
              <li key={a.id} className="action">
                <input type="checkbox" checked={false} aria-label="Done" onChange={() => onToggle(board.id, a.id)} />
                <span className="action-text">{a.text}</span>
                {a.owner && <span className="chip">@{a.owner}</span>}
                {a.due && <span className={`chip ${a.due < t ? 'late' : ''}`}>{a.due}</span>}
                <Button variant="tertiary" size="sm" className="board-ref" tip="Open this board" onClick={() => onOpen(board.id)}>{board.title} →</Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
