import { useCallback, useEffect, useRef, useState } from 'react'
import type { Deck } from '../types'
import { SECONDS_PER_SLIDE } from '../types'
import { SlideContent } from './SlideContent'

interface PlayModeProps {
  deck: Deck
  onExit: () => void
}

export function PlayMode({ deck, onExit }: PlayModeProps) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [remaining, setRemaining] = useState(SECONDS_PER_SLIDE)
  const [showNotes, setShowNotes] = useState(true)
  const tickRef = useRef<number | null>(null)

  const slide = deck.slides[index]
  const total = deck.slides.length

  const goTo = useCallback(
    (newIndex: number) => {
      const clamped = Math.max(0, Math.min(total - 1, newIndex))
      setIndex(clamped)
      setRemaining(SECONDS_PER_SLIDE)
    },
    [total],
  )

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setPlaying(false)
        return i
      }
      return i + 1
    })
    setRemaining(SECONDS_PER_SLIDE)
  }, [total])

  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (!playing) return
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          next()
          return SECONDS_PER_SLIDE
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [playing, next])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'Escape') onExit()
      else if (e.key === 'n' || e.key === 'N') setShowNotes((s) => !s)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onExit])

  if (!slide) return null

  const progress = (remaining / SECONDS_PER_SLIDE) * 100

  return (
    <div className="play-mode">
      <div className="play-mode__stage">
        <SlideContent slide={slide} autoPlayVideo videoMuted={false} />
      </div>

      <div className="play-mode__hud">
        <div className="play-mode__countdown-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}>
          <span>{remaining}</span>
        </div>

        <div className="play-mode__slide-num">
          Slide {index + 1} / {total}
        </div>

        <div className="play-mode__controls">
          <button onClick={prev} disabled={index === 0} title="Previous">
            ⏮
          </button>
          <button onClick={() => setPlaying((p) => !p)} title={playing ? 'Pause' : 'Play'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={next} disabled={index === total - 1} title="Next">
            ⏭
          </button>
          <button onClick={() => setShowNotes((s) => !s)} title="Toggle notes">
            📝
          </button>
          <button onClick={onExit} title="Exit play mode">
            ✕
          </button>
        </div>
      </div>

      {showNotes && slide.notes && (
        <div className="play-mode__notes">
          <strong>Notes:</strong> {slide.notes}
        </div>
      )}

      <div className="play-mode__progress-bar">
        <div className="play-mode__progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
