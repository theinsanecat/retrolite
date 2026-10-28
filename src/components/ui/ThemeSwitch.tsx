import { useRef, useState, type KeyboardEvent } from 'react'
import { applyTheme, savedTheme, type Theme } from '../../lib/theme'
import { btnClass } from './Button'
import { Tooltip } from './Tooltip'
import { Icon, type IconName } from './Icon'

/*
 * Three-way switch: Auto (follow the device), Light, Dark.
 * A radio group, so arrow keys move between the options.
 */

const OPTIONS: { value: Theme; label: string; icon: IconName; tip: string }[] = [
  { value: 'system', label: 'Auto', icon: 'auto', tip: 'Match your device' },
  { value: 'light', label: 'Light', icon: 'sun', tip: 'Always light' },
  { value: 'dark', label: 'Dark', icon: 'moon', tip: 'Always dark' },
]

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(savedTheme)
  const group = useRef<HTMLDivElement>(null)

  const choose = (t: Theme) => { setTheme(t); applyTheme(t) }
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = (OPTIONS.findIndex(o => o.value === theme) + step + OPTIONS.length) % OPTIONS.length
    choose(OPTIONS[i].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[i]?.focus()
  }

  return (
    <div ref={group} className="theme-switch" role="radiogroup" aria-label="Theme" onKeyDown={onKey}>
      {OPTIONS.map(o => (
        <Tooltip key={o.value} text={o.tip}>
          <button
            type="button"
            role="radio"
            aria-checked={theme === o.value}
            tabIndex={theme === o.value ? 0 : -1}
            className={btnClass('tertiary', { size: 'sm' })}
            onClick={() => choose(o.value)}
          >
            <Icon name={o.icon} size={14} />{o.label}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
