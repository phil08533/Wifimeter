import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw } from 'lucide-react'
import { useDevices } from '../hooks/useDevices'
import { useWebSocket } from '../hooks/useWebSocket'
import DeviceCard from '../components/DeviceCard'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export default function Devices() {
  const { setLimit, setPriority } = useDevices()
  const { data: wsData, connected } = useWebSocket(WS_URL)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const devices = wsData?.devices ?? []

  const filtered = useMemo(() => {
    let d = devices
    if (filter === 'online')  d = d.filter(x => x.is_online)
    if (filter === 'offline') d = d.filter(x => !x.is_online)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(x =>
        x.hostname?.toLowerCase().includes(q) ||
        x.ip?.includes(q) ||
        x.mac?.includes(q) ||
        x.vendor?.toLowerCase().includes(q)
      )
    }
    return d
  }, [devices, filter, search])

  return (
    <div className="p-6 space-y-4 overflow-auto h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by hostname, IP, MAC…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-sm">
          {['all', 'online', 'offline'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className={`text-xs ${connected ? 'text-emerald-400' : 'text-slate-500'}`}>
          {filtered.length} device{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full card text-center text-slate-500 py-12">
            {connected ? 'No devices match your filter.' : 'Connecting to server…'}
          </div>
        )}
        {filtered.map(d => (
          <DeviceCard
            key={d.id}
            device={d}
            traffic={d.traffic}
            history={[]}
            onLimitChange={setLimit}
            onPriorityChange={setPriority}
          />
        ))}
      </div>
    </div>
  )
}
