import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { TEMPLATES, uid, type Board } from './types'
import { deleteBoard, listBoards, requestPersistence, saveBoard } from './lib/db'
import { LONG_LINK, downloadFile, readFile, readShare, shareUrl } from './lib/share'
import { toMarkdown } from './lib/markdown'
import { sampleBoard, sampleBoards } from './lib/sample'
import { isTaken, uniqueTitle } from './lib/titles'
import { BoardView } from './components/BoardView'
import { NewBoard } from './components/NewBoard'
import { OpenActions, openActions } from './components/OpenActions'
import { today } from './components/Actions'
import { Button, btnClass } from './components/ui/Button'
import { Icon } from './components/ui/Icon'
import { useToast } from './components/ui/Toaster'
import { useConfirm } from './components/ui/Confirm'
import { msg } from './lib/messages'
import { ThemeSwitch } from './components/ui/ThemeSwitch'

// Remove the board from the address bar as soon as it's read, so other scripts,
// extensions and bookmarks of this page don't keep a copy of it.
const clearHash = () => history.replaceState(null, '', location.pathname + location.search)

// Read once at start-up: the sample boards open for first-time visitors (and
// with ?demo), so the app shows what it does straight away. After the first
// visit they never come back on their own, even if every board is deleted.
const SEEN = 'retrolite.seen'
const firstVisit = (() => { try { return !localStorage.getItem(SEEN) } catch { return false } })()
try { localStorage.setItem(SEEN, '1') } catch { /* private mode: fine */ }
const askedForDemo = new URLSearchParams(location.search).has('demo')
let DEMO = askedForDemo || (firstVisit && !location.hash.includes('share='))
if (askedForDemo) history.replaceState(null, '', location.pathname + location.hash)

type View = 'board' | 'new' | 'actions'

