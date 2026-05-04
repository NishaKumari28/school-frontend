'use client';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, defs, linearGradient, stop
} from 'recharts';
import { transportUtils } from '../utils/staffDataUtils';

/**
 * TransportStatsPanel
 * Props:
 *   isDarkMode   - boolean
 *   passengerIds - string[] | 'all'   (filter by passenger id; 'all' = everyone)
 *   showMessage  - fn
 */
export default function TransportStatsPanel({ isDarkMode, passengerIds = 'all', showMessage }) {
  const today = new Date();
  const [period, setPeriod] = useState('weekly');          // 'daily' | 'weekly' | 'monthly'
  const [registerMonth, setRegisterMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );

  const allPassengers = useMemo(() => transportUtils.getPassengers(), []);
  const allVehicles   = useMemo(() => transportUtils.getVehicles(),   []);
  const allLogs       = useMemo(() => transportUtils.getAttendance(),  []);

  // Only the passengers relevant for this scope
  const myPassengers = useMemo(() => {
    if (passengerIds === 'all') return allPassengers;
    return allPassengers.filter(p => passengerIds.includes(p.id));
  }, [allPassengers, passengerIds]);

  const myPassengerIdSet = useMemo(() => new Set(myPassengers.map(p => p.id)), [myPassengers]);

  // Parse all log entries relevant to this scope
  const parsedLogs = useMemo(() => {
    const result = [];
    Object.keys(allLogs).forEach(key => {
      const parts = key.split('_');
      // key format: YYYY-MM-DD_passengerId
      if (parts.length < 2) return;
      const passengerId = parts.slice(1).join('_');
      const date = parts[0];
      if (!myPassengerIdSet.has(passengerId)) return;
      result.push({ date, passengerId, ...allLogs[key] });
    });
    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allLogs, myPassengerIdSet]);

  // ── CHART DATA ──────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'daily') {
      // Last 14 days
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        const dayLogs = parsedLogs.filter(l => l.date === key);
        days.push({
          label,
          Boarded: dayLogs.filter(l => l.boarded).length,
          Dropped: dayLogs.filter(l => l.dropped).length,
        });
      }
      return days;
    }

    if (period === 'weekly') {
      // Last 8 weeks
      const weeks = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(start.getDate() - i * 7 - 6);
        const end   = new Date(now);
        end.setDate(end.getDate() - i * 7);
        const label = `W${8 - i}`;
        const startStr = start.toISOString().split('T')[0];
        const endStr   = end.toISOString().split('T')[0];
        const weekLogs = parsedLogs.filter(l => l.date >= startStr && l.date <= endStr);
        weeks.push({
          label,
          Boarded: weekLogs.filter(l => l.boarded).length,
          Dropped: weekLogs.filter(l => l.dropped).length,
        });
      }
      return weeks;
    }

    // monthly — last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${yr}-${mo}`;
      const label = d.toLocaleString('default', { month: 'short' }) + ` '${String(yr).slice(2)}`;
      const mLogs = parsedLogs.filter(l => l.date.startsWith(prefix));
      months.push({
        label,
        Boarded: mLogs.filter(l => l.boarded).length,
        Dropped: mLogs.filter(l => l.dropped).length,
      });
    }
    return months;
  }, [parsedLogs, period]);

  // ── MONTHLY REGISTER DATA ────────────────────────────────────────────────────
  const registerRows = useMemo(() => {
    const [yr, mo] = registerMonth.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const rows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayLogs = parsedLogs.filter(l => l.date === dateStr);

      if (myPassengers.length === 1) {
        // Teacher / Parent view — single row per date
        const log = dayLogs[0] || {};
        rows.push({
          date: dateStr,
          name: myPassengers[0]?.name || '-',
          boarded: log.boarded || false,
          boardingTime: log.boardingTime || '-',
          dropped: log.dropped || false,
          droppingTime: log.droppingTime || '-',
        });
      } else {
        // Staff view — one row per passenger per date that has a log
        dayLogs.forEach(log => {
          const p = myPassengers.find(x => x.id === log.passengerId);
          if (!p) return;
          const v = allVehicles.find(x => x.id === p.vehicleId);
          rows.push({
            date: dateStr,
            name: p.name,
            type: p.type,
            bus: v?.busNumber || '-',
            boarded: log.boarded || false,
            boardingTime: log.boardingTime || '-',
            dropped: log.dropped || false,
            droppingTime: log.droppingTime || '-',
          });
        });
      }
    }
    return rows.filter(r => myPassengers.length > 1 ? true : (r.boarded || r.dropped));
  }, [parsedLogs, registerMonth, myPassengers, allVehicles]);

  const primaryText   = isDarkMode ? 'text-white'    : 'text-slate-900';
  const secondaryText = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const labelText     = isDarkMode ? 'text-gray-500' : 'text-slate-400';
  const cardBg        = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── CHART SECTION ── */}
      <div className={`p-8 rounded-[2.5rem] border shadow-xl ${cardBg}`}>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h3 className={`text-xl font-black ${primaryText}`}>📊 Transport Activity</h3>
            <p className={`text-xs font-bold mt-1 ${secondaryText}`}>Pick-up & Drop-off counts over time</p>
          </div>
          <div className={`flex p-1 rounded-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-slate-100'}`}>
            {['daily','weekly','monthly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-lg'
                    : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-800 hover:bg-slate-200'}`
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {chartData.every(d => d.Boarded === 0 && d.Dropped === 0) ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <span className="text-5xl">📭</span>
            <p className={`text-sm font-bold ${secondaryText}`}>No commute data recorded yet for this period.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradBoarded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradDropped" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={isDarkMode ? '#1f2937' : '#f1f5f9'}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: isDarkMode ? '#6b7280' : '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: isDarkMode ? '#6b7280' : '#94a3b8', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '1.25rem',
                    border: 'none',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                    background: isDarkMode ? '#111827' : '#ffffff',
                    padding: '12px 20px',
                  }}
                  labelStyle={{
                    color: isDarkMode ? '#e5e7eb' : '#0f172a',
                    fontWeight: 900,
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                  itemStyle={{ fontWeight: 700, fontSize: 12 }}
                  cursor={{ stroke: isDarkMode ? '#374151' : '#e2e8f0', strokeWidth: 2 }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '18px', fontSize: '12px', fontWeight: 800 }}
                  formatter={(value) =>
                    value === 'Boarded'
                      ? <span style={{ color: '#10b981' }}>🏠 Boarded</span>
                      : <span style={{ color: '#6366f1' }}>📍 Dropped</span>
                  }
                />
                <Area
                  type="monotone"
                  dataKey="Boarded"
                  name="Boarded"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#gradBoarded)"
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="Dropped"
                  name="Dropped"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#gradDropped)"
                  dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── MONTHLY REGISTER ── */}
      <div className={`p-8 rounded-[2.5rem] border shadow-xl ${cardBg}`}>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h3 className={`text-xl font-black ${primaryText}`}>📋 Monthly Register</h3>
            <p className={`text-xs font-bold mt-1 ${secondaryText}`}>Read-only. Auto-filled from daily logs.</p>
          </div>
          <input
            type="month"
            value={registerMonth}
            onChange={e => setRegisterMonth(e.target.value)}
            className={`px-5 py-3 rounded-2xl border text-sm font-black ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
        </div>

        {registerRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <span className="text-4xl">📭</span>
            <p className={`text-sm font-bold ${secondaryText}`}>No data recorded for {registerMonth}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-slate-100 text-slate-400'}`}>
                  <th className="p-4 text-left">Date</th>
                  {myPassengers.length > 1 && <th className="p-4 text-left">Passenger</th>}
                  {myPassengers.length > 1 && <th className="p-4 text-left">Bus</th>}
                  <th className="p-4 text-center">Boarded</th>
                  <th className="p-4 text-center">Pickup Time</th>
                  <th className="p-4 text-center">Dropped</th>
                  <th className="p-4 text-center">Drop Time</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700/50' : 'divide-slate-50'}`}>
                {registerRows.map((row, i) => (
                  <tr key={i} className={`transition-all ${isDarkMode ? 'hover:bg-gray-700/30' : 'hover:bg-slate-50'}`}>
                    <td className={`p-4 text-xs font-black ${primaryText}`}>{row.date}</td>
                    {myPassengers.length > 1 && (
                      <td className="p-4">
                        <p className={`text-xs font-black ${primaryText}`}>{row.name}</p>
                        {row.type && (
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${row.type === 'Student' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {row.type}
                          </span>
                        )}
                      </td>
                    )}
                    {myPassengers.length > 1 && (
                      <td className={`p-4 text-xs font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{row.bus}</td>
                    )}
                    <td className="p-4 text-center text-base">{row.boarded ? '✅' : '—'}</td>
                    <td className={`p-4 text-center text-xs font-black ${row.boarded ? 'text-emerald-500' : labelText}`}>
                      {row.boardingTime}
                    </td>
                    <td className="p-4 text-center text-base">{row.dropped ? '✅' : '—'}</td>
                    <td className={`p-4 text-center text-xs font-black ${row.dropped ? 'text-blue-500' : labelText}`}>
                      {row.droppingTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
