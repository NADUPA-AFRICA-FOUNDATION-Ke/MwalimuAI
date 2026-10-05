import type { Program } from '@/lib/learning-paths-data'

/**
 * Lessons saved on the device for reading without a connection. Stored in IndexedDB (not localStorage) because a
 * program is a few hundred kilobytes of text. Only what a learner needs to read is kept.
 */
export interface OfflineLesson { id: string; title: string; duration: string; reading: string; videoPoints: string[]; reflectionPrompt: string }
export interface OfflineProgram {
  id: string
  title: string
  description: string
  savedAt: number
  bytes: number
  modules: { id: string; title: string; lessons: OfflineLesson[] }[]
}

const DB = 'mwalimu-offline'
const STORE = 'programs'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Offline storage is not available in this browser'))
    const req = indexedDB.open(DB, 1)
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
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export function toOffline(program: Program): OfflineProgram {
  const modules = program.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, duration: l.duration, reading: l.reading, videoPoints: l.videoPoints ?? [], reflectionPrompt: l.reflectionPrompt })),
  }))
  const bytes = new Blob([JSON.stringify(modules)]).size
  return { id: program.id, title: program.title, description: program.description, savedAt: Date.now(), bytes, modules }
}

export const saveOffline = (program: Program) => run('readwrite', (s) => s.put(toOffline(program)))
export const removeOffline = (id: string) => run('readwrite', (s) => s.delete(id))
export const getOffline = (id: string) => run<OfflineProgram | undefined>('readonly', (s) => s.get(id))
export const listOffline = () => run<OfflineProgram[]>('readonly', (s) => s.getAll())

/**
 * The offline reader is an ordinary page. Opening it once in a hidden frame while online makes the service worker
 * keep its scripts too, so it still starts when the connection is gone.
 */
export function warmOfflineReader() {
  if (typeof document === 'undefined') return
  const frame = document.createElement('iframe')
  frame.src = '/offline/lessons?warm=1'
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)
  setTimeout(() => frame.remove(), 10_000)
}
