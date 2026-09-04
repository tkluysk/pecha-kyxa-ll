import type { Slide, SlideZone } from '../types'
import { LAYOUT_ZONE_COUNT, normalizeZone } from '../types'
import { useBlobUrl } from '../storage/useBlobUrl'

interface SlideThumbProps {
  slide: Slide
}

function ZoneThumb({ zone }: { zone: SlideZone | undefined }) {
  const media = zone?.media ?? null
  const blobUrl = useBlobUrl(media?.url ? null : media?.blobId)
  const url = media?.url ?? blobUrl
  if (zone?.embedUrl) {
    return (
      <div className="slide-thumb-zone">
        <span>🔗</span>
      </div>
    )
  }
  if (!media || !url) return <div className="slide-thumb-zone slide-thumb-zone--empty" />
  if (media.kind === 'video') {
    return (
      <div className="slide-thumb-zone">
        <video src={url} muted playsInline />
      </div>
    )
  }
  return (
    <div className="slide-thumb-zone">
      <img src={url} alt="" referrerPolicy="no-referrer" />
    </div>
  )
}

export function SlideThumb({ slide }: SlideThumbProps) {
  const blobUrl = useBlobUrl(slide.media?.url ? null : slide.media?.blobId)
  const mediaUrl = slide.media?.url ?? blobUrl

  if (slide.layout && slide.layout !== '1') {
    const zoneCount = LAYOUT_ZONE_COUNT[slide.layout]
    const zones = slide.zones ?? []
    return (
      <div className={`slide-thumb slide-thumb-zones slide-thumb-zones--${slide.layout}`}>
        {Array.from({ length: zoneCount }, (_, i) => (
          <ZoneThumb key={i} zone={zones[i] ? normalizeZone(zones[i]) : undefined} />
        ))}
      </div>
    )
  }

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
