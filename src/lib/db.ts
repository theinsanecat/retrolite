import type { Board } from '../types'

/*
 * Every board lives in IndexedDB on this device. There is no server and no
 * account: closing the tab, going offline or reloading never loses work.
 */

const DB_NAME = 'retrolite'
const STORE = 'boards'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req.result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export const listBoards = async () =>
  (await run<Board[]>('readonly', s => s.getAll())).sort((a, b) => b.updatedAt - a.updatedAt)

export const saveBoard = (board: Board) => run('readwrite', s => s.put(board)).then(() => undefined)

export const deleteBoard = (id: string) => run('readwrite', s => s.delete(id)).then(() => undefined)

/** Ask the browser not to evict our data when the disk gets full. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
