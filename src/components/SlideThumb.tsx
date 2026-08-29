import type { Slide } from '../types'
import { useBlobUrl } from '../storage/useBlobUrl'

interface SlideThumbProps {
  slide: Slide
}

export function SlideThumb({ slide }: SlideThumbProps) {
  const blobUrl = useBlobUrl(slide.media?.url ? null : slide.media?.blobId)
  const mediaUrl = slide.media?.url ?? blobUrl

  if (slide.embedUrl) {
    return (
      <div className="slide-thumb slide-thumb--embed">
        <span>🔗</span>
      </div>
    )
  }

  if (slide.media && mediaUrl) {
    if (slide.media.kind === 'video') {
      return (
        <div className="slide-thumb">
          <video src={mediaUrl} muted playsInline />
        </div>
      )
    }
    return (
      <div className="slide-thumb">
        <img src={mediaUrl} alt="" referrerPolicy="no-referrer" />
      </div>
    )
  }

  return <div className="slide-thumb slide-thumb--empty" />
}
