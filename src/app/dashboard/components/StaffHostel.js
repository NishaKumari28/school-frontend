import { useState, useMemo, useRef } from 'react';
import React from 'react';
import { hostelUtils } from '../utils/staffDataUtils';
import Papa from 'papaparse';

export default function StaffHostel({ isDarkMode, showMessage, students = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAllotmentModal, setShowAllotmentModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitorType, setVisitorType] = useState('meeting'); // 'meeting' or 'general'
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterOut, setFilterOut] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [roomStatusFilter, setRoomStatusFilter] = useState('All');
  const [allotmentSearch, setAllotmentSearch] = useState({ student: '', room: '', date: '', sharing: '' });
  const [logSearch, setLogSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState({ number: '', type: '', floor: '' });
  const [meetingSearch, setMeetingSearch] = useState({ query: '', date: '' });
  const [generalSearch, setGeneralSearch] = useState({ query: '', date: '' });

  const [roomForm, setRoomForm] = useState({ roomNumber: '', type: '4-Seater', floor: '1st', status: 'Available', beds: 4, occupied: 0 });
  const [allotmentForm, setAllotmentForm] = useState({ studentId: '', studentName: '', roomNumber: '', allotmentDate: new Date().toISOString().split('T')[0] });
  const [logForm, setLogForm] = useState({ studentName: '', roomNumber: '', type: 'IN', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  const [visitorForm, setVisitorForm] = useState({ 
    name: '', number: '', studentName: '', roomNumber: '', 
    relation: '', members: 1, purpose: '', address: '', 
    inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    outTime: ''
  });

  const rooms = useMemo(() => hostelUtils.getRooms(), [refreshKey]);
  const allotments = useMemo(() => hostelUtils.getAllotments(), [refreshKey]);
  const logs = useMemo(() => hostelUtils.getLogs(), [refreshKey]);
  const meetingVisitors = useMemo(() => hostelUtils.getMeetingVisitors(), [refreshKey]);
  const generalVisitors = useMemo(() => hostelUtils.getGeneralVisitors(), [refreshKey]);

  const fileInputRef = useRef(null);
  const allotmentFileRef = useRef(null);
  const downloadSampleCSV = () => {
    const csvContent = "roomNumber,type,floor,status,beds\n101,1-Seater,1st,Available,1\n102,2-Seater,1st,Available,2\n201,4-Seater,2nd,Available,4";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hostel_rooms_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAllotmentSampleCSV = () => {
    const csvContent = "studentName,roomNumber,date\nJohn Doe,101,2026-05-04\nJane Smith,102,2026-05-04";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hostel_allotments_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validRooms = results.data.map(r => ({
            roomNumber: r.roomNumber,
            type: r.type || '4-Seater',
            floor: r.floor || '1st',
            status: r.status || 'Available',
            beds: parseInt(r.beds) || (r.type?.includes('4') ? 4 : r.type?.includes('2') ? 2 : 1),
            occupied: parseInt(r.occupied) || 0
          })).filter(r => r.roomNumber);
          
          hostelUtils.bulkAddRooms(validRooms);
          setRefreshKey(prev => prev + 1);
          showMessage(`Bulk uploaded ${validRooms.length} rooms`, 'success');
        }
      });
    }
  };

  const handleBulkAllotment = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validAllotments = results.data.map(a => ({
            studentName: a.studentName,
            roomNumber: a.roomNumber,
            date: a.date || new Date().toISOString().split('T')[0]
          })).filter(a => a.studentName && a.roomNumber);
          
          hostelUtils.bulkAddAllotments(validAllotments);
          setRefreshKey(prev => prev + 1);
          showMessage(`Bulk allotted ${validAllotments.length} students`, 'success');
        }
      });
    }
  };

  const handleSaveRoom = (e) => {
    e.preventDefault();
    hostelUtils.saveRoom(roomForm);
    setShowRoomModal(false);
    setRefreshKey(prev => prev + 1);
    showMessage('Room saved successfully', 'success');
  };

  const handleAddAllotment = (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === allotmentForm.studentId || s.name === allotmentForm.studentName);
    hostelUtils.addAllotment({
      ...allotmentForm,
      studentName: student?.name || allotmentForm.studentName,
      studentId: student?.id || 'N/A'
    });
    setShowAllotmentModal(false);
    setRefreshKey(prev => prev + 1);
    showMessage('Room allotted successfully', 'success');
  };

  const handleAddLog = (e) => {
    e.preventDefault();
    hostelUtils.addLog(logForm);
    setShowLogModal(false);
    setRefreshKey(prev => prev + 1);
    showMessage('Log entry added', 'success');
  };

  const handleAddVisitor = (e) => {
    e.preventDefault();
    // Phone validation (Indian Standard: starts with 6,7,8,9 and 10 digits)
    const phoneRegex = /^[6789][0-9]{9}$/;
    if (!phoneRegex.test(visitorForm.number)) {
      showMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9', 'error');
      return;
    }

    if (visitorType === 'meeting') {
      hostelUtils.addMeetingVisitor({
        ...visitorForm,
        inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        outTime: ''
      });
    } else {
      hostelUtils.addGeneralVisitor({
        ...visitorForm,
        inTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        outTime: ''
      });
    }
    setShowVisitorModal(false);
    setRefreshKey(prev => prev + 1);
    showMessage('Visitor log added', 'success');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-700';
      case 'Occupied': return 'bg-blue-100 text-blue-700';
      case 'Maintenance': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Sub Navigation */}
      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-slate-100 dark:bg-gray-800 w-fit">
        {['inventory', 'allotments', 'daily-logs', 'visitors'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${activeSubTab === tab ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-slate-500'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* 1. ROOM INVENTORY & BULK UPLOAD */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-black">Room Inventory</h2>
                <p className="text-sm text-slate-500 font-medium">Manage hostel capacity and status</p>
              </div>
              <div className="flex gap-2">
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" />
                <button 
                  onClick={downloadSampleCSV}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  📥 Sample CSV
                </button>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  📤 Bulk Upload
                </button>
                <button 
                  onClick={() => { setRoomForm({ roomNumber: '', type: '4-Seater', floor: '1st', status: 'Available', beds: 4, occupied: 0 }); setShowRoomModal(true); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 transition-all"
                >
                  + Add Room
                </button>
              </div>
            </div>

            {/* Room Filters */}
            <div className={`p-4 rounded-2xl border flex flex-wrap gap-3 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="w-32">
                <input 
                  placeholder="Room #" 
                  value={roomSearch.number}
                  onChange={e => setRoomSearch({...roomSearch, number: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="w-32">
                <select 
                  value={roomSearch.type}
                  onChange={e => setRoomSearch({...roomSearch, type: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All Seaters</option>
                  <option>1-Seater</option>
                  <option>2-Seater</option>
                  <option>4-Seater</option>
                </select>
              </div>
              <div className="w-32">
                <select 
                  value={roomSearch.floor}
                  onChange={e => setRoomSearch({...roomSearch, floor: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All Floors</option>
                  <option>Gnd</option>
                  <option>1st</option>
                  <option>2nd</option>
                  <option>3rd</option>
                </select>
              </div>
              <button 
                onClick={() => setRoomSearch({ number: '', type: '', floor: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📖</span>
                Room Management Book
              </h3>
              <div className="flex gap-2">
                {['All', 'Available', 'Occupied', 'Maintenance'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setRoomStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${roomStatusFilter === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
                    <th className="text-left p-4 font-bold uppercase tracking-wider">Room No</th>
                    <th className="text-left p-4 font-bold uppercase tracking-wider">Type</th>
                    <th className="text-left p-4 font-bold uppercase tracking-wider">Floor</th>
                    <th className="text-left p-4 font-bold uppercase tracking-wider">Capacity</th>
                    <th className="text-left p-4 font-bold uppercase tracking-wider">Status</th>
                    <th className="text-right p-4 font-bold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {rooms
                    .filter(r => {
                      const matchesStatus = roomStatusFilter === 'All' || r.status === roomStatusFilter;
                      const matchesNumber = r.roomNumber.includes(roomSearch.number);
                      const matchesType = !roomSearch.type || r.type === roomSearch.type;
                      const matchesFloor = !roomSearch.floor || r.floor === roomSearch.floor;
                      return matchesStatus && matchesNumber && matchesType && matchesFloor;
                    })
                    .map(room => (
                    <tr key={room.id} className={isDarkMode ? 'hover:bg-gray-700/30' : 'hover:bg-slate-50'}>
                      <td className="p-4 font-black text-blue-600">#{room.roomNumber}</td>
                      <td className="p-4 font-medium">{room.type}</td>
                      <td className="p-4 font-medium">{room.floor}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-gray-900 rounded-full max-w-[100px]">
                             <div className={`h-full rounded-full ${room.occupied >= room.beds ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(room.occupied/room.beds)*100}%` }} />
                          </div>
                          <span className="text-xs font-bold">{room.occupied}/{room.beds}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {room.status === 'Maintenance' && (
                            <button 
                              onClick={() => {
                                hostelUtils.updateRoomStatus(room.id, 'Available');
                                setRefreshKey(k => k + 1);
                                showMessage(`Room #${room.roomNumber} is now Available`, 'success');
                              }}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Mark as Ready / Available"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.143-7.714L1 12l6.857-2.286L11 3z" />
                              </svg>
                            </button>
                          )}
                          {room.status === 'Available' && (
                            <button 
                              onClick={() => {
                                hostelUtils.updateRoomStatus(room.id, 'Maintenance');
                                setRefreshKey(k => k + 1);
                                showMessage(`Room #${room.roomNumber} sent to Maintenance`, 'warning');
                              }}
                              className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                              title="Send to Maintenance"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete Room #${room.roomNumber}?`)) {
                                hostelUtils.deleteRoom(room.id);
                                setRefreshKey(k => k + 1);
                                showMessage('Room removed successfully', 'success');
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove Room"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ALLOTMENTS BOOK */}
      {activeSubTab === 'allotments' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-2xl font-black">Student Allotments</h2>
              <div className="flex gap-2">
                <input type="file" accept=".csv" ref={allotmentFileRef} onChange={handleBulkAllotment} className="hidden" />
                <button 
                  onClick={downloadAllotmentSampleCSV}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  📥 Sample CSV
                </button>
                <button 
                  onClick={() => allotmentFileRef.current.click()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  📤 Bulk Allotment
                </button>
                <button 
                  onClick={() => setShowAllotmentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 transition-all"
                >
                  + Assign Room
                </button>
              </div>
            </div>
            
            {/* Search Filters */}
            <div className={`p-4 rounded-2xl border flex flex-wrap gap-3 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex-1 min-w-[150px]">
                <input 
                  placeholder="Search Student..." 
                  value={allotmentSearch.student}
                  onChange={e => setAllotmentSearch({...allotmentSearch, student: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="w-32">
                <input 
                  placeholder="Room #" 
                  value={allotmentSearch.room}
                  onChange={e => setAllotmentSearch({...allotmentSearch, room: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="w-40">
                <input 
                  type="date" 
                  value={allotmentSearch.date}
                  onChange={e => setAllotmentSearch({...allotmentSearch, date: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="w-32">
                <select 
                  value={allotmentSearch.sharing}
                  onChange={e => setAllotmentSearch({...allotmentSearch, sharing: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="">All Sharing</option>
                  <option value="1">1-Seater</option>
                  <option value="2">2-Seater</option>
                  <option value="4">4-Seater</option>
                </select>
              </div>
              <button 
                onClick={() => setAllotmentSearch({ student: '', room: '', date: '', sharing: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <h3 className="text-lg font-black mb-6">Management Book (Allotments)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="text-left p-4">Room No</th>
                    <th className="text-left p-4">Student Name</th>
                    <th className="text-left p-4">Allotment Date</th>
                    <th className="text-left p-4">Sharing Detail</th>
                    <th className="text-left p-4">Leave Date</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {allotments
                    .filter(a => {
                      const room = rooms.find(r => r.roomNumber === a.roomNumber);
                      const matchesStudent = a.studentName.toLowerCase().includes(allotmentSearch.student.toLowerCase());
                      const matchesRoom = a.roomNumber.includes(allotmentSearch.room);
                      const matchesDate = !allotmentSearch.date || a.date.includes(allotmentSearch.date);
                      const matchesSharing = !allotmentSearch.sharing || room?.type?.includes(allotmentSearch.sharing);
                      return matchesStudent && matchesRoom && matchesDate && matchesSharing;
                    })
                    .map(a => {
                      const room = rooms.find(r => r.roomNumber === a.roomNumber);
                    return (
                      <tr key={a.id}>
                        <td className="p-4 font-bold">#{a.roomNumber}</td>
                        <td className="p-4 font-bold text-blue-600">{a.studentName}</td>
                        <td className="p-4 text-xs">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg font-black text-[10px] ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                            {room?.type || 'N/A'} (Capacity: {room?.occupied}/{room?.beds})
                          </span>
                        </td>
                        <td className="p-4 text-xs text-red-500">{a.leaveDate ? new Date(a.leaveDate).toLocaleDateString() : 'Active'}</td>
                        <td className="p-4">
                          {!a.leaveDate && (
                            <button 
                              onClick={() => { if(confirm('Mark as left?')) hostelUtils.removeAllotment(a.id); setRefreshKey(k=>k+1); }}
                              className="text-xs font-bold text-red-500 hover:underline"
                            >
                              End Allotment
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allotments.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No active allotments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAILY LOG BOOK */}
      {activeSubTab === 'daily-logs' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-black">Daily In/Out Book</h2>
              <p className="text-sm text-slate-500 font-medium">Tracking student movements efficiently</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <input 
                  placeholder="Search Name / Room..." 
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-64 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
              <input 
                type="date" 
                value={logDate} 
                onChange={(e) => setLogDate(e.target.value)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
              />
              <button 
                onClick={() => setFilterOut(!filterOut)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterOut ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
              >
                {filterOut ? 'Showing: OUT Students' : 'Filter: Currently OUT'}
              </button>
              <button onClick={() => setShowLogModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg">+ Add Entry</button>
            </div>
          </div>
          
          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="text-left p-4">Student & Room</th>
                    <th className="text-left p-4">Trips Today</th>
                    <th className="text-left p-4 text-orange-600">Last Out</th>
                    <th className="text-left p-4 text-emerald-600">Last In</th>
                    <th className="text-left p-4">Current Status</th>
                    <th className="text-left p-4">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {(() => {
                    // Grouping logic for scalable view
                    const groupedLogs = {};
                    // Filter logs by selected date first
                    const filteredByDate = logs.filter(l => new Date(l.date).toISOString().split('T')[0] === logDate);

                    filteredByDate.forEach(log => {
                      const dateStr = new Date(log.date).toDateString();
                      const key = `${dateStr}_${log.studentName}`;
                      if (!groupedLogs[key]) {
                        groupedLogs[key] = {
                          studentName: log.studentName,
                          roomNumber: log.roomNumber,
                          date: log.date,
                          trips: [],
                          lastOut: '',
                          lastIn: '',
                          isOut: false
                        };
                      }
                      groupedLogs[key].trips.push(log);
                      if (log.outTime) {
                        groupedLogs[key].lastOut = log.outTime;
                        groupedLogs[key].isOut = !log.inTime;
                      }
                      if (log.inTime) {
                        groupedLogs[key].lastIn = log.inTime;
                        if (new Date(`${log.date.split('T')[0]} ${log.inTime}`) >= new Date(`${log.date.split('T')[0]} ${log.outTime}`)) {
                           groupedLogs[key].isOut = false;
                        }
                      }
                    });

                    let displayLogs = Object.values(groupedLogs).sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    if (logSearch) {
                      const searchLower = logSearch.toLowerCase();
                      displayLogs = displayLogs.filter(l => 
                        l.studentName.toLowerCase().includes(searchLower) || 
                        l.roomNumber.includes(searchLower)
                      );
                    }

                    if (filterOut) {
                      displayLogs = displayLogs.filter(l => l.isOut);
                    }

                    return displayLogs.map((group, idx) => (
                      <React.Fragment key={idx}>
                        <tr className={isDarkMode ? 'hover:bg-gray-700/30' : 'hover:bg-slate-50/50'}>
                          <td className="p-4">
                            <p className="font-bold">{group.studentName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Room #{group.roomNumber}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs mx-auto">
                              {group.trips.length}
                            </span>
                          </td>
                          <td className="p-4 font-black text-orange-600">{group.lastOut || '--:--'}</td>
                          <td className="p-4 font-black text-emerald-600">{group.lastIn || '--:--'}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${group.isOut ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {group.isOut ? '🔴 OUT' : '🟢 IN'}
                            </span>
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {expandedRow === idx ? 'Hide Logs' : 'View All Logs'}
                              <span>{expandedRow === idx ? '↑' : '↓'}</span>
                            </button>
                          </td>
                        </tr>
                        {expandedRow === idx && (
                          <tr className={isDarkMode ? 'bg-gray-900/50' : 'bg-blue-50/30'}>
                            <td colSpan="6" className="p-4 border-l-4 border-blue-500">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-blue-500 mb-2 tracking-widest">Full Trip History for Today</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {group.trips.map((t, tIdx) => (
                                    <div key={t.id} className={`p-3 rounded-xl border flex flex-col gap-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                      <div className="flex justify-between items-center">
                                         <span className="text-[9px] font-black text-slate-400">TRIP #{tIdx + 1}</span>
                                         <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${t.inTime && t.outTime ? 'bg-emerald-100 text-emerald-700' : 'text-orange-700 bg-orange-100'}`}>
                                            {t.inTime && t.outTime ? 'FINISHED' : 'ACTIVE'}
                                         </span>
                                      </div>
                                      <div className="flex justify-between mt-1">
                                        <div className="text-center flex-1 border-r dark:border-gray-700">
                                          <p className="text-[8px] uppercase text-slate-400 font-bold">OUT</p>
                                          <p className="font-black text-orange-600 text-sm">{t.outTime || '--:--'}</p>
                                          {!t.outTime && (
                                            <button onClick={() => {
                                              const time = prompt('OUT time:', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                              if(time) { hostelUtils.addLog({ studentName: t.studentName, type: 'OUT', time }); setRefreshKey(k=>k+1); }
                                            }} className="text-[8px] font-bold text-orange-500 hover:underline">SET OUT</button>
                                          )}
                                        </div>
                                        <div className="text-center flex-1">
                                          <p className="text-[8px] uppercase text-slate-400 font-bold">IN</p>
                                          <p className="font-black text-emerald-600 text-sm">{t.inTime || '--:--'}</p>
                                          {!t.inTime && (
                                            <button onClick={() => {
                                              const time = prompt('IN time:', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                              if(time) { hostelUtils.addLog({ studentName: t.studentName, type: 'IN', time }); setRefreshKey(k=>k+1); }
                                            }} className="text-[8px] font-bold text-emerald-500 hover:underline">SET IN</button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'visitors' && (
        <div className="space-y-12">
          {/* 1. Meeting Book */}
          <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-black">Visitor Meeting Book</h2>
                  <p className="text-xs text-slate-500 font-medium">Tracking visits to residents</p>
                </div>
                <button onClick={() => { setVisitorType('meeting'); setShowVisitorModal(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-lg">+ Log Meeting</button>
             </div>

             {/* Meeting Search */}
             <div className={`p-4 rounded-2xl border flex flex-wrap gap-3 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1 min-w-[200px] relative">
                  <input 
                    placeholder="Search Name / Number / Time..." 
                    value={meetingSearch.query}
                    onChange={e => setMeetingSearch({...meetingSearch, query: e.target.value})}
                    className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>
                <div className="w-40">
                  <input 
                    type="date" 
                    value={meetingSearch.date}
                    onChange={e => setMeetingSearch({...meetingSearch, date: e.target.value})}
                    className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <button onClick={() => setMeetingSearch({ query: '', date: '' })} className="px-3 py-1 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-wider">Reset</button>
             </div>

             <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 border-b text-xs">
                          <th className="p-4 text-left">Visitor</th>
                          <th className="p-4 text-left">Relation</th>
                          <th className="p-4 text-left">Student & Room</th>
                          <th className="p-4 text-center">Members</th>
                          <th className="p-4 text-left">In/Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetingVisitors
                          .filter(v => {
                            const q = meetingSearch.query.toLowerCase();
                            const matchesQuery = !q || v.name.toLowerCase().includes(q) || v.number.includes(q) || v.inTime.includes(q) || v.outTime?.includes(q);
                            const matchesDate = !meetingSearch.date || v.id.includes(meetingSearch.date);
                            return matchesQuery && matchesDate;
                          })
                          .map(v => (
                          <tr key={v.id} className="border-b dark:border-gray-700">
                             <td className="p-4 font-bold">{v.name}</td>
                             <td className="p-4 text-xs">{v.relation}</td>
                             <td className="p-4">
                               <p className="font-bold text-blue-600">{v.studentName}</p>
                               <p className="text-[10px] text-slate-400">Room #{v.roomNumber}</p>
                             </td>
                             <td className="p-4 text-center font-bold">{v.members}</td>
                             <td className="p-4">
                               <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-500 font-bold">{v.inTime}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-red-500 font-bold">{v.outTime || '--:--'}</span>
                                  </div>
                                  {!v.outTime && (
                                    <button 
                                      onClick={() => { 
                                        const time = prompt('Enter checkout time (HH:MM AM/PM):', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                        if (time) {
                                          hostelUtils.checkoutMeetingVisitor(v.id, time); 
                                          setRefreshKey(k=>k+1); 
                                        }
                                      }}
                                      className="text-[10px] font-black text-red-500 hover:underline text-left"
                                    >
                                      CHECKOUT NOW
                                    </button>
                                  )}
                               </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

          {/* 2. General Enquiry Book */}
          <div className="space-y-6 pt-6 border-t dark:border-gray-700">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-black">General Visitor Book</h2>
                  <p className="text-xs text-slate-500 font-medium">Tracking general enquiries and visits</p>
                </div>
                <button onClick={() => { setVisitorType('general'); setShowVisitorModal(true); }} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg">+ Log Enquiry</button>
             </div>

             {/* General Search */}
             <div className={`p-4 rounded-2xl border flex flex-wrap gap-3 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1 min-w-[200px] relative">
                  <input 
                    placeholder="Search Visitor Name / Number / Time..." 
                    value={generalSearch.query}
                    onChange={e => setGeneralSearch({...generalSearch, query: e.target.value})}
                    className={`pl-9 pr-4 py-2 rounded-xl border text-xs w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>
                <div className="w-40">
                  <input 
                    type="date" 
                    value={generalSearch.date}
                    onChange={e => setGeneralSearch({...generalSearch, date: e.target.value})}
                    className={`w-full px-4 py-2 rounded-xl border text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <button onClick={() => setGeneralSearch({ query: '', date: '' })} className="px-3 py-1 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-wider">Reset</button>
             </div>

             <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 border-b text-xs">
                          <th className="p-4 text-left">Visitor</th>
                          <th className="p-4 text-left">Contact</th>
                          <th className="p-4 text-left">Purpose</th>
                          <th className="p-4 text-left">Address</th>
                          <th className="p-4 text-left">In/Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generalVisitors
                          .filter(v => {
                            const q = generalSearch.query.toLowerCase();
                            const matchesQuery = !q || v.name.toLowerCase().includes(q) || v.number.includes(q) || v.inTime.includes(q) || v.outTime?.includes(q);
                            const matchesDate = !generalSearch.date || v.id.includes(generalSearch.date);
                            return matchesQuery && matchesDate;
                          })
                          .map(v => (
                          <tr key={v.id} className="border-b dark:border-gray-700">
                             <td className="p-4 font-bold">{v.name}</td>
                             <td className="p-4 text-xs">{v.number}</td>
                             <td className="p-4 italic text-slate-500">&quot;{v.purpose}&quot;</td>
                             <td className="p-4 text-[10px] max-w-[150px] truncate">{v.address}</td>
                             <td className="p-4">
                               <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-500 font-bold">{v.inTime}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-red-500 font-bold">{v.outTime || '--:--'}</span>
                                  </div>
                                  {!v.outTime && (
                                    <button 
                                      onClick={() => { 
                                        const time = prompt('Enter checkout time (HH:MM AM/PM):', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                        if (time) {
                                          hostelUtils.checkoutGeneralVisitor(v.id, time); 
                                          setRefreshKey(k=>k+1); 
                                        }
                                      }}
                                      className="text-[10px] font-black text-red-500 hover:underline text-left"
                                    >
                                      CHECKOUT NOW
                                    </button>
                                  )}
                               </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Create New Room</h3>
             <form onSubmit={handleSaveRoom} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Room Number</label>
                      <input required value={roomForm.roomNumber} onChange={e=>setRoomForm({...roomForm, roomNumber:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} placeholder="e.g. 101" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Floor</label>
                      <select value={roomForm.floor} onChange={e=>setRoomForm({...roomForm, floor:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                         <option>Gnd</option><option>1st</option><option>2nd</option><option>3rd</option>
                      </select>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Capacity Type</label>
                      <select value={roomForm.type} onChange={e=>setRoomForm({...roomForm, type:e.target.value, beds: e.target.value.includes('4')?4:e.target.value.includes('2')?2:1})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                         <option>1-Seater</option><option>2-Seater</option><option>4-Seater</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Initial Status</label>
                      <select value={roomForm.status} onChange={e=>setRoomForm({...roomForm, status:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                         <option>Available</option><option>Maintenance</option>
                      </select>
                   </div>
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowRoomModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/30">Save Room</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* 2. Allotment Modal */}
      {showAllotmentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">Assign Room to Student</h3>
             <form onSubmit={handleAddAllotment} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400">Select Student</label>
                   <select required value={allotmentForm.studentId} onChange={e=>{
                     const s = students.find(x => x.id === e.target.value);
                     setAllotmentForm({...allotmentForm, studentId: e.target.value, studentName: s?.name || ''});
                   }} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <option value="">-- Choose Student --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.number})</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400">Select Room</label>
                   <select required value={allotmentForm.roomNumber} onChange={e=>setAllotmentForm({...allotmentForm, roomNumber: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <option value="">-- Choose Available Room --</option>
                      {rooms.filter(r => r.status === 'Available' || r.occupied < r.beds).map(r => (
                        <option key={r.id} value={r.roomNumber}>Room #{r.roomNumber} ({r.type} - {r.beds - r.occupied} left)</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400">Allotment Date</label>
                   <input type="date" value={allotmentForm.allotmentDate} onChange={e=>setAllotmentForm({...allotmentForm, allotmentDate: e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowAllotmentModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/30">Assign Room</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* 3. Daily Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">New In/Out Entry</h3>
             <form onSubmit={handleAddLog} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400">Student Name</label>
                   <select required value={logForm.studentName} onChange={e=>{
                     const a = allotments.find(x => x.studentName === e.target.value);
                     setLogForm({...logForm, studentName: e.target.value, roomNumber: a?.roomNumber || ''});
                   }} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                      <option value="">-- Select Resident --</option>
                      {allotments.filter(a=>!a.leaveDate).map(a => <option key={a.id} value={a.studentName}>{a.studentName} (Room #{a.roomNumber})</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Log Type</label>
                      <select value={logForm.type} onChange={e=>setLogForm({...logForm, type:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                         <option>IN</option><option>OUT</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Time</label>
                      <div className="flex gap-2">
                        <input readOnly value={logForm.time} className={`flex-1 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-slate-50'}`} />
                        <button 
                          type="button"
                          onClick={() => setLogForm({...logForm, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black"
                        >
                          GET TIME
                        </button>
                      </div>
                   </div>
                </div>
                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowLogModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl">Add Entry</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* 4. Visitor Modal */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-black mb-6">{visitorType === 'meeting' ? 'Log Student Meeting' : 'Log General Visitor'}</h3>
             <form onSubmit={handleAddVisitor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Visitor Name</label>
                      <input required value={visitorForm.name} onChange={e=>setVisitorForm({...visitorForm, name:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Mobile Number</label>
                      <input 
                        required 
                        type="tel"
                        maxLength={10}
                        value={visitorForm.number} 
                        onChange={e=>setVisitorForm({...visitorForm, number:e.target.value.replace(/\D/g, '')})} 
                        className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} 
                        placeholder="10-digit number"
                      />
                   </div>
                </div>

                {visitorType === 'meeting' ? (
                   <>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Select Student</label>
                            <select required value={visitorForm.studentName} onChange={e=>{
                              const a = allotments.find(x => x.studentName === e.target.value);
                              setVisitorForm({...visitorForm, studentName: e.target.value, roomNumber: a?.roomNumber || ''});
                            }} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                               <option value="">-- Choose Resident --</option>
                               {allotments.filter(a=>!a.leaveDate).map(a => <option key={a.id} value={a.studentName}>{a.studentName} (Room #{a.roomNumber})</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Relation</label>
                            <input value={visitorForm.relation} onChange={e=>setVisitorForm({...visitorForm, relation:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} placeholder="e.g. Father" />
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-400">Number of Members</label>
                         <input type="number" min="1" value={visitorForm.members} onChange={e=>setVisitorForm({...visitorForm, members:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                      </div>
                   </>
                ) : (
                   <>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-400">Purpose of Visit</label>
                         <textarea value={visitorForm.purpose} onChange={e=>setVisitorForm({...visitorForm, purpose:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} rows={2} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase text-slate-400">Address</label>
                         <input value={visitorForm.address} onChange={e=>setVisitorForm({...visitorForm, address:e.target.value})} className={`w-full px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`} />
                      </div>
                   </>
                )}

                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={()=>setShowVisitorModal(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl">Log Visitor (IN)</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
