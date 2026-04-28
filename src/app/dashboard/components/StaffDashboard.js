'use client';
import { useMemo, useState } from 'react';
import DashboardCard from './DashboardCard';
import { getFeeStructure, updateFeeStructure, sendNotification, getFeePayments, updateFeePaymentStatus } from '../../components/auth/authService';

export default function StaffDashboard({ user, allUsers, showMessage }) {
  const [activeTab, setActiveTab] = useState('overview');
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
    <div className="mx-auto max-w-7xl p-6 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200/50 bg-gradient-to-b from-slate-50 to-blue-50 p-6 shadow-xl backdrop-blur-sm h-fit lg:sticky lg:top-24 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
        
        {/* Profile Info in Sidebar */}
        <div className="mb-6 pb-4 border-b border-blue-200">
          <h3 className="text-xl font-bold text-gray-800">{user?.name || 'Non Teaching Staff'}</h3>
          <p className="text-sm font-semibold text-blue-600">Non Teaching Staff</p>
          <p className="text-xs text-gray-500 mt-1">{user?.number}</p>
          
          {user?.schoolName && (
            <p className="text-xs font-semibold text-gray-700 mt-2">🏫 {user.schoolName}</p>
          )}
          <p className="text-xs font-semibold text-gray-600 mt-1">📚 Board: {user?.board || 'N/A'}</p>
        </div>

        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 pb-3 border-b border-blue-200">Quick Actions</h3>
        <div className="space-y-2">
          {navButtons.map((btn) => (
            <button
              key={btn.tab}
              type="button"
              onClick={() => setActiveTab(btn.tab)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 shadow-sm border ${
                activeTab === btn.tab
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-300/50 border-blue-400 hover:shadow-blue-400/70'
                  : 'bg-white/70 hover:bg-white border-slate-200/50 hover:border-blue-300/50 hover:shadow-md text-slate-800 hover:text-blue-700 font-medium'
              }`}
            >
              <span className="text-sm font-semibold">{btn.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div>
        <div className="mb-8 border-b-2 border-slate-200/50 pb-4">
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
            <div className='bg-white p-6 rounded-lg border border-slate-200'>
              <h2 className='text-lg font-semibold text-slate-900 mb-4'>Send Notification</h2>
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
                  className='bg-orange-600 text-slate-900 px-4 py-2 rounded-md hover:bg-orange-700'
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

              <div className='bg-white p-6 rounded-lg border border-slate-200'>
                <h2 className='text-lg font-semibold text-slate-900 mb-4'>Update Fee Structure</h2>
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
                  className='mt-4 bg-green-600 text-slate-900 px-4 py-2 rounded-md hover:bg-green-700'
                >
                  Update Fee Structure
                </button>
              </div>

              <div className='bg-white p-6 rounded-lg border border-slate-200'>
                <h2 className='text-lg font-semibold text-slate-900 mb-4'>Current Fee Structure</h2>
                <div className='space-y-2'>
                  {getFeeStructure().map(f => (
                    <div key={f.id} className='flex justify-between items-center p-3 border border-slate-200 rounded'>
                      <div>
                        <span className='font-medium'>{f.className}</span>
                        {f.description && <span className='text-sm text-slate-700 ml-2'>{f.description}</span>}
                      </div>
                      <span className='font-bold text-green-600'>Rs. {f.feeAmount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className='bg-white p-6 rounded-lg border border-slate-200'>
                <h2 className='text-lg font-semibold text-slate-900 mb-4'>Parent Payment Requests</h2>
                <div className='space-y-3'>
                  {feePayments.length === 0 ? (
                    <p className='text-slate-500'>No payment requests found.</p>
                  ) : (
                    feePayments.map((payment) => {
                      const student = students.find((entry) => entry.id === payment.studentId);
                      const parent = parents.find((entry) => entry.id === payment.parentId);

                      return (
                        <div key={payment.id} className='rounded-lg border border-slate-200 p-4'>
                          <div className='flex flex-wrap items-start justify-between gap-4'>
                            <div className='space-y-1 text-sm text-slate-700'>
                              <p className='font-semibold text-slate-900'>Rs. {payment.amount}</p>
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
      </div>
    </div>
  );
}
