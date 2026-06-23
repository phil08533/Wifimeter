import { useState, useEffect, useMemo } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { trafficApi } from '../services/api'
import TrafficGraph from '../components/TrafficGraph'
import clsx from 'clsx'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export default function Traffic() {
  const { data: wsData } = useWebSocket(WS_URL)
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([])

  const devices = wsData?.devices ?? []
  const sorted = useMemo(() =>
    [...devices].sort((a, b) =>
      (b.traffic?.download ?? 0) + (b.traffic?.upload ?? 0) -
      ((a.traffic?.download ?? 0) + (a.traffic?.upload ?? 0))
    ),
    [devices]
  )

  const selected = selectedId ? devices.find(d => d.id === selectedId) : sorted[0]

  useEffect(() => {
    if (!selected) return
    trafficApi.history(selected.id, 120).then(h => setHistory(h.points ?? []))
    const t = setInterval(async () => {
      const h = await trafficApi.history(selected.id, 120)
      setHistory(h.points ?? [])
    }, 5000)
    return () => clearInterval(t)
  }, [selected?.id])

  return (
    <div className="p-6 space-y-4 overflow-auto h-full">
      <h2 className="font-medium text-slate-300">Live Traffic</h2>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Device list with bars */}
        <div className="card space-y-2 md:col-span-1 max-h-[600px] overflow-y-auto">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">By Device</p>
          {sorted.map(d => {
            const dl = d.traffic?.download ?? 0
            const ul = d.traffic?.upload ?? 0
            const max = 50
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={clsx(
                  'w-full text-left p-2.5 rounded-lg space-y-1.5 transition-colors',
                  selected?.id === d.id ? 'bg-indigo-600/20 border border-indigo-600/30' : 'hover:bg-slate-700/50'
                )}
              >
                <div className="flex justify-between text-xs">
                  <span className="truncate text-slate-200 font-medium">{d.hostname}</span>
                  <span className="text-slate-500 font-mono ml-2 shrink-0">{(dl + ul).toFixed(1)}M</span>
                </div>
                {/* Download bar */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (dl / max) * 100)}%` }}
                  />
                </div>
                {/* Upload bar */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (ul / max) * 100)}%` }}
                  />
                </div>
              </button>
            )
          })}
          {sorted.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-4">No devices found</p>
          )}
        </div>

        {/* Graph for selected */}
        <div className="card md:col-span-2 flex flex-col gap-3">
          {selected ? (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-medium text-slate-200">{selected.hostname}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selected.ip}</p>
                </div>
                <div className="text-xs space-x-3 text-right">
                  <span>
                    ↓ <span className="text-sky-400 font-mono">{(selected.traffic?.download ?? 0).toFixed(2)}</span> Mbps
                  </span>
                  <span>
                    ↑ <span className="text-violet-400 font-mono">{(selected.traffic?.upload ?? 0).toFixed(2)}</span> Mbps
                  </span>
                </div>
              </div>
              <TrafficGraph data={history} height={280} />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-500">Total Downloaded</p>
                  <p className="font-mono text-sky-400 text-lg mt-0.5">
                    {(selected.traffic?.download_total ?? 0).toFixed(1)} MB
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-500">Total Uploaded</p>
                  <p className="font-mono text-violet-400 text-lg mt-0.5">
                    {(selected.traffic?.upload_total ?? 0).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm m-auto">Select a device to view traffic</p>
          )}
        </div>
      </div>
    </div>
  )
}
