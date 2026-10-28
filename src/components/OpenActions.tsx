import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { UNASSIGNED, type ActionItem, type Board } from '../types'
import { localDate, today } from './Actions'
import { Button } from './ui/Button'
import { Select } from './ui/Select'

// Chart.js is only needed on this page, so it loads with it (and is cached for offline use)
const OwnerChart = lazy(() => import('./OwnerChart'))

/*
 * The overview of every action item from every board, so actions from last
 * sprint's retro don't quietly disappear:
 * - a chart of open actions per owner, with a due-date filter
 * - open actions grouped by when they're due, overdue first
 * - done actions, kept until you choose to delete them (you're asked first)
 */

interface Row { board: Board; action: ActionItem }

const inDays = (n: number) => {
  const x = new Date()
  x.setDate(x.getDate() + n)
  return localDate(x)
}

export const openActions = (boards: Board[]): Row[] =>
  boards.flatMap(board => board.actions.filter(a => !a.done).map(action => ({ board, action })))

const doneActions = (boards: Board[]): Row[] =>
  boards.flatMap(board => board.actions.filter(a => a.done).map(action => ({ board, action })))
    .sort((a, b) => (b.action.doneAt ?? 0) - (a.action.doneAt ?? 0))

export function OpenActions({ boards, onToggle, onDelete, onOpen }: {
  boards: Board[]
  onToggle: (boardId: string, actionId: string) => void
  onDelete: (boardId: string, actionId: string) => void
  onOpen: (boardId: string) => void
}) {
  const [owner, setOwner] = useState('')
  const all = openActions(boards)
  const done = doneActions(boards)
  const ownerOf = (a: ActionItem) => a.owner || UNASSIGNED
  const owners = [...new Set([...all, ...done].map(r => ownerOf(r.action)))].sort((a, b) =>
    a === UNASSIGNED ? 1 : b === UNASSIGNED ? -1 : a.localeCompare(b))
  const mine = (r: Row) => !owner || ownerOf(r.action) === owner
  const rows = all.filter(mine)
  const doneRows = done.filter(mine)
  const t = today(), week = inDays(7)
  const groups: [string, Row[]][] = [
    ['Overdue', rows.filter(r => r.action.due && r.action.due < t)],
    ['Due in the next 7 days', rows.filter(r => r.action.due && r.action.due >= t && r.action.due <= week)],
    ['Later', rows.filter(r => r.action.due && r.action.due > week)],
    ['No due date', rows.filter(r => !r.action.due)],
  ]
  groups.forEach(([, g]) => g.sort((a, b) => a.action.due.localeCompare(b.action.due)))
  const count = (o: string) => all.filter(r => ownerOf(r.action) === o).length
  const openItems = useMemo(() => openActions(boards).map(r => r.action), [boards])
  const pick = useCallback((o: string) => setOwner(cur => (cur === o ? '' : o)), [])

  const item = ({ board, action: a }: Row) => (
    <li key={a.id} className={`action ${a.done ? 'done' : ''}`}>
      <input type="checkbox" checked={a.done} aria-label={a.done ? 'Done. Untick to reopen' : 'Done'} onChange={() => onToggle(board.id, a.id)} />
      <span className="action-text">{a.text}</span>
      {a.owner && <span className="chip">@{a.owner}</span>}
      {a.due && <span className={`chip ${!a.done && a.due < t ? 'late' : ''}`}>{a.due}</span>}
      <Button variant="tertiary" size="sm" className="board-ref" icon="arrowRight" tip="Open this board" onClick={() => onOpen(board.id)}>{board.title}</Button>
      {a.done && <Button variant="tertiary" size="sm" iconOnly icon="trash" danger label="Delete this action" onClick={() => onDelete(board.id, a.id)} />}
    </li>
  )

  return (
    <section className="open-actions page">
      <header className="board-head page-head">
        <div>
          <h1>Open actions</h1>
          <p className="text-secondary">Everything your retros agreed to do, across {boards.length} board{boards.length === 1 ? '' : 's'}. Done actions stay below until you delete them.</p>
        </div>
        {owners.length > 0 && (
          <Select
            label="Owner"
            value={owner}
            onChange={setOwner}
            options={[{ value: '', label: 'Everyone', hint: `· ${all.length}` }, ...owners.map(o => ({ value: o, label: o === UNASSIGNED ? o : `@${o}`, hint: `· ${count(o)}` }))]}
          />
        )}
      </header>

      <div className="page-body">
      <Suspense fallback={<section className="chart-box chart-loading" aria-busy="true"><div className="chart-canvas" /></section>}>
        <OwnerChart actions={openItems} selected={owner} onPickOwner={pick} />
      </Suspense>

      {rows.length === 0 && <p className="empty-note text-secondary">Nothing open{owner ? ` for ${owner === UNASSIGNED ? 'unassigned actions' : '@' + owner}` : ''}. Every action is done 🎉</p>}
      {groups.filter(([, g]) => g.length).map(([name, g]) => (
        <div key={name} className={`actions ${name === 'Overdue' ? 'overdue' : ''}`}>
          <h2>{name} <span className="count">{g.length}</span></h2>
          <ul>{g.map(item)}</ul>
        </div>
      ))}
      {doneRows.length > 0 && (
        <div className="actions done-list">
          <h2>Done <span className="count">{doneRows.length}</span></h2>
          <p className="text-tertiary">Kept so you can see what got finished. Untick one to reopen it, or delete it when you no longer need it.</p>
          <ul>{doneRows.map(item)}</ul>
        </div>
      )}
      </div>
    </section>
  )
}
