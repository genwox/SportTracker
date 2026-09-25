import type { DraftStore, LiveExerciseDraft } from '../../../domain/liveDraft'

export const DRAFT_DB_NAME = 'sporttracker-live-v2'
const STORE_NAME = 'drafts'

function scopedPrefix(owner: string): string {
  if (!owner) throw new Error('Connexion requise pour les brouillons live.')
  return `${owner.length}:${owner}:`
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

function open(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// A connection is opened, used and closed for every call instead of being kept
// open for the store's lifetime: on WebKit, a long-lived connection can defer
// the on-disk flush of a committed write past an abrupt page/tab teardown
// (e.g. Playwright's `page.close()` right after `put()`), which silently
// loses the draft. Closing the connection once the transaction has completed
// forces that flush to happen before `put()`/`remove()` resolve.
export function createIndexedDbDraftStore(): DraftStore & { migrate(fromOwner: string, toOwner: string): Promise<void> } {
  async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open()
    try {
      const transaction = db.transaction(STORE_NAME, mode)
      const done = transactionDone(transaction)
      const result = await requestResult(action(transaction.objectStore(STORE_NAME)))
      await done
      return result
    } finally {
      db.close()
    }
  }

  return {
    async get(owner, key) {
      return (await transact('readonly', store => store.get(scopedPrefix(owner) + key))) ?? null
    },
    async put(owner, key, draft) {
      await transact('readwrite', store => store.put(draft, scopedPrefix(owner) + key))
    },
    async remove(owner, key) {
      await transact('readwrite', store => store.delete(scopedPrefix(owner) + key))
    },
    async list(owner, prefix) {
      const scoped = scopedPrefix(owner) + prefix
      const db = await open()
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const done = transactionDone(transaction)
        const values = await requestResult(transaction.objectStore(STORE_NAME).getAll(
          IDBKeyRange.bound(scoped, `${scoped}\uffff`),
        )) as LiveExerciseDraft[]
        await done
        return values
      } finally {
        db.close()
      }
    },
    async migrate(fromOwner, toOwner) {
      const from = scopedPrefix(fromOwner)
      const to = scopedPrefix(toOwner)
      if (from === to) return
      const db = await open()
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const done = transactionDone(transaction)
        const store = transaction.objectStore(STORE_NAME)
        const request = store.openCursor(IDBKeyRange.bound(from, `${from}\uffff`))
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            const cursor = request.result
            if (!cursor) { resolve(); return }
            store.put(cursor.value, to + String(cursor.key).slice(from.length))
            cursor.delete()
            cursor.continue()
          }
          request.onerror = () => reject(request.error)
        })
        await done
      } finally {
        db.close()
      }
    },
  }
}
