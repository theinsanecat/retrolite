import type { Card } from '../types'
import type { MsgKey, Vars } from './messages'

/*
 * How cards relate to each other, and what happens to those relations when a
 * card moves. Every card is in exactly one of three roles:
 *
 * - standalone: not in a group (it may still be linked)
 * - parent:     other cards are grouped under it. It shows the group's total votes.
 * - child:      grouped under a parent, always in the parent's column. One level deep.
 *
 * Links are separate from groups: two related cards point at each other,
 * in any column, whatever their role.
 *
 * Every change returns an Outcome: the new cards plus the message to show,
 * or a warning (and no change) when the action isn't allowed. The messages
 * live in messages.json.
 */

export type Role = 'standalone' | 'parent' | 'child'

export type Outcome =
  | { ok: true; cards: Card[]; msg: MsgKey; vars: Vars }
  | { ok: false; msg: MsgKey; vars: Vars }

const done = (cards: Card[], msg: MsgKey, vars: Vars = {}): Outcome => ({ ok: true, cards, msg, vars })
const warn = (msg: MsgKey, vars: Vars = {}): Outcome => ({ ok: false, msg, vars })

const without = (ids: string[] | undefined, id: string) => {
  const next = (ids ?? []).filter(x => x !== id)
  return next.length ? next : undefined
}
const withId = (ids: string[] | undefined, id: string) => (ids?.includes(id) ? ids : [...(ids ?? []), id])

export const byId = (cards: Card[], id?: string) => cards.find(c => c.id === id)
export const childrenOf = (cards: Card[], id: string) => cards.filter(c => c.parentId === id)
export const linksOf = (cards: Card[], card: Card) => (card.links ?? []).filter(id => cards.some(c => c.id === id))

export const roleOf = (cards: Card[], card: Card): Role =>
  card.parentId ? 'child' : childrenOf(cards, card.id).length ? 'parent' : 'standalone'

export const totalVotes = (cards: Card[], card: Card) =>
  card.votes + childrenOf(cards, card.id).reduce((n, c) => n + c.votes, 0)

/** True when the two cards are in the same group (as parent and child, or as two children). */
const sameGroup = (a: Card, b: Card) =>
  a.parentId === b.id || b.parentId === a.id || (!!a.parentId && a.parentId === b.parentId)

/* ---------------- checks (used to mark valid targets before acting) ---------------- */

export function checkGroup(cards: Card[], aId: string, bId: string): Outcome | undefined {
  const a = byId(cards, aId), b = byId(cards, bId)
  if (!a || !b) return warn('group.self')
  if (a.id === b.id) return warn('group.self')
  if (b.parentId === a.id) return warn('group.intoOwnChild', { a: a.text, b: b.text })
  const parentId = b.parentId ?? b.id
  if (a.parentId === parentId) return warn('group.already', { a: a.text })
  return undefined
}

export function checkLink(cards: Card[], aId: string, bId: string): Outcome | undefined {
  const a = byId(cards, aId), b = byId(cards, bId)
  if (!a || !b || a.id === b.id) return warn('link.self')
  if (a.links?.includes(b.id)) return warn('link.already', { a: a.text, b: b.text })
  if (sameGroup(a, b)) return warn('link.sameGroup', { a: a.text, b: b.text })
  return undefined
}

/* ---------------- changes ---------------- */

/**
 * Group card A under card B.
 * - B is a child: groups are one level deep, so A joins B's parent's group.
 * - A is a parent: A and its children all move under B's group.
 * - A or its children were linked to the new parent: that link is dropped, the group already relates them.
 * - A moves to the parent's column.
 */
export function groupUnder(cards: Card[], aId: string, bId: string): Outcome {
  const blocked = checkGroup(cards, aId, bId)
  if (blocked) return blocked
  const a = byId(cards, aId)!, b = byId(cards, bId)!
  const parent = b.parentId ? byId(cards, b.parentId)! : b
  const kids = childrenOf(cards, a.id)
  const moving = new Set([a.id, ...kids.map(k => k.id)])
  const next = cards.map(c => {
    if (moving.has(c.id)) return { ...c, parentId: parent.id, column: parent.column, links: without(c.links, parent.id) }
    if (c.id === parent.id) return { ...c, links: [...moving].reduce((l, id) => without(l, id), c.links) }
    return c
  })
  if (b.parentId) return done(next, 'group.redirected', { a: a.text, b: b.text, p: parent.text })
  if (kids.length) return done(next, 'group.withChildren', { a: a.text, b: b.text, n: kids.length })
  return done(next, 'group.done', { a: a.text, b: b.text })
}

