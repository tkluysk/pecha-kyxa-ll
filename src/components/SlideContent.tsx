import type { Slide } from '../types'
import { MediaFit } from './MediaFit'

interface SlideContentProps {
  slide: Slide
  autoPlayVideo?: boolean
  videoMuted?: boolean
}

export function SlideContent({ slide, autoPlayVideo = false, videoMuted = true }: SlideContentProps) {
  if (slide.embedUrl) {
    return (
      <iframe
        className="slide-embed"
        src={slide.embedUrl}
        title={slide.title || 'Embedded page'}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    )
  }

  if (slide.media) {
    return <MediaFit media={slide.media} autoPlay={autoPlayVideo} muted={videoMuted} loop />
  }

  return <div className="slide-empty">No media or embed set for this slide</div>
}
