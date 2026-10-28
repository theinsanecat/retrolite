import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/*
 * Positions a floating element (menu, listbox, tooltip) next to its anchor,
 * flipping to the other side and sliding along when it would leave the
 * screen. Uses position: fixed, so it never gets clipped by a scrolling column.
 */

export type Side = 'top' | 'bottom'
/** `arrow` is where the anchor's centre falls along the popup, for a pointer that stays on the anchor. */
export interface Placement { top: number; left: number; side: Side; arrow: number }

const GAP = 6, EDGE = 8

export function place(anchor: DOMRect, pop: { width: number; height: number }, prefer: Side, align: 'start' | 'center' | 'end'): Placement {
  const vw = window.innerWidth, vh = window.innerHeight
  const roomBelow = vh - anchor.bottom, roomAbove = anchor.top
  let side: Side = prefer
  if (prefer === 'bottom' && roomBelow < pop.height + GAP + EDGE && roomAbove > roomBelow) side = 'top'
  if (prefer === 'top' && roomAbove < pop.height + GAP + EDGE && roomBelow > roomAbove) side = 'bottom'
  const top = side === 'bottom' ? anchor.bottom + GAP : anchor.top - GAP - pop.height
  let left = align === 'start' ? anchor.left : align === 'end' ? anchor.right - pop.width : anchor.left + anchor.width / 2 - pop.width / 2
  left = Math.max(EDGE, Math.min(left, vw - pop.width - EDGE))
  const arrow = Math.max(12, Math.min(anchor.left + anchor.width / 2 - left, pop.width - 12))
  return { top: Math.max(EDGE, Math.min(top, vh - pop.height - EDGE)), left, side, arrow }
}

/** Keep `pop` placed next to `anchor` while open, following scroll and resize. */
export function useAnchored(
  anchor: HTMLElement | null | undefined,
  pop: RefObject<HTMLElement | null>,
  open: boolean,
  prefer: Side = 'bottom',
  align: 'start' | 'center' | 'end' = 'start',
) {
  const [pos, setPos] = useState<Placement>()
  useLayoutEffect(() => {
    if (!open || !anchor || !pop.current) return setPos(undefined)
    const update = () => {
      if (!pop.current) return
      setPos(place(anchor.getBoundingClientRect(), pop.current.getBoundingClientRect(), prefer, align))
    }
    update()
    addEventListener('scroll', update, true)
    addEventListener('resize', update)
    return () => { removeEventListener('scroll', update, true); removeEventListener('resize', update) }
  }, [open, anchor, pop, prefer, align])
  return pos
}

type Target = RefObject<HTMLElement | null> | HTMLElement | null | undefined
const el = (t: Target) => (t && 'current' in t ? t.current : t)

/** Call `onAway` on a pointer down outside every given element. */
export function useClickAway(targets: Target[], open: boolean, onAway: () => void) {
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!targets.some(t => el(t)?.contains(e.target as Node))) onAway()
    }
    addEventListener('pointerdown', down, true)
    return () => removeEventListener('pointerdown', down, true)
  })
}
