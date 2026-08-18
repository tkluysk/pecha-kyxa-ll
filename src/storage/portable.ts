import type { Deck } from '../types'
import { getBlob, putBlob } from './db'

const FILE_EXTENSION = '.pechakyxa.json'

interface PortableBlob {
  blobId: string
  mimeType: string
  /** base64-encoded blob data */
  data: string
}

interface PortableDeck {
  format: 'pecha-kyxa-ii'
  version: 1
  deck: Deck
  blobs: PortableBlob[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip the "data:<mime>;base64," prefix
      const commaIdx = result.indexOf(',')
      resolve(result.slice(commaIdx + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

function collectBlobIds(deck: Deck): { blobId: string; mimeType: string }[] {
  const out: { blobId: string; mimeType: string }[] = []
  for (const slide of deck.slides) {
    if (slide.media) {
      out.push({ blobId: slide.media.blobId, mimeType: slide.media.mimeType })
    }
  }
  return out
}

export async function exportDeck(deck: Deck): Promise<void> {
  const blobRefs = collectBlobIds(deck)
  const blobs: PortableBlob[] = []

  for (const ref of blobRefs) {
    const blob = await getBlob(ref.blobId)
    if (!blob) continue
    const data = await blobToBase64(blob)
    blobs.push({ blobId: ref.blobId, mimeType: ref.mimeType, data })
  }

  const portable: PortableDeck = {
    format: 'pecha-kyxa-ii',
    version: 1,
    deck,
    blobs,
  }

  const json = JSON.stringify(portable)
  const file = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  const safeName = deck.name.trim().replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-') || 'deck'
  a.href = url
  a.download = `${safeName}${FILE_EXTENSION}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importDeckFile(file: File): Promise<Deck> {
  const text = await file.text()
  const parsed = JSON.parse(text) as PortableDeck

  if (parsed.format !== 'pecha-kyxa-ii' || !parsed.deck) {
    throw new Error('This file is not a valid Pecha Kyxa II deck export.')
  }

  for (const b of parsed.blobs) {
    const blob = base64ToBlob(b.data, b.mimeType)
    await putBlob(b.blobId, blob)
  }

  return parsed.deck
}
