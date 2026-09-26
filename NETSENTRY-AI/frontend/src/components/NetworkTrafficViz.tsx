import { useEffect, useRef } from 'react'

interface Props {
  running: boolean
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

// ── Colour per risk level ──────────────────────────────────
const riskColor: Record<string, string> = {
  LOW:      '#00ff9d',
  MEDIUM:   '#facc15',
  HIGH:     '#ff9100',
  CRITICAL: '#ff2d41',
}

interface Packet {
  x: number
  y: number
  speed: number
  size: number
  color: string
  opacity: number
}

export default function NetworkTrafficViz({ running, riskLevel = 'LOW' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const packets   = useRef<Packet[]>([])
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Seed initial packets
    packets.current = Array.from({ length: 35 }, () => makePacket(canvas, riskLevel))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Grid lines
      ctx.strokeStyle = 'rgba(0,245,212,0.04)'
      ctx.lineWidth   = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Node circles
      const nodes = [
        { x: 0.12, y: 0.5 },
        { x: 0.38, y: 0.25 },
        { x: 0.38, y: 0.75 },
        { x: 0.62, y: 0.25 },
        { x: 0.62, y: 0.75 },
        { x: 0.88, y: 0.5 },
      ]

      nodes.forEach(({ x, y }) => {
        const cx = x * canvas.width
        const cy = y * canvas.height

        // Glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20)
        grad.addColorStop(0, 'rgba(0,245,212,0.25)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill()

        // Circle
        ctx.strokeStyle = 'rgba(0,245,212,0.5)'
        ctx.lineWidth   = 1.5
        ctx.fillStyle   = 'rgba(0,245,212,0.08)'
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
      })

      // Connection lines
      const lines = [
        [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 4], [2, 3],
      ]
      lines.forEach(([a, b]) => {
        const n1 = nodes[a]; const n2 = nodes[b]
        ctx.strokeStyle = 'rgba(0,140,255,0.12)'
        ctx.lineWidth   = 1
        ctx.beginPath()
        ctx.moveTo(n1.x * canvas.width, n1.y * canvas.height)
        ctx.lineTo(n2.x * canvas.width, n2.y * canvas.height)
        ctx.stroke()
      })

      // Packets
      const color = riskColor[riskLevel] ?? '#00f5d4'
      packets.current.forEach((p, i) => {
        if (running) p.x += p.speed

        if (p.x > canvas.width + 10) {
          packets.current[i] = makePacket(canvas, riskLevel, true)
          return
        }

        ctx.globalAlpha = p.opacity
        ctx.fillStyle   = color
        ctx.shadowBlur  = 8
        ctx.shadowColor = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.shadowBlur  = 0
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [running, riskLevel])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl"
      style={{ display: 'block' }}
    />
  )
}

function makePacket(
  canvas: HTMLCanvasElement,
  riskLevel: string,
  fromEdge = false
): Packet {
  return {
    x:       fromEdge ? -10 : Math.random() * canvas.width,
    y:       Math.random() * canvas.height,
    speed:   1.5 + Math.random() * 2.5,
    size:    1 + Math.random() * 2.5,
    color:   riskColor[riskLevel] ?? '#00f5d4',
    opacity: 0.4 + Math.random() * 0.6,
  }
}
