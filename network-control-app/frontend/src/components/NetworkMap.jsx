import { useEffect, useRef } from 'react'

const PRIORITY_STROKE = {
  critical: '#f43f5e',
  high:     '#f97316',
  normal:   '#6366f1',
  low:      '#64748b',
  guest:    '#14b8a6',
}

export default function NetworkMap({ devices, trafficByIp }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    ctx.clearRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    const r  = Math.min(w, h) * 0.35

    // Router node
    ctx.beginPath()
    ctx.arc(cx, cy, 26, 0, Math.PI * 2)
    ctx.fillStyle = '#312e81'
    ctx.fill()
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#a5b4fc'
    ctx.font = '11px Inter'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Router', cx, cy)

    if (devices.length === 0) return

    devices.forEach((d, i) => {
      const angle = (i / devices.length) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r

      const stats = trafficByIp?.[d.ip] ?? { download: 0, upload: 0 }
      const totalMbps = stats.download + stats.upload
      // Line thickness encodes throughput (1–4px)
      const lineW = Math.min(4, 1 + totalMbps / 10)
      const stroke = d.is_online ? (PRIORITY_STROKE[d.priority] ?? '#6366f1') : '#334155'

      // Connection line
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.strokeStyle = stroke + '66'
      ctx.lineWidth = lineW
      ctx.stroke()

      // Device node
      const nodeR = d.is_online ? 14 : 10
      ctx.beginPath()
      ctx.arc(x, y, nodeR, 0, Math.PI * 2)
      ctx.fillStyle = d.is_online ? stroke + '33' : '#1e293b'
      ctx.fill()
      ctx.strokeStyle = stroke
      ctx.lineWidth = d.is_online ? 1.5 : 1
      ctx.stroke()

      // Hostname label
      ctx.fillStyle = d.is_online ? '#e2e8f0' : '#475569'
      ctx.font = '9px Inter'
      ctx.textAlign = 'center'
      ctx.textBaseline = angle > 0 && angle < Math.PI ? 'top' : 'bottom'
      const labelY = y + (angle > -Math.PI / 2 && angle < Math.PI / 2 ? 1 : -1) * (nodeR + 4)
      ctx.fillText(d.hostname.slice(0, 12), x, labelY)

      // Traffic label if active
      if (totalMbps > 0.1) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '8px JetBrains Mono'
        const trafficLabelY = y + (angle > -Math.PI / 2 && angle < Math.PI / 2 ? 1 : -1) * (nodeR + 14)
        ctx.fillText(`${totalMbps.toFixed(1)}M`, x, trafficLabelY)
      }
    })
  }, [devices, trafficByIp])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'auto' }}
    />
  )
}
