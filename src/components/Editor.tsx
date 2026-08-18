import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { Deck, MediaKind, Slide } from '../types'
import { putBlob, deleteBlob } from '../storage/db'
import { exportDeck, importDeckFile } from '../storage/portable'
import { useFitBox } from '../useFitBox'
import { SlideContent } from './SlideContent'
import { SlideThumb } from './SlideThumb'

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

export function Editor({ deck, updateDeck, onPlay, onImportDeck }: EditorProps) {
  const { containerRef: stageRef, size: previewSize } = useFitBox(16 / 10)
  const [selectedId, setSelectedId] = useState<string>(deck.slides[0]?.id ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const dragCounter = useRef(0)

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
    if (target.media) deleteBlob(target.media.blobId)
    updateSlide(id, { notes: '', media: null, embedUrl: null })
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
    if (slide.media) {
      await deleteBlob(slide.media.blobId)
    }
    const blobId = crypto.randomUUID()
    await putBlob(blobId, file)
    updateSlide(slide.id, {
      media: { kind, blobId, mimeType: file.type, fileName: file.name },
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

  async function clearMedia() {
    if (!slide?.media) return
    await deleteBlob(slide.media.blobId)
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
            <div>
              <h2>{deck.name}</h2>
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
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.pechakyxa.json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </aside>

      {slide && (
        <main className="slide-editor">
          <div className="slide-editor__stage" ref={stageRef}>
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
          </div>

          <div className="slide-editor__fields">
            <div className="slide-editor__fields-header">
              <span className="slide-editor__slide-num">Slide {selectedIndex + 1} of {deck.slides.length}</span>
              <button className="slide-editor__clear-link" onClick={() => clearSlide(slide.id)}>
                Clear slide
              </button>
            </div>

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
                  {slide.media ? slide.media.fileName : 'Drag & drop, or click to choose a file'}
                </span>
              </div>
              {slide.media && (
                <button className="btn" onClick={(e) => { e.stopPropagation(); clearMedia() }}>
                  Remove media
                </button>
              )}
            </div>

            <label className="field">
              <span>Embed web page URL (overrides media)</span>
              <input
                type="url"
                value={slide.embedUrl ?? ''}
                onChange={(e) => handleEmbedChange(e.target.value)}
                placeholder="https://example.com"
              />
            </label>

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
    </div>
  )
}
