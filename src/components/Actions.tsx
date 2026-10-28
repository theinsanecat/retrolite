import { useRef, useState, useLayoutEffect } from 'react'
import { uid, type ActionItem } from '../types'
import { Button } from './ui/Button'
import { useToast } from './ui/Toaster'

/** Today as YYYY-MM-DD in the user's own time zone. */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => localDate()

export function Actions({ items, onChange }: { items: ActionItem[]; onChange: (a: ActionItem[]) => void }) {
  const toast = useToast()
  const latest = useRef(items)
  useLayoutEffect(() => { latest.current = items })
  const [text, setText] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const add = () => {
    if (!text.trim()) return toast('action.needsText')
    onChange([...items, { id: uid(), text: text.trim(), owner: owner.trim(), due, done: false }])
    setText(''); setOwner(''); setDue('')
  }
  const toggle = (a: ActionItem) => {
    onChange(items.map(i => (i.id === a.id ? { ...a, done: !a.done } : i)))
    toast(a.done ? 'action.reopened' : 'action.done', { text: a.text })
  }
  const remove = (a: ActionItem) => {
    const index = items.indexOf(a)
    onChange(items.filter(i => i.id !== a.id))
    toast('action.deleted', {}, { action: { label: 'Undo', run: () => {
      const now = latest.current.filter(i => i.id !== a.id)
      onChange([...now.slice(0, index), a, ...now.slice(index)])
    } } })
  }
  const open = items.filter(i => !i.done).length

  return (
    <section className="actions">
      <h2>Action items <span className="count">{open} open</span></h2>
      <p className="text-secondary">A retro is only useful if something changes. Give every action an owner and a date.</p>
      <form className="action-form" onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder="What will we do?" aria-label="Action" value={text} onChange={e => setText(e.target.value)} />
        <input placeholder="Owner" aria-label="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
        <input type="date" aria-label="Due date" value={due} onChange={e => setDue(e.target.value)} />
        <Button variant="primary" type="submit">Add</Button>
      </form>
      <ul>
        {items.map(a => (
          <li key={a.id} className={`action ${a.done ? 'done' : ''}`}>
            <input type="checkbox" checked={a.done} aria-label="Done" onChange={() => toggle(a)} />
            <span className="action-text">{a.text}</span>
            {a.owner && <span className="chip">@{a.owner}</span>}
            {a.due && <span className={`chip ${!a.done && a.due < today() ? 'late' : ''}`}>{a.due}</span>}
            <Button variant="tertiary" size="sm" icon danger label="Delete action" onClick={() => remove(a)}>✕</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
