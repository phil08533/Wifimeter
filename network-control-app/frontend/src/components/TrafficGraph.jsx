import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs space-y-1">
      <p className="text-slate-400 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{p.value.toFixed(2)} Mbps</span>
        </p>
      ))}
    </div>
  )
}

export default function TrafficGraph({ data = [], height = 180 }) {
  const chartData = data.map(p => ({
    time: formatTime(p.timestamp),
    Download: parseFloat(p.download_mbps.toFixed(3)),
    Upload:   parseFloat(p.upload_mbps.toFixed(3)),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="ul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}M`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 4 }}
          iconType="circle"
          iconSize={8}
        />
        <Area type="monotone" dataKey="Download" stroke="#38bdf8" fill="url(#dl)" strokeWidth={1.5} dot={false} />
        <Area type="monotone" dataKey="Upload"   stroke="#a78bfa" fill="url(#ul)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
