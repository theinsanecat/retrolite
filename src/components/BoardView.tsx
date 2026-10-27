import { useState } from 'react'
import { columnsOf, uid, type ActionItem, type Board, type Card, type Column } from '../types'
import { childrenOf, groupUnder, linkCards, makeStandalone, moveToColumn, removeCard, totalVotes } from '../lib/cards'
import { Actions } from './Actions'

/*
 * Organizing cards uses one flow with two ways in:
 * - the ⋯ button on a card (works with mouse, keyboard and touch), or
 * - dragging a card onto another card (desktop shortcut)
 * Either way the banner asks what you want: group it under the other card,
 * or link the two as related. Dropping a card on an empty part of a column
 * moves it there.
 */
type Organize =
  | { cardId: string; step: 'menu' }
  | { cardId: string; step: 'pick'; mode: 'group' | 'link' }
  | { cardId: string; step: 'drop'; targetId: string }

interface Props {
  board: Board
  duplicateTitle: boolean
  onChange: (b: Board) => void
  onTitleDone: () => void
  onShare: () => void
  onDownload: () => void
  onNotes: () => void
  onDelete: () => void
}

const short = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function BoardView({ board, duplicateTitle, onChange, onTitleDone, onShare, onDownload, onNotes, onDelete }: Props) {
  const [organize, setOrganize] = useState<Organize>()
  const [dragId, setDragId] = useState<string>()
  const [highlight, setHighlight] = useState<string[]>([])
  const columns = columnsOf(board)
  const cards = board.cards
  const find = (id?: string) => cards.find(c => c.id === id)

  const setCards = (next: Card[]) => onChange({ ...board, cards: next })
  const setActions = (actions: ActionItem[]) => onChange({ ...board, actions })

  const finish = (next: Card[]) => { setCards(next); setOrganize(undefined) }
  const pick = (targetId: string) => {
    if (organize?.step !== 'pick' || targetId === organize.cardId) return
    finish(organize.mode === 'group' ? groupUnder(cards, organize.cardId, targetId) : linkCards(cards, organize.cardId, targetId))
  }
  const dropOnColumn = (column: string) => {
    if (!dragId) return
    const c = find(dragId)
    if (c && (c.column !== column || c.parentId)) setCards(moveToColumn(cards, dragId, column))
    setDragId(undefined)
  }

  const subject = find(organize?.cardId)

  return (
    <section className="board">
      <header className="board-head">
        <div className="title-wrap">
          <input
            className="title"
            aria-label="Board title"
            value={board.title}
            onChange={e => onChange({ ...board, title: e.target.value })}
            onBlur={onTitleDone}
          />
          {duplicateTitle && <small className="warn">Another board already has this name. It will get a number when you click away.</small>}
        </div>
        <div className="row">
          <button onClick={onShare} title="Copy a link that carries this whole board">Share link</button>
          <button onClick={onNotes} title="Copy meeting notes as Markdown">Copy notes</button>
          <button onClick={onDownload} title="Save this board as a file: a backup, or for boards too big for a link">Download</button>
          <button className="ghost danger" onClick={onDelete}>Delete</button>
        </div>
      </header>

      {organize && subject && (
        <div className="banner organize" role="dialog" aria-label="Organize card">
          {organize.step === 'menu' && (<>
            <div><strong>Organize “{short(subject.text)}”</strong></div>
            <div className="row">
              <button onClick={() => setOrganize({ cardId: subject.id, step: 'pick', mode: 'group' })}>Group under a card</button>
              <button onClick={() => setOrganize({ cardId: subject.id, step: 'pick', mode: 'link' })}>Link to a related card</button>
              <label className="move">Move to
                <select value="" onChange={e => e.target.value && finish(moveToColumn(cards, subject.id, e.target.value))}>
                  <option value="">column…</option>
                  {columns.filter(c => c.id !== subject.column || subject.parentId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              {(subject.parentId || subject.links?.length) && (
                <button onClick={() => finish(makeStandalone(cards, subject.id))}>Make standalone</button>
              )}
              <button className="ghost" onClick={() => setOrganize(undefined)}>Cancel</button>
            </div>
          </>)}
          {organize.step === 'pick' && (<>
            <div><strong>{organize.mode === 'group' ? `Click the card to group “${short(subject.text)}” under` : `Click the card that's related to “${short(subject.text)}”`}</strong></div>
            <button className="ghost" onClick={() => setOrganize(undefined)}>Cancel</button>
          </>)}
          {organize.step === 'drop' && (<>
            <div><strong>“{short(subject.text, 30)}” → “{short(find(organize.targetId)?.text ?? '', 30)}”</strong></div>
            <div className="row">
              <button className="primary" onClick={() => finish(groupUnder(cards, subject.id, organize.targetId))}>Group under it</button>
              <button onClick={() => finish(linkCards(cards, subject.id, organize.targetId))}>Link as related</button>
              <button className="ghost" onClick={() => setOrganize(undefined)}>Cancel</button>
            </div>
          </>)}
        </div>
      )}

      <div className={`columns cols-${columns.length}`}>
        {columns.map((col, i) => (
          <ColumnView
            key={col.id}
            index={i}
            column={col}
            cards={cards}
            picking={organize?.step === 'pick' ? organize.cardId : undefined}
            dragging={!!dragId}
            highlight={highlight}
            onAdd={text => setCards([...cards, { id: uid(), column: col.id, text, votes: 0 }])}
            onUpdate={card => setCards(cards.map(c => (c.id === card.id ? card : c)))}
            onRemove={id => setCards(removeCard(cards, id))}
            onOrganize={id => setOrganize({ cardId: id, step: 'menu' })}
            onPick={pick}
            onHighlight={ids => setHighlight(h => (h.join() === ids.join() ? [] : ids))}
            onDragStart={setDragId}
            onDragEnd={() => setDragId(undefined)}
            onDropOnCard={targetId => {
              if (dragId && dragId !== targetId) setOrganize({ cardId: dragId, step: 'drop', targetId })
              setDragId(undefined)
            }}
            onDropOnColumn={() => dropOnColumn(col.id)}
          />
        ))}
      </div>

      <Actions items={board.actions} onChange={setActions} />
    </section>
  )
}

interface ColumnProps {
  index: number
  column: Column
  cards: Card[]
  picking?: string
  dragging: boolean
  highlight: string[]
  onAdd: (text: string) => void
  onUpdate: (c: Card) => void
  onRemove: (id: string) => void
  onOrganize: (id: string) => void
  onPick: (id: string) => void
  onHighlight: (ids: string[]) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropOnCard: (id: string) => void
  onDropOnColumn: () => void
}

function ColumnView(p: ColumnProps) {
  const [draft, setDraft] = useState('')
  const [over, setOver] = useState(false)
  const mine = p.cards.filter(c => c.column === p.column.id)
  const top = mine.filter(c => !c.parentId).sort((a, b) => totalVotes(p.cards, b) - totalVotes(p.cards, a))
  const add = () => {
    if (!draft.trim()) return
    p.onAdd(draft.trim())
    setDraft('')
  }
  const item = (card: Card, child = false) => (
    <CardItem key={card.id} card={card} child={child} {...p} total={child ? card.votes : totalVotes(p.cards, card)}
      kids={child ? 0 : childrenOf(p.cards, card.id).length} />
  )
  return (
    <div
      className={`column col-${p.index} ${over ? 'drop' : ''}`}
      onDragOver={e => { if (p.dragging) { e.preventDefault(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); p.onDropOnColumn() }}
    >
      <h2>{p.column.title} <span className="count">{mine.length}</span></h2>
      <form onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder={p.column.hint} aria-label={`Add to ${p.column.title}`} value={draft} onChange={e => setDraft(e.target.value)} />
      </form>
      <ul>
        {top.map(card => (
          <li key={card.id} className="group">
            <ul>
              {item(card)}
              {childrenOf(p.cards, card.id).sort((a, b) => b.votes - a.votes).map(k => item(k, true))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface CardProps extends ColumnProps {
  card: Card
  child: boolean
  total: number
  kids: number
}

function CardItem({ card, child, total, kids, cards, picking, highlight, onUpdate, onRemove, onOrganize, onPick, onHighlight, onDragStart, onDragEnd, onDropOnCard, dragging }: CardProps) {
  const [armed, setArmed] = useState(false)
  const [over, setOver] = useState(false)
  const links = (card.links ?? []).filter(id => cards.some(c => c.id === id))
  const isTarget = picking && picking !== card.id
  return (
    <li
      className={`card ${child ? 'child' : ''} ${highlight.includes(card.id) ? 'lit' : ''} ${isTarget ? 'target' : ''} ${over ? 'drop' : ''}`}
      draggable={armed}
      onDragStart={e => { e.dataTransfer.setData('text/plain', card.id); onDragStart(card.id) }}
      onDragEnd={() => { setArmed(false); onDragEnd() }}
      onDragOver={e => { if (dragging) { e.preventDefault(); e.stopPropagation(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDropOnCard(card.id) }}
    >
      {child && <span className="child-mark" aria-hidden>↳</span>}
      <textarea
        aria-label="Card text"
        value={card.text}
        rows={Math.max(1, Math.ceil(card.text.length / 32))}
        onChange={e => onUpdate({ ...card, text: e.target.value })}
      />
      {(kids > 0 || links.length > 0) && (
        <div className="card-tags">
          {kids > 0 && <span className="chip" title="Votes for this card and the cards grouped under it">▲ {total} in group</span>}
          {links.length > 0 && (
            <button className="chip link-chip" onClick={() => onHighlight(links)} title="Show related cards">
              ↔ {links.length} related
            </button>
          )}
        </div>
      )}
      <div className="card-foot">
        <span
          className="handle"
          title="Drag onto another card to group or link, or onto a column to move"
          aria-hidden
          onMouseDown={() => setArmed(true)}
          onMouseUp={() => setArmed(false)}
        >⠿</span>
        <span className="spacer" />
        <button className="vote" onClick={() => onUpdate({ ...card, votes: card.votes + 1 })} aria-label="Vote">▲ {card.votes}</button>
        {card.votes > 0 && (
          <button className="ghost small" onClick={() => onUpdate({ ...card, votes: card.votes - 1 })} aria-label="Remove vote">−</button>
        )}
        <button className="ghost small" onClick={() => onOrganize(card.id)} aria-label="Organize card" title="Group, link or move">⋯</button>
        <button className="ghost small" onClick={() => onRemove(card.id)} aria-label="Delete card">✕</button>
      </div>
      {isTarget && <button className="pick" onClick={() => onPick(card.id)} aria-label={`Choose “${card.text}”`} />}
    </li>
  )
}
