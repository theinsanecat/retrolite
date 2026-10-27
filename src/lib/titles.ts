import type { Board } from '../types'

const norm = (s: string) => s.trim().toLowerCase()

/** True when another board already uses this name (ignoring case and spaces). */
export const isTaken = (title: string, boards: Board[], exceptId?: string) =>
  boards.some(b => b.id !== exceptId && norm(b.title) === norm(title))

/** "Sprint retro" -> "Sprint retro (2)" when the name is already used. */
export function uniqueTitle(title: string, boards: Board[], exceptId?: string): string {
  const wanted = title.trim() || 'Untitled retro'
  if (!isTaken(wanted, boards, exceptId)) return wanted
  const base = wanted.replace(/\s\(\d+\)$/, '')
  let n = 2
  while (isTaken(`${base} (${n})`, boards, exceptId)) n++
  return `${base} (${n})`
}
