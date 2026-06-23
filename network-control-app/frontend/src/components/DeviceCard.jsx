import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Laptop, Smartphone, Tv, Router, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import BandwidthSlider from './BandwidthSlider'
import TrafficGraph from './TrafficGraph'

const PRIORITY_COLORS = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  normal:   'bg-slate-600/40 text-slate-300 border-slate-600',
  low:      'bg-slate-700/40 text-slate-400 border-slate-700',
  guest:    'bg-teal-500/20 text-teal-300 border-teal-500/30',
}

const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low', 'guest']

function DeviceIcon({ vendor, hostname }) {
  const s = `${vendor} ${hostname}`.toLowerCase()
  if (s.includes('phone') || s.includes('iphone') || s.includes('android') || s.includes('samsung') && !s.includes('tv'))
    return <Smartphone size={18} />
  if (s.includes('tv') || s.includes('apple tv') || s.includes('roku') || s.includes('firestick'))
    return <Tv size={18} />
  if (s.includes('router') || s.includes('gateway') || s.includes('openwrt') || s.includes('ubiquiti'))
    return <Router size={18} />
  if (s.includes('laptop') || s.includes('macbook') || s.includes('pc') || s.includes('desktop'))
    return <Laptop size={18} />
  return <HelpCircle size={18} />
}

export default function DeviceCard({ device, traffic, history, onLimitChange, onPriorityChange }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const dl = traffic?.download ?? 0
  const ul = traffic?.upload ?? 0

  return (
    <div className={clsx(
      'card flex flex-col gap-3 transition-all duration-200',
      !device.is_online && 'opacity-50'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={clsx(
            'p-2 rounded-lg',
            device.is_online ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-500'
          )}>
            <DeviceIcon vendor={device.vendor} hostname={device.hostname} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{device.hostname}</p>
            <p className="text-xs text-slate-500 font-mono">{device.ip}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx('badge border', PRIORITY_COLORS[device.priority] ?? PRIORITY_COLORS.normal)}>
            {device.priority}
          </span>
          <div className={clsx('w-2 h-2 rounded-full', device.is_online ? 'bg-emerald-400' : 'bg-slate-600')} />
        </div>
      </div>

      {/* Live traffic numbers */}
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-slate-500">↓ </span>
          <span className="font-mono text-sky-400">{dl.toFixed(1)}</span>
          <span className="text-slate-500"> Mbps</span>
        </div>
        <div>
          <span className="text-slate-500">↑ </span>
          <span className="font-mono text-violet-400">{ul.toFixed(1)}</span>
          <span className="text-slate-500"> Mbps</span>
        </div>
        <div className="text-slate-600 ml-auto font-mono truncate">{device.vendor}</div>
      </div>

      {/* Inline mini graph if expanded */}
      {expanded && history?.length > 0 && (
        <TrafficGraph data={history} height={120} />
      )}

      {/* Expand controls */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <BandwidthSlider
            label="Download limit"
            value={device.download_limit}
            onChange={dl => onLimitChange(device.id, dl, device.upload_limit)}
            color="sky"
          />
          <BandwidthSlider
            label="Upload limit"
            value={device.upload_limit}
            onChange={ul => onLimitChange(device.id, device.download_limit, ul)}
            color="violet"
          />

          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_ORDER.map(p => (
                <button
                  key={p}
                  onClick={() => onPriorityChange(device.id, p)}
                  className={clsx(
                    'badge border cursor-pointer transition-opacity',
                    PRIORITY_COLORS[p],
                    device.priority === p ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate(`/devices/${device.id}`)}
            className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-1"
          >
            View full details →
          </button>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-center gap-1 text-slate-600 hover:text-slate-400 text-xs transition-colors -mb-1"
      >
        {expanded ? <><ChevronUp size={14}/> Less</> : <><ChevronDown size={14}/> Controls</>}
      </button>
    </div>
  )
}
