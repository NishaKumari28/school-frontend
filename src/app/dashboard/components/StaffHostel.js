'use client';
import { useState, useMemo } from 'react';
import { hostelUtils } from '../utils/staffDataUtils';

export default function StaffHostel({ isDarkMode, showMessage }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({ roomNumber: '', type: '4-Seater', floor: '1st', status: 'Available', beds: 4, occupied: 0 });

  const rooms = useMemo(() => hostelUtils.getRooms(), [refreshKey]);
  const visitors = useMemo(() => hostelUtils.getVisitors(), [refreshKey]);

  const handleSaveRoom = (e) => {
    e.preventDefault();
    hostelUtils.saveRoom(roomForm);
    setShowRoomModal(false);
    setRefreshKey(prev => prev + 1);
    if (showMessage) showMessage('Room saved successfully', 'success');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Occupied': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cleaning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Maintenance': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub Navigation */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-gray-800 w-fit">
        <button 
          onClick={() => setActiveSubTab('inventory')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'inventory' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Room Inventory
        </button>
        <button 
          onClick={() => setActiveSubTab('visitors')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'visitors' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
        >
          Visitor Logs
        </button>
      </div>

      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Room Management</h2>
            <button 
              onClick={() => { setRoomForm({ roomNumber: '', type: '4-Seater', floor: '1st', status: 'Available', beds: 4, occupied: 0 }); setShowRoomModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700"
            >
              + Add Room
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className={`p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Room {room.roomNumber}</h3>
                    <p className="text-xs text-slate-500">{room.type} · {room.floor} Floor</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(room.status)}`}>
                    {room.status}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>Capacity</span>
                    <span className="font-bold">{room.occupied} / {room.beds} Beds</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${room.occupied >= room.beds ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${(room.occupied / room.beds) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'visitors' && (
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Hostel Visitor Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
                <tr>
                  <th className="text-left p-4">Visitor Name</th>
                  <th className="text-left p-4">Student Name</th>
                  <th className="text-left p-4">Relation</th>
                  <th className="text-left p-4">Time In</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {visitors.map((v) => (
                  <tr key={v.id}>
                    <td className="p-4 font-semibold">{v.name}</td>
                    <td className="p-4">{v.studentName}</td>
                    <td className="p-4 text-xs">{v.relation}</td>
                    <td className="p-4 text-xs">{new Date(v.date).toLocaleString()}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold">IN PREMISES</span>
                    </td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">No visitors logged today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-xl font-bold mb-4">Add New Room</h3>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">Room Number</label>
                  <input 
                    required 
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({...roomForm, roomNumber: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Floor</label>
                  <select 
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
                  >
                    <option>Gnd</option><option>1st</option><option>2nd</option><option>3rd</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">Type</label>
                  <select 
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({...roomForm, type: e.target.value, beds: e.target.value.includes('4') ? 4 : e.target.value.includes('2') ? 2 : 1})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
                  >
                    <option>1-Seater</option><option>2-Seater</option><option>4-Seater</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Status</label>
                  <select 
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({...roomForm, status: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 dark:bg-gray-700"
                  >
                    <option>Available</option><option>Occupied</option><option>Cleaning</option><option>Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowRoomModal(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
