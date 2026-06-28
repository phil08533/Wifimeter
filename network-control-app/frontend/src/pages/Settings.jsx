import { useState, useEffect } from 'react'
import { settingsApi } from '../services/api'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({ host: '', user: 'root', password: '', port: 22 })
  const [testStatus, setTestStatus] = useState(null) // null | 'testing' | 'ok' | 'fail'
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettings(s)
      if (s.openwrt_host) setForm(f => ({ ...f, host: s.openwrt_host, user: s.openwrt_user, port: s.openwrt_port }))
    })
  }, [])

  async function testConnection() {
    setTestStatus('testing')
    try {
      const r = await settingsApi.testRouter(form)
      setTestStatus(r.connected ? 'ok' : 'fail')
      setTestMsg(r.message)
    } catch (e) {
      setTestStatus('fail')
      setTestMsg(e.response?.data?.detail ?? 'Connection failed')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-auto h-full">
      <h2 className="font-semibold text-slate-100">Settings</h2>

      {/* Network info */}
      {settings && (
        <div className="card space-y-3">
          <h3 className="text-sm font-medium text-slate-300">Network Configuration</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Subnet</p>
              <p className="font-mono text-slate-200">{settings.subnet}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Scan Interval</p>
              <p className="font-mono text-slate-200">{settings.scan_interval}s</p>
            </div>
          </div>
        </div>
      )}

      {/* Router config */}
      <div className="card space-y-4">
        <h3 className="text-sm font-medium text-slate-300">OpenWrt Router Integration</h3>
        <p className="text-xs text-slate-500">
          Configure SSH access to your OpenWrt router to enable real bandwidth limits via tc/HTB.
          Without this, limits are logged locally only.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Router IP / Hostname</label>
            <input
              value={form.host}
              onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
              placeholder="192.168.1.1"
              className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Username</label>
            <input
              value={form.user}
              onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
              className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Port</label>
            <input
              type="number"
              value={form.port}
              onChange={e => setForm(f => ({ ...f, port: +e.target.value }))}
              className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={testConnection} disabled={testStatus === 'testing'} className="btn-primary">
            {testStatus === 'testing' ? <Loader className="animate-spin" size={15} /> : 'Test Connection'}
          </button>
          {testStatus === 'ok' && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle size={15}/> {testMsg}</span>}
          {testStatus === 'fail' && <span className="flex items-center gap-1 text-rose-400 text-sm"><XCircle size={15}/> {testMsg}</span>}
        </div>
      </div>

      {/* About */}
      <div className="card text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">About Wifimeter</p>
        <p>Network management dashboard built with FastAPI + React + Recharts.</p>
        <p>Supports OpenWrt via SSH for real QoS enforcement with tc/HTB.</p>
        <p className="font-mono">v1.0.0</p>
      </div>
    </div>
  )
}
