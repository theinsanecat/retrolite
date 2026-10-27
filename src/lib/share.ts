import type { Board, Card, ActionItem } from '../types'
import { uid, COLUMNS } from '../types'

const COLUMN_IDS: string[] = COLUMNS.map(c => c.id)

/*
 * Share a board as a link. The board is compressed into the URL fragment
 * (everything after #), which browsers never send to a server. So sharing
 * needs no backend: the link itself carries the board.
 *
 * Uses the browser's built-in CompressionStream, so there is no dependency.
 */

interface SharedBoard {
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

export async function shareUrl(board: Board): Promise<string> {
  const file: SharedBoard = {
    app: 'retrolite',
    v: 1,
    title: board.title,
    // ids belong to this device; the recipient gets fresh ones
    cards: board.cards.map(({ id: _id, ...c }) => c),
    actions: board.actions.map(({ id: _id, ...a }) => a),
  }
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(file)), new CompressionStream('deflate-raw'))
  return `${location.origin}${location.pathname}#share=${toB64url(packed)}`
}

/** The board in a #share= fragment, undefined when there is none. Throws if it is damaged. */
export async function readShare(hash = location.hash): Promise<Board | undefined> {
  const m = hash.match(/[#&]share=([A-Za-z0-9_-]+)/)
  if (!m) return undefined
  let file: SharedBoard
  try {
    const bytes = await pipe(fromB64url(m[1]), new DecompressionStream('deflate-raw'))
    file = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new Error('This share link is incomplete or damaged. Ask for it to be sent again.')
  }
  if (file?.app !== 'retrolite' || !Array.isArray(file.cards)) throw new Error('This link does not hold a retro board.')
  const now = Date.now()
  return {
    id: uid(),
    title: String(file.title || 'Shared retro'),
    createdAt: now,
    updatedAt: now,
    cards: file.cards
      .filter(c => COLUMN_IDS.includes(c.column))
      .map(c => ({ id: uid(), column: c.column, text: String(c.text), votes: Number(c.votes) || 0 })),
    actions: (file.actions ?? []).map(a => ({
      id: uid(), text: String(a.text), owner: String(a.owner ?? ''), due: String(a.due ?? ''), done: !!a.done,
    })),
  }
}
