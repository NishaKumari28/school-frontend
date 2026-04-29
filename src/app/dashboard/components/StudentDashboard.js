'use client';
import { useState, useMemo, useEffect } from 'react';
import DashboardCard from './DashboardCard';
import { updateUserProfilePhoto } from '../../components/auth/authService';

// Local storage keys
const STORAGE_KEYS = {
  HOMEWORK: 'student_homework',
  MATERIALS: 'student_materials',
  ATTENDANCE: 'student_attendance',
  USERS: 'student_users'
};

// Helper functions
const getLocalData = (key) => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const saveLocalData = (key, data) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

const getLatestTimestamp = (item) => {
  const dateFields = ['createdAt', 'updatedAt', 'uploadedAt', 'markedAt', 'submittedAt', 'date'];
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

export default function StudentDashboard({ user, allUsers: propUsers, showMessage, loadData }) {
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

  const [homeworkSubmission, setHomeworkSubmission] = useState({ 
    homeworkId: '', 
    submission: '', 
    attachmentUrl: '', 
    attachmentName: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Local state for all data
  const [allUsers, setAllUsers] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  // Initialize data from localStorage
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = () => {
    setIsLoading(true);
    
    // Load or initialize users
    let users = getLocalData(STORAGE_KEYS.USERS);
    if (users.length === 0 && propUsers && propUsers.length > 0) {
      users = propUsers;
      saveLocalData(STORAGE_KEYS.USERS, users);
    } else if (users.length === 0) {
      // Default demo data
      const defaultUsers = [
        { id: generateId(), name: "John Student", number: "9876543210", password: "123456", role: "student", className: "10", section: "A", schoolName: "City School" },
        { id: generateId(), name: "Emma Student", number: "9876543211", password: "123456", role: "student", className: "10", section: "A", schoolName: "City School" },
        { id: generateId(), name: "Sarah Parent", number: "9876543212", password: "123456", role: "parents", schoolName: "City School", childName: "John Student", childClass: "10", childSection: "A" }
      ];
      users = defaultUsers;
      saveLocalData(STORAGE_KEYS.USERS, users);
    }
    setAllUsers(sortLatestFirst(users));
    
    // Load or initialize homework
    let homework = getLocalData(STORAGE_KEYS.HOMEWORK);
    if (homework.length === 0) {
      homework = [
        { 
          id: generateId(), 
          title: "Math Assignment", 
          description: "Solve problems 1-10 from chapter 5", 
          dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
          className: "10", 
          section: "A",
          teacherId: generateId(),
          teacherName: "Mr. Smith",
          submissions: []
        },
        { 
          id: generateId(), 
          title: "Science Project", 
          description: "Create a model of solar system", 
          dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
          className: "10", 
          section: "A",
          teacherId: generateId(),
          teacherName: "Mrs. Johnson",
          submissions: []
        }
      ];
      saveLocalData(STORAGE_KEYS.HOMEWORK, homework);
    }
    setHomeworkList(sortLatestFirst(homework));
    
    // Load or initialize materials
    let materials = getLocalData(STORAGE_KEYS.MATERIALS);
    if (materials.length === 0) {
      materials = [
        { 
          id: generateId(), 
          title: "Chapter 1 Notes", 
          type: "document", 
          url: "#", 
          description: "Introduction to Algebra", 
          className: "10", 
          section: "A",
          teacherId: generateId(),
          teacherName: "Mr. Smith",
          readBy: []
        },
        { 
          id: generateId(), 
          title: "Periodic Table", 
          type: "pdf", 
          url: "#", 
          description: "Complete periodic table with properties", 
          className: "10", 
          section: "A",
          teacherId: generateId(),
          teacherName: "Mrs. Johnson",
          readBy: []
        }
      ];
      saveLocalData(STORAGE_KEYS.MATERIALS, materials);
    }
    setMaterialsList(sortLatestFirst(materials));
    
    // Load or initialize attendance
    let attendance = getLocalData(STORAGE_KEYS.ATTENDANCE);
    if (attendance.length === 0) {
      attendance = [];
      saveLocalData(STORAGE_KEYS.ATTENDANCE, attendance);
    }
    setAttendanceList(sortLatestFirst(attendance));
    
    setIsLoading(false);
  };

  const refreshData = () => {
    setAllUsers(sortLatestFirst(getLocalData(STORAGE_KEYS.USERS)));
    setHomeworkList(sortLatestFirst(getLocalData(STORAGE_KEYS.HOMEWORK)));
    setMaterialsList(sortLatestFirst(getLocalData(STORAGE_KEYS.MATERIALS)));
    setAttendanceList(sortLatestFirst(getLocalData(STORAGE_KEYS.ATTENDANCE)));
  };

  const getParentName = (parentId) => {
    const parent = allUsers.find(u => u.id === parentId && u.role === 'parents');
    return parent ? parent.name : null;
  };

  // Current student data
  const currentStudent = user;

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Please upload a valid image file', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = updateUserProfilePhoto({
        userId: currentStudent.id,
        profilePhoto: typeof reader.result === 'string' ? reader.result : ''
      });

      if (result.success) {
        showMessage('Profile photo updated successfully!');
        if (loadData) loadData();
      } else {
        showMessage(result.message, 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveProfilePhoto = () => {
    const result = updateUserProfilePhoto({
      userId: currentStudent.id,
      profilePhoto: ''
    });

    if (result.success) {
      showMessage('Profile photo removed successfully!');
      if (loadData) loadData();
    } else {
      showMessage(result.message, 'error');
    }
  };
  
  // Filter homework based on student's class and section
  const myHomework = useMemo(() => {
    return sortLatestFirst(homeworkList.filter(hw => {
      const classMatch = !hw.className || hw.className === currentStudent.className;
      const sectionMatch = !hw.section || hw.section === (currentStudent.section || currentStudent.sec);
      return classMatch && sectionMatch;
    }));
  }, [homeworkList, currentStudent.className, currentStudent.section, currentStudent.sec]);

  // Filter materials based on student's class and section
  const myMaterials = useMemo(() => {
    return sortLatestFirst(materialsList.filter(mat => {
      const classMatch = !mat.className || mat.className === currentStudent.className;
      const sectionMatch = !mat.section || mat.section === (currentStudent.section || currentStudent.sec);
      return classMatch && sectionMatch;
    }));
  }, [materialsList, currentStudent.className, currentStudent.section, currentStudent.sec]);

  // Filter attendance for current student
  const myAttendance = useMemo(() => {
    return sortLatestFirst(attendanceList.filter(att => att.studentId === currentStudent.id));
  }, [attendanceList, currentStudent.id]);

  // Homework statistics
  const homeworkStats = useMemo(() => {
    const submitted = [];
    const pending = [];
    
    myHomework.forEach(hw => {
      const hasSubmitted = hw.submissions?.some(s => s.studentId === currentStudent.id);
      if (hasSubmitted) {
        submitted.push(hw);
      } else {
        pending.push(hw);
      }
    });
    
    return { submitted, pending };
  }, [myHomework, currentStudent.id]);

  // Materials statistics
  const materialsStats = useMemo(() => {
    const read = myMaterials.filter(mat => mat.readBy?.some(r => r.studentId === currentStudent.id));
    const unread = myMaterials.filter(mat => !mat.readBy?.some(r => r.studentId === currentStudent.id));
    return { read, unread };
  }, [myMaterials, currentStudent.id]);

  // Attendance statistics
  const attendanceStats = useMemo(() => {
    const present = myAttendance.filter(att => att.status === 'present').length;
    const absent = myAttendance.filter(att => att.status === 'absent').length;
    const late = myAttendance.filter(att => att.status === 'late').length;
    return { present, absent, late, total: myAttendance.length };
  }, [myAttendance]);

  const handleHomeworkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showMessage('File must be 10MB or smaller', 'error');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setHomeworkSubmission(prev => ({
        ...prev,
        attachmentUrl: typeof reader.result === 'string' ? reader.result : '',
        attachmentName: file.name
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitHomework = () => {
    if (!homeworkSubmission.homeworkId) {
      showMessage('Please select a homework', 'error');
      return;
    }
    
    if (!homeworkSubmission.submission && !homeworkSubmission.attachmentUrl) {
      showMessage('Please enter submission text or upload a file', 'error');
      return;
    }
    
    setSubmitting(true);
    
    const submissionText = homeworkSubmission.submission || (homeworkSubmission.attachmentName ? `Uploaded file: ${homeworkSubmission.attachmentName}` : '');
    
    // Update homework with submission
    const updatedHomework = homeworkList.map(hw => {
      if (hw.id === parseInt(homeworkSubmission.homeworkId)) {
        const existingSubmissions = hw.submissions || [];
        const existingIndex = existingSubmissions.findIndex(s => s.studentId === currentStudent.id);
        
        let newSubmissions;
        if (existingIndex !== -1) {
          newSubmissions = [...existingSubmissions];
          newSubmissions[existingIndex] = {
            ...newSubmissions[existingIndex],
            submission: submissionText,
            attachmentUrl: homeworkSubmission.attachmentUrl,
            attachmentName: homeworkSubmission.attachmentName,
            submittedAt: new Date().toISOString()
          };
        } else {
          newSubmissions = [...existingSubmissions, {
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            submission: submissionText,
            attachmentUrl: homeworkSubmission.attachmentUrl,
            attachmentName: homeworkSubmission.attachmentName,
            submittedAt: new Date().toISOString(),
            verdict: 'pending',
            teacherFeedback: ''
          }];
        }
        
        return { ...hw, submissions: newSubmissions };
      }
      return hw;
    });
    
    setHomeworkList(updatedHomework);
    saveLocalData(STORAGE_KEYS.HOMEWORK, updatedHomework);
    
    showMessage('Homework submitted successfully!');
    setHomeworkSubmission({ homeworkId: '', submission: '', attachmentUrl: '', attachmentName: '' });
    setSubmitting(false);
    refreshData();
  };

  const handleMarkMaterialRead = (materialId) => {
    const updatedMaterials = materialsList.map(mat => {
      if (mat.id === materialId) {
        const readBy = mat.readBy || [];
        if (!readBy.some(r => r.studentId === currentStudent.id)) {
          return {
            ...mat,
            readBy: [...readBy, {
              studentId: currentStudent.id,
              studentName: currentStudent.name,
              readAt: new Date().toISOString()
            }]
          };
        }
      }
      return mat;
    });
    
    setMaterialsList(updatedMaterials);
    saveLocalData(STORAGE_KEYS.MATERIALS, updatedMaterials);
    showMessage('Material marked as read!');
    refreshData();
  };

  const renderFilePreview = (url, name, type) => {
    if (!url || url === '#') return null;
    
    const isImage = url.startsWith('data:image') || name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = url.startsWith('data:application/pdf') || name?.match(/\.pdf$/i);
    const isVideo = url.startsWith('data:video') || name?.match(/\.(mp4|webm|mov)$/i);
    
    if (isImage) {
      return <img src={url} alt={name} className="max-w-full h-32 object-contain rounded border mt-2" />;
    } else if (isPdf) {
      return (
        <div className="mt-2">
          <embed src={url} type="application/pdf" className="w-full h-40 rounded border" />
          <a href={url} download={name} className="text-blue-600 hover:underline text-sm mt-1 inline-block">📄 Download PDF</a>
        </div>
      );
    } else if (isVideo) {
      return <video src={url} controls className="w-full max-h-40 rounded border mt-2" />;
    } else if (url && url !== '#') {
      return (
        <a href={url} download={name} className="text-blue-600 hover:underline text-sm mt-1 inline-block">
          📎 Download: {name || 'Attachment'}
        </a>
      );
    }
    return null;
  };

  const navButtons = [
    { label: 'Overview', tab: 'overview' },
    { label: 'My Homework', tab: 'homework' },
    { label: 'Study Materials', tab: 'materials' },
    { label: 'My Attendance', tab: 'attendance' }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <aside className={`w-80 flex-shrink-0 border-r shadow-lg z-40 flex flex-col h-screen sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="text-center mb-6">
          <div className="relative inline-block mt-4 mb-3">
            {currentStudent.profilePhoto ? (
              <img src={currentStudent.profilePhoto} alt={currentStudent.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto" />
            ) : (
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold border-3 border-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'}`}>
                👨‍🎓
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 cursor-pointer hover:bg-blue-700 transition shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
            </label>
          </div>
          {currentStudent.profilePhoto && (
            <button onClick={handleRemoveProfilePhoto} className="mt-1 text-xs text-red-500 hover:text-red-700 transition block mx-auto mb-3">
              Remove Photo
            </button>
          )}

          <h3 className={`text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
            {currentStudent.name}
          </h3>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
            Class: {currentStudent.className || 'N/A'} | Section: {currentStudent.section || currentStudent.sec || 'N/A'}
          </p>
          {currentStudent?.schoolName && (
            <p className={`text-xs font-semibold mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>🏫 {currentStudent.schoolName}</p>
          )}
          <p className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>📚 Board: {currentStudent?.board || 'N/A'}</p>

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
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Welcome Card */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-2">Welcome back, {currentStudent.name}! 👋</h2>
                <p className="text-blue-100">Class {currentStudent.className} - Section {currentStudent.section || currentStudent.sec}</p>
                <p className="text-blue-100 text-sm mt-1">Track your homework, study materials, and attendance from here.</p>
              </div>
              
              {/* Statistics Cards */}
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                <DashboardCard 
                  onClick={() => setActiveTab('homework')}
                  className="cursor-pointer"
                  title="Homework Submitted" 
                  icon="📚" 
                  value={homeworkStats.submitted.length} 
                  color="green" 
                />
                <DashboardCard 
                  onClick={() => setActiveTab('homework')}
                  className="cursor-pointer"
                  title="Homework Pending" 
                  icon="⏳" 
                  value={homeworkStats.pending.length} 
                  color="red" 
                />
                <DashboardCard 
                  onClick={() => setActiveTab('materials')}
                  className="cursor-pointer"
                  title="Materials Read" 
                  icon="📖" 
                  value={materialsStats.read.length} 
                  color="blue" 
                />
                <DashboardCard 
                  onClick={() => setActiveTab('attendance')}
                  className="cursor-pointer"
                  title="Attendance" 
                  icon="📅" 
                  value={`${attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%`} 
                  color="purple" 
                />
              </div>

              {/* Recent Homework */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>Recent Homework</h2>
                <div className='space-y-2'>
                  {myHomework.slice(0, 5).map(hw => {
                    const isSubmitted = hw.submissions?.some(s => s.studentId === currentStudent.id);
                    const submission = hw.submissions?.find(s => s.studentId === currentStudent.id);
                    return (
                      <div key={hw.id} className='flex justify-between items-center p-3 border border-blue-100 rounded-lg bg-blue-50/30'>
                        <div>
                          <p className='font-medium text-slate-800'>{hw.title}</p>
                          <p className='text-xs text-slate-600'>Due: {hw.dueDate}</p>
                          {isSubmitted && submission && (
                            <p className='text-xs text-green-600 mt-1'>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${isSubmitted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {isSubmitted ? '✓ Submitted' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                  {myHomework.length === 0 && (
                    <p className='text-slate-500 text-center py-4'>No homework assigned yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Materials */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>Recent Study Materials</h2>
                <div className='space-y-2'>
                  {myMaterials.slice(0, 3).map(mat => {
                    const isRead = mat.readBy?.some(r => r.studentId === currentStudent.id);
                    return (
                      <div key={mat.id} className='flex justify-between items-center p-3 border border-blue-100 rounded-lg bg-blue-50/30'>
                        <div>
                          <p className='font-medium text-slate-800'>{mat.title}</p>
                          <p className='text-xs text-slate-600'>{mat.type}</p>
                        </div>
                        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${isRead ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isRead ? '✓ Read' : 'New'}
                        </span>
                      </div>
                    );
                  })}
                  {myMaterials.length === 0 && (
                    <p className='text-slate-500 text-center py-4'>No study materials available yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className='space-y-6'>
              {/* Submit Homework Form */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>📝 Submit Homework</h2>
                <div className='space-y-4'>
                  <select
                    value={homeworkSubmission.homeworkId}
                    onChange={(e) => setHomeworkSubmission({...homeworkSubmission, homeworkId: e.target.value})}
                    className='w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>Select Homework</option>
                    {homeworkStats.pending.map(hw => (
                      <option key={hw.id} value={hw.id}>
                        {hw.title} (Due: {hw.dueDate}) - Class {hw.className} | Sec {hw.section}
                      </option>
                    ))}
                    {homeworkStats.pending.length === 0 && (
                      <option disabled>No pending homework</option>
                    )}
                  </select>
                  
                  <textarea
                    placeholder='Write your answer here...'
                    value={homeworkSubmission.submission}
                    onChange={(e) => setHomeworkSubmission({...homeworkSubmission, submission: e.target.value})}
                    className='w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500'
                    rows={4}
                  />
                  
                  {/* File Upload */}
                  <div className='rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4'>
                    <p className='text-sm font-medium text-blue-900 mb-2'>Upload homework file (optional)</p>
                    <div className='flex flex-wrap items-center gap-3'>
                      <label className='cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>
                        Choose file
                        <input 
                          type='file' 
                          className='hidden' 
                          accept='.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt' 
                          onChange={handleHomeworkFileChange} 
                        />
                      </label>
                      {homeworkSubmission.attachmentName ? (
                        <>
                          <span className='text-sm text-blue-800'>{homeworkSubmission.attachmentName}</span>
                          <button
                            type='button'
                            onClick={() => setHomeworkSubmission(prev => ({ ...prev, attachmentUrl: '', attachmentName: '' }))}
                            className='text-sm font-medium text-red-600 hover:underline'
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className='text-sm text-blue-700'>No file selected (PDF, DOC, images)</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSubmitHomework}
                    disabled={submitting || homeworkStats.pending.length === 0}
                    className='bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                  >
                    {submitting ? 'Submitting...' : 'Submit Homework'}
                  </button>
                </div>
              </div>

              {/* Homework Progress */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>📊 My Homework Progress</h2>
                <div className='mb-4 bg-gray-200 rounded-full h-4 overflow-hidden'>
                  <div 
                    className='bg-green-500 h-4 rounded-full transition-all duration-500'
                    style={{ width: `${myHomework.length > 0 ? (homeworkStats.submitted.length / myHomework.length) * 100 : 0}%` }}
                  />
                </div>
                <p className='text-sm text-slate-600 mb-4'>
                  {homeworkStats.submitted.length} of {myHomework.length} homework completed ({myHomework.length > 0 ? Math.round((homeworkStats.submitted.length / myHomework.length) * 100) : 0}%)
                </p>
                
                <div className='space-y-3'>
                  <h3 className='font-semibold text-green-700'>✅ Submitted ({homeworkStats.submitted.length})</h3>
                  {homeworkStats.submitted.map(hw => {
                    const submission = hw.submissions?.find(s => s.studentId === currentStudent.id);
                    return (
                      <div key={hw.id} className='border border-green-200 rounded-lg p-3 bg-green-50'>
                        <div className='flex justify-between items-start'>
                          <div className='flex-1'>
                            <p className='font-medium text-slate-800'>{hw.title}</p>
                            <p className='text-xs text-slate-600'>Due: {hw.dueDate}</p>
                            <p className='text-xs text-green-700 mt-1'>Your submission: {submission?.submission}</p>
                            {renderFilePreview(submission?.attachmentUrl, submission?.attachmentName, '')}
                            {submission?.teacherFeedback && (
                              <p className='text-xs text-orange-600 mt-1'>Feedback: {submission.teacherFeedback}</p>
                            )}
                            {submission?.correctedSubmission && (
                              <p className='text-xs text-blue-600 mt-1'>Corrected: {submission.correctedSubmission}</p>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${submission?.verdict === 'correct' ? 'bg-green-200 text-green-800' : submission?.verdict === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-200 text-yellow-800'}`}>
                            {submission?.verdict === 'correct' ? '✓ Correct' : submission?.verdict === 'pending' ? '⏳ Pending Review' : '🔄 Needs Correction'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  <h3 className='font-semibold text-red-700 mt-4'>⏳ Pending ({homeworkStats.pending.length})</h3>
                  {homeworkStats.pending.map(hw => (
                    <div key={hw.id} className='border border-red-200 rounded-lg p-3 bg-red-50'>
                      <p className='font-medium text-slate-800'>{hw.title}</p>
                      <p className='text-xs text-slate-600'>Due: {hw.dueDate}</p>
                      <p className='text-xs text-slate-600'>Class: {hw.className} | Section: {hw.section}</p>
                    </div>
                  ))}
                  
                  {myHomework.length === 0 && (
                    <p className='text-slate-500 text-center py-4'>No homework assigned yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
              <h2 className='text-lg font-semibold text-blue-900 mb-4'>📚 Learning Materials</h2>
              <div className='space-y-4'>
                {myMaterials.map(material => {
                  const isRead = material.readBy?.some(r => r.studentId === currentStudent.id);
                  return (
                    <div key={material.id} className={`border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded-lg p-4 hover:shadow-md transition-shadow`}>
                      <div className='flex justify-between items-start mb-2'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-slate-800'>{material.title}</h3>
                          <p className='text-xs text-slate-500 capitalize'>Type: {material.type}</p>
                          <p className='text-xs text-slate-500'>Class: {material.className || 'All'} | Section: {material.section || 'All'}</p>
                        </div>
                        {!isRead && (
                          <button
                            onClick={() => handleMarkMaterialRead(material.id)}
                            className='bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition'
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'} mb-3`}>{material.description}</p>
                      {renderFilePreview(material.url, material.fileName, material.type)}
                      {material.url && material.url !== '#' && (
                        <a
                          href={material.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 hover:text-blue-800 text-sm inline-flex items-center gap-1 mt-2'
                        >
                          📖 View Material →
                        </a>
                      )}
                      {isRead && <span className='text-green-600 text-sm ml-3'>✓ Read</span>}
                    </div>
                  );
                })}
                {myMaterials.length === 0 && (
                  <p className='text-slate-500 text-center py-8'>No study materials available for your class yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className='space-y-6'>
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200 shadow-sm`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>📅 My Attendance Summary</h2>
                <div className='grid gap-4 md:grid-cols-3 mb-6'>
                  <div className='bg-green-50 rounded-lg p-4 text-center border border-green-200'>
                    <p className='text-2xl font-bold text-green-600'>{attendanceStats.present}</p>
                    <p className='text-sm text-green-700'>Present Days</p>
                  </div>
                  <div className='bg-red-50 rounded-lg p-4 text-center border border-red-200'>
                    <p className='text-2xl font-bold text-red-600'>{attendanceStats.absent}</p>
                    <p className='text-sm text-red-700'>Absent Days</p>
                  </div>
                  <div className='bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200'>
                    <p className='text-2xl font-bold text-yellow-600'>{attendanceStats.late}</p>
                    <p className='text-sm text-yellow-700'>Late Days</p>
                  </div>
                </div>
                
                <div className='mb-4 bg-gray-200 rounded-full h-4 overflow-hidden'>
                  <div 
                    className='bg-green-500 h-4 rounded-full transition-all duration-500'
                    style={{ width: `${attendanceStats.total > 0 ? (attendanceStats.present / attendanceStats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className='text-sm text-slate-600 text-center mb-6'>
                  Overall Attendance: {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                </p>
                
                <h3 className='font-semibold text-slate-800 mb-3'>Attendance Records</h3>
                <div className='space-y-2'>
                  {myAttendance.length > 0 ? (
                    myAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)).map(att => (
                      <div key={att.id} className={`flex justify-between items-center p-3 border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded-lg`}>
                        <div>
                          <p className='font-medium text-slate-800'>{new Date(att.date).toLocaleDateString()}</p>
                          <p className='text-xs text-slate-500'>Teacher ID: {att.teacherId?.toString().slice(-4)}</p>
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          att.status === 'present' ? 'bg-green-100 text-green-700' : 
                          att.status === 'absent' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {att.status === 'present' ? '✓ Present' : att.status === 'absent' ? '✗ Absent' : '⏰ Late'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className='text-slate-500 text-center py-4'>No attendance records found.</p>
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
