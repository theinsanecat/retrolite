import type { Board, Card, Column } from '../types'
import { uid, columnsOf, TEMPLATES } from '../types'

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

/** Cards point at each other by position in the list, so this device's ids stay behind. */
interface FileCard {
  column: string
  text: string
  votes: number
  parent?: number
  links?: number[]
}

interface BoardFile {
  app: 'retrolite'
  v: 2
  title: string
  columns: Column[]
  cards: FileCard[]
  actions: { text: string; owner: string; due: string; done: boolean }[]
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

/** What travels in a link or a downloaded file. */
export function toFile(board: Board): BoardFile {
  const index = new Map(board.cards.map((c, i) => [c.id, i]))
  return {
    app: 'retrolite',
    v: 2,
    title: board.title,
    columns: columnsOf(board),
    cards: board.cards.map(c => {
      const f: FileCard = { column: c.column, text: c.text, votes: c.votes }
      if (c.parentId && index.has(c.parentId)) f.parent = index.get(c.parentId)
      const links = (c.links ?? []).filter(id => index.has(id)).map(id => index.get(id)!)
      if (links.length) f.links = links
      return f
    }),
    actions: board.actions.map(({ text, owner, due, done }) => ({ text, owner, due, done })),
  }
}

const str = (v: unknown, max = 2000) => String(v ?? '').slice(0, max)

/** A fresh board from a link or file, with new ids. Reads both file versions. Throws if it isn't a retro board. */
export function fromFile(file: unknown): Board {
  const f = file as Partial<BoardFile> | null
  if (f?.app !== 'retrolite' || !Array.isArray(f.cards)) throw new Error('This does not hold a Retrolite board.')

  const columns: Column[] = Array.isArray(f.columns) && f.columns.length >= 1 && f.columns.length <= 6
    ? f.columns.map(c => ({ id: str(c?.id, 40), title: str(c?.title, 60), hint: str(c?.hint, 120) }))
    : TEMPLATES[0].columns
  const colIds = new Set(columns.map(c => c.id))

  const raw = f.cards.slice(0, 500)
  const ids = raw.map(() => uid())
  const ok = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < raw.length
  const cards: Card[] = []
  raw.forEach((c, i) => {
    if (!colIds.has(c?.column)) return
    const card: Card = { id: ids[i], column: c.column, text: str(c.text), votes: Math.max(0, Number(c.votes) || 0) }
    if (ok(c.parent) && c.parent !== i) card.parentId = ids[c.parent]
    const links = Array.isArray(c.links) ? c.links.filter(ok).filter(j => j !== i).map(j => ids[j]) : []
    if (links.length) card.links = links
    cards.push(card)
  })
  // drop references to cards that were filtered out, and keep groups one level deep
  const present = new Set(cards.map(c => c.id))
  const byId = new Map(cards.map(c => [c.id, c]))
  for (const c of cards) {
    if (c.parentId && (!present.has(c.parentId) || byId.get(c.parentId)!.parentId)) c.parentId = undefined
    if (c.links) c.links = c.links.filter(id => present.has(id))
    if (c.links && !c.links.length) c.links = undefined
  }

  const now = Date.now()
  return {
    id: uid(),
    title: str(f.title, 120) || 'Shared retro',
    createdAt: now,
    updatedAt: now,
    columns,
    cards,
    actions: (Array.isArray(f.actions) ? f.actions : []).slice(0, 200).map(a => ({
      id: uid(), text: str(a?.text), owner: str(a?.owner, 80), due: str(a?.due, 10), done: !!a?.done,
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
