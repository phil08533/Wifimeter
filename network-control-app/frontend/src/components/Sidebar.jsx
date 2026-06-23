import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Monitor, Activity, Settings, Wifi } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Monitor,         label: 'Devices' },
  { to: '/traffic', icon: Activity,        label: 'Traffic' },
  { to: '/settings',icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-5 flex items-center gap-2.5 border-b border-slate-800">
        <Wifi className="text-indigo-400" size={22} />
        <span className="text-lg font-semibold tracking-tight">Wifimeter</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600/20 text-indigo-300'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            )}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600">
        v1.0.0
      </div>
    </aside>
  )
}
