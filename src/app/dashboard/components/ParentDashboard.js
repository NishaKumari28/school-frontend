'use client';
import { useMemo, useState, useEffect } from 'react';
import DashboardCard from './DashboardCard';
import UserTransportLog from './UserTransportLog';
import TransportStatsPanel from './TransportStatsPanel';
import { transportUtils, feeUtils } from '../utils/staffDataUtils';
import {
  getAttendanceList,
  getHomeworkList,
  getLearningMaterials,
  getNotifications,
  getFeeStructure,
  getFeePayments,
  updateUserProfilePhoto,
  getUserList
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
  const [refresh, setRefresh] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');

  useEffect(() => {
    const handleStorage = () => setRefresh(k => k + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    // Priority 1: Use the first kid from the parent's kids array
    if (user.kids && user.kids.length > 0) {
      const firstKid = user.kids[0];
      const match = students.find((student) => 
        normalize(student.name) === normalize(firstKid.name) && 
        normalize(student.className) === normalize(firstKid.currentClass)
      );
      if (match) return match;
    }

    // Priority 2: Try matching based on legacy child fields
    return students.find((student) => {
      const nameMatch = normalize(student.name) === normalize(user.childName);
      const classMatch = !user.childClass || normalize(student.className) === normalize(user.childClass);
      return nameMatch && classMatch;
    }) || null;
  }, [students, user.kids, user.childName, user.childClass]);

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
    return feeUtils.getStructure(linkedChild.id) || null;
  }, [linkedChild]);

  const feePayments = useMemo(() => {
    if (!linkedChild) return [];
    return feeUtils.getAllInvoices()
      .filter((inv) => String(inv.studentId) === String(linkedChild.id))
      .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  }, [linkedChild, refresh]);

  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    const balance = Math.max(0, (Number(invoice.totalFee) || 0) - (Number(invoice.paidAmount) || 0));
    setPaymentAmount(balance);
    setPaymentScreenshot('');
    setIsPaymentModalOpen(true);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPaymentScreenshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitPaymentProof = () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      showMessage("Please enter a valid amount.", "error");
      return;
    }
    if (!paymentScreenshot) {
      showMessage("Payment screenshot is mandatory!", "error");
      return;
    }
    feeUtils.submitProof(selectedInvoice.id, paymentAmount, paymentScreenshot);
    setIsPaymentModalOpen(false);
    setRefresh(k => k + 1);
    showMessage("Payment proof submitted! Staff will verify and update status.", "success");
  };

  const formatCurrency = (value) => `Rs. ${(Number(value) || 0).toLocaleString()}`;

  const buildInvoiceHtml = (invoice) => {
    const FEE_FIELDS = [
      { key: 'tuitionFee',      label: 'Tuition Fee' },
      { key: 'libraryFee',      label: 'Library Fee' },
      { key: 'electricityBill', label: 'Electricity Bill' },
      { key: 'waterBill',       label: 'Water Bill' },
      { key: 'dressFee',        label: 'Dress / Uniform Fee' },
      { key: 'bookFee',         label: 'Book Fee' },
      { key: 'transportFee',    label: 'Transport Fee' },
      { key: 'fine',            label: 'Fine' },
    ];

    const lineItems = FEE_FIELDS
      .filter((field) => Number(invoice[field.key]) > 0)
      .map((field) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;">${field.label}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">${formatCurrency(invoice[field.key])}</td>
        </tr>
      `)
      .join('');

    const balance = Math.max(0, (Number(invoice.totalFee) || 0) - (Number(invoice.paidAmount) || 0));

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${invoice.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
            .sheet { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
            .muted { color: #64748b; }
            .row { display: flex; justify-content: space-between; gap: 16px; }
            .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            .summary { margin-top: 24px; padding: 20px; border-radius: 18px; background: #f8fafc; }
            .summary .row { margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="row" style="align-items:flex-start;">
              <div>
                <h1 style="margin:0 0 8px;font-size:28px;">Fee Invoice</h1>
                <div class="muted" style="font-weight:700;">${invoice.invoiceNo}</div>
              </div>
              <span class="pill">${invoice.status}</span>
            </div>
            <div style="margin-top:24px;">
              <div class="row">
                <div>
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Student</div>
                  <div style="font-size:20px;font-weight:800;margin-top:6px;">${invoice.studentName || '-'}</div>
                </div>
                <div style="text-align:right;">
                  <div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;">Due Date</div>
                  <div style="font-size:18px;font-weight:800;margin-top:6px;">${invoice.dueDate || '-'}</div>
                </div>
              </div>
            </div>
            <table><tbody>${lineItems}</tbody></table>
            <div class="summary">
              <div class="row"><span style="font-weight:700;">Total Fee</span><span style="font-weight:800;">${formatCurrency(invoice.totalFee)}</span></div>
              <div class="row"><span style="font-weight:700;color:#059669;">Paid</span><span style="font-weight:800;color:#059669;">${formatCurrency(invoice.paidAmount)}</span></div>
              <div class="row"><span style="font-weight:700;color:#dc2626;">Balance</span><span style="font-weight:800;color:#dc2626;">${formatCurrency(balance)}</span></div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = (invoice) => {
    const html = buildInvoiceHtml(invoice);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Invoice downloaded!', 'success');
  };

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
    if (feePayments.length === 0) return { totalFee: 0, paidAmount: 0, inProcessAmount: 0, pendingAmount: 0 };
    
    const totalFee = feePayments.reduce((sum, inv) => sum + (parseFloat(inv.totalFee) || 0), 0);
    const paidAmount = feePayments.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount) || 0), 0);
    const pendingAmount = Math.max(totalFee - paidAmount, 0);
    
    return { totalFee, paidAmount, inProcessAmount: 0, pendingAmount };
  }, [feePayments]);

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
          
          <div className="mt-4 space-y-3">
            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Children Linked</p>
            {user.kids && user.kids.length > 0 ? (
              user.kids.map((kid, idx) => {
                const actualStudent = students.find(s => normalize(s.name) === normalize(kid.name) && normalize(s.className) === normalize(kid.currentClass));
                return (
                  <div key={idx} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{kid.name}</p>
                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      Class {kid.currentClass} | Sec {actualStudent?.section || actualStudent?.sec || 'N/A'}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className={`p-3 rounded-xl border border-dashed ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                <p className="text-[10px] text-slate-400 italic">Add children in profile to see details</p>
              </div>
            )}
          </div>

          {user?.schoolName && (
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
              <p className={`text-xs font-black ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>🏫 {user.schoolName}</p>
              <p className={`text-[10px] font-bold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>📚 Board: {user?.board || 'N/A'}</p>
            </div>
          )}


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

        {/* Logout Button 
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
            Logout
          </button>
        </div>  */}
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
                    <p><span className='font-semibold'>Student:</span> {linkedChild?.name || 'N/A'}</p>
                    <p><span className='font-semibold'>Class:</span> {linkedChild?.className || 'N/A'}</p>
                    <p><span className='font-semibold'>Section:</span> {linkedChild?.section || linkedChild?.sec || 'N/A'}</p>
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
            <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
              {/* Premium Summary Cards */}
              <div className='grid gap-4 md:grid-cols-4'>
                {[
                  { label: 'Total Payable', val: formatCurrency(feeSummary.totalFee), icon: '💰', color: 'from-blue-600 to-indigo-600' },
                  { label: 'Total Paid', val: formatCurrency(feeSummary.paidAmount), icon: '✅', color: 'from-emerald-500 to-teal-600' },
                  { label: 'Pending', val: formatCurrency(feeSummary.pendingAmount), icon: '⏳', color: 'from-rose-500 to-red-600' },
                  { label: 'Plan Status', val: feePayments[0]?.paymentPlan?.replace('_',' ') || 'Not Set', icon: '📅', color: 'from-amber-500 to-orange-600' },
                ].map((card, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br ${card.color}`}>
                    <div className="absolute -right-4 -top-4 text-6xl opacity-20">{card.icon}</div>
                    <p className='text-xs font-bold uppercase tracking-wider opacity-80'>{card.label}</p>
                    <p className='mt-2 text-2xl font-black'>{card.val}</p>
                  </div>
                ))}
              </div>

              <div className='grid gap-6 lg:grid-cols-3'>
                {/* Account Info */}
                <div className={`lg:col-span-1 space-y-6`}>
                  <div className={`rounded-[2rem] border shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                      <h2 className="text-lg font-black text-white">Billing Info</h2>
                      <p className="text-xs text-slate-400 mt-1">Details for {linkedChild?.name || 'N/A'}</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                        <span className="text-sm font-bold text-slate-500">Student ID</span>
                        <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{linkedChild?.id?.toString().slice(-6) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                        <span className="text-sm font-bold text-slate-500">Class & Sec</span>
                        <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{linkedChild?.className || 'N/A'} - {linkedChild?.section || linkedChild?.sec || 'N/A'}</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">School Note</p>
                        <p className={`text-sm italic ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                          {feeDetails?.description || 'No specific fee instructions provided by the school administration.'}
                        </p>
                      </div>
                    </div>
                  </div>

                   <div className={`rounded-[2rem] border shadow-lg p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Payment Instructions</h3>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                        <p className="text-xs text-slate-500 leading-relaxed">Review the pending invoices list below.</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                        <p className="text-xs text-slate-500 leading-relaxed">Click 'Pay Now' for the respective installment.</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                        <p className="text-xs text-slate-500 leading-relaxed">Download the generated receipt for your records.</p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-[2rem] border shadow-lg p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Fee Notices</h3>
                    <div className="space-y-4">
                      {feeNotices.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No active notices.</p>
                      ) : (
                        feeNotices.map((notice) => (
                          <div key={notice.id} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-gray-750 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{new Date(notice.sentAt).toLocaleDateString()}</p>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>{notice.title}</p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'} mt-1 leading-relaxed`}>{notice.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoices List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Transaction Ledger</h2>
                    <span className="text-xs font-bold text-slate-400">{feePayments.length} Items</span>
                  </div>

                  {feePayments.length === 0 ? (
                    <div className={`rounded-[2rem] border border-dashed p-12 text-center ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                      <div className="text-4xl mb-4">🧾</div>
                      <p className="text-slate-500 font-bold">No invoices found for this student.</p>
                      <p className="text-xs text-slate-400 mt-2">School office will generate invoices as per the schedule.</p>
                    </div>
                  ) : (
                    feePayments.map((inv) => (
                      <div key={inv.id} className={`group rounded-[1.5rem] border p-6 transition-all hover:shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-slate-100 hover:border-emerald-200'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${
                              inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {inv.status === 'paid' ? '✓' : '!'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inv.invoiceNo}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-500 mt-0.5">{inv.installmentLabel || 'One-time Fee'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(inv.totalFee)}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                              Due: {new Date(inv.dueDate).toLocaleDateString()}
                            </p>
                            <div className="w-full md:w-auto flex items-center gap-2 pt-4 md:pt-0 border-t md:border-0 border-slate-100">
                            {inv.status === 'unpaid' || inv.status === 'partial' ? (
                              <button 
                                onClick={() => handlePayInvoice(inv)}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                              >
                                {inv.status === 'partial' ? 'Pay Balance' : 'Pay Now'}
                              </button>
                            ) : inv.status === 'processing' ? (
                              <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase">
                                Under Review
                              </span>
                            ) : null}
                            <button 
                              onClick={() => handleDownloadInvoice(inv)}
                              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black border transition-all ${
                                isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              Download
                            </button>
                          </div>
                        </div>
                        {inv.paidAmount > 0 && (
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400">Total amount paid:</span>
                            <span className="text-xs font-black text-emerald-600">{formatCurrency(inv.paidAmount)}</span>
                          </div>
                        )}
                        {inv.paymentProof && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                             <span className="text-[10px] font-bold text-amber-700">Proof submitted for {formatCurrency(inv.paymentProof.amount)}</span>
                             <span className="text-[9px] text-amber-500">{new Date(inv.paymentProof.submittedAt).toLocaleString()}</span>
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

        {/* Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Confirm Payment</h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">Invoice: {selectedInvoice?.invoiceNo}</p>
                  </div>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Amount to Pay</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rs.</span>
                       <input 
                         type="number" 
                         value={paymentAmount}
                         onChange={e => setPaymentAmount(e.target.value)}
                         className={`w-full pl-12 pr-4 py-4 rounded-2xl font-black text-xl border focus:ring-4 focus:ring-emerald-500/20 transition-all ${
                           isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-slate-50 border-slate-100'
                         }`}
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Upload Payment Screenshot (Mandatory)</label>
                    <label className={`block w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-emerald-500 ${
                      paymentScreenshot ? 'border-emerald-500 bg-emerald-50/10' : (isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-slate-200 hover:bg-slate-50')
                    }`}>
                      <input type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" />
                      {paymentScreenshot ? (
                        <div className="relative">
                           <img src={paymentScreenshot} className="h-32 mx-auto rounded-xl shadow-lg" alt="Proof" />
                           <div className="mt-2 text-xs font-black text-emerald-600">✓ Screenshot Added</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-3xl">📸</div>
                          <p className="text-xs font-bold text-slate-500">Tap to upload proof</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button 
                    onClick={submitPaymentProof}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-[0.98] transition-all"
                  >
                    Submit Proof
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-bold px-6">
                    By submitting, you confirm that the payment has been made. School staff will verify the screenshot before updating your official record.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
