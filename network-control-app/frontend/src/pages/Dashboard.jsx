import { useMemo } from 'react'
import { Activity, Monitor, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import DeviceCard from '../components/DeviceCard'
import NetworkMap from '../components/NetworkMap'
import TrafficGraph from '../components/TrafficGraph'
import { useWebSocket } from '../hooks/useWebSocket'
import { deviceApi } from '../services/api'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-semibold font-mono">
          {value} <span className="text-sm text-slate-500 font-sans">{unit}</span>
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: wsData, connected } = useWebSocket(WS_URL)

  const devices   = wsData?.devices ?? []
  const summary   = wsData?.summary ?? {}
  const trafficMap = useMemo(() => {
    const m = {}
    devices.forEach(d => { m[d.ip] = d.traffic })
    return m
  }, [devices])

  async function handleLimitChange(id, dl, ul) {
    try { await deviceApi.setLimit(id, dl, ul) } catch {}
  }

  async function handlePriorityChange(id, priority) {
    try { await deviceApi.setPriority(id, priority) } catch {}
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto h-full">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Monitor}
          label="Devices online"
          value={summary.online_devices ?? 0}
          unit={`/ ${summary.total_devices ?? 0}`}
          color="bg-indigo-500/20 text-indigo-300"
        />
        <StatCard
          icon={Activity}
          label="Total download"
          value={(summary.total_download ?? 0).toFixed(1)}
          unit="Mbps"
          color="bg-sky-500/20 text-sky-300"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Total upload"
          value={(summary.total_upload ?? 0).toFixed(1)}
          unit="Mbps"
          color="bg-violet-500/20 text-violet-300"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="WS status"
          value={connected ? 'Live' : 'Off'}
          unit=""
          color={connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Network map */}
        <div className="card xl:col-span-1 min-h-64 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-slate-300">Network Map</h2>
          <div className="flex-1 min-h-56">
            <NetworkMap devices={devices} trafficByIp={trafficMap} />
          </div>
        </div>

        {/* Device cards */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          {devices.length === 0 && (
            <div className="col-span-2 card text-center text-slate-500 py-12">
              {connected ? 'Scanning for devices…' : 'Connecting to server…'}
            </div>
          )}
          {devices.map(d => (
            <DeviceCard
              key={d.id}
              device={d}
              traffic={d.traffic}
              history={[]}
              onLimitChange={handleLimitChange}
              onPriorityChange={handlePriorityChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
