'use client';
import { useState, useMemo } from 'react';
import { transportUtils } from '../utils/staffDataUtils';

export default function StaffTransport({ isDarkMode, showMessage, students = [], teachers = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('passengers');
  const [refreshKey, setRefreshKey] = useState(0);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [passengerSearch, setPassengerSearch] = useState('');
  const [passengerTypeFilter, setPassengerTypeFilter] = useState('all');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  
  // Modal States
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  
  const [vehicleForm, setVehicleForm] = useState({ 
    busNumber: '', 
    plateNumber: '', 
    routeNumber: '', 
    driverName: '', 
    driverPhone: '', 
    capacity: 40,
    status: 'Available'
  });

  const [passengerForm, setPassengerForm] = useState({
    type: 'Student',
    name: '',
    vehicleId: '',
    stop: '',
    class: '',
    section: '',
    isManual: false
  });

  const routes = useMemo(() => transportUtils.getRoutes(), [refreshKey]);
  const vehicles = useMemo(() => transportUtils.getVehicles(), [refreshKey]);
  const passengers = useMemo(() => transportUtils.getPassengers(), [refreshKey]);

  // Attendance Logic
  const attendanceLogs = useMemo(() => transportUtils.getAttendance(), [refreshKey, attendanceDate]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.busNumber.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.driverName.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.routeNumber.toLowerCase().includes(vehicleSearch.toLowerCase())
    );
  }, [vehicles, vehicleSearch]);

  const filteredPassengers = useMemo(() => {
    return passengers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(passengerSearch.toLowerCase()) ||
                          p.stop.toLowerCase().includes(passengerSearch.toLowerCase());
      const matchesType = passengerTypeFilter === 'all' || p.type === passengerTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [passengers, passengerSearch, passengerTypeFilter]);

  const filteredAttendance = useMemo(() => {
    return passengers.filter(p => p.name.toLowerCase().includes(attendanceSearch.toLowerCase()));
  }, [passengers, attendanceSearch]);

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    if (vehicleForm.driverPhone.length !== 10) {
      showMessage('Phone number must be 10 digits', 'error');
      return;
    }
    transportUtils.saveVehicle(vehicleForm);
    setRefreshKey(k => k + 1);
    setShowVehicleModal(false);
    setVehicleForm({ busNumber: '', plateNumber: '', routeNumber: '', driverName: '', driverPhone: '', capacity: 40, status: 'Available' });
    showMessage('Vehicle registered successfully!', 'success');
  };

  const handleDeleteVehicle = (id) => {
    if (confirm('Are you sure you want to remove this vehicle?')) {
      transportUtils.deleteVehicle(id);
      setRefreshKey(k => k + 1);
      showMessage('Vehicle removed', 'warning');
    }
  };

  const handleAssignPassenger = (e) => {
    e.preventDefault();
    const finalData = passengerForm.isManual 
      ? { ...passengerForm, name: `${passengerForm.name} (${passengerForm.class}-${passengerForm.section})` }
      : passengerForm;
    
    transportUtils.assignPassenger(finalData);
    setRefreshKey(k => k + 1);
    setShowPassengerModal(false);
    setPassengerForm({ type: 'Student', name: '', vehicleId: '', stop: '', class: '', section: '', isManual: false });
    showMessage('Passenger assigned successfully', 'success');
  };

  const getVehicleRoute = (vId) => {
    const v = vehicles.find(x => x.id === vId);
    return routes.find(r => r.number === v?.routeNumber || r.name === v?.routeNumber);
  };

  const primaryText = isDarkMode ? 'text-white' : 'text-slate-900';
  const secondaryText = isDarkMode ? 'text-gray-400' : 'text-slate-700';
  const labelText = isDarkMode ? 'text-gray-500' : 'text-slate-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* 1. Sub Navigation */}
      <div className={`flex flex-wrap p-1.5 rounded-2xl w-fit ${isDarkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
        {[
          { id: 'passengers', label: 'Registry', icon: '👥' },
          { id: 'fleet', label: 'Bus List', icon: '🚍' },
          { id: 'attendance', label: 'Daily Log Book', icon: '📖' },
          { id: 'tracking', label: 'Live Map', icon: '🛰️' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                : `${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-700 hover:text-black'}`
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. Passengers Registry Tab */}
      {activeSubTab === 'passengers' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Passenger Registry</h2>
              <p className={`text-sm font-bold ${secondaryText}`}>Manage transport assignments for students and teachers</p>
            </div>
            <button 
              onClick={() => setShowPassengerModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg hover:scale-105 transition-all"
            >
              + ASSIGN PASSENGER
            </button>
          </div>

          <div className={`p-6 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input 
                  placeholder={`Search ${passengerTypeFilter === 'all' ? 'Passengers' : passengerTypeFilter + 's'}...`} 
                  value={passengerSearch}
                  onChange={e => setPassengerSearch(e.target.value)}
                  className={`w-full pl-12 pr-6 py-3.5 rounded-2xl border text-sm transition-all placeholder:text-slate-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900 font-bold'}`}
                />
              </div>

              <div className={`flex p-1 rounded-2xl ${isDarkMode ? 'bg-gray-900/80' : 'bg-slate-200'}`}>
                 {['all', 'Student', 'Teacher'].map(type => (
                    <button
                      key={type}
                      onClick={() => setPassengerTypeFilter(type)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        passengerTypeFilter === type 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-900 hover:bg-slate-300/50'}`
                      }`}
                    >
                      {type === 'all' ? 'All' : type + 's'}
                    </button>
                 ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${labelText} border-b border-slate-100 dark:border-gray-700 text-[10px] font-black uppercase`}>
                    <th className="p-6 text-left">Passenger</th>
                    <th className="p-6 text-left">Assigned Bus</th>
                    <th className="p-6 text-left">Pickup/Drop Stop</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
                  {filteredPassengers.map(p => {
                    const v = vehicles.find(x => x.id === p.vehicleId);
                    return (
                      <tr key={p.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                        <td className="p-6">
                          <p className={`font-black text-lg ${primaryText}`}>{p.name}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.type === 'Student' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{p.type}</span>
                        </td>
                        <td className="p-6">
                          <p className={`font-black text-indigo-600`}>{v?.busNumber || 'N/A'}</p>
                          <p className={`text-[10px] font-black ${secondaryText}`}>{v?.routeNumber || 'No Route'}</p>
                        </td>
                        <td className="p-6">
                          <p className={`font-black ${primaryText}`}>{p.stop}</p>
                        </td>
                        <td className="p-6 text-right">
                           <button onClick={() => { transportUtils.removePassenger(p.id); setRefreshKey(k=>k+1); showMessage('Assignment removed','warning'); }} className="text-red-500 hover:underline text-[10px] font-black uppercase">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bus List Tab */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Bus Fleet Overview</h2>
              <p className={`text-sm font-bold ${secondaryText}`}>Manage registered vehicles and track seat occupancy</p>
            </div>
            <button 
              onClick={() => setShowVehicleModal(true)}
              className="px-6 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black shadow-lg hover:scale-105 transition-all"
            >
              + REGISTER NEW BUS
            </button>
          </div>

          {/* Availability Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {vehicles.map(v => {
                const occupied = passengers.filter(p => p.vehicleId === v.id).length;
                const remaining = Math.max(0, v.capacity - occupied);
                const percent = Math.min(100, (occupied / v.capacity) * 100);
                
                return (
                   <div key={`stat-${v.id}`} className={`p-6 rounded-[2rem] border shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h4 className={`font-black text-lg ${primaryText}`}>{v.busNumber}</h4>
                            <p className={`text-[10px] font-black uppercase ${labelText}`}>{v.routeNumber}</p>
                         </div>
                         <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${remaining > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {remaining > 0 ? 'Available' : 'Full'}
                         </span>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between items-end">
                            <p className={`text-2xl font-black ${primaryText}`}>{remaining}</p>
                            <p className={`text-[10px] font-black ${labelText}`}>Seats Left</p>
                         </div>
                         <div className="h-1.5 w-full bg-slate-100 dark:bg-gray-900 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }} />
                         </div>
                         <p className={`text-[9px] font-black uppercase text-center ${secondaryText}`}>{occupied} / {v.capacity} Members Added</p>
                      </div>
                   </div>
                );
             })}
          </div>

          <div className={`p-6 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-4 mb-8">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input 
                  placeholder="Filter by Bus #, Plate, or Route..." 
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  className={`w-full pl-12 pr-6 py-3.5 rounded-2xl border text-sm transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200 text-slate-900 font-bold'}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${labelText} border-b border-slate-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-[0.2em]`}>
                    <th className="p-6 text-left">Bus Details</th>
                    <th className="p-6 text-left">Route & Plate</th>
                    <th className="p-6 text-left">Driver Info</th>
                    <th className="p-6 text-center">Status</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
                  {filteredVehicles.map(v => (
                    <tr key={v.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all group">
                      <td className="p-6">
                        <p className={`font-black text-lg ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{v.busNumber}</p>
                        <p className={`text-[10px] font-black uppercase ${secondaryText}`}>Cap: {v.capacity} Seats</p>
                      </td>
                      <td className="p-6">
                        <p className={`font-black ${primaryText}`}>{v.routeNumber}</p>
                        <p className={`text-[10px] font-black font-mono tracking-tighter ${secondaryText}`}>{v.plateNumber}</p>
                      </td>
                      <td className="p-6">
                        <p className={`font-black ${primaryText}`}>{v.driverName}</p>
                        <p className={`text-[10px] font-black ${secondaryText}`}>📞 {v.driverPhone}</p>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                          v.status === 'On Trip' ? 'bg-emerald-100 text-emerald-600' :
                          v.status === 'Maintenance' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => handleDeleteVehicle(v.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Daily Log Book (Attendance) Tab */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Daily Log Book</h2>
              <p className={`text-sm font-bold ${secondaryText}`}>View boarding and dropping status (View Only for Staff)</p>
            </div>
            <input 
              type="date" 
              value={attendanceDate} 
              onChange={e => setAttendanceDate(e.target.value)} 
              className={`px-6 py-3 rounded-2xl border font-black text-sm shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>

          <div className={`p-8 rounded-[3rem] border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-4 mb-10">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input 
                  placeholder="Search passenger in log book..." 
                  value={attendanceSearch}
                  onChange={e => setAttendanceSearch(e.target.value)}
                  className={`w-full pl-12 pr-6 py-4 rounded-2xl border text-sm transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 font-bold'}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${labelText} border-b border-slate-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest`}>
                    <th className="p-6 text-left">Passenger</th>
                    <th className="p-6 text-left">Bus & Stop</th>
                    <th className="p-6 text-center">Boarding</th>
                    <th className="p-6 text-center">Dropping</th>
                    <th className="p-6 text-right">Pickup Time</th>
                    <th className="p-6 text-right">Drop Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
                  {filteredAttendance.map(p => {
                    const log = attendanceLogs[`${attendanceDate}_${p.id}`] || { boarded: false, dropped: false, boardingTime: '-', droppingTime: '-' };
                    const v = vehicles.find(x => x.id === p.vehicleId);
                    return (
                      <tr key={p.id} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-all">
                        <td className="p-6">
                          <p className={`font-black ${primaryText}`}>{p.name}</p>
                          <p className={`text-[9px] font-black uppercase ${secondaryText}`}>{p.type}</p>
                        </td>
                        <td className="p-6">
                           <p className={`font-bold text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{v?.busNumber || 'N/A'}</p>
                           <p className={`text-[10px] font-black ${secondaryText}`}>{p.stop}</p>
                        </td>
                        <td className="p-6 text-center">
                           <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl ${log.boarded ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-gray-700 text-slate-300'}`}>
                             🏠
                           </div>
                        </td>
                        <td className="p-6 text-center">
                           <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl ${log.dropped ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-gray-700 text-slate-300'}`}>
                             📍
                           </div>
                        </td>
                        <td className="p-6 text-right font-bold text-xs">
                           {log.boardingTime || '-'}
                        </td>
                        <td className="p-6 text-right font-bold text-xs">
                           {log.droppingTime || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Live Map Tab */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>Live Trip Monitor</h2>
              <p className={`text-sm font-bold ${secondaryText}`}>Track any bus by number or route name</p>
            </div>
            <div className="relative w-full max-w-sm">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input 
                  placeholder="Enter Bus # to track..." 
                  value={trackingSearch}
                  onChange={e => setTrackingSearch(e.target.value)}
                  className={`w-full pl-12 pr-6 py-3.5 rounded-2xl border text-sm transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900 font-bold focus:ring-4 focus:ring-blue-500/10'}`}
                />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {vehicles.filter(v => 
                v.status !== 'Maintenance' && 
                (v.busNumber.toLowerCase().includes(trackingSearch.toLowerCase()) || 
                 v.routeNumber.toLowerCase().includes(trackingSearch.toLowerCase()))
             ).map(v => (
                <div key={v.id} className={`p-6 rounded-[2.5rem] border shadow-xl relative overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">🚌</div>
                         <div>
                            <h4 className={`font-black text-lg ${primaryText}`}>{v.busNumber}</h4>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${labelText}`}>{v.routeNumber}</p>
                         </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${v.status === 'On Trip' ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>{v.status}</span>
                   </div>

                   <div className="relative h-1 bg-slate-100 dark:bg-gray-700 rounded-full mb-8 mt-10">
                      <div className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: v.status === 'On Trip' ? '65%' : '0%' }} />
                      <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000" style={{ left: v.status === 'On Trip' ? '65%' : '0%' }}>
                         <div className="w-4 h-4 rounded-full bg-white border-4 border-blue-600 shadow-lg" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/50">
                         <p className={`text-[9px] font-black uppercase mb-1 ${labelText}`}>Driver</p>
                         <p className={`text-xs font-bold ${primaryText}`}>{v.driverName}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/50">
                         <p className={`text-[9px] font-black uppercase mb-1 ${labelText}`}>Seats</p>
                         <p className={`text-xs font-bold ${primaryText}`}>{passengers.filter(p => p.vehicleId === v.id).length} / {v.capacity}</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* 6. Modals */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowVehicleModal(false)} />
           <div className={`relative w-full max-w-xl p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
              <h3 className={`text-2xl font-black mb-8 ${primaryText}`}>Register New Vehicle</h3>
              <form onSubmit={handleSaveVehicle} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Bus Number</label>
                       <input required placeholder="e.g. Bus #05" value={vehicleForm.busNumber} onChange={e=>setVehicleForm({...vehicleForm, busNumber:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`} />
                    </div>
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Plate Number</label>
                       <input required placeholder="e.g. KA-01-XXXX" value={vehicleForm.plateNumber} onChange={e=>setVehicleForm({...vehicleForm, plateNumber:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Assign Route (Manual)</label>
                       <input 
                         required 
                         placeholder="e.g. R-101" 
                         value={vehicleForm.routeNumber} 
                         onChange={e=>setVehicleForm({...vehicleForm, routeNumber:e.target.value})} 
                         className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`} 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Driver Phone (10 Digits)</label>
                       <input 
                        type="tel" 
                        pattern="[0-9]{10}" 
                        maxLength={10} 
                        required 
                        value={vehicleForm.driverPhone} 
                        onChange={e=>setVehicleForm({...vehicleForm, driverPhone:e.target.value.replace(/\D/g,'')})} 
                        className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`} 
                       />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Driver Name</label>
                    <input required value={vehicleForm.driverName} onChange={e=>setVehicleForm({...vehicleForm, driverName:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`} />
                 </div>

                 <div className="flex gap-4 pt-8">
                    <button type="button" onClick={()=>setShowVehicleModal(false)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Discard</button>
                    <button type="submit" className="flex-[2] py-4 rounded-2xl bg-amber-600 text-white font-black text-xs uppercase shadow-lg shadow-amber-600/20 hover:scale-[1.02] active:scale-95 transition-all">Register Vehicle</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showPassengerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPassengerModal(false)} />
           <div className={`relative w-full max-w-xl p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
              <h3 className={`text-2xl font-black mb-8 ${primaryText}`}>Assign New Passenger</h3>
              <form onSubmit={handleAssignPassenger} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-900/50 p-2 rounded-2xl">
                    <button type="button" onClick={()=>setPassengerForm({...passengerForm, type:'Student', name:'', isManual: false})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${passengerForm.type === 'Student' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-slate-400'}`}>Student</button>
                    <button type="button" onClick={()=>setPassengerForm({...passengerForm, type:'Teacher', name:'', isManual: false})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${passengerForm.type === 'Teacher' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-600' : 'text-slate-400'}`}>Teacher</button>
                 </div>

                 <div className="flex items-center justify-end px-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                       <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-600 transition-colors">Manual Entry</span>
                       <input 
                         type="checkbox" 
                         checked={passengerForm.isManual} 
                         onChange={e => setPassengerForm({...passengerForm, isManual: e.target.checked, name: '', class: '', section: ''})} 
                         className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                       />
                    </label>
                 </div>

                 {passengerForm.isManual ? (
                   <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                         <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>{passengerForm.type} Name</label>
                         <input required placeholder={`Enter ${passengerForm.type} Name`} value={passengerForm.name} onChange={e=>setPassengerForm({...passengerForm, name:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`} />
                      </div>
                      {passengerForm.type === 'Student' && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Class</label>
                              <input required placeholder="e.g. 5" value={passengerForm.class} onChange={e=>setPassengerForm({...passengerForm, class:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`} />
                           </div>
                           <div className="space-y-1.5">
                              <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Sec</label>
                              <input required placeholder="e.g. A" value={passengerForm.section} onChange={e=>setPassengerForm({...passengerForm, section:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`} />
                           </div>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                      <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Select {passengerForm.type}</label>
                      <select required value={passengerForm.name} onChange={e=>setPassengerForm({...passengerForm, name:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`}>
                         <option value="">Choose {passengerForm.type}</option>
                         {(passengerForm.type === 'Student' ? students : teachers).map((x, i) => (
                            <option key={i} value={x.name}>{x.name} {x.class ? `(${x.class}-${x.section})` : (x.subject ? `(${x.subject})` : '')}</option>
                         ))}
                      </select>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Assign Bus</label>
                       <select required value={passengerForm.vehicleId} onChange={e=>setPassengerForm({...passengerForm, vehicleId:e.target.value, stop: ''})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`}>
                          <option value="">Select Bus</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.busNumber} ({v.routeNumber})</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className={`text-[10px] font-black uppercase ml-2 ${labelText}`}>Pickup/Drop Stop</label>
                       {getVehicleRoute(passengerForm.vehicleId)?.stops ? (
                         <select required value={passengerForm.stop} onChange={e=>setPassengerForm({...passengerForm, stop:e.target.value})} className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'}`}>
                            <option value="">Choose Stop</option>
                            {getVehicleRoute(passengerForm.vehicleId).stops.map((s, i) => <option key={i} value={s}>{s}</option>)}
                            <option value="CUSTOM">-- Manual Entry --</option>
                         </select>
                       ) : (
                         <input 
                           required 
                           placeholder="Enter Stop Name" 
                           value={passengerForm.stop} 
                           onChange={e=>setPassengerForm({...passengerForm, stop:e.target.value})} 
                           className={`w-full px-6 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold focus:bg-white focus:border-indigo-500'}`} 
                         />
                       )}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-8">
                    <button type="button" onClick={()=>setShowPassengerModal(false)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                    <button type="submit" className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all">Assign Now</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
