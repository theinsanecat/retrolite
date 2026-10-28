import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { columnsOf, uid, type ActionItem, type Board, type Card, type Column } from '../types'
import {
  byId, checkGroup, checkLink, childrenOf, groupUnder, linkCards, linksOf, moveToColumn, removeCard,
  removeFromGroup, restoreCard, roleOf, totalVotes, ungroup, unlinkCards, type Outcome,
} from '../lib/cards'
import { Actions } from './Actions'
import { Button } from './ui/Button'
import { Menu, type MenuEntry } from './ui/Menu'
import { Tooltip } from './ui/Tooltip'
import { Icon } from './ui/Icon'
import { useToast } from './ui/Toaster'

/*
 * Every card action goes through the ⋯ menu (mouse, keyboard and touch), and
 * dragging is a shortcut on desktop:
 * - drag a card onto a column  → move it there
 * - drag a card onto a card    → a small menu asks: group under it, or link as related
 * "Group under…" and "Link to…" ask you to click the other card. Cards that
 * can't be chosen are dimmed, and choosing one explains why in a toast.
 * The rules for each case (standalone, parent, child, linked) live in lib/cards.ts.
 */

type Pick = { cardId: string; mode: 'group' | 'link' }
type Open = { cardId: string; anchor: HTMLElement; targetId?: string }

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
  const toast = useToast()
  const [menu, setMenu] = useState<Open>()
  const [pick, setPick] = useState<Pick>()
  const [dragId, setDragId] = useState<string>()
  const [highlight, setHighlight] = useState<string[]>([])
  const latest = useRef(board)
  useLayoutEffect(() => { latest.current = board })
  const columns = columnsOf(board)
  const cards = board.cards
  const colTitle = (id: string) => columns.find(c => c.id === id)?.title ?? id

  const setCards = (next: Card[]) => onChange({ ...latest.current, cards: next })
  const setActions = (actions: ActionItem[]) => onChange({ ...latest.current, actions })

  /** Apply an outcome from lib/cards: change the cards, or explain why not. */
  const act = (o: Outcome) => {
    if (o.ok) setCards(o.cards)
    toast(o.msg, o.vars)
    return o.ok
  }

  const startPick = (cardId: string, mode: Pick['mode']) => {
    const check = mode === 'group' ? checkGroup : checkLink
    if (!cards.some(c => c.id !== cardId && !check(cards, cardId, c.id))) {
      toast(mode === 'group' ? 'group.noTargets' : 'link.noTargets')
      return
    }
    setHighlight([])
    setPick({ cardId, mode })
  }
  const choose = (targetId: string) => {
    if (!pick) return
    const ok = act(pick.mode === 'group' ? groupUnder(cards, pick.cardId, targetId) : linkCards(cards, pick.cardId, targetId))
    if (ok) setPick(undefined)
  }

  useEffect(() => {
    if (!pick) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setPick(undefined)
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [pick])

  const remove = (id: string) => {
    const { outcome, removed } = removeCard(cards, id)
    if (!outcome.ok) return
    setCards(outcome.cards)
    toast(outcome.msg, outcome.vars, {
      action: { label: 'Undo', run: () => { setCards(restoreCard(latest.current.cards, removed)); toast('card.restored') } },
    })
  }

  const dropOnColumn = (column: string) => {
    const id = dragId
    setDragId(undefined)
    if (!id) return
    const c = byId(cards, id)
    if (!c || (c.column === column && !c.parentId)) return // dropped back where it was
    act(moveToColumn(cards, id, column, colTitle(column)))
  }

  /** The ⋯ menu: what can be done with this card, given its role. */
  const cardMenu = (card: Card): MenuEntry[] => {
    const role = roleOf(cards, card)
    const kids = childrenOf(cards, card.id).length
    const links = linksOf(cards, card)
    const canGroup = cards.some(c => c.id !== card.id && !checkGroup(cards, card.id, c.id))
    const canLink = cards.some(c => c.id !== card.id && !checkLink(cards, card.id, c.id))
    const entries: MenuEntry[] = [
      { kind: 'heading', label: 'Organize' },
      {
        id: 'group', icon: 'groupUnder', label: role === 'child' ? 'Move to another group…' : 'Group under a card…',
        hint: role === 'parent' ? `Brings its ${kids} grouped card${kids === 1 ? '' : 's'} along` : 'Then click the card to group it under',
        blocked: !canGroup, onSelect: () => startPick(card.id, 'group'),
      },
    ]
    if (role === 'child') entries.push({ id: 'out', icon: 'takeOut', label: 'Take out of group', hint: 'Stays in this column', onSelect: () => act(removeFromGroup(cards, card.id)) })
    if (role === 'parent') entries.push({ id: 'ungroup', icon: 'ungroup', label: `Ungroup ${kids} card${kids === 1 ? '' : 's'}`, hint: kids === 1 ? 'It stays in this column, on its own' : 'They stay in this column, on their own', onSelect: () => act(ungroup(cards, card.id)) })
    entries.push({ id: 'link', icon: 'link', label: 'Link to a related card…', hint: 'In any column', blocked: !canLink, onSelect: () => startPick(card.id, 'link') })
    for (const id of links) {
      const other = byId(cards, id)!
      entries.push({ id: `unlink-${id}`, icon: 'unlink', label: `Unlink “${short(other.text, 28)}”`, onSelect: () => act(unlinkCards(cards, card.id, id)) })
    }

    const targets = columns.filter(c => c.id !== card.column)
    if (targets.length) {
      entries.push({ kind: 'separator' }, { kind: 'heading', label: 'Move to column' })
      for (const col of targets) {
        entries.push({
          id: `move-${col.id}`, icon: 'arrowRight', label: col.title,
          hint: role === 'parent' ? `With its ${kids} grouped card${kids === 1 ? '' : 's'}` : role === 'child' ? 'Leaves its group' : undefined,
          onSelect: () => act(moveToColumn(cards, card.id, col.id, col.title)),
        })
      }
    }

    entries.push(
      { kind: 'separator' },
      { id: 'edit', icon: 'pencil', label: 'Edit text', onSelect: () => document.getElementById(`card-text-${card.id}`)?.focus() },
      {
        id: 'reset', icon: 'reset', label: 'Reset votes', hint: card.votes ? `Takes back all ${card.votes}` : undefined, blocked: !card.votes,
        onSelect: () => {
          if (!card.votes) return toast('card.noVotes', { a: card.text })
          setCards(cards.map(c => (c.id === card.id ? { ...c, votes: 0 } : c)))
          toast('card.votesReset', { a: card.text })
        },
      },
      {
        id: 'delete', icon: 'trash', label: 'Delete card', danger: true,
        hint: role === 'parent' ? (kids === 1 ? 'Its grouped card stays, on its own' : `Its ${kids} grouped cards stay, on their own`) : undefined,
        onSelect: () => remove(card.id),
      },
    )
    // blocked items still run: startPick and the checks explain why it can't be done
    return entries
  }

  /** After dropping a card on another card: group or link? */
  const dropMenu = (cardId: string, targetId: string): MenuEntry[] => {
    const target = byId(cards, targetId)!
    const groupBlocked = checkGroup(cards, cardId, targetId)
    const linkBlocked = checkLink(cards, cardId, targetId)
    return [
      { kind: 'heading', label: `Dropped on “${short(target.text, 30)}”` },
      { id: 'drop-group', icon: 'groupUnder', label: 'Group under it', hint: target.parentId ? 'Joins its group' : undefined, blocked: !!groupBlocked, onSelect: () => act(groupUnder(cards, cardId, targetId)) },
      { id: 'drop-link', icon: 'link', label: 'Link as related', blocked: !!linkBlocked, onSelect: () => act(linkCards(cards, cardId, targetId)) },
      { kind: 'separator' },
      { id: 'drop-cancel', icon: 'x', label: 'Cancel', onSelect: () => {} },
    ]
  }

  const subject = byId(cards, pick?.cardId)
  const menuCard = byId(cards, menu?.cardId)

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
          <Button variant="primary" icon="link" tip="Copy a link that carries this whole board" onClick={onShare}>Share link</Button>
          <Button variant="primary" icon="notes" tip="Copy meeting notes as Markdown, for Slack, Jira or email" onClick={onNotes}>Copy notes</Button>
          <Button variant="primary" icon="download" tip="Save this board as a file: a backup, or for boards too big for a link" onClick={onDownload}>Download</Button>
          <Button variant="secondary" danger icon="trash" tip="Delete this board from this device" onClick={onDelete}>Delete</Button>
        </div>
      </header>

      {pick && subject && (
        <div className="banner organize" role="status">
          <span>
            <strong>{pick.mode === 'group' ? 'Group under which card?' : 'Link to which card?'}</strong>
            <span className="text-secondary"> Click a highlighted card for “{short(subject.text)}”. Esc cancels.</span>
          </span>
          <Button variant="secondary" size="sm" icon="x" onClick={() => setPick(undefined)}>Cancel</Button>
        </div>
      )}

      <div className={`columns cols-${columns.length}`}>
        {columns.map((col, i) => (
          <ColumnView
            key={col.id}
            index={i}
            column={col}
            cards={cards}
            pick={pick}
            dragId={dragId}
            menuId={menu?.cardId}
            highlight={highlight}
            onAdd={text => setCards([...cards, { id: uid(), column: col.id, text, votes: 0 }])}
            onEmpty={() => toast('card.empty')}
            onUpdate={card => setCards(cards.map(c => (c.id === card.id ? card : c)))}
            onMenu={(cardId, anchor) => setMenu({ cardId, anchor })}
            onPick={choose}
            onHighlight={ids => setHighlight(h => (h.join() === ids.join() ? [] : ids))}
            onDragStart={id => { setPick(undefined); setDragId(id) }}
            onDragEnd={() => setDragId(undefined)}
            onDropOnCard={(targetId, anchor) => {
              const id = dragId
              setDragId(undefined)
              if (id && id !== targetId) setMenu({ cardId: id, targetId, anchor })
            }}
            onDropOnColumn={() => dropOnColumn(col.id)}
          />
        ))}
      </div>

      <Actions items={board.actions} boardTitle={board.title} onChange={setActions} />

      {menu && menuCard && (
        <Menu
          anchor={menu.anchor}
          label={menu.targetId ? 'Group or link' : 'Card options'}
          align={menu.targetId ? 'start' : 'end'}
          entries={menu.targetId ? dropMenu(menu.cardId, menu.targetId) : cardMenu(menuCard)}
          onClose={refocus => { setMenu(undefined); if (refocus) menu.anchor.focus() }}
        />
      )}
    </section>
  )
}

