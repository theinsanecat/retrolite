import { useState } from 'react'
import { applyTheme, savedTheme, type Theme } from '../../lib/theme'
import { Segmented, type Segment } from './Segmented'

/* Three-way theme switch: Auto (follow the device), Light, Dark. */

const OPTIONS: Segment<Theme>[] = [
  { value: 'system', label: 'Auto', icon: 'auto', tip: 'Match your device' },
  { value: 'light', label: 'Light', icon: 'sun', tip: 'Always light' },
  { value: 'dark', label: 'Dark', icon: 'moon', tip: 'Always dark' },
]

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(savedTheme)
  return (
    <Segmented
      label="Theme"
      className="theme-switch"
      value={theme}
      options={OPTIONS}
      onChange={t => { setTheme(t); applyTheme(t) }}
    />
  )
}