/** Take a child out of its group. It stays in the same column, keeps its links. */
export function removeFromGroup(cards: Card[], id: string): Outcome {
  const a = byId(cards, id)
  if (!a?.parentId) return warn('group.notChild', { a: a?.text ?? '' })
  return done(cards.map(c => (c.id === id ? { ...c, parentId: undefined } : c)), 'group.removed', { a: a.text })
}

/** Release every card grouped under a parent. */
export function ungroup(cards: Card[], id: string): Outcome {
  const a = byId(cards, id)!
  const n = childrenOf(cards, id).length
  if (!n) return warn('group.noChildren', { a: a.text })
  return done(cards.map(c => (c.parentId === id ? { ...c, parentId: undefined } : c)), 'group.ungrouped', { a: a.text, n })
}

/** Link two cards as related. Links are kept on both cards. */
export function linkCards(cards: Card[], aId: string, bId: string): Outcome {
  const blocked = checkLink(cards, aId, bId)
  if (blocked) return blocked
  const a = byId(cards, aId)!, b = byId(cards, bId)!
  return done(cards.map(c => {
    if (c.id === a.id) return { ...c, links: withId(c.links, b.id) }
    if (c.id === b.id) return { ...c, links: withId(c.links, a.id) }
    return c
  }), 'link.done', { a: a.text, b: b.text })
}

export function unlinkCards(cards: Card[], aId: string, bId: string): Outcome {
  const a = byId(cards, aId)!, b = byId(cards, bId)
  return done(cards.map(c => {
    if (c.id === aId) return { ...c, links: without(c.links, bId) }
    if (c.id === bId) return { ...c, links: without(c.links, aId) }
    return c
  }), 'link.removed', { a: a.text, b: b?.text ?? '' })
}

/**
 * Move a card to another column.
 * - standalone: moves.
 * - parent: its whole group moves with it.
 * - child: leaves its group and moves on its own.
 * Links are kept in every case, since related cards can sit in any column.
 */
export function moveToColumn(cards: Card[], id: string, column: string, columnTitle: string): Outcome {
  const a = byId(cards, id)!
  if (a.column === column && !a.parentId) return warn('move.same', { a: a.text, column: columnTitle })
  const kids = childrenOf(cards, id)
  const next = cards.map(c => {
    if (c.id === id) return { ...c, column, parentId: undefined }
    if (c.parentId === id) return { ...c, column }
    return c
  })
  if (a.parentId) return done(next, 'move.leftGroup', { a: a.text, column: columnTitle })
  if (kids.length) return done(next, 'move.withChildren', { a: a.text, n: kids.length, column: columnTitle })
  return done(next, 'move.done', { a: a.text, column: columnTitle })
}

/** What's needed to put a deleted card back exactly as it was. */
export interface Removed { card: Card; index: number; children: string[]; links: string[] }

/** Delete a card. Its children become standalone and links to it are removed. */
export function removeCard(cards: Card[], id: string): { outcome: Outcome; removed: Removed } {
  const index = cards.findIndex(c => c.id === id)
  const card = cards[index]
  const children = childrenOf(cards, id).map(c => c.id)
  const removed = { card, index, children, links: linksOf(cards, card) }
  const next = cards
    .filter(c => c.id !== id)
    .map(c => (c.parentId === id || c.links?.includes(id) ? { ...c, parentId: c.parentId === id ? undefined : c.parentId, links: without(c.links, id) } : c))
  return {
    removed,
    outcome: children.length ? done(next, 'card.deletedParent', { n: children.length }) : done(next, 'card.deleted'),
  }
}

/** Undo a delete: put the card back, regroup its children that are still on their own, restore links. */
export function restoreCard(cards: Card[], r: Removed): Card[] {
  if (cards.some(c => c.id === r.card.id)) return cards
  const links = r.links.filter(id => cards.some(c => c.id === id))
  const next = cards.map(c => {
    let x = c
    if (r.children.includes(c.id) && !c.parentId && !childrenOf(cards, c.id).length) x = { ...x, parentId: r.card.id, column: r.card.column }
    if (links.includes(c.id)) x = { ...x, links: withId(x.links, r.card.id) }
    return x
  })
  const card = { ...r.card, parentId: r.card.parentId && cards.some(c => c.id === r.card.parentId && !c.parentId) ? r.card.parentId : undefined, links: links.length ? links : undefined }
  next.splice(Math.min(r.index, next.length), 0, card)
  return next
}
