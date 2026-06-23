import { useState } from 'react'

const PRESETS = [0, 1, 2, 5, 10, 20, 50, 100, 200]

function mbpsToSlider(mbps) {
  if (mbps <= 0) return 0
  const idx = PRESETS.findIndex(p => p >= mbps)
  return idx === -1 ? PRESETS.length - 1 : Math.max(0, idx)
}

function sliderToMbps(idx) {
  return PRESETS[Math.round(idx)] ?? 0
}

export default function BandwidthSlider({ label, value, onChange, color = 'indigo' }) {
  const [localIdx, setLocalIdx] = useState(mbpsToSlider(value))
  const displayMbps = sliderToMbps(localIdx)

  const colorMap = {
    indigo: 'text-indigo-400',
    violet: 'text-violet-400',
    sky:    'text-sky-400',
  }

  function commit(idx) {
    const mbps = sliderToMbps(idx)
    onChange(mbps)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-mono font-medium ${colorMap[color] ?? colorMap.indigo}`}>
          {displayMbps === 0 ? '∞ Unlimited' : `${displayMbps} Mbps`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={PRESETS.length - 1}
        step={1}
        value={localIdx}
        onChange={e => setLocalIdx(Number(e.target.value))}
        onMouseUp={e => commit(Number(e.target.value))}
        onTouchEnd={e => commit(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-slate-600 text-xs">
        <span>∞</span>
        <span>100 Mbps</span>
        <span>200 Mbps</span>
      </div>
    </div>
  )
}
