import { useState } from 'react'
import { uid, type ActionItem } from '../types'

/** Today as YYYY-MM-DD in the user's own time zone. */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => localDate()

export function Actions({ items, onChange }: { items: ActionItem[]; onChange: (a: ActionItem[]) => void }) {
  const [text, setText] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const add = () => {
    if (!text.trim()) return
    onChange([...items, { id: uid(), text: text.trim(), owner: owner.trim(), due, done: false }])
    setText(''); setOwner(''); setDue('')
  }
  const set = (a: ActionItem) => onChange(items.map(i => (i.id === a.id ? a : i)))
  const open = items.filter(i => !i.done).length

  return (
    <section className="actions">
      <h2>Action items <span className="count">{open} open</span></h2>
      <p className="muted">A retro is only useful if something changes. Give every action an owner and a date.</p>
      <form className="action-form" onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder="What will we do?" aria-label="Action" value={text} onChange={e => setText(e.target.value)} />
        <input placeholder="Owner" aria-label="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
        <input type="date" aria-label="Due date" value={due} onChange={e => setDue(e.target.value)} />
        <button className="primary" type="submit">Add</button>
      </form>
      <ul>
        {items.map(a => (
          <li key={a.id} className={`action ${a.done ? 'done' : ''}`}>
            <input type="checkbox" checked={a.done} aria-label="Done" onChange={e => set({ ...a, done: e.target.checked })} />
            <span className="action-text">{a.text}</span>
            {a.owner && <span className="chip">@{a.owner}</span>}
            {a.due && <span className={`chip ${!a.done && a.due < today() ? 'late' : ''}`}>{a.due}</span>}
            <button className="ghost small" onClick={() => onChange(items.filter(i => i.id !== a.id))} aria-label="Delete action">✕</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
