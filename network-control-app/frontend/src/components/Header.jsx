import { Wifi, WifiOff } from 'lucide-react'

export default function Header({ title, connected, summary }) {
  return (
    <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <h1 className="font-semibold text-slate-100">{title}</h1>
      <div className="flex items-center gap-6 text-sm">
        {summary && (
          <>
            <span className="text-slate-400">
              <span className="text-emerald-400 font-mono">{summary.online_devices}</span>
              <span className="text-slate-600"> / </span>
              <span className="font-mono">{summary.total_devices}</span>
              {' '}online
            </span>
            <span className="text-slate-400">
              ↓ <span className="text-sky-400 font-mono">{summary.total_download?.toFixed(1)}</span> Mbps
            </span>
            <span className="text-slate-400">
              ↑ <span className="text-violet-400 font-mono">{summary.total_upload?.toFixed(1)}</span> Mbps
            </span>
          </>
        )}
        <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Live' : 'Reconnecting'}
        </div>
      </div>
    </header>
  )
}
