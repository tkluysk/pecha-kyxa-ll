import { zip, unzip, type AsyncZippable, type Unzipped } from 'fflate'
import type { Deck } from '../types'
import { getBlob, putBlob } from './db'

const FILE_EXTENSION = '.pechakyxa.zip'
const MANIFEST_NAME = 'deck.json'
const MEDIA_DIR = 'media/'

interface Manifest {
  format: 'pecha-kyxa-ii'
  version: 2
  deck: Deck
}

function collectBlobIds(deck: Deck): string[] {
  const ids: string[] = []
  for (const slide of deck.slides) {
    if (slide.media) ids.push(slide.media.blobId)
  }
  return ids
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

export async function exportDeck(deck: Deck): Promise<void> {
  const blobIds = collectBlobIds(deck)
  const files: AsyncZippable = {}

  const manifest: Manifest = { format: 'pecha-kyxa-ii', version: 2, deck }
  files[MANIFEST_NAME] = new TextEncoder().encode(JSON.stringify(manifest))

  for (const blobId of blobIds) {
    const blob = await getBlob(blobId)
    if (!blob) continue
    files[`${MEDIA_DIR}${blobId}`] = [await blobToUint8Array(blob), { level: 0 }]
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const file = new Blob([new Uint8Array(zipped)], { type: 'application/zip' })
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
  const buf = new Uint8Array(await file.arrayBuffer())

  const entries = await new Promise<Unzipped>((resolve, reject) => {
    unzip(buf, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const manifestBytes = entries[MANIFEST_NAME]
  if (!manifestBytes) {
    throw new Error('This file is not a valid Pecha Kyxa II deck export.')
  }

  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as Manifest
  if (manifest.format !== 'pecha-kyxa-ii' || !manifest.deck) {
    throw new Error('This file is not a valid Pecha Kyxa II deck export.')
  }

  for (const [path, bytes] of Object.entries(entries)) {
    if (!path.startsWith(MEDIA_DIR)) continue
    const blobId = path.slice(MEDIA_DIR.length)
    const mimeType = findMimeType(manifest.deck, blobId)
    const copy = new Uint8Array(bytes)
    await putBlob(blobId, new Blob([copy], { type: mimeType }))
  }

  return manifest.deck
}

function findMimeType(deck: Deck, blobId: string): string {
  for (const slide of deck.slides) {
    if (slide.media?.blobId === blobId) return slide.media.mimeType
  }
  return 'application/octet-stream'
}
