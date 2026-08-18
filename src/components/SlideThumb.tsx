import type { Slide } from '../types'
import { useBlobUrl } from '../storage/useBlobUrl'

interface SlideThumbProps {
  slide: Slide
}

export function SlideThumb({ slide }: SlideThumbProps) {
  const blobUrl = useBlobUrl(slide.media?.blobId)

  if (slide.embedUrl) {
    return (
      <div className="slide-thumb slide-thumb--embed">
        <span>🔗</span>
      </div>
    )
  }

  if (slide.media && blobUrl) {
    if (slide.media.kind === 'video') {
      return (
        <div className="slide-thumb">
          <video src={blobUrl} muted playsInline />
        </div>
      )
    }
    return (
      <div className="slide-thumb">
        <img src={blobUrl} alt="" />
      </div>
    )
  }

  return <div className="slide-thumb slide-thumb--empty" />
}
