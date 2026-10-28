import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAnchored, useClickAway } from './popover'
import { btnClass, type Variant } from './Button'
import { Icon } from './Icon'

/*
 * A styled dropdown that behaves like a native <select> (listbox pattern):
 * - closed: Enter, Space or the arrow keys open it
 * - open: arrows, Home/End and typing a letter move the highlight;
 *   Enter or Space choose; Esc or Tab close.
 * Focus stays on the list while it's open; the highlighted option is
 * announced with aria-activedescendant.
 */

export interface Option { value: string; label: string; hint?: string }

interface Props {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  variant?: Variant
  size?: 'md' | 'sm'
  showLabel?: boolean
}

export function Select({ label, value, options, onChange, variant = 'secondary', size = 'md', showLabel = true }: Props) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const pos = useAnchored(triggerEl, list, open, 'bottom', 'start')
  // focus the list once it is placed (it's hidden until then, and hidden elements can't take focus)
  const placed = open && !!pos
  useLayoutEffect(() => { if (placed) list.current?.focus({ preventScroll: true }) }, [placed])
  const current = options.find(o => o.value === value) ?? options[0]

  const openAt = (i: number) => {
    setActive(Math.max(0, i))
    setOpen(true)
  }
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const choose = (i: number) => { onChange(options[i].value); close() }
  useClickAway([list, trigger], open, () => close(false))

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openAt(options.indexOf(current))
    }
  }
  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1
    const move = (i: number) => { e.preventDefault(); setActive(Math.max(0, Math.min(last, i))) }
    if (e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(last)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase()
      const i = options.findIndex((o, j) => j > active && o.label.replace(/^@/, '').toLowerCase().startsWith(k))
      const first = options.findIndex(o => o.label.replace(/^@/, '').toLowerCase().startsWith(k))
      if (i >= 0 || first >= 0) move(i >= 0 ? i : first)
    }
  }

  return (
    <div className="select">
      {showLabel && <span className="select-label text-secondary" id={`${id}-label`}>{label}</span>}
      <button
        ref={node => { trigger.current = node; setTriggerEl(node) }}
        type="button"
        className={btnClass(variant, { size, extra: 'select-trigger' })}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={showLabel ? `${id}-label ${id}-value` : undefined}
        aria-label={showLabel ? undefined : `${label}: ${current?.label}`}
        onClick={() => (open ? close() : openAt(options.indexOf(current)))}
        onKeyDown={onTriggerKey}
      >
        <span id={`${id}-value`}>{current?.label}</span>
        <Icon name="chevronDown" size={14} className="chevron" />
      </button>
      {open && createPortal(
        <ul
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-opt-${active}`}
          className={`popover listbox ${pos ? 'is-placed' : ''}`}
          style={pos ? { top: pos.top, left: pos.left, minWidth: triggerEl?.offsetWidth } : undefined}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`option ${i === active ? 'is-active' : ''}`}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span className="option-check">{o.value === value && <Icon name="check" size={14} />}</span>
              <span>{o.label}{o.hint && <span className="text-tertiary"> {o.hint}</span>}</span>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}
