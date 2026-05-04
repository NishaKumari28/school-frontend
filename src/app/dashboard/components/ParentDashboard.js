'use client';
import { useMemo, useState, useEffect } from 'react';
import DashboardCard from './DashboardCard';
import UserTransportLog from './UserTransportLog';
import TransportStatsPanel from './TransportStatsPanel';
import { transportUtils } from '../utils/staffDataUtils';
import {
  getAttendanceList,
  getHomeworkList,
  getLearningMaterials,
  getNotifications,
  getFeeStructure,
  getFeePayments,
  updateUserProfilePhoto
} from '../../components/auth/authService';

const normalize = (value) => String(value || '').trim().toLowerCase();

const getLatestTimestamp = (item) => {
  const dateFields = ['createdAt', 'updatedAt', 'uploadedAt', 'sentAt', 'requestedAt', 'paidAt', 'date'];
  for (const field of dateFields) {
    const value = item?.[field];
    if (!value) continue;
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  const numericId = Number(item?.id);
  return Number.isNaN(numericId) ? 0 : numericId;
};

const sortLatestFirst = (items = []) => [...items].sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a));

export default function ParentDashboard({ user, allUsers, showMessage, loadData }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('school_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
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


  const students = useMemo(() => allUsers.filter((entry) => entry.role === 'student'), [allUsers]);

  const linkedChild = useMemo(() => {
    const directChild = students.find((student) => student.parentId === user.id);
    if (directChild) return directChild;

    return students.find((student) => {
      const nameMatch = normalize(student.name) === normalize(user.childName);
      const classMatch = !user.childClass || normalize(student.className) === normalize(user.childClass);
      const sectionMatch = !user.childSection && !user.childSec
        ? true
        : normalize(student.section || student.sec) === normalize(user.childSection || user.childSec);
      return nameMatch && classMatch && sectionMatch;
    }) || null;
  }, [students, user]);

  const attendanceRecords = useMemo(() => {
    if (!linkedChild) return [];
    return getAttendanceList()
      .filter((record) => record.studentId === linkedChild.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [linkedChild]);

  const childHomework = useMemo(() => {
    if (!linkedChild) return [];
    return sortLatestFirst(getHomeworkList().filter((homework) => {
      const classMatch = !homework.className || normalize(homework.className) === normalize(linkedChild.className);
      const sectionMatch = !homework.section || normalize(homework.section) === normalize(linkedChild.section || linkedChild.sec);
      return classMatch && sectionMatch;
    }));
  }, [linkedChild]);

  const childMaterials = useMemo(() => {
    if (!linkedChild) return [];
    return sortLatestFirst(getLearningMaterials().filter((material) => {
      const classMatch = !material.className || normalize(material.className) === normalize(linkedChild.className);
      const sectionMatch = !material.section || normalize(material.section) === normalize(linkedChild.section || linkedChild.sec);
      return classMatch && sectionMatch;
    }));
  }, [linkedChild]);

  const notifications = useMemo(() => {
    return getNotifications()
      .filter((notification) => notification.targetRole === 'all' || notification.targetRole === 'parents')
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  }, []);

  const feeDetails = useMemo(() => {
    if (!linkedChild) return null;
    return getFeeStructure().find((fee) => normalize(fee.className) === normalize(linkedChild.className)) || null;
  }, [linkedChild]);

  const feePayments = useMemo(() => {
    if (!linkedChild) return [];
    return getFeePayments()
      .filter((payment) => payment.studentId === linkedChild.id && payment.parentId === user.id)
      .sort((a, b) => new Date(b.requestedAt || b.paidAt) - new Date(a.requestedAt || a.paidAt));
  }, [linkedChild, user.id]);

  const homeworkStats = useMemo(() => {
    if (!linkedChild) return { submitted: [], pending: [] };
    const submitted = [];
    const pending = [];

    childHomework.forEach((homework) => {
      const hasSubmitted = (homework.submissions || []).some((submission) => submission.studentId === linkedChild.id);
      if (hasSubmitted) submitted.push(homework);
      else pending.push(homework);
    });

    return { submitted, pending };
  }, [childHomework, linkedChild]);

  const materialsStats = useMemo(() => {
    if (!linkedChild) return { read: [], unread: [] };
    const read = childMaterials.filter((material) => (material.readBy || []).some((entry) => entry.studentId === linkedChild.id));
    const unread = childMaterials.filter((material) => !(material.readBy || []).some((entry) => entry.studentId === linkedChild.id));
    return { read, unread };
  }, [childMaterials, linkedChild]);

  const attendanceStats = useMemo(() => {
    const present = attendanceRecords.filter((record) => record.status === 'present').length;
    const absent = attendanceRecords.filter((record) => record.status === 'absent').length;
    const late = attendanceRecords.filter((record) => record.status === 'late').length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, percentage };
  }, [attendanceRecords]);

  const feeSummary = useMemo(() => {
    const totalFee = Number(feeDetails?.feeAmount || 0);
    const paidAmount = feePayments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const inProcessAmount = feePayments
      .filter((payment) => payment.status === 'pending' || payment.status === 'processing')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const pendingAmount = Math.max(totalFee - paidAmount, 0);
    return { totalFee, paidAmount, inProcessAmount, pendingAmount };
  }, [feeDetails, feePayments]);

  // Transport: find this child's passenger record id
  const childTransportPassengerIds = useMemo(() => {
    const p = transportUtils.getPassengers().find(x => x.name === linkedChild?.name);
    return p ? [p.id] : [];
  }, [linkedChild?.name]);

  const latestPayment = feePayments[0] || null;
  const latestPaymentMode = latestPayment
    ? latestPayment.plan.replaceAll('_', ' ')
    : 'Not selected yet';

  const feeNotices = useMemo(() => {
    return notifications.filter((notification) => {
      const searchableText = `${notification.title} ${notification.message}`.toLowerCase();
      return searchableText.includes('fee') || searchableText.includes('payment') || searchableText.includes('installment');
    });
  }, [notifications]);

  const navButtons = [
    { label: 'Overview', tab: 'overview' },
    { label: 'Child Progress', tab: 'progress' },
    { label: 'School Notices', tab: 'notifications' },
    { label: 'Fee Status', tab: 'fees' },
    { label: 'Transport', tab: 'transport' }
  ];

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage?.('Please upload a valid image file', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = updateUserProfilePhoto({
        userId: user.id,
        profilePhoto: typeof reader.result === 'string' ? reader.result : ''
      });

      if (result.success) {
        showMessage?.('Profile photo updated successfully!');
        if (loadData) loadData();
      } else {
        showMessage?.(result.message, 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveProfilePhoto = () => {
    const result = updateUserProfilePhoto({
      userId: user.id,
      profilePhoto: ''
    });

    if (result.success) {
      showMessage?.('Profile photo removed successfully!');
      if (loadData) loadData();
    } else {
      showMessage?.(result.message, 'error');
    }
  };

  if (!linkedChild) {
    return (
      <div className='mx-auto max-w-5xl p-6'>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm'>
          <h2 className='text-2xl font-bold text-amber-900'>Parent Dashboard</h2>
          <p className='mt-3 text-amber-800'>
            No child is linked to this parent account yet. Ask admin or superadmin to link your child profile first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <aside className={`w-80 flex-shrink-0 border-r shadow-lg z-40 flex flex-col h-screen sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className='text-center mb-6'>
          <div className="relative inline-block mt-4 mb-3">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto" />
            ) : (
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold border-3 border-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'}`}>
                {user.name?.charAt(0)?.toUpperCase() || 'P'}
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
          {user.profilePhoto && (
            <button onClick={handleRemoveProfilePhoto} className="mt-1 text-xs text-red-500 hover:text-red-700 transition block mx-auto mb-3">
              Remove Photo
            </button>
          )}

          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</h3>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Monitoring: {linkedChild.name}</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            Class {linkedChild.className || 'N/A'} | Section {linkedChild.section || linkedChild.sec || 'N/A'}
          </p>
          {user?.schoolName && (
            <p className={`text-xs font-semibold mt-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>🏫 {user.schoolName}</p>
          )}
          <p className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>📚 Board: {user?.board || 'N/A'}</p>

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

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>MENU</p>
          <div className="space-y-1">
            {navButtons.map((btn) => (
              <button
                key={btn.tab}
                onClick={() => setActiveTab(btn.tab)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === btn.tab ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              >
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

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 min-h-screen">
        <div className={`mb-8 border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}/50 pb-4`}>
          <nav className='flex flex-wrap gap-4'>
            {navButtons.map((btn) => (
              <button
                key={`top-${btn.tab}`}
                type='button'
                onClick={() => setActiveTab(btn.tab)}
                className={`rounded-full border-2 px-6 py-3 text-sm font-semibold shadow-lg transition-all duration-300 ${
                  activeTab === btn.tab
                    ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-400/50'
                    : 'border-slate-200/50 bg-white/80 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </nav>
        </div>

        <div className='space-y-6'>
          {activeTab === 'overview' && (
            <>
              <div className='rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white shadow-xl'>
                <h2 className='text-2xl font-bold'>Parent Overview</h2>
                <p className='mt-2 text-blue-50'>
                  See only your child's school performance, notices, and fee progress from one focused dashboard.
                </p>
              </div>

              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <DashboardCard onClick={() => setActiveTab('progress')} className="cursor-pointer" title='Attendance' icon='A' value={`${attendanceStats.percentage}%`} color='green' />
                <DashboardCard onClick={() => setActiveTab('progress')} className="cursor-pointer" title='Homework Pending' icon='H' value={homeworkStats.pending.length} color='red' />
                <DashboardCard onClick={() => setActiveTab('progress')} className="cursor-pointer" title='Materials Unread' icon='M' value={materialsStats.unread.length} color='orange' />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer" title='Fee Pending' icon='F' value={`Rs. ${feeSummary.pendingAmount}`} color='blue' />
              </div>

              <div className='grid gap-6 lg:grid-cols-2'>
                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Child Snapshot</h3>
                  <div className={`mt-4 space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    <p><span className='font-semibold'>Student:</span> {linkedChild.name}</p>
                    <p><span className='font-semibold'>Class:</span> {linkedChild.className || 'N/A'}</p>
                    <p><span className='font-semibold'>Section:</span> {linkedChild.section || linkedChild.sec || 'N/A'}</p>
                    <p><span className='font-semibold'>Homework Submitted:</span> {homeworkStats.submitted.length}</p>
                    <p><span className='font-semibold'>Homework Pending:</span> {homeworkStats.pending.length}</p>
                    <p><span className='font-semibold'>Materials Read:</span> {materialsStats.read.length}</p>
                    <p><span className='font-semibold'>Unread Materials:</span> {materialsStats.unread.length}</p>
                  </div>
                </div>

                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Latest Status</h3>
                  <div className={`mt-4 space-y-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    <p>
                      <span className='font-semibold'>Recent attendance:</span>{' '}
                      {attendanceRecords[0] ? `${attendanceRecords[0].status} on ${new Date(attendanceRecords[0].date).toLocaleDateString()}` : 'No attendance record yet'}
                    </p>
                    <p>
                      <span className='font-semibold'>Latest notice:</span>{' '}
                      {notifications[0]?.title || 'No school notice available'}
                    </p>
                    <p><span className='font-semibold'>Payment status:</span> {latestPayment ? `${latestPayment.status} (${latestPaymentMode})` : 'Awaiting school update'}</p>
                    <p>
                      <span className='font-semibold'>Fee description:</span>{' '}
                      {feeDetails?.description || 'Fee structure not configured for this class'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'progress' && (
            <div className='space-y-6'>
              <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Attendance Performance</h2>
                <div className='mt-4 grid gap-4 md:grid-cols-4'>
                  <DashboardCard title='Present' icon='P' value={attendanceStats.present} color='green' className='h-auto min-h-[9rem]' />
                  <DashboardCard title='Absent' icon='A' value={attendanceStats.absent} color='red' className='h-auto min-h-[9rem]' />
                  <DashboardCard title='Late' icon='L' value={attendanceStats.late} color='orange' className='h-auto min-h-[9rem]' />
                  <DashboardCard title='Total Days' icon='T' value={attendanceStats.total} color='blue' className='h-auto min-h-[9rem]' />
                </div>
                <div className='mt-6 space-y-2'>
                  {attendanceRecords.length === 0 ? (
                    <p className='text-slate-500'>No attendance records found.</p>
                  ) : (
                    attendanceRecords.slice(0, 10).map((record) => (
                      <div key={record.id} className={`flex items-center justify-between rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-3`}>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{new Date(record.date).toLocaleDateString()}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : record.status === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className='grid gap-6 lg:grid-cols-2'>
                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Homework Status</h2>
                  <div className='mt-4 space-y-3'>
                    {childHomework.length === 0 ? (
                      <p className='text-slate-500'>No homework assigned yet.</p>
                    ) : (
                      childHomework.map((homework) => {
                        const submission = (homework.submissions || []).find((entry) => entry.studentId === linkedChild.id);
                        const isSubmitted = Boolean(submission);
                        return (
                          <div key={homework.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{homework.title}</p>
                                <p className='text-xs text-slate-500'>Due: {homework.dueDate || 'N/A'}</p>
                                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{homework.description}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isSubmitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {isSubmitted ? 'Submitted' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Study Materials</h2>
                  <div className='mt-4 space-y-3'>
                    {childMaterials.length === 0 ? (
                      <p className='text-slate-500'>No study materials available yet.</p>
                    ) : (
                      childMaterials.map((material) => {
                        const isRead = (material.readBy || []).some((entry) => entry.studentId === linkedChild.id);
                        return (
                          <div key={material.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{material.title}</p>
                                <p className='text-xs text-slate-500'>Type: {material.type}</p>
                                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{material.description}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isRead ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isRead ? 'Read' : 'Unread'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>School Notices</h2>
              <p className='mt-1 text-sm text-slate-600'>Only notices sent to parents or all users are shown here.</p>
              <div className='mt-4 space-y-4'>
                {notifications.length === 0 ? (
                  <p className='text-slate-500'>No notices available.</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{notification.title}</h3>
                          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{notification.message}</p>
                        </div>
                        <span className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                          {notification.targetRole}
                        </span>
                      </div>
                      <p className='mt-3 text-xs text-slate-500'>
                        From {notification.senderName} ({notification.senderRole}) on {new Date(notification.notificationDate || notification.sentAt).toLocaleDateString()}
                      </p>
                      {notification.attachmentDataUrl && (
                        <a
                          href={notification.attachmentDataUrl}
                          download={notification.attachmentName || 'notification-attachment'}
                          className='mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700'
                        >
                          Download Attachment
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'transport' && (
            <div className="space-y-6">
               <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-8 text-white shadow-xl">
                  <h2 className="text-3xl font-black mb-2">Child Transport Tracking</h2>
                  <p className="text-indigo-100 font-bold opacity-90">Manage your child's daily school bus boarding and dropping status. This ensures safety and keeps the school office informed.</p>
               </div>
               <UserTransportLog isDarkMode={isDarkMode} user={linkedChild} showMessage={showMessage} />
               <TransportStatsPanel
                 isDarkMode={isDarkMode}
                 showMessage={showMessage}
                 passengerIds={childTransportPassengerIds}
               />
            </div>
          )}

          {activeTab === 'fees' && (
            <div className='space-y-6'>
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer" title='Total Fee' icon='T' value={`Rs. ${feeSummary.totalFee}`} color='blue' />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer" title='Paid' icon='P' value={`Rs. ${feeSummary.paidAmount}`} color='green' />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer" title='In Process' icon='I' value={`Rs. ${feeSummary.inProcessAmount}`} color='orange' />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer" title='Pending' icon='B' value={`Rs. ${feeSummary.pendingAmount}`} color='red' />
              </div>

              <div className='grid gap-6 lg:grid-cols-2'>
                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Fee Summary</h2>
                  <div className={`mt-4 space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    <p><span className='font-semibold'>Student:</span> {linkedChild.name}</p>
                    <p><span className='font-semibold'>Class:</span> {linkedChild.className || 'N/A'}</p>
                    <p><span className='font-semibold'>Total annual fee:</span> Rs. {feeSummary.totalFee}</p>
                    <p><span className='font-semibold'>Paid amount:</span> Rs. {feeSummary.paidAmount}</p>
                    <p><span className='font-semibold'>Amount in process:</span> Rs. {feeSummary.inProcessAmount}</p>
                    <p><span className='font-semibold'>Current pending:</span> Rs. {feeSummary.pendingAmount}</p>
                    <p><span className='font-semibold'>Fee note:</span> {feeDetails?.description || 'No fee description set by school yet.'}</p>
                  </div>
                </div>

                <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Payment Mode</h2>
                  <p className='mt-1 text-sm text-slate-600'>
                    Parents can view fee payment status here, but cannot submit fee from the application.
                  </p>
                  <div className={`mt-4 space-y-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    <p><span className='font-semibold'>Selected mode:</span> {latestPaymentMode}</p>
                    <p><span className='font-semibold'>Cycle:</span> {latestPayment?.note || 'School will update whether it is monthly, semester, installment (3/4/6 months), or one-time.'}</p>
                    <p><span className='font-semibold'>Current status:</span> {latestPayment?.status || 'Pending update from school office'}</p>
                    <p><span className='font-semibold'>Payment instruction:</span> Please contact school office or follow school notice for the actual payment process.</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Fee Notices</h2>
                <div className='mt-4 space-y-3'>
                  {feeNotices.length === 0 ? (
                    <p className='text-slate-500'>No fee-related notices available right now.</p>
                  ) : (
                    feeNotices.map((notice) => (
                      <div key={notice.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{notice.title}</p>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{notice.message}</p>
                        <p className='mt-2 text-xs text-slate-500'>
                          From {notice.senderName} ({notice.senderRole}) on {new Date(notice.sentAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} bg-white p-6 shadow-sm`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Payment History</h2>
                <div className='mt-4 space-y-3'>
                  {feePayments.length === 0 ? (
                    <p className='text-slate-500'>No payment status has been updated by school yet.</p>
                  ) : (
                    feePayments.map((payment) => (
                      <div key={payment.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Rs. {payment.amount}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Plan: {payment.plan.replace('_', ' ')}</p>
                            <p className='text-xs text-slate-500'>
                              Requested on {new Date(payment.requestedAt).toLocaleDateString()}
                            </p>
                            {payment.note && <p className='mt-1 text-sm text-slate-600'>{payment.note}</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : payment.status === 'processing'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
