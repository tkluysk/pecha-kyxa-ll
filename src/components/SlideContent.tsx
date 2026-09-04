import type { Slide } from '../types'
import { LAYOUT_ZONE_COUNT, normalizeZone } from '../types'
import { MediaFit } from './MediaFit'

interface SlideContentProps {
  slide: Slide
  autoPlayVideo?: boolean
  videoMuted?: boolean
  emptyMessage?: string
  showDropIcon?: boolean
}

function EmptyZone({ emptyMessage, showDropIcon }: { emptyMessage: string; showDropIcon: boolean }) {
  return (
    <div className="slide-empty">
      {showDropIcon && <span className="slide-empty__icon">⤓</span>}
      <span>{emptyMessage}</span>
    </div>
  )
}

export function SlideContent({
  slide,
  autoPlayVideo = false,
  videoMuted = true,
  emptyMessage = 'Drag & drop an image, GIF, or video here',
  showDropIcon = true,
}: SlideContentProps) {
  if (slide.layout && slide.layout !== '1') {
    const zoneCount = LAYOUT_ZONE_COUNT[slide.layout]
    const zones = slide.zones ?? []
    return (
      <div className={`slide-zones slide-zones--${slide.layout}`}>
        {Array.from({ length: zoneCount }, (_, i) => {
          const zone = zones[i] ? normalizeZone(zones[i]) : undefined
          return (
            <div className="slide-zone" key={i}>
              {zone?.embedUrl ? (
                <iframe
                  className="slide-embed"
                  src={zone.embedUrl}
                  title="Embedded page"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : zone?.media ? (
                <MediaFit media={zone.media} autoPlay={autoPlayVideo} muted={videoMuted} loop />
              ) : showDropIcon ? (
                <EmptyZone emptyMessage="Drag & drop media here" showDropIcon />
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

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

  return <EmptyZone emptyMessage={emptyMessage} showDropIcon={showDropIcon} />
}
