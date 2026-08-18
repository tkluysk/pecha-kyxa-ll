import type { Slide } from '../types'
import { MediaFit } from './MediaFit'

interface SlideContentProps {
  slide: Slide
  autoPlayVideo?: boolean
  videoMuted?: boolean
  emptyMessage?: string
  showDropIcon?: boolean
}

export function SlideContent({
  slide,
  autoPlayVideo = false,
  videoMuted = true,
  emptyMessage = 'Drag & drop an image, GIF, or video here',
  showDropIcon = true,
}: SlideContentProps) {
  if (slide.embedUrl) {
    return (
      <iframe
        className="slide-embed"
        src={slide.embedUrl}
        title="Embedded page"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    )
  }

  if (slide.media) {
    return <MediaFit media={slide.media} autoPlay={autoPlayVideo} muted={videoMuted} loop />
  }

  return (
    <div className="slide-empty">
      {showDropIcon && <span className="slide-empty__icon">⤓</span>}
      <span>{emptyMessage}</span>
    </div>
  )
}
