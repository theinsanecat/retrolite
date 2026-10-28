/*
 * Light, dark, or follow the device ("system"). The choice is kept on this
 * device only and applied as data-theme on <html>; the CSS tokens do the rest.
 */

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'retrolite-theme'

export function savedTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  // switch instantly, without every button fading between themes
  root.classList.add('theme-switching')
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch { /* private mode: the choice just isn't remembered */ }
}
