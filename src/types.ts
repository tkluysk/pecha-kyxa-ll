export type MediaKind = 'image' | 'gif' | 'video'

export interface SlideMedia {
  kind: MediaKind
  /**
   * Key into the IndexedDB blob store. Set for uploaded/dropped files.
   * Exactly one of `blobId` / `url` is set.
   */
  blobId?: string
  /** Remote media URL. Set when the media is referenced directly from the web. */
  url?: string
  mimeType: string
  fileName: string
}

export interface Slide {
  id: string
  notes: string
  media: SlideMedia | null
  embedUrl: string | null
}

export interface Deck {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  slides: Slide[]
}

export const SECONDS_PER_SLIDE = 20
export const SLIDE_COUNT = 20

export function createEmptySlide(): Slide {
  return {
    id: crypto.randomUUID(),
    notes: '',
    media: null,
    embedUrl: null,
  }
}

export function createEmptyDeck(name: string): Deck {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    slides: Array.from({ length: SLIDE_COUNT }, createEmptySlide),
  }
}
