'use client';
import { useState, useMemo } from 'react';
import { transportUtils } from '../utils/staffDataUtils';

export default function UserTransportLog({ isDarkMode, user, showMessage }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const passengers = useMemo(() => transportUtils.getPassengers(), [refreshKey]);
  const vehicles   = useMemo(() => transportUtils.getVehicles(),   [refreshKey]);
  const attendanceLogs = useMemo(() => transportUtils.getAttendance(), [refreshKey, attendanceDate]);

  // Find the passenger record matching this user by name
  const myAssignment = useMemo(() =>
    passengers.find(p => p.name === user?.name || p.id === user?.id),
    [passengers, user]
  );

  const assignedBus = useMemo(() =>
    myAssignment ? vehicles.find(v => v.id === myAssignment.vehicleId) : null,
    [vehicles, myAssignment]
  );

  const handleToggle = (field) => {
    if (!myAssignment) return;
    transportUtils.toggleAttendance(attendanceDate, myAssignment.id, field);
    setRefreshKey(k => k + 1);
    if (showMessage) showMessage(
      field === 'boarded' ? '✅ Boarding recorded!' : '📍 Drop-off recorded!',
      'success'
    );
  };

  // Build a full history list from all log keys
  const myHistory = useMemo(() => {
    if (!myAssignment) return [];
    return Object.keys(attendanceLogs)
      .filter(key => key.endsWith(`_${myAssignment.id}`))
      .map(key => {
        const date = key.replace(`_${myAssignment.id}`, '');
        return { date, ...attendanceLogs[key] };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceLogs, myAssignment]);

  if (!myAssignment) {
    return (
      <div className={`p-12 rounded-[2.5rem] border text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100 shadow-xl'}`}>
        <div className="w-24 h-24 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">🚌</div>
        <h3 className={`text-2xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Bus Assigned</h3>
        <p className={`font-bold max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
          You are not assigned to any school transport route. Contact the transport office for registration.
        </p>
      </div>
    );
  }

  const primaryText   = isDarkMode ? 'text-white'    : 'text-slate-900';
  const secondaryText = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const labelText     = isDarkMode ? 'text-gray-500' : 'text-slate-400';

  const todayKey = `${attendanceDate}_${myAssignment.id}`;
  const todayLog = attendanceLogs[todayKey] || {
    boarded: false, dropped: false, boardingTime: '-', droppingTime: '-'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Bus Info Banner */}
      <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-600/30">
              🚌
            </div>
            <div>
              <h3 className={`text-2xl font-black ${primaryText}`}>{assignedBus?.busNumber || 'Assigned Bus'}</h3>
              <p className="text-blue-600 font-black uppercase tracking-widest text-[10px]">{assignedBus?.routeNumber || 'Route N/A'}</p>
              <p className={`text-xs font-bold mt-0.5 ${secondaryText}`}>Driver: {assignedBus?.driverName || '-'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-[10px] font-black uppercase ${labelText}`}>Your Stop</p>
            <p className={`text-xl font-black ${primaryText}`}>{myAssignment.stop}</p>
          </div>
        </div>

        {/* Date selector */}
        <div className="flex justify-between items-center mb-6">
          <p className={`text-xs font-black uppercase ${labelText}`}>Log Date</p>
          <input
            type="date"
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
            className={`px-4 py-2 rounded-xl border text-xs font-black ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
        </div>

        {/* Action Buttons — Board & Drop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* BOARD button */}
          <button
            onClick={() => handleToggle('boarded')}
            className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all hover:scale-[1.02] active:scale-95 ${
              todayLog.boarded
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                : `border-slate-200 dark:border-gray-700 ${isDarkMode ? 'bg-gray-900/50 hover:border-emerald-500' : 'bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50'}`
            }`}
          >
            {todayLog.boarded && <div className="absolute top-4 right-4 text-2xl">✅</div>}
            <div className={`text-4xl mb-4 transition-transform group-hover:scale-110 ${todayLog.boarded ? '' : 'opacity-40 grayscale'}`}>🏠</div>
            <p className="text-sm font-black uppercase tracking-widest mb-1">Boarded / Picked Up</p>
            <p className={`text-[11px] font-bold ${todayLog.boarded ? 'text-emerald-100' : 'text-slate-400'}`}>
              {todayLog.boarded ? `Marked at ${todayLog.boardingTime}` : 'Tap when you board the bus'}
            </p>
          </button>

          {/* DROP button */}
          <button
            onClick={() => handleToggle('dropped')}
            className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all hover:scale-[1.02] active:scale-95 ${
              todayLog.dropped
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30'
                : `border-slate-200 dark:border-gray-700 ${isDarkMode ? 'bg-gray-900/50 hover:border-blue-600' : 'bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`
            }`}
          >
            {todayLog.dropped && <div className="absolute top-4 right-4 text-2xl">✅</div>}
            <div className={`text-4xl mb-4 transition-transform group-hover:scale-110 ${todayLog.dropped ? '' : 'opacity-40 grayscale'}`}>📍</div>
            <p className="text-sm font-black uppercase tracking-widest mb-1">Dropped / Reached Home</p>
            <p className={`text-[11px] font-bold ${todayLog.dropped ? 'text-blue-100' : 'text-slate-400'}`}>
              {todayLog.dropped ? `Marked at ${todayLog.droppingTime}` : 'Tap when you reach your destination'}
            </p>
          </button>
        </div>

        {/* Today's Summary Row */}
        {(todayLog.boarded || todayLog.dropped) && (
          <div className={`mt-8 p-5 rounded-2xl flex flex-wrap gap-6 justify-around ${isDarkMode ? 'bg-gray-900/60' : 'bg-slate-50'}`}>
            <div className="text-center">
              <p className={`text-[9px] font-black uppercase ${labelText}`}>Pickup Time</p>
              <p className={`text-xl font-black ${todayLog.boarded ? 'text-emerald-500' : secondaryText}`}>
                {todayLog.boardingTime || '-'}
              </p>
            </div>
            <div className="text-center">
              <p className={`text-[9px] font-black uppercase ${labelText}`}>Drop Time</p>
              <p className={`text-xl font-black ${todayLog.dropped ? 'text-blue-500' : secondaryText}`}>
                {todayLog.droppingTime || '-'}
              </p>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="mt-10 pt-10 border-t border-slate-100 dark:border-gray-700">
          <h4 className={`text-lg font-black mb-6 ${primaryText}`}>📖 Commute History (All Dates)</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest ${labelText}`}>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-center py-3 px-2">Boarded</th>
                  <th className="text-center py-3 px-2">Dropped</th>
                  <th className="text-right py-3 px-2">Pickup Time</th>
                  <th className="text-right py-3 px-2">Drop Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
                {myHistory.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-900/50 transition-all">
                    <td className={`py-4 px-2 text-sm font-black ${primaryText}`}>{log.date}</td>
                    <td className="py-4 px-2 text-center text-base">{log.boarded ? '✅' : '❌'}</td>
                    <td className="py-4 px-2 text-center text-base">{log.dropped ? '✅' : '❌'}</td>
                    <td className={`py-4 px-2 text-right text-xs font-black ${log.boarded ? 'text-emerald-500' : secondaryText}`}>
                      {log.boardingTime || '-'}
                    </td>
                    <td className={`py-4 px-2 text-right text-xs font-black ${log.dropped ? 'text-blue-500' : secondaryText}`}>
                      {log.droppingTime || '-'}
                    </td>
                  </tr>
                ))}
                {myHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-sm font-bold text-slate-400">
                      No commute history found yet. Start by clicking a button above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
