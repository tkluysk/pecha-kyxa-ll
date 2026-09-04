import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { Deck, LayoutId, MediaKind, Slide, SlideMedia, SlideZone } from '../types'
import { createEmptySlide, createEmptyZone, LAYOUT_ZONE_COUNT, normalizeZone } from '../types'
import { putBlob, deleteBlob } from '../storage/db'
import { exportDeck, importDeckFile } from '../storage/portable'
import { useFitBox } from '../useFitBox'
import { SlideContent } from './SlideContent'
import { SlideThumb } from './SlideThumb'
import { MediaFit } from './MediaFit'
import { DeckFormatHelp } from './DeckFormatHelp'

interface EditorProps {
  deck: Deck
  updateDeck: (updater: (prev: Deck) => Deck) => void
  onPlay: () => void
  onImportDeck: (deck: Deck) => void
}

function mediaKindFromMime(mime: string): MediaKind | null {
  if (mime === 'image/gif') return 'gif'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

/** Free any IndexedDB blob backing this media. No-op for URL-referenced media. */
function releaseMedia(media: SlideMedia | null | undefined) {
  if (media?.blobId) deleteBlob(media.blobId)
}

function mediaKindFromUrl(url: string): MediaKind {
  const path = url.split(/[?#]/, 1)[0].toLowerCase()
  if (path.endsWith('.gif')) return 'gif'
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)$/.test(path)) return 'video'
  return 'image'
}

const LAYOUTS: LayoutId[] = ['1', '2', '3', '4']

function LayoutGlyph({ layout }: { layout: LayoutId }) {
  const spanCount = LAYOUT_ZONE_COUNT[layout]
  return (
    <div className={`layout-picker__glyph layout-picker__glyph--${layout}`}>
      {Array.from({ length: spanCount }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}

function LayoutPicker({
  value,
  onChange,
}: {
  value: LayoutId
  onChange: (layout: LayoutId) => void
}) {
  return (
    <div className="layout-picker">
      {LAYOUTS.map((layout) => (
        <button
          key={layout}
          type="button"
          title={`${LAYOUT_ZONE_COUNT[layout]} zone${LAYOUT_ZONE_COUNT[layout] > 1 ? 's' : ''}`}
          className={`layout-picker__option ${value === layout ? 'layout-picker__option--active' : ''}`}
          onClick={() => onChange(layout)}
        >
          <LayoutGlyph layout={layout} />
        </button>
      ))}
    </div>
  )
}

export function Editor({ deck, updateDeck, onPlay, onImportDeck }: EditorProps) {
  const { containerRef: stageRef, size: previewSize } = useFitBox(16 / 10)
  const [selectedId, setSelectedId] = useState<string>(deck.slides[0]?.id ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zoneFileInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const importInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [zoneDragIndex, setZoneDragIndex] = useState<number | null>(null)
  const [showFormatHelp, setShowFormatHelp] = useState(false)
  const dragCounter = useRef(0)
  const zoneDragCounter = useRef(0)

  const selectedIndex = Math.max(
    0,
    deck.slides.findIndex((s) => s.id === selectedId),
  )
  const slide: Slide | undefined = deck.slides[selectedIndex]

  useEffect(() => {
    if (!deck.slides.some((s) => s.id === selectedId) && deck.slides[0]) {
      setSelectedId(deck.slides[0].id)
    }
  }, [deck.slides, selectedId])

  function updateSlide(id: string, patch: Partial<Slide>) {
    updateDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function clearSlide(id: string) {
    const target = deck.slides.find((s) => s.id === id)
    if (!target) return
    if (!confirm('Clear this slide’s media, embed, and notes?')) return
    releaseMedia(target.media)
    target.zones?.forEach((z) => releaseMedia(z.media))
    updateSlide(id, { notes: '', media: null, embedUrl: null, layout: undefined, zones: undefined })
  }

  async function clearDeck() {
    if (
      !confirm(
        `This will permanently clear all ${deck.slides.length} slides in "${deck.name}" — media, embeds, and notes. This cannot be undone. Continue?`,
      )
    )
      return
    await Promise.all(
      deck.slides
        .flatMap((s) => [s.media?.blobId, ...(s.zones ?? []).map((z) => z.media?.blobId)])
        .filter((id): id is string => !!id)
        .map((id) => deleteBlob(id)),
    )
    updateDeck((prev) => ({
      ...prev,
      slides: prev.slides.map(() => createEmptySlide()),
    }))
    setSelectedId('')
  }

  function moveSlide(id: string, direction: -1 | 1) {
    updateDeck((prev) => {
      const idx = prev.slides.findIndex((s) => s.id === id)
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= prev.slides.length) return prev
      const slides = [...prev.slides]
      const [item] = slides.splice(idx, 1)
      slides.splice(newIdx, 0, item)
      return { ...prev, slides }
    })
  }

  async function handleFileUpload(file: File) {
    if (!slide) return
    const kind = mediaKindFromMime(file.type)
    if (!kind) {
      alert('Unsupported file type. Please upload an image, GIF, or video.')
      return
    }
    releaseMedia(slide.media)
    const blobId = crypto.randomUUID()
    await putBlob(blobId, file)
    updateSlide(slide.id, {
      media: { kind, blobId, mimeType: file.type, fileName: file.name },
      embedUrl: null,
    })
  }

  function handleMediaUrl(rawUrl: string) {
    if (!slide) return
    const url = rawUrl.trim()
    if (!url) return
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      alert('Please enter a full URL, e.g. https://example.com/photo.jpg')
      return
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      alert('Media URL must be http(s).')
      return
    }
    const kind = mediaKindFromUrl(url)
    const fileName = decodeURIComponent(parsed.pathname.split('/').pop() || parsed.hostname)
    releaseMedia(slide.media)
    updateSlide(slide.id, {
      media: { kind, url, mimeType: '', fileName },
      embedUrl: null,
    })
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current += 1
    setDragActive(true)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragActive(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragCounter.current = 0
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  function handleEmbedChange(url: string) {
    if (!slide) return
    updateSlide(slide.id, { embedUrl: url || null, media: url ? null : slide.media })
  }

  /** Zones array padded to 4 fixed slots, preserving content from hidden slots. */
  function zonesOf(s: Slide): SlideZone[] {
    const zones = s.zones ?? []
    return Array.from({ length: 4 }, (_, i) => (zones[i] ? normalizeZone(zones[i]) : createEmptyZone()))
  }

  function handleLayoutChange(layout: LayoutId) {
    if (!slide) return
    if (layout === '1') {
      updateSlide(slide.id, { layout: '1' })
      return
    }
    const zones = zonesOf(slide)
    if (!slide.zones && (slide.media || slide.embedUrl)) {
      zones[0] = { media: slide.media, embedUrl: slide.embedUrl }
    }
    updateSlide(slide.id, { layout, zones, embedUrl: null })
  }

  async function handleZoneFileUpload(zoneIndex: number, file: File) {
    if (!slide) return
    const kind = mediaKindFromMime(file.type)
    if (!kind) {
      alert('Unsupported file type. Please upload an image, GIF, or video.')
      return
    }
    const zones = zonesOf(slide)
    releaseMedia(zones[zoneIndex].media)
    const blobId = crypto.randomUUID()
    await putBlob(blobId, file)
    zones[zoneIndex] = { media: { kind, blobId, mimeType: file.type, fileName: file.name }, embedUrl: null }
    updateSlide(slide.id, { zones })
  }

  function handleZoneMediaUrl(zoneIndex: number, rawUrl: string) {
    if (!slide) return
    const url = rawUrl.trim()
    if (!url) return
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      alert('Please enter a full URL, e.g. https://example.com/photo.jpg')
      return
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      alert('Media URL must be http(s).')
      return
    }
    const kind = mediaKindFromUrl(url)
    const fileName = decodeURIComponent(parsed.pathname.split('/').pop() || parsed.hostname)
    const zones = zonesOf(slide)
    releaseMedia(zones[zoneIndex].media)
    zones[zoneIndex] = { media: { kind, url, mimeType: '', fileName }, embedUrl: null }
    updateSlide(slide.id, { zones })
  }

  function handleZoneEmbedChange(zoneIndex: number, url: string) {
    if (!slide) return
    const zones = zonesOf(slide)
    if (url) releaseMedia(zones[zoneIndex].media)
    zones[zoneIndex] = { embedUrl: url || null, media: url ? null : zones[zoneIndex].media }
    updateSlide(slide.id, { zones })
  }

  function clearZoneMedia(zoneIndex: number) {
    if (!slide) return
    const zones = zonesOf(slide)
    releaseMedia(zones[zoneIndex].media)
    zones[zoneIndex] = { ...zones[zoneIndex], media: null }
    updateSlide(slide.id, { zones })
  }

  function handleZoneDragEnter(zoneIndex: number, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer.types.includes('Files')) return
    zoneDragCounter.current += 1
    setZoneDragIndex(zoneIndex)
  }

  function handleZoneDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleZoneDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    zoneDragCounter.current -= 1
    if (zoneDragCounter.current <= 0) {
      zoneDragCounter.current = 0
      setZoneDragIndex(null)
    }
  }

  function handleZoneDrop(zoneIndex: number, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    zoneDragCounter.current = 0
    setZoneDragIndex(null)
    const file = e.dataTransfer.files?.[0]
    if (file) handleZoneFileUpload(zoneIndex, file)
  }

  function clearMedia() {
    if (!slide?.media) return
    releaseMedia(slide.media)
    updateSlide(slide.id, { media: null })
  }

  async function handleExport() {
    setBusy('export')
    try {
      await exportDeck(deck)
    } finally {
      setBusy(null)
    }
  }

  async function handleImportFile(file: File) {
    setBusy('import')
    try {
      const imported = await importDeckFile(file)
      onImportDeck(imported)
      setSelectedId(imported.slides[0]?.id ?? '')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import deck.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="editor">
      <aside className="slide-list">
        <div className="slide-list__header">
          <div className="slide-list__brand">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="slide-list__logo" />
            <div className="slide-list__title-wrap">
              <input
                className="slide-list__title-input"
                value={deck.name}
                onChange={(e) => updateDeck((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Untitled deck"
                aria-label="Deck title"
                spellCheck={false}
              />
              <p className="slide-list__subhead">20 slides · 20s each</p>
            </div>
          </div>
        </div>
        <div className="slide-list__play-row">
          <button className="btn btn--primary btn--play" onClick={onPlay}>
            ▶ Play
          </button>
        </div>
        <ol className="slide-list__items">
          {deck.slides.map((s, i) => (
            <li
              key={s.id}
              className={`slide-list__item ${s.id === selectedId ? 'slide-list__item--active' : ''}`}
              onClick={() => setSelectedId(s.id)}
            >
              <SlideThumb slide={s} />
              <div className="slide-list__item-bar">
                <span className="slide-list__num">{i + 1}</span>
                <div className="slide-list__actions">
                  <button
                    title="Move up"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSlide(s.id, -1)
                    }}
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    title="Move down"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSlide(s.id, 1)
                    }}
                    disabled={i === deck.slides.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    title="Clear slide"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearSlide(s.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="slide-list__footer">
          <button className="btn" onClick={handleExport} disabled={busy !== null}>
            {busy === 'export' ? 'Exporting…' : '⬇ Download deck'}
          </button>
          <button className="btn" onClick={() => importInputRef.current?.click()} disabled={busy !== null}>
            {busy === 'import' ? 'Importing…' : '⬆ Upload deck'}
          </button>
          <button className="slide-list__help-link" onClick={() => setShowFormatHelp(true)}>
            ✨ Make a deck with an LLM
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,.pechakyxa.zip,application/zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
          <button className="btn btn--danger" onClick={clearDeck} disabled={busy !== null}>
            ⚠ Clear deck
          </button>
        </div>
      </aside>

      {slide && (
        <main className="slide-editor">
          <div className="slide-editor__stage" ref={stageRef}>
            {slide.layout && slide.layout !== '1' ? (
              <div
                className="slide-editor__preview"
                style={
                  previewSize.width > 0
                    ? { width: previewSize.width, height: previewSize.height }
                    : undefined
                }
              >
                <div className={`slide-zones slide-zones--${slide.layout}`}>
                  {Array.from({ length: LAYOUT_ZONE_COUNT[slide.layout] }, (_, i) => {
                    const zone = zonesOf(slide)[i]
                    return (
                      <div
                        key={i}
                        className={`slide-zone ${zoneDragIndex === i ? 'slide-zone--drag' : ''}`}
                        onDragEnter={(e) => handleZoneDragEnter(i, e)}
                        onDragOver={handleZoneDragOver}
                        onDragLeave={handleZoneDragLeave}
                        onDrop={(e) => handleZoneDrop(i, e)}
                      >
                        {zone.embedUrl ? (
                          <iframe
                            className="slide-embed"
                            src={zone.embedUrl}
                            title="Embedded page"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          />
                        ) : zone.media ? (
                          <MediaFit media={zone.media} />
                        ) : (
                          <div className="slide-empty">
                            <span className="slide-empty__icon">⤓</span>
                            <span>Drag & drop media here</span>
                          </div>
                        )}
                        {zoneDragIndex === i && (
                          <div className="slide-editor__drop-hint">
                            <span>Drop to set this zone's media</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div
                className={[
                  'slide-editor__preview',
                  !slide.media && !slide.embedUrl ? 'slide-editor__preview--empty' : '',
                  dragActive ? 'slide-editor__preview--drag' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  previewSize.width > 0
                    ? { width: previewSize.width, height: previewSize.height }
                    : undefined
                }
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <SlideContent slide={slide} />
                {dragActive && (
                  <div className="slide-editor__drop-hint">
                    <span>Drop image, GIF, or video to set as this slide's media</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="slide-editor__fields">
            <div className="slide-editor__fields-header">
              <span className="slide-editor__slide-num">Slide {selectedIndex + 1} of {deck.slides.length}</span>
              <button className="slide-editor__clear-link" onClick={() => clearSlide(slide.id)}>
                Clear slide
              </button>
            </div>

            <div className="field">
              <span>Layout</span>
              <LayoutPicker value={slide.layout ?? '1'} onChange={handleLayoutChange} />
            </div>

            {slide.layout && slide.layout !== '1' ? (
              <div className="zone-fields">
                {Array.from({ length: LAYOUT_ZONE_COUNT[slide.layout] }, (_, i) => {
                  const zone = zonesOf(slide)[i]
                  return (
                    <div className="field" key={i}>
                      <span className="zone-field__label">Zone {i + 1}</span>
                      <div
                        className={`media-dropzone ${zoneDragIndex === i ? 'media-dropzone--drag' : ''}`}
                        onClick={() => zoneFileInputRefs.current[i]?.click()}
                        onDragEnter={(e) => handleZoneDragEnter(i, e)}
                        onDragOver={handleZoneDragOver}
                        onDragLeave={handleZoneDragLeave}
                        onDrop={(e) => handleZoneDrop(i, e)}
                      >
                        <input
                          ref={(el) => {
                            zoneFileInputRefs.current[i] = el
                          }}
                          type="file"
                          accept="image/*,video/*"
                          className="media-dropzone__input"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleZoneFileUpload(i, file)
                            e.target.value = ''
                          }}
                        />
                        <span className="media-dropzone__icon">⤓</span>
                        <span className="media-dropzone__label">
                          {zone.media
                            ? zone.media.url
                              ? `🌐 ${zone.media.fileName}`
                              : zone.media.fileName
                            : 'Drag & drop, or click to choose a file'}
                        </span>
                      </div>
                      <div className="media-url-row">
                        <span className="media-url-row__or">or paste an image / video URL</span>
                        <input
                          key={slide.id + i + (zone.media?.url ?? '')}
                          type="url"
                          defaultValue={zone.media?.url ?? ''}
                          placeholder="https://…/photo.jpg"
                          onBlur={(e) => handleZoneMediaUrl(i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleZoneMediaUrl(i, (e.target as HTMLInputElement).value)
                            }
                          }}
                        />
                      </div>
                      {zone.media && (
                        <button className="btn" onClick={(e) => { e.stopPropagation(); clearZoneMedia(i) }}>
                          Remove media
                        </button>
                      )}
                      <label className="field zone-field__embed">
                        <span>or embed a web page (overrides media)</span>
                        <input
                          type="url"
                          value={zone.embedUrl ?? ''}
                          onChange={(e) => handleZoneEmbedChange(i, e.target.value)}
                          placeholder="https://youtube.com/embed/…"
                        />
                      </label>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="field">
                <span>Media (image, GIF, or video)</span>
                <div
                  className={`media-dropzone ${dragActive ? 'media-dropzone--drag' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="media-dropzone__input"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                      e.target.value = ''
                    }}
                  />
                  <span className="media-dropzone__icon">⤓</span>
                  <span className="media-dropzone__label">
                    {slide.media
                      ? slide.media.url
                        ? `🌐 ${slide.media.fileName}`
                        : slide.media.fileName
                      : 'Drag & drop, or click to choose a file'}
                  </span>
                </div>
                <div className="media-url-row">
                  <span className="media-url-row__or">or paste an image / video URL</span>
                  <input
                    key={slide.id + (slide.media?.url ?? '')}
                    type="url"
                    defaultValue={slide.media?.url ?? ''}
                    placeholder="https://…/photo.jpg"
                    onBlur={(e) => handleMediaUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleMediaUrl((e.target as HTMLInputElement).value)
                      }
                    }}
                  />
                </div>
                {slide.media && (
                  <button className="btn" onClick={(e) => { e.stopPropagation(); clearMedia() }}>
                    Remove media
                  </button>
                )}
              </div>
            )}

            {(!slide.layout || slide.layout === '1') && (
              <label className="field">
                <span>Embed web page URL (overrides media)</span>
                <input
                  type="url"
                  value={slide.embedUrl ?? ''}
                  onChange={(e) => handleEmbedChange(e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
            )}

            <label className="field">
              <span>Presenter notes</span>
              <textarea
                value={slide.notes}
                onChange={(e) => updateSlide(slide.id, { notes: e.target.value })}
                placeholder="Notes only you will see in play mode"
                rows={6}
              />
            </label>
          </div>
        </main>
      )}

      {showFormatHelp && <DeckFormatHelp onClose={() => setShowFormatHelp(false)} />}
    </div>
  )
}
