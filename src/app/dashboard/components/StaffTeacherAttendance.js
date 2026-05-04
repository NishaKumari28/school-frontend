'use client';
import { useState, useMemo } from 'react';
import { teacherAttendanceUtils } from '../utils/staffDataUtils';
import AnalyticsChart from './Charts';

export default function StaffTeacherAttendance({ teachers, isDarkMode, user, showMessage }) {
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  
  // Month Selection for Register View
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const allAttendance = useMemo(() => {
    return teacherAttendanceUtils.getAttendance();
  }, [refreshKey]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchName = !searchName || t.name?.toLowerCase().includes(searchName.toLowerCase());
      const matchNumber = !searchNumber || String(t.number || t.id || '').includes(searchNumber);
      const matchSubject = !searchSubject || (t.subject || '').toLowerCase().includes(searchSubject.toLowerCase());
      return matchName && matchNumber && matchSubject;
    });
  }, [teachers, searchName, searchNumber, searchSubject]);

  const handleMarkAttendance = (teacherId, status, date = attendanceDate) => {
    if (!date) {
      showMessage('Please select a date', 'error');
      return;
    }
    teacherAttendanceUtils.markAttendance({
      teacherId,
      date,
      status,
      markedBy: user.id,
      markedByName: user.name
    });
    setRefreshKey(prev => prev + 1);
    if (showMessage) showMessage(`Attendance marked as ${status} for ${date}`, 'success');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-emerald-600 text-white';
      case 'absent': return 'bg-red-600 text-white';
      case 'late': return 'bg-amber-500 text-white';
      case 'leave': return 'bg-blue-600 text-white';
      default: return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return 'P';
      case 'absent': return 'A';
      case 'late': return 'L';
      case 'leave': return 'LV';
      default: return '-';
    }
  };

  // Helper for Monthly Register
  const getDaysInMonth = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const renderDailyView = () => (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
            <th className="text-left p-4 font-semibold uppercase tracking-wider">Teacher Name</th>
            <th className="text-left p-4 font-semibold uppercase tracking-wider">ID / Contact</th>
            <th className="text-left p-4 font-semibold uppercase tracking-wider">Subject</th>
            <th className="text-center p-4 font-semibold uppercase tracking-wider">Attendance Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
          {filteredTeachers.map((teacher) => {
            const record = allAttendance.find(a => a.teacherId === teacher.id && a.date === attendanceDate);
            return (
              <tr key={teacher.id} className={`transition-colors ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-slate-50/50'}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                      {teacher.name.charAt(0)}
                    </div>
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{teacher.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <p className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>{teacher.id || 'N/A'}</p>
                  <p className="text-xs text-blue-500">{teacher.number || 'No Contact'}</p>
                </td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                     {teacher.subject || 'N/A'}
                   </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    {['present', 'absent', 'late', 'leave'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleMarkAttendance(teacher.id, status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          record?.status === status 
                            ? getStatusColor(status) 
                            : isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderRegisterView = () => (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-gray-700">
      <table className="w-full text-[10px] sm:text-xs">
        <thead>
          <tr className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
            <th className="text-left p-2 font-semibold sticky left-0 z-10 bg-inherit min-w-[120px]">Teacher</th>
            <th className="text-center p-2 font-semibold min-w-[40px]">P</th>
            <th className="text-center p-2 font-semibold min-w-[40px]">A</th>
            <th className="text-center p-2 font-semibold min-w-[40px]">L</th>
            <th className="text-center p-2 font-semibold min-w-[40px]">LV</th>
            <th className="text-left p-2 font-semibold">Perf.</th>
            {daysArray.map(day => (
              <th key={day} className="text-center p-1 border-l border-slate-200 dark:border-gray-700 min-w-[25px]">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
          {filteredTeachers.map((teacher) => {
            const monthlyRecords = allAttendance.filter(a => a.teacherId === teacher.id && a.date.startsWith(selectedMonth));
            const presentCount = monthlyRecords.filter(r => r.status === 'present').length;
            const absentCount = monthlyRecords.filter(r => r.status === 'absent').length;
            const lateCount = monthlyRecords.filter(r => r.status === 'late').length;
            const leaveCount = monthlyRecords.filter(r => r.status === 'leave').length;
            
            const totalMarked = monthlyRecords.length;
            const perf = totalMarked > 0 ? Math.round(((presentCount + (lateCount * 0.5)) / totalMarked) * 100) : 0;
            
            return (
              <tr key={teacher.id} className={`transition-colors ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-slate-50/50'}`}>
                <td className="p-2 font-medium sticky left-0 z-10 bg-inherit border-r border-slate-100 dark:border-gray-700">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[100px]">{teacher.name}</span>
                    <span className="text-[9px] text-slate-400">{teacher.id}</span>
                  </div>
                </td>
                <td className="p-2 text-center text-emerald-600 font-bold">{presentCount}</td>
                <td className="p-2 text-center text-red-600 font-bold">{absentCount}</td>
                <td className="p-2 text-center text-amber-600 font-bold">{lateCount}</td>
                <td className="p-2 text-center text-blue-600 font-bold">{leaveCount}</td>
                <td className="p-2 text-center">
                  <span className={`font-bold ${perf > 80 ? 'text-emerald-500' : perf > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {perf}%
                  </span>
                </td>
                {daysArray.map(day => {
                  const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                  const record = monthlyRecords.find(r => r.date === dateStr);
                  return (
                    <td 
                      key={day} 
                      className={`text-center p-0.5 border-l border-slate-100 dark:border-gray-800 transition-colors ${record ? getStatusColor(record.status).split(' ')[0] : ''}`}
                    >
                      <select
                        value={record?.status || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                             handleMarkAttendance(teacher.id, e.target.value, dateStr);
                          }
                        }}
                        className="w-full bg-transparent text-center border-none focus:ring-0 cursor-pointer text-[10px] appearance-none"
                        style={{ color: record ? 'white' : 'inherit' }}
                      >
                        <option value="" className="bg-white dark:bg-gray-800 text-gray-500">-</option>
                        <option value="present" className="bg-white dark:bg-gray-800 text-emerald-600">P</option>
                        <option value="absent" className="bg-white dark:bg-gray-800 text-red-600">A</option>
                        <option value="late" className="bg-white dark:bg-gray-800 text-amber-600">L</option>
                        <option value="leave" className="bg-white dark:bg-gray-800 text-blue-600">LV</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filters and Header */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Teacher Attendance Management</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Track and analyze faculty performance</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">View Mode</label>
              <div className="flex bg-slate-100 dark:bg-gray-900 p-1 rounded-xl border border-slate-200 dark:border-gray-700">
                <button 
                  onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${attendanceDate ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-slate-500'}`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setAttendanceDate('')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!attendanceDate ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-slate-500'}`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {attendanceDate ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Select Date</label>
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Select Month</label>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-700">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">Teacher Name</label>
            <input 
              type="text" 
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">Teacher ID/Number</label>
            <input 
              type="text" 
              placeholder="Search by ID or Number..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">Subject</label>
            <input 
              type="text" 
              placeholder="Search by subject..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'}`}
            />
          </div>
        </div>

        {attendanceDate ? renderDailyView() : renderRegisterView()}

        {filteredTeachers.length === 0 && (
          <div className="p-12 text-center text-slate-500 bg-slate-50 dark:bg-gray-900/30 rounded-xl mt-4">
            No teachers matching the current filters were found.
          </div>
        )}
      </div>

      {/* Performance Graph Section */}
      {filteredTeachers.length > 0 && (
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold">Attendance Performance Analytics</h3>
             {!attendanceDate && (
                <div className="text-xs text-slate-500 font-medium">
                  Showing trends for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
             )}
          </div>
          
          <div className="h-[400px]">
            {(() => {
              let chartData = [];
              let title = '';
              let xKey = 'name';
              
              if (attendanceDate) {
                // Daily View Summary
                const dayData = allAttendance.filter(a => a.date === attendanceDate);
                chartData = [{
                  name: new Date(attendanceDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                  Present: dayData.filter(r => r.status === 'present').length,
                  Absent: dayData.filter(r => r.status === 'absent').length,
                  Late: dayData.filter(r => r.status === 'late').length,
                  Leave: dayData.filter(r => r.status === 'leave').length
                }];
                title = `Attendance Summary for ${attendanceDate}`;
              } else {
                // Monthly Trend View
                xKey = 'day';
                title = `Attendance Trends - ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                
                for (let i = 1; i <= daysCount; i++) {
                  const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
                  const dayRecords = allAttendance.filter(a => a.date === dateStr);
                  chartData.push({
                    day: i,
                    Present: dayRecords.filter(r => r.status === 'present').length,
                    Absent: dayRecords.filter(r => r.status === 'absent').length,
                    Late: dayRecords.filter(r => r.status === 'late').length,
                    Leave: dayRecords.filter(r => r.status === 'leave').length
                  });
                }
              }
              
              return (
                <AnalyticsChart 
                  type={attendanceDate ? 'bar' : 'line'}
                  data={chartData}
                  title={title}
                  xKey={xKey}
                  height={350}
                  series={[
                    { dataKey: 'Present', color: '#10b981' },
                    { dataKey: 'Absent', color: '#ef4444' },
                    { dataKey: 'Late', color: '#f59e0b' },
                    { dataKey: 'Leave', color: '#3b82f6' }
                  ]}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
