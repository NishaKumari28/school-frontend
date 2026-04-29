'use client';
import { useMemo, useState, useEffect } from 'react';
import DashboardCard from './DashboardCard';
import { getFeeStructure, updateFeeStructure, sendNotification, getFeePayments, updateFeePaymentStatus, updateUserProfilePhoto } from '../../components/auth/authService';

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
  const [fee, setFee] = useState({ className: '', feeAmount: '', description: '' });
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);

  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const parents = allUsers.filter(u => u.role === 'parents');
 // const staff = allUsers.filter(u => u.role === 'staff');

  const feePayments = useMemo(() => {
    return getFeePayments().slice().sort((a, b) => new Date(b.requestedAt || b.paidAt) - new Date(a.requestedAt || a.paidAt));
  }, [paymentRefreshKey]);

  const paymentSummary = useMemo(() => ({
    pending: feePayments.filter((payment) => payment.status === 'pending').length,
    processing: feePayments.filter((payment) => payment.status === 'processing').length,
    paid: feePayments.filter((payment) => payment.status === 'paid').length,
    rejected: feePayments.filter((payment) => payment.status === 'rejected').length
  }), [feePayments]);

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

  const handleUpdateFee = () => {
    if (!fee.className || !fee.feeAmount) {
      showMessage('Please fill fee fields', 'error');
      return;
    }

    const result = updateFeeStructure({
      className: fee.className,
      feeAmount: parseFloat(fee.feeAmount),
      description: fee.description
    });

    if (result.success) {
      showMessage('Fee structure updated successfully!');
      setFee({ className: '', feeAmount: '', description: '' });
    } else {
      showMessage(result.message, 'error');
    }
  };

  const handlePaymentStatusUpdate = (paymentId, status) => {
    const result = updateFeePaymentStatus({ id: paymentId, status });

    if (result.success) {
      setPaymentRefreshKey((prev) => prev + 1);
      showMessage(`Payment marked as ${status}`);
    } else {
      showMessage(result.message, 'error');
    }
  };

  const navButtons = [
    { label: 'Overview', tab: 'overview' },
    { label: 'Notifications', tab: 'notifications' },
    { label: 'Fee Structure', tab: 'fees' }
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
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

          <h3 className={`text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name || 'Non Teaching Staff'}</h3>
          <p className="text-sm font-semibold text-blue-600 text-center">Non Teaching Staff</p>
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

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
              <DashboardCard className="cursor-pointer" title="Students" icon="S" value={students.length} color="blue" />
              <DashboardCard className="cursor-pointer" title="Teachers" icon="T" value={teachers.length} color="green" />
              <DashboardCard className="cursor-pointer" title="Parents" icon="P" value={parents.length} color="purple" />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Send Notification</h2>
              <div className='space-y-4'>
                <input
                  type='text'
                  placeholder='Notification Title'
                  value={notification.title}
                  onChange={(e) => setNotification({...notification, title: e.target.value})}
                  className='w-full px-3 py-2 border border-slate-300 rounded-md'
                />
                <textarea
                  placeholder='Notification Message'
                  value={notification.message}
                  onChange={(e) => setNotification({...notification, message: e.target.value})}
                  className='w-full px-3 py-2 border border-slate-300 rounded-md'
                  rows={4}
                />
                <select
                  value={notification.targetRole}
                  onChange={(e) => setNotification({...notification, targetRole: e.target.value})}
                  className='w-full px-3 py-2 border border-slate-300 rounded-md'
                >
                  <option value='all'>All Users</option>
                  <option value='students'>Students Only</option>
                  <option value='parents'>Parents Only</option>
                  <option value='teachers'>Teachers Only</option>
                </select>
                <button
                  onClick={handleSendNotification}
                  className={`bg-orange-600 ${isDarkMode ? 'text-white' : 'text-slate-900'} px-4 py-2 rounded-md hover:bg-orange-700`}
                >
                  Send Notification
                </button>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer h-auto min-h-[9rem]" title="Pending Requests" icon="P" value={paymentSummary.pending} color="orange" />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer h-auto min-h-[9rem]" title="Processing" icon="I" value={paymentSummary.processing} color="blue" />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer h-auto min-h-[9rem]" title="Paid" icon="D" value={paymentSummary.paid} color="green" />
                <DashboardCard onClick={() => setActiveTab('fees')} className="cursor-pointer h-auto min-h-[9rem]" title="Rejected" icon="R" value={paymentSummary.rejected} color="red" />
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Update Fee Structure</h2>
                <div className='grid gap-4 md:grid-cols-3'>
                  <input
                    type='text'
                    placeholder='Class Name (e.g., Class 10)'
                    value={fee.className}
                    onChange={(e) => setFee({...fee, className: e.target.value})}
                    className='px-3 py-2 border border-slate-300 rounded-md'
                  />
                  <input
                    type='number'
                    placeholder='Fee Amount'
                    value={fee.feeAmount}
                    onChange={(e) => setFee({...fee, feeAmount: e.target.value})}
                    className='px-3 py-2 border border-slate-300 rounded-md'
                  />
                  <input
                    type='text'
                    placeholder='Description (optional)'
                    value={fee.description}
                    onChange={(e) => setFee({...fee, description: e.target.value})}
                    className='px-3 py-2 border border-slate-300 rounded-md'
                  />
                </div>
                <button
                  onClick={handleUpdateFee}
                  className={`mt-4 bg-green-600 ${isDarkMode ? 'text-white' : 'text-slate-900'} px-4 py-2 rounded-md hover:bg-green-700`}
                >
                  Update Fee Structure
                </button>
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Current Fee Structure</h2>
                <div className='space-y-2'>
                  {getFeeStructure().map(f => (
                    <div key={f.id} className={`flex justify-between items-center p-3 border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded`}>
                      <div>
                        <span className='font-medium'>{f.className}</span>
                        {f.description && <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'} ml-2`}>{f.description}</span>}
                      </div>
                      <span className='font-bold text-green-600'>Rs. {f.feeAmount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Parent Payment Requests</h2>
                <div className='space-y-3'>
                  {feePayments.length === 0 ? (
                    <p className='text-slate-500'>No payment requests found.</p>
                  ) : (
                    feePayments.map((payment) => {
                      const student = students.find((entry) => entry.id === payment.studentId);
                      const parent = parents.find((entry) => entry.id === payment.parentId);

                      return (
                        <div key={payment.id} className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} p-4`}>
                          <div className='flex flex-wrap items-start justify-between gap-4'>
                            <div className={`space-y-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Rs. {payment.amount}</p>
                              <p>Student: {student?.name || `Student #${payment.studentId}`}</p>
                              <p>Parent: {parent?.name || `Parent #${payment.parentId}`}</p>
                              <p>Class: {payment.className || student?.className || 'N/A'}</p>
                              <p>Plan: {payment.plan.replace('_', ' ')}</p>
                              <p>Status: <span className='font-semibold capitalize'>{payment.status}</span></p>
                              <p>Requested: {new Date(payment.requestedAt).toLocaleDateString()}</p>
                              {payment.note && <p>Note: {payment.note}</p>}
                            </div>

                            <div className='flex flex-wrap gap-2'>
                              <button
                                type='button'
                                onClick={() => handlePaymentStatusUpdate(payment.id, 'processing')}
                                className='rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700'
                              >
                                Mark Processing
                              </button>
                              <button
                                type='button'
                                onClick={() => handlePaymentStatusUpdate(payment.id, 'paid')}
                                className='rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700'
                              >
                                Mark Paid
                              </button>
                              <button
                                type='button'
                                onClick={() => handlePaymentStatusUpdate(payment.id, 'rejected')}
                                className='rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700'
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
