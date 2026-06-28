import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetails from './pages/DeviceDetails'
import Traffic from './pages/Traffic'
import Settings from './pages/Settings'
import { useWebSocket } from './hooks/useWebSocket'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

const PAGE_TITLES = {
  '/':         'Dashboard',
  '/devices':  'Devices',
  '/traffic':  'Traffic',
  '/settings': 'Settings',
}

export default function App() {
  const location = useLocation()
  const { data: wsData, connected } = useWebSocket(WS_URL)
  const summary = wsData?.summary

  const titleKey = Object.keys(PAGE_TITLES)
    .filter(k => location.pathname === k || location.pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title={PAGE_TITLES[titleKey] ?? 'Wifimeter'}
          connected={connected}
          summary={summary}
        />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/devices"       element={<Devices />} />
            <Route path="/devices/:id"   element={<DeviceDetails />} />
            <Route path="/traffic"       element={<Traffic />} />
            <Route path="/settings"      element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
