'use client';
import { useState, useMemo } from 'react';
import { teacherAttendanceUtils } from '../utils/staffDataUtils';

export default function StaffTeacherAttendance({ teachers, isDarkMode, user, showMessage }) {
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);

  const attendanceRecords = useMemo(() => {
    return teacherAttendanceUtils.getAttendance().filter(a => a.date === attendanceDate);
  }, [attendanceDate, refreshKey]);

  const handleMarkAttendance = (teacherId, status) => {
    teacherAttendanceUtils.markAttendance({
      teacherId,
      date: attendanceDate,
      status,
      markedBy: user.id,
      markedByName: user.name
    });
    setRefreshKey(prev => prev + 1);
    if (showMessage) showMessage(`Attendance marked as ${status}`, 'success');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Teacher Attendance Registry</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Manage and track faculty presence for the day</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Select Date:</label>
            <input 
              type="date" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className={`px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-200'}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-slate-50 text-slate-500'}>
                <th className="text-left p-4 font-semibold uppercase tracking-wider">Teacher Name</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wider">ID / Contact</th>
                <th className="text-center p-4 font-semibold uppercase tracking-wider">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {teachers.map((teacher) => {
                const record = attendanceRecords.find(a => a.teacherId === teacher.id);
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
              {teachers.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-slate-500">No teachers found in the system.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
