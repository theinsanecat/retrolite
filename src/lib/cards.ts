import type { Card } from '../types'

/*
 * How cards relate to each other. Kept deliberately simple:
 * - standalone: no parent, no links
 * - grouped: a child sits under one parent card in the same column (one level
 *   deep), and the parent shows the combined votes
 * - linked: related cards, in any column, point at each other as siblings
 */

const without = (ids: string[] | undefined, id: string) => {
  const next = (ids ?? []).filter(x => x !== id)
  return next.length ? next : undefined
}

export const childrenOf = (cards: Card[], id: string) => cards.filter(c => c.parentId === id)

export const totalVotes = (cards: Card[], card: Card) =>
  card.votes + childrenOf(cards, card.id).reduce((n, c) => n + c.votes, 0)

/** Put `childId` (and anything grouped under it) under `targetId`. */
export function groupUnder(cards: Card[], childId: string, targetId: string): Card[] {
  const target = cards.find(c => c.id === targetId)
  if (!target || childId === targetId) return cards
  // one level deep: grouping under a child means grouping under its parent
  const parentId = target.parentId ?? target.id
  if (parentId === childId) return cards
  const parent = cards.find(c => c.id === parentId)!
  return cards.map(c => {
    if (c.id === childId || c.parentId === childId) {
      return { ...c, parentId, column: parent.column, links: without(c.links, parentId) }
    }
    return c
  })
}

/** Link two cards as related siblings. */
export function linkCards(cards: Card[], a: string, b: string): Card[] {
  if (a === b) return cards
  return cards.map(c => {
    if (c.id === a && !c.links?.includes(b)) return { ...c, links: [...(c.links ?? []), b] }
    if (c.id === b && !c.links?.includes(a)) return { ...c, links: [...(c.links ?? []), a] }
    return c
  })
}

/** Take a card out of its group and remove its links. Its own children stay with it. */
export function makeStandalone(cards: Card[], id: string): Card[] {
  return cards.map(c => {
    if (c.id === id) return { ...c, parentId: undefined, links: undefined }
    if (c.links?.includes(id)) return { ...c, links: without(c.links, id) }
    return c
  })
}

/** Move a card to another column. Its children move with it; a child leaves its group. */
export function moveToColumn(cards: Card[], id: string, column: string): Card[] {
  return cards.map(c => {
    if (c.id === id) return { ...c, column, parentId: undefined }
    if (c.parentId === id) return { ...c, column }
    return c
  })
}

/** Delete a card. Its children become standalone and links to it are removed. */
export function removeCard(cards: Card[], id: string): Card[] {
  return cards
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      parentId: c.parentId === id ? undefined : c.parentId,
      links: c.links?.includes(id) ? without(c.links, id) : c.links,
    }))
}
