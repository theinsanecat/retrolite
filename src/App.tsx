import { useEffect, useState } from 'react'
import { COLUMNS, uid, type ActionItem, type Board, type Card, type ColumnId } from './types'
import { deleteBoard, listBoards, requestPersistence, saveBoard } from './lib/db'
import { readShare, shareUrl } from './lib/share'
import { toMarkdown } from './lib/markdown'

const newBoard = (title = 'Sprint retro'): Board => {
  const now = Date.now()
  return { id: uid(), title, createdAt: now, updatedAt: now, cards: [], actions: [] }
}

export default function App() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [incoming, setIncoming] = useState<Board>()
  const [error, setError] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [online, setOnline] = useState(navigator.onLine)
  const [persisted, setPersisted] = useState(false)

  useEffect(() => {
    listBoards().then(list => {
      setBoards(list)
      setActiveId(list[0]?.id)
    })
    requestPersistence().then(setPersisted)
    readShare().then(setIncoming).catch(e => setError(e.message))
    const on = () => setOnline(navigator.onLine)
    addEventListener('online', on)
    addEventListener('offline', on)
    return () => { removeEventListener('online', on); removeEventListener('offline', on) }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const active = boards.find(b => b.id === activeId)

  const update = (board: Board) => {
    const next = { ...board, updatedAt: Date.now() }
    setBoards(bs => [next, ...bs.filter(b => b.id !== next.id)])
    saveBoard(next)
  }

  const create = (board = newBoard()) => {
    update(board)
    setActiveId(board.id)
  }

  const remove = (id: string) => {
    if (!confirm('Delete this board from this device?')) return
    deleteBoard(id)
    const rest = boards.filter(b => b.id !== id)
    setBoards(rest)
    setActiveId(rest[0]?.id)
  }

  const clearHash = () => history.replaceState(null, '', location.pathname + location.search)

  const acceptIncoming = () => {
    if (incoming) create(incoming)
    setIncoming(undefined)
    clearHash()
    setToast('Saved a copy to this device')
  }

  const share = async (board: Board) => {
    const url = await shareUrl(board)
    try {
      await navigator.clipboard.writeText(url)
      setToast(`Link copied (${url.length.toLocaleString()} characters)`)
    } catch {
      prompt('Copy this link', url)
    }
  }

  const copyNotes = async (board: Board) => {
    await navigator.clipboard.writeText(toMarkdown(board))
    setToast('Meeting notes copied as Markdown')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden>◐</span>
          <div>
            <strong>Retrolite</strong>
            <small>Sprint retros. No backend.</small>
          </div>
        </div>
        <button className="primary wide" onClick={() => create()}>+ New board</button>
        <nav aria-label="Boards">
          {boards.map(b => (
            <button
              key={b.id}
              className={`board-link ${b.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(b.id)}
            >
              <span>{b.title || 'Untitled'}</span>
              <small>{b.cards.length} cards · {new Date(b.updatedAt).toLocaleDateString()}</small>
            </button>
          ))}
        </nav>
        <footer className="status">
          <span className={`dot ${online ? 'on' : 'off'}`} /> {online ? 'Online' : 'Offline — still works'}
          <br />
          <span className="muted">{persisted ? 'Saved on this device (persistent)' : 'Saved on this device'}</span>
        </footer>
      </aside>

      <main>
        {error && (
          <div className="banner error" role="alert">
            {error}
            <button className="ghost" onClick={() => { setError(undefined); clearHash() }}>Dismiss</button>
          </div>
        )}
        {incoming && (
          <div className="banner" role="status">
            <div>
              <strong>Someone shared “{incoming.title}” with you.</strong>
              <span className="muted"> {incoming.cards.length} card{incoming.cards.length === 1 ? '' : 's'}, {incoming.actions.length} action item{incoming.actions.length === 1 ? '' : 's'}. It came inside the link; no server saw it.</span>
            </div>
            <div className="row">
              <button className="primary" onClick={acceptIncoming}>Save a copy</button>
              <button className="ghost" onClick={() => { setIncoming(undefined); clearHash() }}>Ignore</button>
            </div>
          </div>
        )}

        {active ? (
          <BoardView
            key={active.id}
            board={active}
            onChange={update}
            onShare={() => share(active)}
            onNotes={() => copyNotes(active)}
            onDelete={() => remove(active.id)}
          />
        ) : (
          <Empty onCreate={() => create()} />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="empty">
      <h1>Run your sprint retro in the browser</h1>
      <p>Boards are saved on your device in IndexedDB, work offline, and travel inside a share link. No sign-up, no server, no database.</p>
      <button className="primary" onClick={onCreate}>Start a retro</button>
    </section>
  )
}

interface BoardProps {
  board: Board
  onChange: (b: Board) => void
  onShare: () => void
  onNotes: () => void
  onDelete: () => void
}

function BoardView({ board, onChange, onShare, onNotes, onDelete }: BoardProps) {
  const setCards = (cards: Card[]) => onChange({ ...board, cards })
  const setActions = (actions: ActionItem[]) => onChange({ ...board, actions })

  return (
    <section className="board">
      <header className="board-head">
        <input
          className="title"
          aria-label="Board title"
          value={board.title}
          onChange={e => onChange({ ...board, title: e.target.value })}
        />
        <div className="row">
          <button onClick={onShare} title="Copy a link that carries this whole board">Share link</button>
          <button onClick={onNotes} title="Copy meeting notes as Markdown">Copy notes</button>
          <button className="ghost danger" onClick={onDelete}>Delete</button>
        </div>
      </header>

      <div className="columns">
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            hint={col.hint}
            cards={board.cards.filter(c => c.column === col.id)}
            onAdd={text => setCards([...board.cards, { id: uid(), column: col.id, text, votes: 0 }])}
            onUpdate={card => setCards(board.cards.map(c => (c.id === card.id ? card : c)))}
            onRemove={id => setCards(board.cards.filter(c => c.id !== id))}
          />
        ))}
      </div>

      <Actions items={board.actions} onChange={setActions} />
    </section>
  )
}

interface ColumnProps {
  id: ColumnId
  title: string
  hint: string
  cards: Card[]
  onAdd: (text: string) => void
  onUpdate: (c: Card) => void
  onRemove: (id: string) => void
}

function Column({ id, title, hint, cards, onAdd, onUpdate, onRemove }: ColumnProps) {
  const [draft, setDraft] = useState('')
  const sorted = [...cards].sort((a, b) => b.votes - a.votes)
  const add = () => {
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
  }
  return (
    <div className={`column col-${id}`}>
      <h2>{title} <span className="count">{cards.length}</span></h2>
      <form onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder={hint} aria-label={`Add to ${title}`} value={draft} onChange={e => setDraft(e.target.value)} />
      </form>
      <ul>
        {sorted.map(card => (
          <li key={card.id} className="card">
            <textarea
              aria-label="Card text"
              value={card.text}
              rows={Math.max(1, Math.ceil(card.text.length / 34))}
              onChange={e => onUpdate({ ...card, text: e.target.value })}
            />
            <div className="card-foot">
              <button className="vote" onClick={() => onUpdate({ ...card, votes: card.votes + 1 })} aria-label="Vote">
                ▲ {card.votes}
              </button>
              {card.votes > 0 && (
                <button className="ghost small" onClick={() => onUpdate({ ...card, votes: card.votes - 1 })} aria-label="Remove vote">−</button>
              )}
              <button className="ghost small" onClick={() => onRemove(card.id)} aria-label="Delete card">✕</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Actions({ items, onChange }: { items: ActionItem[]; onChange: (a: ActionItem[]) => void }) {
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
            {a.due && <span className={`chip ${!a.done && a.due < new Date().toISOString().slice(0, 10) ? 'late' : ''}`}>{a.due}</span>}
            <button className="ghost small" onClick={() => onChange(items.filter(i => i.id !== a.id))} aria-label="Delete action">✕</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