export default function App() {
  const toast = useToast()
  const confirm = useConfirm()
  const [boards, setBoards] = useState<Board[]>([])
  const boardsRef = useRef(boards)
  useLayoutEffect(() => { boardsRef.current = boards })
  const [activeId, setActiveId] = useState<string>()
  const [view, setView] = useState<View>('board')
  const [incoming, setIncoming] = useState<{ board: Board; from: 'link' | 'file' }>()
  const [sharing, setSharing] = useState<Board>()
  const [error, setError] = useState<string>()
  const [online, setOnline] = useState(navigator.onLine)
  const [persisted, setPersisted] = useState(false)

  useEffect(() => {
    listBoards().then(list => {
      if (DEMO && list.length === 0) {
        DEMO = false
        const samples = sampleBoards()
        samples.forEach(saveBoard)
        setBoards(bs => (bs.length ? bs : samples))
        setActiveId(id => id ?? samples[0].id)
        toast('board.sample')
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
      toast('board.renamed', { title: fixed })
    }
  }

  const remove = async (id: string) => {
    const b = boardsRef.current.find(x => x.id === id)
    if (!b) return
    const ok = await confirm({
      title: 'Delete this board?', danger: true, icon: 'trash', confirmLabel: 'Delete board',
      message: msg('confirm.deleteBoard', { title: b.title, n: b.cards.length }).text,
    })
    if (!ok) return
    deleteBoard(id)
    const rest = boardsRef.current.filter(x => x.id !== id)
    setBoards(rest)
    setActiveId(rest[0]?.id)
    toast('board.deleted')
  }

  const acceptIncoming = () => {
    if (incoming) {
      const saved = create(incoming.board)
      if (saved.title === incoming.board.title) toast('board.saved')
      else toast('board.savedAs', { title: saved.title })
    }
    setIncoming(undefined)
  }

  const copyLink = async (board: Board) => {
    setSharing(undefined)
    const url = await shareUrl(board)
    try {
      await navigator.clipboard.writeText(url)
      toast(url.length > LONG_LINK ? 'share.long' : 'share.copied', { n: url.length })
    } catch {
      toast('share.failed')
      prompt('Copy this link', url)
    }
  }

  const download = (board: Board) => {
    setSharing(undefined)
    downloadFile(board)
    toast('file.downloaded')
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
    toast('notes.copied')
  }

  const toggleAction = (boardId: string, actionId: string) => {
    const b = boardsRef.current.find(x => x.id === boardId)
    const a = b?.actions.find(x => x.id === actionId)
    if (!b || !a) return
    update({ ...b, actions: b.actions.map(x => (x.id === actionId ? { ...x, done: !x.done, doneAt: x.done ? undefined : Date.now() } : x)) })
    toast(a.done ? 'action.reopened' : 'action.done', { text: a.text }, a.done ? undefined : { action: { label: 'Undo', run: () => toggleAction(boardId, actionId) } })
  }

  /** Delete an action from the overview, after asking. */
  const deleteAction = async (boardId: string, actionId: string) => {
    const b = boardsRef.current.find(x => x.id === boardId)
    const a = b?.actions.find(x => x.id === actionId)
    if (!b || !a) return
    const ok = await confirm({
      title: 'Delete this action?', danger: true, icon: 'trash', confirmLabel: 'Delete',
      message: msg('confirm.deleteAction', { text: a.text, board: b.title }).text,
    })
    if (!ok) return toast('action.kept', { text: a.text })
    const index = b.actions.indexOf(a)
    update({ ...b, actions: b.actions.filter(x => x.id !== actionId) })
    toast('action.deleted', {}, { action: { label: 'Undo', run: () => {
      const now = boardsRef.current.find(x => x.id === boardId)
      if (now) update({ ...now, actions: [...now.actions.slice(0, index), a, ...now.actions.slice(index)] })
    } } })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {/* 1. Brand */}
        <div className="side-section side-brand">
          <span className="logo" aria-hidden><Icon name="auto" size={28} /></span>
          <div>
            <strong>Retrolite</strong>
            <small>Sprint retros. No backend.</small>
          </div>
        </div>

        {/* 2. Actions */}
        <div className="side-section side-actions">
          <Button variant="primary" className="wide" icon="plus" onClick={() => setView('new')}>New board</Button>
          <label className={btnClass('primary', { extra: 'wide' })}>
            <Icon name="upload" />Import board file
            <input type="file" accept=".json,application/json" className="sr-only" onChange={e => { importFile(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>

        {/* 3. Pages: the overview, then every sprint board */}
        <div className="side-section side-pages">
          <p className="side-heading text-tertiary">Overview</p>
          <button className={`board-link open-link ${view === 'actions' ? 'active' : ''}`} aria-current={view === 'actions' ? 'page' : undefined} onClick={() => setView('actions')}>
            <Icon name="overview" className="link-icon" />
            <span className="link-text">
              <span>Open actions <span className="count">{open.length}</span></span>
              <small className="text-tertiary">{overdue ? <span className="late-text">{overdue} overdue</span> : 'Across all boards'}</small>
            </span>
          </button>
          <p className="side-heading text-tertiary">Sprint boards <span className="count">{boards.length}</span></p>
          <nav aria-label="Boards">
            {boards.map(b => (
              <button
                key={b.id}
                className={`board-link ${view === 'board' && b.id === activeId ? 'active' : ''}`}
                aria-current={view === 'board' && b.id === activeId ? 'page' : undefined}
                onClick={() => { setActiveId(b.id); setView('board') }}
              >
                <Icon name="sprintBoard" className="link-icon" />
                <span className="link-text">
                  <span>{b.title || 'Untitled'}</span>
                  <small className="text-tertiary">{b.cards.length} cards · {new Date(b.updatedAt).toLocaleDateString()}</small>
                </span>
              </button>
            ))}
            {boards.length === 0 && <p className="text-tertiary side-empty">No boards yet.</p>}
          </nav>
        </div>

        {/* 4. Footer */}
        <footer className="side-section side-footer">
          <ThemeSwitch />
          <div className="status">
            <span className={`dot ${online ? 'on' : 'off'}`} /> {online ? 'Online' : 'Offline — still works'}
            <br />
            <span className="text-tertiary">{persisted ? 'Saved on this device (persistent)' : 'Saved on this device'}</span>
          </div>
        </footer>
      </aside>

      <main>
        {(error || incoming || sharing) && (
        <div className="main-banners">
        {error && (
          <div className="banner error" role="alert">
            {error}
            <Button variant="secondary" size="sm" icon="x" onClick={() => setError(undefined)}>Dismiss</Button>
          </div>
        )}
        {incoming && (
          <div className="banner" role="status">
            <div>
              <strong>{incoming.from === 'link' ? `Someone shared “${incoming.board.title}” with you.` : `Import “${incoming.board.title}”?`}</strong>
              <span className="text-secondary"> {incoming.board.cards.length} card{incoming.board.cards.length === 1 ? '' : 's'}, {incoming.board.actions.length} action item{incoming.board.actions.length === 1 ? '' : 's'}.{incoming.from === 'link' ? ' It came inside the link; no server saw it.' : ''}</span>
            </div>
            <div className="row">
              <Button variant="primary" icon="download" onClick={acceptIncoming}>Save a copy</Button>
              <Button variant="secondary" icon="x" onClick={() => setIncoming(undefined)}>Ignore</Button>
            </div>
          </div>
        )}

        {sharing && (
          <div className="banner" role="dialog" aria-label="Share this board">
            <div>
              <strong>Anyone with this link can read the whole board.</strong>
              <span className="text-secondary"> The link can also stay in their browser history, so leave out anything confidential.</span>
            </div>
            <div className="row">
              <Button variant="primary" icon="link" onClick={() => copyLink(sharing)}>Copy link</Button>
              <Button variant="primary" icon="download" onClick={() => download(sharing)}>Download file instead</Button>
              <Button variant="secondary" icon="x" onClick={() => setSharing(undefined)}>Cancel</Button>
            </div>
          </div>
        )}
        </div>
        )}

        {view === 'new' ? (
          <NewBoard boards={boards} onCreate={createFromTemplate} onCancel={boards.length ? () => setView('board') : undefined} />
        ) : view === 'actions' ? (
          <OpenActions boards={boards} onToggle={toggleAction} onDelete={deleteAction} onOpen={id => { setActiveId(id); setView('board') }} />
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

    </div>
  )
}

function Empty({ onCreate, onSample }: { onCreate: () => void; onSample: () => void }) {
  return (
    <section className="page"><div className="page-body"><div className="empty">
      <h1>Run your sprint retro in the browser</h1>
      <p>Boards are saved on your device in IndexedDB, work offline, and travel inside a share link. No sign-up, no server, no database.</p>
      <div className="row center">
        <Button variant="primary" icon="plus" onClick={onCreate}>Start a retro</Button>
        <Button variant="primary" icon="sparkle" onClick={onSample}>Try a sample board</Button>
      </div>
    </div></div></section>
  )
}
