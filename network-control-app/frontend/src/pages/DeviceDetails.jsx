import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { deviceApi, trafficApi } from '../services/api'
import TrafficGraph from '../components/TrafficGraph'
import BandwidthSlider from '../components/BandwidthSlider'
import clsx from 'clsx'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRIORITIES = ['critical', 'high', 'normal', 'low', 'guest']

export default function DeviceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice]       = useState(null)
  const [history, setHistory]     = useState([])
  const [schedules, setSchedules] = useState([])
  const [hostname, setHostname]   = useState('')
  const [saved, setSaved]         = useState(false)
  const [newSched, setNewSched]   = useState({
    name: 'New Rule', start_time: '08:00', end_time: '22:00',
    days_of_week: [0,1,2,3,4], download_limit: 10, upload_limit: 5,
  })

  const load = useCallback(async () => {
    const [d, h, s] = await Promise.all([
      deviceApi.get(id),
      trafficApi.history(id, 120),
      deviceApi.getSchedules(id),
    ])
    setDevice(d)
    setHostname(d.hostname)
    setHistory(h.points ?? [])
    setSchedules(s)
  }, [id])

  useEffect(() => { load() }, [load])

  // Refresh history every 5s
  useEffect(() => {
    const t = setInterval(async () => {
      const h = await trafficApi.history(id, 120)
      setHistory(h.points ?? [])
    }, 5000)
    return () => clearInterval(t)
  }, [id])

  async function saveHostname() {
    const d = await deviceApi.update(id, { hostname })
    setDevice(d)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function setLimit(dl, ul) {
    const d = await deviceApi.setLimit(id, dl, ul)
    setDevice(d)
  }

  async function setPriority(priority) {
    const d = await deviceApi.setPriority(id, priority)
    setDevice(d)
  }

  async function addSchedule() {
    const s = await deviceApi.createSchedule(id, newSched)
    setSchedules(prev => [...prev, s])
  }

  async function deleteSchedule(sid) {
    await deviceApi.deleteSchedule(id, sid)
    setSchedules(prev => prev.filter(s => s.id !== sid))
  }

  if (!device) {
    return <div className="p-6 text-slate-500">Loading…</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-auto h-full">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-semibold text-lg">{device.hostname}</h2>
          <p className="text-xs text-slate-500 font-mono">{device.ip} · {device.mac} · {device.vendor}</p>
        </div>
        <div className={clsx('w-2 h-2 rounded-full ml-auto', device.is_online ? 'bg-emerald-400' : 'bg-slate-600')} />
      </div>

      {/* Traffic graph */}
      <div className="card space-y-2">
        <h3 className="text-sm font-medium text-slate-300">Traffic (last 2 min)</h3>
        <TrafficGraph data={history} height={200} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Name + limits */}
        <div className="card space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Device Settings</h3>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Hostname</label>
            <div className="flex gap-2">
              <input
                value={hostname}
                onChange={e => setHostname(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button onClick={saveHostname} className="btn-primary px-3 py-2">
                {saved ? '✓' : <Save size={15} />}
              </button>
            </div>
          </div>

          <BandwidthSlider
            label="Download limit"
            value={device.download_limit}
            onChange={dl => setLimit(dl, device.upload_limit)}
            color="sky"
          />
          <BandwidthSlider
            label="Upload limit"
            value={device.upload_limit}
            onChange={ul => setLimit(device.download_limit, ul)}
            color="violet"
          />

          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Priority</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    device.priority === p
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'text-slate-400 border-slate-600 hover:border-slate-500'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Schedules */}
        <div className="card space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Bandwidth Schedules</h3>

          {schedules.map(s => (
            <div key={s.id} className="flex items-start justify-between bg-slate-700/50 rounded-lg p-3 text-xs gap-2">
              <div className="space-y-0.5">
                <p className="font-medium text-slate-200">{s.name}</p>
                <p className="text-slate-400 font-mono">{s.start_time} – {s.end_time}</p>
                <p className="text-slate-500">
                  {(s.days_of_week ?? []).map(d => DAYS[d]).join(', ')}
                </p>
                <p className="text-slate-400">
                  ↓ {s.download_limit || '∞'} · ↑ {s.upload_limit || '∞'} Mbps
                </p>
              </div>
              <button onClick={() => deleteSchedule(s.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add schedule form */}
          <div className="border border-slate-700 rounded-lg p-3 space-y-3 text-xs">
            <p className="font-medium text-slate-300">Add Schedule</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500">Start</label>
                <input
                  type="time"
                  value={newSched.start_time}
                  onChange={e => setNewSched(s => ({ ...s, start_time: e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-500">End</label>
                <input
                  type="time"
                  value={newSched.end_time}
                  onChange={e => setNewSched(s => ({ ...s, end_time: e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setNewSched(s => ({
                    ...s,
                    days_of_week: s.days_of_week.includes(i)
                      ? s.days_of_week.filter(x => x !== i)
                      : [...s.days_of_week, i]
                  }))}
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs border transition-colors',
                    newSched.days_of_week.includes(i)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-600 text-slate-400'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500">DL limit (Mbps)</label>
                <input
                  type="number" min={0}
                  value={newSched.download_limit}
                  onChange={e => setNewSched(s => ({ ...s, download_limit: +e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-500">UL limit (Mbps)</label>
                <input
                  type="number" min={0}
                  value={newSched.upload_limit}
                  onChange={e => setNewSched(s => ({ ...s, upload_limit: +e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button onClick={addSchedule} className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-1.5">
              <Plus size={14} /> Add Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
