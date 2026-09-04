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

/**
 * Layout id for a slide's zone grid.
 * '1' = single full-bleed zone (the legacy/default shape).
 * '2' = two zones side by side.
 * '3' = one large zone + two stacked small zones.
 * '4' = a 2x2 grid of four equal zones.
 */
export type LayoutId = '1' | '2' | '3' | '4'

/** How many zones are visible/active for each layout. */
export const LAYOUT_ZONE_COUNT: Record<LayoutId, number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
}

/** A single zone's content: either media or an embedded web page, like a slide's own fields. */
export interface SlideZone {
  media: SlideMedia | null
  embedUrl: string | null
}

export function createEmptyZone(): SlideZone {
  return { media: null, embedUrl: null }
}

/**
 * Coerces a possibly-stale zone entry (from an earlier, differently-shaped
 * `zones` array persisted before this shape existed) into the current
 * `SlideZone` shape, so old saved data never silently disappears.
 */
export function normalizeZone(raw: unknown): SlideZone {
  if (!raw || typeof raw !== 'object') return createEmptyZone()
  if ('media' in raw || 'embedUrl' in raw) {
    const z = raw as Partial<SlideZone>
    return { media: z.media ?? null, embedUrl: z.embedUrl ?? null }
  }
  // Legacy shape: the array held a SlideMedia object directly.
  if ('kind' in raw) {
    return { media: raw as SlideMedia, embedUrl: null }
  }
  return createEmptyZone()
}

export interface Slide {
  id: string
  notes: string
  media: SlideMedia | null
  embedUrl: string | null
  /**
   * Layout id for multi-zone slides. Absent/'1' means the legacy single-zone
   * shape driven by `media`/`embedUrl` above — old decks always render this way.
   */
  layout?: LayoutId
  /**
   * Fixed 4-slot zone array, only meaningful when `layout` is set to a
   * multi-zone layout. Slots beyond the active layout's zone count are kept
   * (not deleted) so switching to a smaller layout and back restores content;
   * only clearing the slide wipes them. Absent for legacy single-zone slides.
   */
  zones?: SlideZone[]
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
