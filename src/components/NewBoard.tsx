import { useState } from 'react'
import { TEMPLATES, type Board } from '../types'
import { isTaken, uniqueTitle } from '../lib/titles'

export function NewBoard({ boards, onCreate, onCancel }: {
  boards: Board[]
  onCreate: (title: string, templateId: string) => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(() => uniqueTitle('Sprint retro', boards))
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const taken = isTaken(title, boards)

  return (
    <section className="new-board">
      <h1>New retro</h1>
      <form onSubmit={e => { e.preventDefault(); onCreate(uniqueTitle(title, boards), template) }}>
        <label className="field">
          <span>Board name</span>
          <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Board name" autoFocus />
          {taken && <small className="warn">That name is taken, so it will be saved as “{uniqueTitle(title, boards)}”.</small>}
        </label>
        <fieldset className="templates">
          <legend>Format</legend>
          {TEMPLATES.map(t => (
            <label key={t.id} className={`template ${template === t.id ? 'chosen' : ''}`}>
              <input type="radio" name="template" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id)} />
              <strong>{t.name}</strong>
              <span className="muted">{t.blurb}</span>
              <span className="mini-cols">{t.columns.map((c, i) => <i key={c.id} className={`col-${i}`}>{c.title}</i>)}</span>
            </label>
          ))}
        </fieldset>
        <div className="row">
          <button className="primary" type="submit">Create board</button>
          {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </section>
  )
}
