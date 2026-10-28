import messages from '../messages.json'

/*
 * Every message the app shows in a toast lives in messages.json, so the
 * wording is in one place and easy to change or translate. A message has a
 * type (success, info, warning, error) and a text with {placeholders}.
 * Passing `n` also fills {s} with the plural ending.
 */

export type ToastType = 'success' | 'info' | 'warning' | 'error'
export type MsgKey = keyof typeof messages
export type Vars = Record<string, string | number>

export interface Message { type: ToastType; text: string }

/** Long card texts are cut at a word boundary so toasts stay readable. */
const short = (v: string | number) =>
  typeof v === 'string' && v.length > 36 ? v.slice(0, 36).replace(/\s+\S*$/, '') + '…' : v

export function msg(key: MsgKey, vars: Vars = {}): Message {
  const m = messages[key] as Message
  const all: Vars = { ...vars }
  if (typeof vars.n === 'number') all.s = vars.n === 1 ? '' : 's'
  const text = m.text.replace(/\{(\w+)\}/g, (whole, name) =>
    name in all ? String(short(name === 'n' ? Number(all[name]).toLocaleString() : all[name])) : whole)
  return { type: m.type, text }
}
