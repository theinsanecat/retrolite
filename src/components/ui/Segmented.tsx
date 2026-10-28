import { useRef, type KeyboardEvent } from 'react'
import { btnClass } from './Button'
import { Icon, type IconName } from './Icon'
import { Tooltip } from './Tooltip'

/*
 * A small segmented control: one choice out of a few, like Bar / Pie or
 * Auto / Light / Dark. It is a radio group, so arrow keys move the choice.
 */

export interface Segment<T extends string> { value: T; label: string; icon?: IconName; tip?: string }

interface Props<T extends string> {
  label: string
  value: T
  options: Segment<T>[]
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({ label, value, options, onChange, className = '' }: Props<T>) {
  const group = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = (options.findIndex(o => o.value === value) + step + options.length) % options.length
    onChange(options[i].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[i]?.focus()
  }

  return (
    <div ref={group} className={`segmented ${className}`} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map(o => {
        const button = (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            className={btnClass('tertiary', { size: 'sm' })}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} size={14} />}{o.label}
          </button>
        )
        return o.tip ? <Tooltip key={o.value} text={o.tip}>{button}</Tooltip> : button
      })}
    </div>
  )
}
