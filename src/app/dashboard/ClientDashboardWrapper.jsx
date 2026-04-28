'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserList, isAuthenticated, logout } from '../components/auth/authService';

import SuperadminDashboard from './components/SuperadminDashboard';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';
import StaffDashboard from './components/StaffDashboard';

export default function ClientDashboardWrapper({ initialUsers = [], initialUser = null }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [allUsers, setAllUsers] = useState(initialUsers);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = () => {
    try {
      const users = getUserList();
      const currentUser = getCurrentUser();
      const fullCurrentUser = users.find((entry) => entry.id === currentUser?.id)
        || users.find((entry) => entry.number === currentUser?.number)
        || currentUser;

      setUser(fullCurrentUser || null);
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const clearMessage = useCallback(() => {
    setVisible(false);
    // wait for exit animation before clearing text
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 300);
  }, []);

  const showMessage = useCallback((msg, type = 'success') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage(msg);
    setMessageType(type);
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      clearMessage();
    }, 5000);
  }, [clearMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!user) {
    return (
      <main className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
        <p className='text-slate-800'>Loading dashboard...</p>
      </main>
    );
  }

  // Render Role Dashboard
  const renderDashboard = () => {
    const props = { user, allUsers, showMessage, loadData };
    switch(user.role) {
      case 'superadmin': return <SuperadminDashboard {...props} />;
      case 'admin': return <AdminDashboard {...props} />;
      case 'teacher': return <TeacherDashboard {...props} />;
      case 'student': return <StudentDashboard {...props} />;
      case 'parents': return <ParentDashboard {...props} />;
      case 'staff': return <StaffDashboard {...props} />;
      default: return <p>Invalid role detected.</p>;
    }
  };

  return (
    <>
      {/* Header */}
      <header className='bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50/30 border-b border-slate-100/50 shadow-xl backdrop-blur-xl sticky top-0 z-50'>
        <div className='mx-auto max-w-7xl px-6 py-4'>
          <div className='flex items-center justify-between gap-6'>
            <div className='flex items-center gap-4 group'>
              <div className='relative'>
                <img 
                  src='https://play-lh.googleusercontent.com/SwRA5CRtwVlGHVg75qaZbxc6ivcJ7mVkErDDudhpZ37Vr32U_PzV1NffrnnsD9dM5g' 
                  alt="Vista's Learning Logo" 
                  className='w-16 h-16 object-contain rounded-2xl shadow-2xl ring-4 ring-white/50 hover:scale-105 transition-all duration-300 hover:shadow-blue-500/20 group-hover:rotate-3'
                />
                <div className='absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 rounded-3xl blur opacity-20 animate-pulse' />
              </div>
              <div>
                <h1 className='text-3xl font-black bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent drop-shadow-lg group-hover:scale-105 transition-all duration-300'>
                  Vista&apos;s Learning
                </h1>
                <p className='text-sm font-semibold bg-gradient-to-r from-blue-600/80 to-purple-600/80 bg-clip-text text-transparent'>
                  School Management System
                </p>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <span className='px-6 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 rounded-2xl shadow-lg text-lg font-bold text-blue-900 ring-1 ring-blue-100/50 hover:shadow-xl hover:shadow-blue-200/30 transition-all duration-300'>
                👋 Welcome, <span className='text-purple-700'>{user.name} :: {user.role}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className='group relative px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:from-red-600 hover:to-red-700 active:scale-[0.97] transition-all duration-300 overflow-hidden'
              >
                <span className='relative z-10'>Logout</span>
                <div className='absolute inset-0 bg-gradient-to-r from-white/20 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700' />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Fixed-position Toast Notification */}
      {message && (
        <div
          className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all duration-300 min-w-[320px] max-w-[90vw] ${
            visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          } ${
            messageType === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-green-600 text-white border-green-700'
          }`}
        >
          <span className='text-xl flex-shrink-0'>
            {messageType === 'error' ? '❌' : '✅'}
          </span>
          <span className='font-semibold text-sm flex-1'>{message}</span>
          <button
            onClick={clearMessage}
            className='ml-2 text-white/80 hover:text-white text-lg leading-none flex-shrink-0'
            aria-label='Close'
          >
            ×
          </button>
        </div>
      )}

      <div className='mx-auto max-w-7xl px-6 pt-6'>
        {renderDashboard()}
      </div>
    </>
  );
}
