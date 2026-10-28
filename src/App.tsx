import { useEffect, useState } from 'react'
import { COLUMNS, uid, type ActionItem, type Board, type Card, type ColumnId } from './types'
import { deleteBoard, listBoards, requestPersistence, saveBoard } from './lib/db'
import { LONG_LINK, downloadFile, readFile, readShare, shareUrl } from './lib/share'
import { toMarkdown } from './lib/markdown'
import { sampleBoard } from './lib/sample'

// Remove the board from the address bar as soon as it's read, so other scripts,
// extensions and bookmarks of this page don't keep a copy of it.
const clearHash = () => history.replaceState(null, '', location.pathname + location.search)

// Read once at start-up: ?demo (the link shared on LinkedIn) opens a sample
// board for first-time visitors.
let DEMO = new URLSearchParams(location.search).has('demo')
if (DEMO) history.replaceState(null, '', location.pathname + location.hash)

const newBoard = (title = 'Sprint retro'): Board => {import { useEffect, useState } from 'react'
import { TEMPLATES, uid, type Board } from './types'
import { deleteBoard, listBoards, requestPersistence, saveBoard } from './lib/db'
import { LONG_LINK, downloadFile, readFile, readShare, shareUrl } from './lib/share'
import { toMarkdown } from './lib/markdown'
import { sampleBoard } from './lib/sample'
import { isTaken, uniqueTitle } from './lib/titles'
import { BoardView } from './components/BoardView'
import { NewBoard } from './components/NewBoard'
import { OpenActions, openActions } from './components/OpenActions'
import { today } from './components/Actions'

// Remove the board from the address bar as soon as it's read, so other scripts,
// extensions and bookmarks of this page don't keep a copy of it.
const clearHash = () => history.replaceState(null, '', location.pathname + location.search)

// Read once at start-up: ?demo (the link shared on LinkedIn) opens a sample
// board for first-time visitors.
let DEMO = new URLSearchParams(location.search).has('demo')
if (DEMO) history.replaceState(null, '', location.pathname + location.hash)

type View = 'board' | 'new' | 'actions'

export default function App() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [view, setView] = useState<View>('board')
  const [incoming, setIncoming] = useState<{ board: Board; from: 'link' | 'file' }>()
  const [sharing, setSharing] = useState<Board>()
  const [error, setError] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [online, setOnline] = useState(navigator.onLine)
  const [persisted, setPersisted] = useState(false)

  useEffect(() => {
    listBoards().then(list => {
      if (DEMO && list.length === 0) {
        DEMO = false
        const sample = sampleBoard()
        saveBoard(sample)
        setBoards(bs => (bs.length ? bs : [sample]))
        setActiveId(id => id ?? sample.id)
        setToast('This is a sample board. Play around: everything stays in your browser.')
        return
      }
      // Older versions allowed duplicate names; give any repeats a number once.
      const seen: Board[] = []
      const named = [...list].sort((x, y) => x.createdAt - y.createdAt).map(bd => {
        const title = uniqueTitle(bd.title, seen)
        const next = title === bd.title ? bd : { ...bd, title }
        if (next !== bd) saveBoard(next)
        seen.push(next)
        return next
      })
      const byId = new Map(named.map(bd => [bd.id, bd]))
      setBoards(list.map(bd => byId.get(bd.id)!))
      setActiveId(list[0]?.id)
    })
    requestPersistence().then(setPersisted)
    // Read a shared board from the link, on load and when a link is opened in an open tab
    const readLink = () => {
      const hash = location.hash
      if (!hash.includes('share=')) return
      clearHash()
      readShare(hash).then(board => board && setIncoming({ board, from: 'link' })).catch(e => setError(e.message))
    }
    readLink()
    const on = () => setOnline(navigator.onLine)
    addEventListener('online', on)
    addEventListener('offline', on)
    addEventListener('hashchange', readLink)
    return () => { removeEventListener('online', on); removeEventListener('offline', on); removeEventListener('hashchange', readLink) }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), toast.length > 60 ? 6000 : 2400)
    return () => clearTimeout(t)
  }, [toast])

  const active = boards.find(b => b.id === activeId)
  const open = openActions(boards)
  const overdue = open.filter(r => r.action.due && r.action.due < today()).length

  const update = (board: Board) => {
    const next = { ...board, updatedAt: Date.now() }
    setBoards(bs => [next, ...bs.filter(b => b.id !== next.id)])
    saveBoard(next)
  }

  /** Every new board gets a name no other board on this device uses. */
  const create = (board: Board) => {
    const named = { ...board, title: uniqueTitle(board.title, boards) }
    update(named)
    setActiveId(named.id)
    setView('board')
    return named
  }

  const createFromTemplate = (title: string, templateId: string) => {
    const now = Date.now()
    const t = TEMPLATES.find(x => x.id === templateId) ?? TEMPLATES[0]
    create({ id: uid(), title, createdAt: now, updatedAt: now, columns: t.columns, cards: [], actions: [] })
  }

  const finishTitle = (board: Board) => {
    const fixed = uniqueTitle(board.title, boards, board.id)
    if (fixed !== board.title) {
      update({ ...board, title: fixed })
      setToast(`Another board already had that name, so this one is now “${fixed}”.`)
    }
  }

  const remove = (id: string) => {
    if (!confirm('Delete this board from this device?')) return
    deleteBoard(id)
    const rest = boards.filter(b => b.id !== id)
    setBoards(rest)
    setActiveId(rest[0]?.id)
  }

  const acceptIncoming = () => {
    if (incoming) {
      const saved = create(incoming.board)
      setToast(saved.title === incoming.board.title ? 'Saved a copy to this device' : `Saved a copy as “${saved.title}”`)
    }
    setIncoming(undefined)
  }

  const copyLink = async (board: Board) => {
    setSharing(undefined)
    const url = await shareUrl(board)
    try {
      await navigator.clipboard.writeText(url)
      setToast(url.length > LONG_LINK
        ? `Link copied, but it's long (${url.length.toLocaleString()} characters). Some chat apps cut long links; if it doesn't open, send the board file instead.`
        : `Link copied (${url.length.toLocaleString()} characters)`)
    } catch {
      prompt('Copy this link', url)
    }
  }

  const download = (board: Board) => {
    setSharing(undefined)
    downloadFile(board)
    setToast('Board file downloaded')
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      setIncoming({ board: await readFile(file), from: 'file' })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const copyNotes = async (board: Board) => {
    await navigator.clipboard.writeText(toMarkdown(board))
    setToast('Meeting notes copied as Markdown')
  }

  const toggleAction = (boardId: string, actionId: string) => {
    const b = boards.find(x => x.id === boardId)
    if (b) update({ ...b, actions: b.actions.map(a => (a.id === actionId ? { ...a, done: !a.done } : a)) })
    setToast('Marked as done')
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
        <button className="primary wide" onClick={() => setView('new')}>+ New board</button>
        <label className="button wide">
          Import board file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={e => { importFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <button className={`board-link open-link ${view === 'actions' ? 'active' : ''}`} onClick={() => setView('actions')}>
          <span>✓ Open actions <span className="count">{open.length}</span></span>
          <small>{overdue ? <span className="late-text">{overdue} overdue</span> : 'Across all boards'}</small>
        </button>
        <nav aria-label="Boards">
          {boards.map(b => (
            <button
              key={b.id}
              className={`board-link ${view === 'board' && b.id === activeId ? 'active' : ''}`}
              onClick={() => { setActiveId(b.id); setView('board') }}
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
            <button className="ghost" onClick={() => setError(undefined)}>Dismiss</button>
          </div>
        )}
        {incoming && (
          <div className="banner" role="status">
            <div>
              <strong>{incoming.from === 'link' ? `Someone shared “${incoming.board.title}” with you.` : `Import “${incoming.board.title}”?`}</strong>
              <span className="muted"> {incoming.board.cards.length} card{incoming.board.cards.length === 1 ? '' : 's'}, {incoming.board.actions.length} action item{incoming.board.actions.length === 1 ? '' : 's'}.{incoming.from === 'link' ? ' It came inside the link; no server saw it.' : ''}</span>
            </div>
            <div className="row">
              <button className="primary" onClick={acceptIncoming}>Save a copy</button>
              <button className="ghost" onClick={() => setIncoming(undefined)}>Ignore</button>
            </div>
          </div>
        )}

        {sharing && (
          <div className="banner" role="dialog" aria-label="Share this board">
            <div>
              <strong>Anyone with this link can read the whole board.</strong>
              <span className="muted"> The link can also stay in their browser history, so leave out anything confidential.</span>
            </div>
            <div className="row">
              <button className="primary" onClick={() => copyLink(sharing)}>Copy link</button>
              <button onClick={() => download(sharing)}>Download file instead</button>
              <button className="ghost" onClick={() => setSharing(undefined)}>Cancel</button>
            </div>
          </div>
        )}

        {view === 'new' ? (
          <NewBoard boards={boards} onCreate={createFromTemplate} onCancel={boards.length ? () => setView('board') : undefined} />
        ) : view === 'actions' ? (
          <OpenActions boards={boards} onToggle={toggleAction} onOpen={id => { setActiveId(id); setView('board') }} />
        ) : active ? (
          <BoardView
            key={active.id}
            board={active}
            duplicateTitle={isTaken(active.title, boards, active.id)}
            onChange={update}
            onTitleDone={() => finishTitle(active)}
            onShare={() => setSharing(active)}
            onDownload={() => download(active)}
            onNotes={() => copyNotes(active)}
            onDelete={() => remove(active.id)}
          />
        ) : (
          <Empty onCreate={() => setView('new')} onSample={() => create(sampleBoard())} />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Empty({ onCreate, onSample }: { onCreate: () => void; onSample: () => void }) {
  return (
    <section className="empty">
      <h1>Run your sprint retro in the browser</h1>
      <p>Boards are saved on your device in IndexedDB, work offline, and travel inside a share link. No sign-up, no server, no database.</p>
      <div className="row center">
        <button className="primary" onClick={onCreate}>Start a retro</button>
        <button onClick={onSample}>Try a sample board</button>
      </div>
    </section>
  )
}

  const now = Date.now()
  return { id: uid(), title, createdAt: now, updatedAt: now, cards: [], actions: [] }
}

export default function App() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [incoming, setIncoming] = useState<{ board: Board; from: 'link' | 'file' }>()
  const [sharing, setSharing] = useState<Board>()
  const [error, setError] = useState<string>()
  const [toast, setToast] = useState<string>()
  const [online, setOnline] = useState(navigator.onLine)
  const [persisted, setPersisted] = useState(false)

  useEffect(() => {
    listBoards().then(list => {
      if (DEMO && list.length === 0) {
        DEMO = false
        const sample = sampleBoard()
        saveBoard(sample)
        setBoards(bs => (bs.length ? bs : [sample]))
        setActiveId(id => id ?? sample.id)
        setToast('This is a sample board. Play around: everything stays in your browser.')
        return
      }
      setBoards(list)
      setActiveId(list[0]?.id)
    })
    requestPersistence().then(setPersisted)
    const hash = location.hash
    if (hash.includes('share=')) clearHash()
    readShare(hash).then(board => board && setIncoming({ board, from: 'link' })).catch(e => setError(e.message))
    const on = () => setOnline(navigator.onLine)
    addEventListener('online', on)
    addEventListener('offline', on)
    return () => { removeEventListener('online', on); removeEventListener('offline', on) }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), toast.length > 60 ? 6000 : 2400)
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

  const acceptIncoming = () => {
    if (incoming) create(incoming.board)
    setIncoming(undefined)
    setToast('Saved a copy to this device')
  }

  const copyLink = async (board: Board) => {
    setSharing(undefined)
    const url = await shareUrl(board)
    try {
      await navigator.clipboard.writeText(url)
      setToast(url.length > LONG_LINK
        ? `Link copied, but it's long (${url.length.toLocaleString()} characters). Some chat apps cut long links; if it doesn't open, send the board file instead.`
        : `Link copied (${url.length.toLocaleString()} characters)`)
    } catch {
      prompt('Copy this link', url)
    }
  }

  const download = (board: Board) => {
    setSharing(undefined)
    downloadFile(board)
    setToast('Board file downloaded')
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      setIncoming({ board: await readFile(file), from: 'file' })
    } catch (e) {
      setError((e as Error).message)
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
        <label className="button wide">
          Import board file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={e => { importFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
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
            <button className="ghost" onClick={() => setError(undefined)}>Dismiss</button>
          </div>
        )}
        {incoming && (
          <div className="banner" role="status">
            <div>
              <strong>{incoming.from === 'link' ? `Someone shared “${incoming.board.title}” with you.` : `Import “${incoming.board.title}”?`}</strong>
              <span className="muted"> {incoming.board.cards.length} card{incoming.board.cards.length === 1 ? '' : 's'}, {incoming.board.actions.length} action item{incoming.board.actions.length === 1 ? '' : 's'}.{incoming.from === 'link' ? ' It came inside the link; no server saw it.' : ''}</span>
            </div>
            <div className="row">
              <button className="primary" onClick={acceptIncoming}>Save a copy</button>
              <button className="ghost" onClick={() => setIncoming(undefined)}>Ignore</button>
            </div>
          </div>
        )}

        {sharing && (
          <div className="banner" role="dialog" aria-label="Share this board">
            <div>
              <strong>Anyone with this link can read the whole board.</strong>
              <span className="muted"> The link can also stay in their browser history, so leave out anything confidential.</span>
            </div>
            <div className="row">
              <button className="primary" onClick={() => copyLink(sharing)}>Copy link</button>
              <button onClick={() => download(sharing)}>Download file instead</button>
              <button className="ghost" onClick={() => setSharing(undefined)}>Cancel</button>
            </div>
          </div>
        )}

        {active ? (
          <BoardView
            key={active.id}
            board={active}
            onChange={update}
            onShare={() => setSharing(active)}
            onDownload={() => download(active)}
            onNotes={() => copyNotes(active)}
            onDelete={() => remove(active.id)}
          />
        ) : (
          <Empty onCreate={() => create()} onSample={() => create(sampleBoard())} />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Empty({ onCreate, onSample }: { onCreate: () => void; onSample: () => void }) {
  return (
    <section className="empty">
      <h1>Run your sprint retro in the browser</h1>
      <p>Boards are saved on your device in IndexedDB, work offline, and travel inside a share link. No sign-up, no server, no database.</p>
      <div className="row center">
        <button className="primary" onClick={onCreate}>Start a retro</button>
        <button onClick={onSample}>Try a sample board</button>
      </div>
    </section>
  )
}

interface BoardProps {
  board: Board
  onChange: (b: Board) => void
  onShare: () => void
  onDownload: () => void
  onNotes: () => void
  onDelete: () => void
}

function BoardView({ board, onChange, onShare, onDownload, onNotes, onDelete }: BoardProps) {
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
          <button onClick={onDownload} title="Save this board as a file: a backup, or for boards too big for a link">Download</button>
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
