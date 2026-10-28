import { useEffect, useState } from 'react'
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
