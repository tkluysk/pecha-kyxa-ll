import { useEffect, useRef } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  hue: number
  createdAt: number
  lifetime: number
}

const RAINBOW_HUES = [0, 30, 55, 90, 140, 190, 230, 270, 310]
const MAX_PARTICLES = 220
const PARTICLES_PER_MOVE = 5
const DRAG = 0.94
const GRAVITY = 0.012

export function PixieCursor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const particles = useRef<Particle[]>([])
  const nextId = useRef(0)
  const hueIndex = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const lastFrame = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function spawnBurst(x: number, y: number, dirX: number, dirY: number, speed: number) {
      const count = Math.min(PARTICLES_PER_MOVE, 2 + Math.floor(speed / 8))
      for (let i = 0; i < count; i++) {
        const hue = RAINBOW_HUES[hueIndex.current % RAINBOW_HUES.length]
        hueIndex.current += 1

        // fan out roughly opposite to travel direction, with wide random spread
        const spread = (Math.random() - 0.5) * 2.6
        const baseAngle = Math.atan2(-dirY, -dirX) + spread
        const magnitude = 0.6 + Math.random() * 1.8

        particles.current.push({
          id: nextId.current++,
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(baseAngle) * magnitude,
          vy: Math.sin(baseAngle) * magnitude,
          size: 2 + Math.random() * 3.5,
          hue,
          createdAt: performance.now(),
          lifetime: 500 + Math.random() * 500,
        })
      }
      if (particles.current.length > MAX_PARTICLES) {
        particles.current.splice(0, particles.current.length - MAX_PARTICLES)
      }
    }

    function handlePointerMove(e: PointerEvent) {
      const prev = lastPos.current
      lastPos.current = { x: e.clientX, y: e.clientY }
      if (!prev) return
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      const dist = Math.hypot(dx, dy)
      if (dist < 1) return
      const steps = Math.min(6, Math.ceil(dist / 10))
      for (let s = 0; s < steps; s++) {
        const t = (s + 1) / steps
        spawnBurst(prev.x + dx * t, prev.y + dy * t, dx, dy, dist)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)

    function tick(now: number) {
      const dt = lastFrame.current ? Math.min(32, now - lastFrame.current) : 16
      lastFrame.current = now
      const dtScale = dt / 16

      particles.current = particles.current.filter((p) => now - p.createdAt < p.lifetime)

      if (container) {
        container.innerHTML = ''
        const frag = document.createDocumentFragment()
        for (const p of particles.current) {
          p.vx *= DRAG
          p.vy *= DRAG
          p.vy += GRAVITY * dtScale
          p.x += p.vx * dtScale
          p.y += p.vy * dtScale

          const age = (now - p.createdAt) / p.lifetime
          const eased = 1 - Math.pow(1 - age, 2)
          const opacity = 1 - eased
          const scale = 1 - age * 0.5

          const dot = document.createElement('span')
          dot.className = 'pixie-dust'
          dot.style.left = `${p.x}px`
          dot.style.top = `${p.y}px`
          dot.style.width = `${p.size}px`
          dot.style.height = `${p.size}px`
          dot.style.setProperty('--hue', String(p.hue))
          dot.style.opacity = String(Math.max(0, opacity))
          dot.style.transform = `translate(-50%, -50%) scale(${Math.max(0, scale)})`
          frag.appendChild(dot)
        }
        container.appendChild(frag)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return <div ref={containerRef} className="pixie-cursor-layer" aria-hidden="true" />
}
