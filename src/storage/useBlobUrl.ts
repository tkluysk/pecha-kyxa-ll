import { useEffect, useState } from 'react'
import { getBlob } from './db'

const urlCache = new Map<string, string>()

export function useBlobUrl(blobId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(blobId ? urlCache.get(blobId) ?? null : null)

  useEffect(() => {
    if (!blobId) {
      setUrl(null)
      return
    }
    const cached = urlCache.get(blobId)
    if (cached) {
      setUrl(cached)
      return
    }
    let cancelled = false
    getBlob(blobId).then((blob) => {
      if (cancelled || !blob) return
      const objectUrl = URL.createObjectURL(blob)
      urlCache.set(blobId, objectUrl)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
    }
  }, [blobId])

  return url
}
