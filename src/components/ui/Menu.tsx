import { useEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAnchored, useClickAway } from './popover'

/*
 * A popup menu anchored to a button (the ⋯ on a card, or a dropped card).
 * Keyboard: arrows and Home/End move, Enter/Space choose, Esc closes and
 * returns focus to the button, Tab closes. Items that aren't allowed right
 * now stay focusable and say why when chosen, instead of silently doing nothing.
 */

export type MenuEntry =
  | { kind?: 'item'; id: string; label: string; hint?: string; icon?: string; danger?: boolean; blocked?: boolean; onSelect: () => void }
  | { kind: 'heading'; label: string }
  | { kind: 'separator' }

interface Props {
  anchor: HTMLElement
  label: string
  entries: MenuEntry[]
  onClose: (refocus: boolean) => void
  align?: 'start' | 'end'
}

export function Menu({ anchor, label, entries, onClose, align = 'end' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useAnchored(anchor, ref, true, 'bottom', align)
  useClickAway([ref, anchor], true, () => onClose(false))

  const items = () => [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])]
  const placed = !!pos
  useEffect(() => { if (placed) items()[0]?.focus({ preventScroll: true }) }, [placed])

  const onKey = (e: KeyboardEvent) => {
    const list = items(), i = list.indexOf(document.activeElement as HTMLButtonElement)
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(list.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); onClose(true) }
    else if (e.key === 'Tab') onClose(false)
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={`popover menu ${pos ? 'is-placed' : ''}`}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      onKeyDown={onKey}
    >
      {entries.map((e, i) => {
        if (e.kind === 'separator') return <div key={i} role="separator" className="menu-sep" />
        if (e.kind === 'heading') return <div key={i} role="presentation" className="menu-heading text-tertiary">{e.label}</div>
        return (
          <button
            key={e.id}
            role="menuitem"
            tabIndex={-1}
            aria-disabled={e.blocked || undefined}
            className={`menu-item ${e.danger ? 'is-danger' : ''} ${e.blocked ? 'is-blocked' : ''}`}
            onClick={() => { onClose(false); e.onSelect() }}
          >
            <span className="menu-icon" aria-hidden>{e.icon}</span>
            <span className="menu-text">
              <span className="menu-label">{e.label}</span>
              {e.hint && <span className="menu-hint text-tertiary">{e.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
