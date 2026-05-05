'use client';
import { useMemo, useState, useEffect } from 'react';
import { sendNotification, getFeePayments, updateUserProfilePhoto, getNotifications } from '../../components/auth/authService';

import StaffTeacherAttendance from './StaffTeacherAttendance';
import StaffHostel from './StaffHostel';
import StaffLibrary from './StaffLibrary';
import StaffTransport from './StaffTransport';
import StaffFees from './StaffFees';
import { initializeSampleData, hostelUtils, libraryUtils, transportUtils, teacherAttendanceUtils } from '../utils/staffDataUtils';

export default function StaffDashboard({ user, allUsers, showMessage }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('school_theme') === 'dark';
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    initializeSampleData();
  }, [isDarkMode]);

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

  const [notification, setNotification] = useState({ title: '', message: '', targetRole: 'all', notificationDate: new Date().toISOString().split('T')[0] });
  const [notificationAttachment, setNotificationAttachment] = useState(null);
  const [notificationRecordFilterDate, setNotificationRecordFilterDate] = useState('');
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [relativeTimeNow, setRelativeTimeNow] = useState(0);
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

  const [availableClasses, setAvailableClasses] = useState(['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12']);
  const staffClassOptions = adminAssignedClasses.length > 0 ? adminAssignedClasses : availableClasses;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refreshDashboardData = () => {
      setDashboardRefreshKey((value) => value + 1);
      setRelativeTimeNow(new Date().getTime());
    };

    refreshDashboardData();
    const intervalId = window.setInterval(refreshDashboardData, 3000);
    window.addEventListener('storage', refreshDashboardData);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', refreshDashboardData);
    };
  }, []);

  const teacherIdSet = useMemo(() => new Set(teachers.map((item) => String(item.id))), [teachers]);
  const studentIdSet = useMemo(() => new Set(students.map((item) => String(item.id))), [students]);
  const parentIdSet = useMemo(() => new Set(parents.map((item) => String(item.id))), [parents]);

  const schoolNotifications = useMemo(() => {
    void dashboardRefreshKey;
    void notificationRefreshKey;
    return getNotifications()
      .filter((item) => !item.schoolName || normalize(item.schoolName) === normalize(user.schoolName))
      .sort((a, b) => new Date(b.sentAt || b.notificationDate || 0) - new Date(a.sentAt || a.notificationDate || 0));
  }, [dashboardRefreshKey, notificationRefreshKey, user.schoolName]);

  const liveDashboardData = useMemo(() => {
    void dashboardRefreshKey;
    const isSameSchool = (record) => !record?.schoolName || normalize(record.schoolName) === normalize(user.schoolName);

    const hostelRooms = hostelUtils.getRooms().filter(isSameSchool);
    const hostelAllotments = hostelUtils.getAllotments().filter((item) => isSameSchool(item) && !item.leaveDate);
    const hostelLogs = hostelUtils.getLogs().filter(isSameSchool);
    const meetingVisitors = hostelUtils.getMeetingVisitors().filter(isSameSchool);
    const generalVisitors = hostelUtils.getGeneralVisitors().filter(isSameSchool);

    const libraryBooks = libraryUtils.getBooks().filter(isSameSchool);
    const readingLogs = libraryUtils.getReadingLogs().filter(isSameSchool);
    const studentLending = libraryUtils.getStudentLending().filter(isSameSchool);
    const teacherLending = libraryUtils.getTeacherLending().filter(isSameSchool);

    const transportPassengers = transportUtils.getPassengers().filter((item) => {
      if (item?.schoolName && !isSameSchool(item)) return false;
      const personId = item.studentId || item.teacherId || item.userId || item.id;
      return studentIdSet.has(String(personId)) || teacherIdSet.has(String(personId)) || !personId;
    });
    const transportAttendance = transportUtils.getAttendance();

    const teacherAttendance = teacherAttendanceUtils.getAttendance().filter((item) => {
      if (!item) return false;
      if (item.schoolName && !isSameSchool(item)) return false;
      return teacherIdSet.has(String(item.teacherId));
    });

    const feePayments = getFeePayments().filter((item) => {
      if (!item) return false;
      if (item.schoolName && !isSameSchool(item)) return false;
      return (
        studentIdSet.has(String(item.studentId)) ||
        parentIdSet.has(String(item.parentId)) ||
        !item.studentId
      );
    });

    return {
      hostelRooms,
      hostelAllotments,
      hostelLogs,
      meetingVisitors,
      generalVisitors,
      libraryBooks,
      readingLogs,
      studentLending,
      teacherLending,
      transportPassengers,
      transportAttendance,
      teacherAttendance,
      feePayments
    };
  }, [dashboardRefreshKey, studentIdSet, teacherIdSet, user.schoolName, parentIdSet]);

  const operationsSummary = useMemo(() => {
    const totalBeds = liveDashboardData.hostelRooms.reduce((sum, room) => sum + (Number(room.beds) || 0), 0);
    const occupiedBeds = liveDashboardData.hostelRooms.reduce((sum, room) => sum + (Number(room.occupied) || 0), 0);
    const hostelPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const totalBookUnits = liveDashboardData.libraryBooks.reduce((sum, book) => sum + Math.max(0, Number(book.stock) || 0), 0);
    const issuedStudentBooks = liveDashboardData.studentLending.filter((item) => item.status === 'Issued').length;
    const issuedTeacherBooks = liveDashboardData.teacherLending.filter((item) => item.status === 'Issued').length;
    const activeIssuedBooks = issuedStudentBooks + issuedTeacherBooks;
    const libraryBase = totalBookUnits + activeIssuedBooks;
    const libraryPercent = libraryBase > 0 ? Math.round((activeIssuedBooks / libraryBase) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const todayTransportLogs = Object.entries(liveDashboardData.transportAttendance)
      .filter(([key]) => key.startsWith(`${today}_`))
      .map(([, value]) => value);
    const completedTrips = todayTransportLogs.filter((item) => item.boarded && item.dropped).length;
    const transportPercent = liveDashboardData.transportPassengers.length > 0
      ? Math.round((completedTrips / liveDashboardData.transportPassengers.length) * 100)
      : 0;

    const totalRequestedFees = liveDashboardData.feePayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalCollectedFees = liveDashboardData.feePayments
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const feePercent = totalRequestedFees > 0 ? Math.round((totalCollectedFees / totalRequestedFees) * 100) : 0;

    return [
      {
        label: 'Hostel Occupancy',
        val: `${hostelPercent}%`,
        color: 'bg-blue-500',
        detail: `${occupiedBeds}/${totalBeds || 0} beds occupied`
      },
      {
        label: 'Library Utilization',
        val: `${libraryPercent}%`,
        color: 'bg-purple-500',
        detail: `${activeIssuedBooks} books currently issued`
      },
      {
        label: 'Transport Efficiency',
        val: `${transportPercent}%`,
        color: 'bg-orange-500',
        detail: `${completedTrips}/${liveDashboardData.transportPassengers.length || 0} trips completed today`
      },
      {
        label: 'Fee Collection',
        val: `${feePercent}%`,
        color: 'bg-emerald-500',
        detail: `Rs. ${totalCollectedFees.toLocaleString()} of Rs. ${totalRequestedFees.toLocaleString()} collected`
      }
    ];
  }, [liveDashboardData]);

  const formatRelativeTime = (value) => {
    if (!value) return 'Just now';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    const diffMs = (relativeTimeNow || parsed.getTime()) - parsed.getTime();
    if (diffMs < 60 * 1000) return 'Just now';

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day ago`;

    return parsed.toLocaleDateString();
  };

  const buildActivityTimestamp = (dateValue, timeValue) => {
    if (!dateValue) return '';
    if (!timeValue || timeValue === '-') return `${dateValue}T00:00:00`;

    const parsed = new Date(`${dateValue} ${timeValue}`);
    if (Number.isNaN(parsed.getTime())) return `${dateValue}T00:00:00`;

    return parsed.toISOString();
  };

  const recentActivities = useMemo(() => {
    const passengerById = new Map(
      liveDashboardData.transportPassengers.map((item) => [String(item.id), item])
    );

    const feeActivities = liveDashboardData.feePayments.map((item) => ({
      id: `fee-${item.id}`,
      icon: '💰',
      text: item.status === 'paid'
        ? `Fee payment received: Rs. ${(Number(item.amount) || 0).toLocaleString()}`
        : `Fee request raised: Rs. ${(Number(item.amount) || 0).toLocaleString()}`,
      timestamp: item.paidAt || item.updatedAt || item.requestedAt
    }));

    const notificationActivities = schoolNotifications.map((item) => ({
      id: `notification-${item.id}`,
      icon: '🔔',
      text: `Notification sent: ${item.title}`,
      timestamp: item.sentAt || item.notificationDate
    }));

    const hostelActivities = [
      ...liveDashboardData.hostelAllotments.map((item) => ({
        id: `hostel-allotment-${item.id}`,
        icon: '🏢',
        text: `${item.studentName || 'Student'} allotted to room ${item.roomNumber || '-'}`,
        timestamp: item.date || item.createdAt
      })),
      ...liveDashboardData.meetingVisitors.map((item) => ({
        id: `hostel-meeting-${item.id}`,
        icon: '🏢',
        text: `Hostel visitor check-in: ${item.visitorName || item.name || 'Visitor'}`,
        timestamp: item.createdAt
      })),
      ...liveDashboardData.generalVisitors.map((item) => ({
        id: `hostel-general-${item.id}`,
        icon: '🏢',
        text: `General hostel visitor: ${item.visitorName || item.name || 'Visitor'}`,
        timestamp: item.createdAt
      })),
      ...liveDashboardData.hostelLogs.map((item) => ({
        id: `hostel-log-${item.id}`,
        icon: '🏢',
        text: `${item.studentName || 'Student'} hostel movement updated`,
        timestamp: item.date
      }))
    ];

    const libraryActivities = [
      ...liveDashboardData.studentLending.map((item) => ({
        id: `library-student-${item.id}`,
        icon: '📚',
        text: `${item.bookTitle || 'Book'} issued to ${item.studentName || 'student'}`,
        timestamp: item.returnDate || item.issueDate
      })),
      ...liveDashboardData.teacherLending.map((item) => ({
        id: `library-teacher-${item.id}`,
        icon: '📚',
        text: `${item.bookTitle || 'Book'} issued to ${item.teacherName || 'teacher'}`,
        timestamp: item.returnDate || item.issueDate
      })),
      ...liveDashboardData.readingLogs.map((item) => ({
        id: `library-reading-${item.id}`,
        icon: '📚',
        text: `${item.bookTitle || 'Book'} used in reading room`,
        timestamp: item.date
      }))
    ];

    const transportActivities = Object.entries(liveDashboardData.transportAttendance).flatMap(([key, item]) => {
      const [date, passengerId] = key.split('_');
      const passenger = passengerById.get(String(passengerId));
      const name = passenger?.name || passenger?.studentName || passenger?.teacherName || 'Passenger';

      return [
        item.boarded ? {
          id: `transport-boarded-${key}`,
          icon: '🚌',
          text: `${name} boarded transport`,
          timestamp: buildActivityTimestamp(date, item.boardingTime)
        } : null,
        item.dropped ? {
          id: `transport-dropped-${key}`,
          icon: '🚌',
          text: `${name} dropped from transport`,
          timestamp: buildActivityTimestamp(date, item.droppingTime)
        } : null
      ].filter(Boolean);
    });

    const teacherAttendanceActivities = liveDashboardData.teacherAttendance.map((item) => {
      const teacher = teachers.find((record) => String(record.id) === String(item.teacherId));
      return {
        id: `teacher-attendance-${item.id}`,
        icon: '👨‍🏫',
        text: `${teacher?.name || 'Teacher'} marked ${item.status || 'attendance'}`,
        timestamp: item.updatedAt || item.date
      };
    });

    return [
      ...feeActivities,
      ...notificationActivities,
      ...hostelActivities,
      ...libraryActivities,
      ...transportActivities,
      ...teacherAttendanceActivities
    ]
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);
  }, [liveDashboardData, schoolNotifications, teachers]);

  const filteredNotificationRecords = useMemo(() => {
    if (!notificationRecordFilterDate) return schoolNotifications;
    return schoolNotifications.filter((item) => {
      const itemDate = item.notificationDate || (item.sentAt ? item.sentAt.split('T')[0] : '');
      return itemDate === notificationRecordFilterDate;
    });
  }, [schoolNotifications, notificationRecordFilterDate]);

  const handleNotificationAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setNotificationAttachment(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNotificationAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendNotification = () => {
    if (!notification.title || !notification.message || !notification.notificationDate) {
      showMessage('Please fill notification fields', 'error');
      return;
    }
    const result = sendNotification({
      title: notification.title,
      message: notification.message,
      targetRole: notification.targetRole,
      notificationDate: notification.notificationDate,
      attachment: notificationAttachment,
      senderId: user.id
    });
    if (result.success) {
      showMessage('Notification sent successfully!');
      setNotification({ title: '', message: '', targetRole: 'all', notificationDate: new Date().toISOString().split('T')[0] });
      setNotificationAttachment(null);
      setNotificationRefreshKey((value) => value + 1);
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

  const formatNotificationDate = (value) => {
    if (!value) return 'No date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  const formatAttachmentSize = (size = 0) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

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

        {/* Logout Button
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
            Logout
          </button>
        </div>   */}
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

              {/* Staff Tools Guide (Overview tab only) */}
              <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">🧭</span>
                  Staff Tools Guide
                </h3>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                  Manage your staff sections using the tabs below. Press Open to view and edit details within a category.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      tab: 'teacher_attendance',
                      icon: '👨‍🏫',
                      title: 'Teacher Attendance',
                      desc: 'Maintain daily attendance records and check staff status.'
                    },
                    {
                      tab: 'hostel',
                      icon: '🏢',
                      title: 'Hostel',
                      desc: 'Manage hostel occupancy and student check-in/check-out operations.'
                    },
                    {
                      tab: 'library',
                      icon: '📚',
                      title: 'Library',
                      desc: 'Manage books and issued items while tracking availability.'
                    },
                    {
                      tab: 'transport',
                      icon: '🚌',
                      title: 'Transport',
                      desc: 'Review routes and monitor transport status.'
                    },
                    {
                      tab: 'fees',
                      icon: '💰',
                      title: 'Fees Control',
                      desc: 'Manage fee structure, payments, and due tracking.'
                    },
                    {
                      tab: 'notifications',
                      icon: '🔔',
                      title: 'Notifications',
                      desc: 'Send broadcast notifications and review saved records.'
                    }
                  ].map((item) => (
                    <div
                      key={item.tab}
                      className={`rounded-2xl border p-5 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-slate-100 bg-slate-50/70'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-sm">
                              {item.icon}
                            </span>
                            <h4 className="text-base font-black truncate">{item.title}</h4>
                          </div>
                          <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            {item.desc}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab(item.tab)}
                          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] ${
                            isDarkMode
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📅</span>
                    Operations Summary
                  </h3>
                  <div className="space-y-4">
                    {operationsSummary.map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                          <span>{item.label}</span>
                          <span>{item.val}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-gray-900 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: item.val }} />
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{item.detail}</p>
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
                    {recentActivities.length === 0 ? (
                      <div className={`rounded-2xl border p-4 text-sm ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-slate-200 text-slate-500'}`}>
                        No real activity available yet. New hostel, library, transport, fee, attendance, or notification updates will appear here automatically.
                      </div>
                    ) : recentActivities.map((act) => (
                      <div key={act.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-gray-900 flex items-center justify-center text-lg">{act.icon}</div>
                        <div>
                          <p className="text-sm font-bold">{act.text}</p>
                          <p className="text-xs text-slate-400">{formatRelativeTime(act.timestamp)}</p>
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
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-8 rounded-3xl border border-slate-100 shadow-xl`}>
              <h2 className="text-xl font-black mb-2 flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-xl">🔔</span>
                Broadcast Notification
              </h2>
              <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                Send a notification with date, audience, attachment, title, and message.
              </p>
              <div className='space-y-4'>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-xs font-bold uppercase ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Notice Date</label>
                    <input
                      type='date'
                      value={notification.notificationDate}
                      onChange={(e) => setNotification({ ...notification, notificationDate: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className={`mb-2 block text-xs font-bold uppercase ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Target Role</label>
                    <select
                      value={notification.targetRole}
                      onChange={(e) => setNotification({...notification, targetRole: e.target.value})}
                      className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                    >
                      <option value='all'>All Users</option>
                      <option value='students'>Students Only</option>
                      <option value='parents'>Parents Only</option>
                      <option value='teachers'>Teachers Only</option>
                      <option value='staff'>Staff Only</option>
                    </select>
                  </div>
                </div>
                <div className={`rounded-2xl border border-dashed p-4 ${isDarkMode ? 'border-gray-600 bg-gray-700/40' : 'border-slate-300 bg-slate-50'}`}>
                  <label className={`mb-2 block text-xs font-bold uppercase ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Attachment Upload</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="notification-attachment"
                      className={`inline-flex cursor-pointer items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Choose File
                    </label>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      {notificationAttachment ? notificationAttachment.name : 'No file chosen'}
                    </span>
                  </div>
                  <input
                    id="notification-attachment"
                    type="file"
                    onChange={handleNotificationAttachmentChange}
                    className="hidden"
                  />
                  {notificationAttachment && (
                    <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-slate-700'}`}>
                      <p className="font-semibold">{notificationAttachment.name}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        {notificationAttachment.type || 'File'} {formatAttachmentSize(notificationAttachment.size) ? `- ${formatAttachmentSize(notificationAttachment.size)}` : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNotificationAttachment(null)}
                        className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        Remove attachment
                      </button>
                    </div>
                  )}
                </div>
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
                <button
                  onClick={handleSendNotification}
                  className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  Send Broadcast
                </button>
              </div>
              </div>

              <div className={`p-8 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-100'}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Notification Record Book</h2>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      All notification details will be stored here in the local record.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Filter By Date</label>
                    <input
                      type="date"
                      value={notificationRecordFilterDate}
                      onChange={(e) => setNotificationRecordFilterDate(e.target.value)}
                      className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-200 text-slate-800'}`}
                    />
                    {notificationRecordFilterDate && (
                      <button
                        type="button"
                        onClick={() => setNotificationRecordFilterDate('')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Total Records</p>
                    <p className="mt-2 text-2xl font-black">{schoolNotifications.length}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Filtered Records</p>
                    <p className="mt-2 text-2xl font-black">{filteredNotificationRecords.length}</p>
                  </div>
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>With Attachment</p>
                    <p className="mt-2 text-2xl font-black">{schoolNotifications.filter((item) => item.attachmentDataUrl).length}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredNotificationRecords.length === 0 ? (
                    <div className={`rounded-2xl border p-6 text-sm ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-slate-200 text-slate-500'}`}>
                      No notification record was found for the selected date.
                    </div>
                  ) : (
                    filteredNotificationRecords.map((item) => (
                      <div key={item.id} className={`rounded-2xl border p-5 ${isDarkMode ? 'border-gray-700 bg-gray-900/60' : 'border-slate-200 bg-slate-50/70'}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-lg font-black">{item.title}</h3>
                            <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{item.message}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-slate-700 border border-slate-200'}`}>
                            {item.targetRole}
                          </span>
                        </div>
                        <div className={`mt-4 grid gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'} md:grid-cols-2`}>
                          <p>Notice Date: {formatNotificationDate(item.notificationDate || item.sentAt)}</p>
                          <p>Sent On: {formatNotificationDate(item.sentAt)}</p>
                          <p>From: {item.senderName} ({item.senderRole})</p>
                          <p>School: {item.schoolName || user.schoolName || 'N/A'}</p>
                        </div>
                        {item.attachmentDataUrl && (
                          <div className={`mt-4 rounded-xl p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white border border-slate-200'}`}>
                            <p className="text-sm font-semibold">{item.attachmentName || 'Attachment'}</p>
                            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{item.attachmentType || 'File attachment'}</p>
                            <a
                              href={item.attachmentDataUrl}
                              download={item.attachmentName || 'notification-attachment'}
                              className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                              Download Attachment
                            </a>
                          </div>
                        )}
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

