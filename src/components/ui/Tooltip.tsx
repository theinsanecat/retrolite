import { cloneElement, useEffect, useId, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { useAnchored, type Side } from './popover'

/*
 * A small styled tooltip, shown on mouse hover (after a short pause) or on
 * keyboard focus. Not on touch, where hover doesn't exist: touch users get
 * the same words from the button's label. Esc hides it.
 */

interface Props {
  text: string
  side?: Side
  children: ReactElement<{ 'aria-describedby'?: string }>
}

const DELAY = 350

export function Tooltip({ text, side = 'top', children }: Props) {
  const id = useId()
  const wrap = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(undefined)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const pos = useAnchored(anchor, bubble, open, side, 'center')

  const show = (now = false) => {
    setAnchor(wrap.current?.firstElementChild as HTMLElement | null)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), now ? 0 : DELAY)
  }
  const hide = () => { clearTimeout(timer.current); setOpen(false) }

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <span
      ref={wrap}
      className="tip-anchor"
      onPointerEnter={e => e.pointerType === 'mouse' && show()}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={e => (e.target as HTMLElement).matches(':focus-visible') && show(true)}
      onBlur={hide}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open && createPortal(
        <div
          ref={bubble}
          id={id}
          role="tooltip"
          className={`tooltip tooltip--${pos?.side ?? side} ${pos ? 'is-placed' : ''}`}
          style={pos ? { top: pos.top, left: pos.left, '--arrow-x': `${pos.arrow}px` } as CSSProperties : undefined}
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  )
}
