import type { SlideMedia } from '../types'
import { useBlobUrl } from '../storage/useBlobUrl'

interface MediaFitProps {
  media: SlideMedia
  className?: string
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
  loop?: boolean
}

export function MediaFit({
  media,
  className,
  autoPlay = false,
  muted = true,
  controls = false,
  loop = false,
}: MediaFitProps) {
  const blobUrl = useBlobUrl(media.url ? null : media.blobId)
  const url = media.url ?? blobUrl

  if (!url) {
    return <div className={`media-fit media-fit--loading ${className ?? ''}`}>Loading…</div>
  }

  if (media.kind === 'video') {
    return (
      <video
        className={`media-fit ${className ?? ''}`}
        src={url}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        loop={loop}
        playsInline
      />
    )
  }

  return (
    <img
      className={`media-fit ${className ?? ''}`}
      src={url}
      alt={media.fileName}
      referrerPolicy="no-referrer"
    />
  )
}
