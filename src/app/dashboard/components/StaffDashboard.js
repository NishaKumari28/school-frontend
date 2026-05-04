'use client';
import { useMemo, useState, useEffect } from 'react';
import DashboardCard from './DashboardCard';
import { getFeeStructure, updateFeeStructure, sendNotification, getFeePayments, updateFeePaymentStatus, updateUserProfilePhoto } from '../../components/auth/authService';

import StaffTeacherAttendance from './StaffTeacherAttendance';
import StaffHostel from './StaffHostel';
import StaffLibrary from './StaffLibrary';
import StaffTransport from './StaffTransport';
import StaffFees from './StaffFees';
import { initializeSampleData } from '../utils/staffDataUtils';

export default function StaffDashboard({ user, allUsers, showMessage }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');

  useEffect(() => {
    const savedTheme = localStorage.getItem('school_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    initializeSampleData();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('school_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('school_theme', 'light');
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = updateUserProfilePhoto({
          userId: user.id,
          profilePhoto: reader.result
        });
        if (result.success) {
          setProfilePhoto(reader.result);
          if(showMessage) showMessage('Profile photo updated successfully!', 'success');
        } else {
          if(showMessage) showMessage(result.message, 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePhoto = () => {
    const result = updateUserProfilePhoto({
      userId: user.id,
      profilePhoto: ''
    });
    if (result.success) {
      setProfilePhoto('');
      if(showMessage) showMessage('Profile photo removed successfully!', 'success');
    } else {
      if(showMessage) showMessage(result.message, 'error');
    }
  };

  const [notification, setNotification] = useState({ title: '', message: '', targetRole: 'all' });
  const [staffClassFilter, setStaffClassFilter] = useState('');
  const [staffSectionFilter, setStaffSectionFilter] = useState('');

  const normalize = (value) => String(value ?? '').trim().toLowerCase();
  
  const students = allUsers.filter(u => u.role === 'student' && normalize(u.schoolName) === normalize(user.schoolName));
  const teachers = allUsers.filter(u => u.role === 'teacher' && normalize(u.schoolName) === normalize(user.schoolName));
  const parents = allUsers.filter(u => u.role === 'parents' && normalize(u.schoolName) === normalize(user.schoolName));
  
  const parseMultiValueField = (value) => {
    if (!value) return [];
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  };

  const myAdmin = useMemo(() => {
    const admin = allUsers.find(u => u.id && user.createdByAdminId && String(u.id) === String(user.createdByAdminId)) || 
                  allUsers.find(u => normalize(u.role) === 'admin' && normalize(u.schoolName) === normalize(user.schoolName));
    return admin || user;
  }, [allUsers, user]);

  const adminAssignedClasses = useMemo(() => parseMultiValueField(myAdmin?.className || myAdmin?.classes), [myAdmin]);

  const getLocalData = (key) => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  };

  const [availableClasses, setAvailableClasses] = useState(['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12']);
  const staffClassOptions = adminAssignedClasses.length > 0 ? adminAssignedClasses : availableClasses;

  const handleSendNotification = () => {
    if (!notification.title || !notification.message) {
      showMessage('Please fill notification fields', 'error');
      return;
    }
    const result = sendNotification({
      title: notification.title,
      message: notification.message,
      targetRole: notification.targetRole,
      senderId: user.id
    });
    if (result.success) {
      showMessage('Notification sent successfully!');
      setNotification({ title: '', message: '', targetRole: 'all' });
    } else {
      showMessage(result.message, 'error');
    }
  };

  const navButtons = [
    { label: 'Overview', tab: 'overview', icon: '📊' },
    { label: 'Teacher Attendance', tab: 'teacher_attendance', icon: '👨‍🏫' },
    { label: 'Hostel', tab: 'hostel', icon: '🏢' },
    { label: 'Library', tab: 'library', icon: '📚' },
    { label: 'Transport', tab: 'transport', icon: '🚌' },
    { label: 'Fees Control', tab: 'fees', icon: '💰' },
    { label: 'Notifications', tab: 'notifications', icon: '🔔' }
  ];

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <aside className={`w-80 flex-shrink-0 border-r shadow-lg z-40 flex flex-col h-screen sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`mb-6 pb-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-200'}`}>
          <div className="relative inline-block mt-4 mb-3 text-center w-full">
            {profilePhoto ? (
              <img src={profilePhoto} alt={user.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto" />
            ) : (
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold border-3 border-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'}`}>
                👔
              </div>
            )}
            <label className="absolute bottom-0 right-[25%] lg:right-[35%] bg-blue-600 rounded-full p-1.5 cursor-pointer hover:bg-blue-700 transition shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
            </label>
          </div>
          {profilePhoto && (
            <button onClick={handleRemoveProfilePhoto} className="mt-1 text-xs text-red-500 hover:text-red-700 transition block mx-auto mb-3">
              Remove Photo
            </button>
          )}

          <h3 className={`text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name || 'Staff Member'}</h3>
          <p className="text-sm font-semibold text-blue-600 text-center">Staff Member</p>
          <p className={`text-xs text-center mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.number}</p>
          
          {user?.schoolName && (
            <p className={`text-xs font-semibold text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>🏫 {user.schoolName}</p>
          )}
          <p className={`text-xs font-semibold text-center mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>📚 Board: {user?.board || 'N/A'}</p>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`mt-4 w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${isDarkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 border border-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200'}`}
          >
            {isDarkMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Light Mode
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                Dark Mode
              </>
            )}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>MENU</p>
          <div className="space-y-1">
            {navButtons.map((btn) => (
              <button
                key={btn.tab}
                onClick={() => setActiveTab(btn.tab)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === btn.tab ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              >
                <span className="mr-2">{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-8 relative overflow-x-hidden">
        <div className={`mb-8 border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}/50 pb-4`}>
          <nav className="flex flex-wrap gap-4">
            {navButtons.map((btn) => (
              <button
                key={`top-${btn.tab}`}
                type="button"
                onClick={() => setActiveTab(btn.tab)}
                className={`px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition-all duration-300 border-2 ${
                  activeTab === btn.tab
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-blue-400/50 hover:shadow-blue-500/70 hover:scale-[1.02]'
                    : 'bg-white/80 border-slate-200/50 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md text-slate-700 hover:text-blue-700 backdrop-blur-sm'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Top Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Staff Management Portal</h1>
            <p className="text-slate-500 text-sm">Welcome back, {user.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <DashboardCard 
                  title="Active Teachers" 
                  icon="🧑‍🏫" 
                  value={teachers.length} 
                  color="green" 
                  onClick={() => setActiveTab('teacher_attendance')}
                />
                <DashboardCard 
                  title="Library Books" 
                  icon="📖" 
                  value="1,240" 
                  color="purple" 
                  onClick={() => setActiveTab('library')}
                />
                <DashboardCard 
                  title="Active Routes" 
                  icon="🚌" 
                  value="8" 
                  color="orange" 
                  onClick={() => setActiveTab('transport')}
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📅</span>
                    Operations Summary
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Hostel Occupancy', val: '84%', color: 'bg-blue-500' },
                      { label: 'Library Utilization', val: '62%', color: 'bg-purple-500' },
                      { label: 'Transport Efficiency', val: '91%', color: 'bg-orange-500' },
                      { label: 'Fee Collection', val: '78%', color: 'bg-emerald-500' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                          <span>{item.label}</span>
                          <span>{item.val}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-gray-900 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: item.val }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-sm">📣</span>
                    Recent Activity
                  </h3>
                  <div className="space-y-6">
                    {[
                      { icon: '💰', text: 'Parent of Arjun (Cl-5) paid Fee Rs. 15,000', time: '10 mins ago' },
                      { icon: '📚', text: 'Modern Physics issued to Prof. Khanna', time: '45 mins ago' },
                      { icon: '🏢', text: 'Visitor: Mr. Gupta (Parent) checked-in at Hostel', time: '2 hrs ago' },
                    ].map((act, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-gray-900 flex items-center justify-center text-lg">{act.icon}</div>
                        <div>
                          <p className="text-sm font-bold">{act.text}</p>
                          <p className="text-xs text-slate-400">{act.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teacher_attendance' && (
            <StaffTeacherAttendance 
              teachers={teachers} 
              isDarkMode={isDarkMode} 
              user={user} 
              showMessage={showMessage} 
            />
          )}

          {activeTab === 'hostel' && (
            <StaffHostel isDarkMode={isDarkMode} showMessage={showMessage} students={students} />
          )}

          {activeTab === 'library' && (
            <StaffLibrary isDarkMode={isDarkMode} showMessage={showMessage} allUsers={allUsers} students={students} teachers={teachers} staffClassOptions={staffClassOptions} />
          )}

          {activeTab === 'transport' && (
            <StaffTransport 
              isDarkMode={isDarkMode} 
              showMessage={showMessage} 
              students={students} 
              teachers={teachers} 
            />
          )}

          {activeTab === 'fees' && (
            <StaffFees 
              isDarkMode={isDarkMode} 
              showMessage={showMessage} 
              staffClassOptions={staffClassOptions}
              students={students}
              parents={parents}
            />
          )}

          {activeTab === 'notifications' && (
            <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-8 rounded-3xl border border-slate-100 shadow-xl max-w-2xl`}>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-xl">🔔</span>
                Broadcast Notification
              </h2>
              <div className='space-y-4'>
                <input
                  type='text'
                  placeholder='Notification Title'
                  value={notification.title}
                  onChange={(e) => setNotification({...notification, title: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                <textarea
                  placeholder='Notification Message'
                  value={notification.message}
                  onChange={(e) => setNotification({...notification, message: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                  rows={4}
                />
                <select
                  value={notification.targetRole}
                  onChange={(e) => setNotification({...notification, targetRole: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                >
                  <option value='all'>All Users</option>
                  <option value='students'>Students Only</option>
                  <option value='parents'>Parents Only</option>
                  <option value='teachers'>Teachers Only</option>
                </select>
                <button
                  onClick={handleSendNotification}
                  className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  Send Broadcast
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
