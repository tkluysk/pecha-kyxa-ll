const DB_NAME = 'pecha-kyxa-ii'
const DB_VERSION = 1
const DECKS_STORE = 'decks'
const BLOBS_STORE = 'blobs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DECKS_STORE)) {
        db.createObjectStore(DECKS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  await withStore(BLOBS_STORE, 'readwrite', (store) => store.put(blob, id))
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  return withStore(BLOBS_STORE, 'readonly', (store) => store.get(id))
}

export async function deleteBlob(id: string): Promise<void> {
  await withStore(BLOBS_STORE, 'readwrite', (store) => store.delete(id))
}

export async function putDeck(deck: unknown): Promise<void> {
  await withStore(DECKS_STORE, 'readwrite', (store) => store.put(deck))
}

export async function getAllDecks<T>(): Promise<T[]> {
  return withStore(DECKS_STORE, 'readonly', (store) => store.getAll())
}

export async function deleteDeck(id: string): Promise<void> {
  await withStore(DECKS_STORE, 'readwrite', (store) => store.delete(id))
}
