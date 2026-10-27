import type { Board, Card, ActionItem } from '../types'
import { uid, COLUMNS } from '../types'

const COLUMN_IDS: string[] = COLUMNS.map(c => c.id)

/*
 * Share a board as a link. The board is compressed into the URL fragment
 * (everything after #), which browsers never send to a server. So sharing
 * needs no backend: the link itself carries the board.
 *
 * Things to keep in mind, and how the app handles them:
 * - Some chat apps and link shorteners cut long links, so the app warns past
 *   LONG_LINK characters and offers a board file instead.
 * - Scripts and browser extensions on the page can read the fragment, so the
 *   app removes it from the address bar as soon as it has read it.
 * - The link can stay in browser history, so the app reminds people that
 *   anyone with the link can read the board.
 *
 * Uses the browser's built-in CompressionStream, so there is no dependency.
 */

export const LONG_LINK = 2000

interface BoardFile {
  app: 'retrolite'
  v: 1
  title: string
  cards: Omit<Card, 'id'>[]
  actions: Omit<ActionItem, 'id'>[]
}

const toB64url = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** What travels in a link or a downloaded file. Ids belong to this device and are left behind. */
export function toFile(board: Board): BoardFile {
  return {
    app: 'retrolite',
    v: 1,
    title: board.title,
    cards: board.cards.map(({ id: _id, ...c }) => c),
    actions: board.actions.map(({ id: _id, ...a }) => a),
  }
}

/** A fresh board from a link or file, with new ids. Throws if it isn't a retro board. */
export function fromFile(file: unknown): Board {
  const f = file as Partial<BoardFile> | null
  if (f?.app !== 'retrolite' || !Array.isArray(f.cards)) throw new Error('This does not hold a Retrolite board.')
  const now = Date.now()
  return {
    id: uid(),
    title: String(f.title || 'Shared retro'),
    createdAt: now,
    updatedAt: now,
    cards: f.cards
      .filter(c => COLUMN_IDS.includes(c?.column))
      .map(c => ({ id: uid(), column: c.column, text: String(c.text ?? ''), votes: Number(c.votes) || 0 })),
    actions: (Array.isArray(f.actions) ? f.actions : []).map(a => ({
      id: uid(), text: String(a?.text ?? ''), owner: String(a?.owner ?? ''), due: String(a?.due ?? ''), done: !!a?.done,
    })),
  }
}

export async function shareUrl(board: Board): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(toFile(board))), new CompressionStream('deflate-raw'))
  return `${location.origin}${location.pathname}#share=${toB64url(packed)}`
}

/** The board in a #share= fragment, undefined when there is none. Throws if it is damaged. */
export async function readShare(hash: string): Promise<Board | undefined> {
  const m = hash.match(/[#&]share=([A-Za-z0-9_-]+)/)
  if (!m) return undefined
  let file: unknown
  try {
    const bytes = await pipe(fromB64url(m[1]), new DecompressionStream('deflate-raw'))
    file = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error('This share link is incomplete or damaged. Ask for it to be sent again, or ask for the board file.')
  }
  return fromFile(file)
}

/** Save the board as a .json file: a backup, or a way to share a board too big for a link. */
export function downloadFile(board: Board) {
  const blob = new Blob([JSON.stringify(toFile(board), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${board.title.trim().replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'retro'}.retrolite.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function readFile(file: File): Promise<Board> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('That file could not be read. Pick a .retrolite.json file downloaded from Retrolite.')
  }
  return fromFile(data)
}
