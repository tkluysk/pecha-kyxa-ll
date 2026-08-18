import { useEffect, useRef, useState } from 'react'

export function useFitBox(aspectRatio: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function recalc() {
      if (!container) return
      const { width: cw, height: ch } = container.getBoundingClientRect()
      let width = cw
      let height = width / aspectRatio
      if (height > ch) {
        height = ch
        width = height * aspectRatio
      }
      setSize({ width, height })
    }

    recalc()
    const observer = new ResizeObserver(recalc)
    observer.observe(container)
    return () => observer.disconnect()
  }, [aspectRatio])

  return { containerRef, size }
}
