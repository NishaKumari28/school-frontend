'use client';
import { useState, useMemo } from 'react';
import { transportUtils } from '../utils/staffDataUtils';

export default function StaffTransport({ isDarkMode, showMessage }) {
  const [activeSubTab, setActiveSubTab] = useState('routes');
  const [refreshKey, setRefreshKey] = useState(0);

  const routes = useMemo(() => transportUtils.getRoutes(), [refreshKey]);
  const vehicles = useMemo(() => transportUtils.getVehicles(), [refreshKey]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub Navigation */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-gray-800 w-fit">
        <button 
          onClick={() => setActiveSubTab('routes')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'routes' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Active Routes
        </button>
        <button 
          onClick={() => setActiveSubTab('fleet')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'fleet' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Vehicle Fleet
        </button>
      </div>

      {activeSubTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routes.map((route) => (
            <div key={route.id} className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl">
                    🚌
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{route.name}</h3>
                    <p className="text-xs text-slate-500">Route ID: {route.id}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Active</span>
              </div>

              <div className="space-y-4">
                <div className="relative pl-6 space-y-4 border-l-2 border-dashed border-slate-200 dark:border-gray-700 ml-6">
                  {route.stops.map((stop, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-amber-500 dark:bg-gray-800" />
                      <p className="text-sm font-medium">{stop}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] text-white font-bold">+12</div>
                </div>
                <button className="text-blue-600 text-xs font-bold hover:underline">Full Passenger List →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'fleet' && (
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <h2 className="text-xl font-bold mb-6">Fleet Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-700">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Vehicles</p>
              <h3 className="text-2xl font-black">12</h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-700">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">On Service</p>
              <h3 className="text-2xl font-black text-emerald-600">8</h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-700">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">In Maintenance</p>
              <h3 className="text-2xl font-black text-red-500">4</h3>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400">Recent Service Alerts</h4>
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-700">Bus #04 (KA-01-2345)</p>
                  <p className="text-xs text-red-600">Insurance expiring in 3 days</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Renew Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