interface ColumnProps {
  index: number
  column: Column
  cards: Card[]
  pick?: Pick
  dragId?: string
  menuId?: string
  highlight: string[]
  onAdd: (text: string) => void
  onEmpty: () => void
  onUpdate: (c: Card) => void
  onMenu: (id: string, anchor: HTMLElement) => void
  onPick: (id: string) => void
  onHighlight: (ids: string[]) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropOnCard: (id: string, anchor: HTMLElement) => void
  onDropOnColumn: () => void
}

function ColumnView(p: ColumnProps) {
  const [draft, setDraft] = useState('')
  const [over, setOver] = useState(false)
  const mine = p.cards.filter(c => c.column === p.column.id)
  const top = mine.filter(c => !c.parentId).sort((a, b) => totalVotes(p.cards, b) - totalVotes(p.cards, a))
  const add = () => {
    if (!draft.trim()) return p.onEmpty()
    p.onAdd(draft.trim())
    setDraft('')
  }
  return (
    <div
      className={`column col-${p.index} ${over ? 'is-drop' : ''}`}
      onDragOver={e => { if (p.dragId) { e.preventDefault(); setOver(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={e => { e.preventDefault(); setOver(false); p.onDropOnColumn() }}
    >
      <h2>{p.column.title} <span className="count">{mine.length}</span></h2>
      <form onSubmit={e => { e.preventDefault(); add() }}>
        <input placeholder={p.column.hint} aria-label={`Add to ${p.column.title}`} value={draft} onChange={e => setDraft(e.target.value)} />
      </form>
      <ul>
        {top.map(card => {
          const kids = childrenOf(p.cards, card.id).sort((a, b) => b.votes - a.votes)
          return (
            <li key={card.id} className={`card-group ${kids.length ? 'card-group--has-children' : ''}`}>
              <ul>
                <CardItem card={card} {...p} />
                {kids.map(k => <CardItem key={k.id} card={k} {...p} />)}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CardItem({ card, cards, pick, dragId, menuId, highlight, onUpdate, onMenu, onPick, onHighlight, onDragStart, onDragEnd, onDropOnCard }: ColumnProps & { card: Card }) {
  const [armed, setArmed] = useState(false)
  const [over, setOver] = useState(false)
  const role = roleOf(cards, card)
  const links = linksOf(cards, card)
  const kids = childrenOf(cards, card.id).length
  const total = totalVotes(cards, card)

  // while choosing a card for group/link: is this one a valid choice?
  const picking = pick && pick.cardId !== card.id
  const invalid = picking && !!(pick.mode === 'group' ? checkGroup : checkLink)(cards, pick.cardId, card.id)

  const state = [
    'card', `card--${role}`,
    links.length && 'is-linked',
    highlight.includes(card.id) && 'is-lit',
    pick?.cardId === card.id && 'is-source',
    picking && (invalid ? 'is-invalid' : 'is-target'),
    over && 'is-drop',
    dragId === card.id && 'is-dragging',
    menuId === card.id && 'is-menu-open',
  ].filter(Boolean).join(' ')

  return (
    <li
      className={state}
      draggable={armed}
      onDragStart={e => { e.dataTransfer.setData('text/plain', card.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(card.id) }}
      onDragEnd={() => { setArmed(false); onDragEnd() }}
      onDragOver={e => { if (dragId && dragId !== card.id) { e.preventDefault(); e.stopPropagation(); setOver(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDropOnCard(card.id, e.currentTarget) }}
    >
      {role === 'child' && <span className="child-mark" aria-hidden>↳</span>}
      <textarea
        id={`card-text-${card.id}`}
        aria-label="Card text"
        value={card.text}
        rows={Math.max(1, Math.ceil(card.text.length / 32))}
        onChange={e => onUpdate({ ...card, text: e.target.value })}
      />
      {(kids > 0 || links.length > 0) && (
        <div className="card-tags">
          {kids > 0 && (
            <Tooltip text={`${card.votes} vote${card.votes === 1 ? '' : 's'} here, plus ${total - card.votes} from the ${kids} grouped card${kids === 1 ? '' : 's'}`}>
              <span className="chip" tabIndex={0}><Icon name="vote" size={11} />{total} in group</span>
            </Tooltip>
          )}
          {links.length > 0 && (
            <Button variant="tertiary" size="sm" className="chip link-chip" icon="link" tip="Highlight the related cards" onClick={() => onHighlight(links)}>
              {links.length} related
            </Button>
          )}
        </div>
      )}
      <div className="card-foot">
        <Tooltip text="Drag onto a card to group or link, or onto a column to move">
          <span className="handle" aria-hidden onMouseDown={() => setArmed(true)} onMouseUp={() => setArmed(false)}><Icon name="grip" /></span>
        </Tooltip>
        <span className="spacer" />
        <Button variant="secondary" size="sm" className="vote" icon="vote" label={`Vote (${card.votes})`} tip="Vote" onClick={() => onUpdate({ ...card, votes: card.votes + 1 })}>
          {card.votes}
        </Button>
        {card.votes > 0 && (
          <Button variant="tertiary" size="sm" iconOnly icon="minus" label="Take back a vote" onClick={() => onUpdate({ ...card, votes: card.votes - 1 })} />
        )}
        <Button
          variant="tertiary" size="sm" iconOnly icon="more" label="Card options"
          aria-haspopup="menu" aria-expanded={menuId === card.id}
          onClick={e => onMenu(card.id, e.currentTarget)}
        />
      </div>
      {picking && (
        <button
          className="pick"
          onClick={() => onPick(card.id)}
          aria-label={invalid ? `Can't choose “${card.text}”` : `Choose “${card.text}”`}
        />
      )}
    </li>
  )
}
