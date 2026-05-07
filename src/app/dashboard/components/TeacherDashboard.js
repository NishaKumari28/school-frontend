'use client';
import { useMemo, useState, useEffect } from 'react';
import AnalyticsChart from './Charts';
import LMSDashboard from './LMSDashboard';
import UserTransportLog from './UserTransportLog';
import TransportStatsPanel from './TransportStatsPanel';
import { transportUtils } from '../utils/staffDataUtils';
import quizDataUtils from '../utils/quizDataUtils';


// Local storage keys
const STORAGE_KEYS = {
  HOMEWORK: 'teacher_homework',
  ATTENDANCE: 'teacher_attendance',
  MATERIALS: 'teacher_materials',
  USERS: 'teacher_users',
  CLASSES: 'school_classes',
  SECTIONS: 'school_sections',
  ACADEMIC_YEARS: 'academic_years'
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
  const dateFields = ['createdAt', 'updatedAt', 'uploadedAt', 'markedAt', 'date'];
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

export default function TeacherDashboard({ user, allUsers: propUsers, showMessage, loadData }) {
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
        setProfilePhoto(reader.result);
        const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, profilePhoto: reader.result } : u);
        setAllUsers(updatedUsers);
        saveLocalData(STORAGE_KEYS.USERS, updatedUsers);
        if(showMessage) showMessage('Profile photo updated successfully!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhoto('');
    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, profilePhoto: '' } : u);
    setAllUsers(updatedUsers);
    saveLocalData(STORAGE_KEYS.USERS, updatedUsers);
    if(showMessage) showMessage('Profile photo removed successfully!', 'success');
  };

  const [homework, setHomework] = useState({ 
    title: '', description: '', dueDate: '', 
    attachmentUrl: '', attachmentName: '', attachmentType: '',
    className: '', section: ''
  });
  const [material, setMaterial] = useState({ title: '', type: 'document', url: '', description: '', file: null });
  const [editHomeworkId, setEditHomeworkId] = useState(null);
  const [editHomework, setEditHomework] = useState({ title: '', description: '', dueDate: '', className: '', section: '' });
  const [editAttendanceId, setEditAttendanceId] = useState(null);
  const [editAttendance, setEditAttendance] = useState({ date: '', status: 'present' });
  const [editMaterialId, setEditMaterialId] = useState(null);
  const [editMaterial, setEditMaterial] = useState({ title: '', type: 'document', url: '', description: '', className: '', section: '' });
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkParentId, setLinkParentId] = useState('');
  const [linkStudentSearchTerm, setLinkStudentSearchTerm] = useState('');
  const [linkStudentClassFilter, setLinkStudentClassFilter] = useState('');
  const [linkStudentSectionFilter, setLinkStudentSectionFilter] = useState('');
  const [linkStudentAcademicYearFilter, setLinkStudentAcademicYearFilter] = useState('');
  const [homeworkFilterClass, setHomeworkFilterClass] = useState('');
  const [homeworkFilterSection, setHomeworkFilterSection] = useState('');
  const [overviewFilterClass, setOverviewFilterClass] = useState('');
  const [overviewFilterSection, setOverviewFilterSection] = useState('');
  const [attendanceFilterClass, setAttendanceFilterClass] = useState('');
  const [attendanceFilterSection, setAttendanceFilterSection] = useState('');
  const [attendanceFilterDate, setAttendanceFilterDate] = useState('');
  const [reviewingSubmission, setReviewingSubmission] = useState({
    homeworkId: null,
    studentId: null,
    correctedSubmission: '',
    feedback: '',
    verdict: 'needs_correction'
  });

  // Local state for all data
  const [allUsers, setAllUsers] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});

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
        { id: generateId(), name: "Mike Student", number: "9876543212", password: "123456", role: "student", className: "9", section: "B", schoolName: "City School" },
        { id: generateId(), name: "Sarah Parent", number: "9876543213", password: "123456", role: "parents", schoolName: "City School", childName: "John Student", childClass: "10", childSection: "A" },
        { id: generateId(), name: "Robert Parent", number: "9876543214", password: "123456", role: "parents", schoolName: "City School", childName: "Emma Student", childClass: "10", childSection: "A" }
      ];
      users = defaultUsers;
      saveLocalData(STORAGE_KEYS.USERS, users);
    }
    setAllUsers(sortLatestFirst(users));
    
    // Load or initialize homework
    let homework = getLocalData(STORAGE_KEYS.HOMEWORK);
    if (homework.length === 0) {
      homework = [];
      saveLocalData(STORAGE_KEYS.HOMEWORK, homework);
    }
    setHomeworkList(sortLatestFirst(homework));
    
    // Load or initialize attendance
    let attendance = getLocalData(STORAGE_KEYS.ATTENDANCE);
    if (attendance.length === 0) {
      attendance = [];
      saveLocalData(STORAGE_KEYS.ATTENDANCE, attendance);
    }
    setAttendanceList(sortLatestFirst(attendance));
    
    // Load or initialize materials
    let materials = getLocalData(STORAGE_KEYS.MATERIALS);
    if (materials.length === 0) {
      materials = [];
      saveLocalData(STORAGE_KEYS.MATERIALS, materials);
    }
    setMaterialsList(sortLatestFirst(materials));
    
    setIsLoading(false);
  };

  const refreshData = () => {
    setAllUsers(sortLatestFirst(getLocalData(STORAGE_KEYS.USERS)));
    setHomeworkList(sortLatestFirst(getLocalData(STORAGE_KEYS.HOMEWORK)));
    setAttendanceList(sortLatestFirst(getLocalData(STORAGE_KEYS.ATTENDANCE)));
    setMaterialsList(sortLatestFirst(getLocalData(STORAGE_KEYS.MATERIALS)));
    if (loadData) loadData();
  };

  const getParentName = (parentId) => {
    const parent = allUsers.find(u => u.id === parentId && u.role === 'parents');
    return parent ? parent.name : null;
  };

const students = allUsers.filter(u => u.role === 'student');
  const parents = allUsers.filter(u => u.role === 'parents');

  const normalize = (value) => String(value ?? '').trim().toLowerCase();
  const teacherClassName = user.className || user.classId || '';
  const teacherSection = user.section || user.sec || '';
  const teacherSubject = user.subject || 'N/A';
  
  // Helper function to parse comma-separated values (e.g., "9,10" -> ["9", "10"])
  const parseMultiValueField = (value) => {
    if (!value) return [];
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };
  
  // Find the admin of this school
  const myAdmin = useMemo(() => {
    const admin = allUsers.find(u => u.id && user.createdByAdminId && String(u.id) === String(user.createdByAdminId)) || 
                  allUsers.find(u => normalize(u.role) === 'admin' && normalize(u.schoolName) === normalize(user.schoolName));
    return admin || user;
  }, [allUsers, user]);

  const adminAssignedClasses = useMemo(() => parseMultiValueField(myAdmin?.className || myAdmin?.classes), [myAdmin]);
  const adminAssignedSections = useMemo(() => parseMultiValueField(myAdmin?.section || myAdmin?.sec), [myAdmin]);
  const adminAssignedYears = useMemo(() => parseMultiValueField(myAdmin?.academicYear), [myAdmin]);
  const adminAssignedBoards = useMemo(() => parseMultiValueField(myAdmin?.board), [myAdmin]);

  const [availableClasses, setAvailableClasses] = useState(['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12']);
  const [availableSections, setAvailableSections] = useState(['A','B','C','D','E','F']);
  const [availableYears, setAvailableYears] = useState(['2025-26','2026-27','2027-28','2028-29','2029-30']);

  useEffect(() => {
    const c = getLocalData(STORAGE_KEYS.CLASSES) || [];
    if (c.length) setAvailableClasses(c);
    const s = getLocalData(STORAGE_KEYS.SECTIONS) || [];
    if (s.length) setAvailableSections(s);
    const y = getLocalData(STORAGE_KEYS.ACADEMIC_YEARS) || [];
    if (y.length) setAvailableYears(y);
  }, []);

  const classOptions = adminAssignedClasses.length > 0 ? adminAssignedClasses : availableClasses;
  const sectionOptions = adminAssignedSections.length > 0 ? adminAssignedSections : availableSections;
  const yearOptions = adminAssignedYears.length > 0 ? adminAssignedYears : availableYears;


  const navButtons = [
    { label: 'Overview', tab: 'overview' },
    { label: 'Homework', tab: 'homework' },
    { label: 'Attendance', tab: 'attendance' },
    { label: 'Learning Materials', tab: 'materials' },
    { label: 'LMS', tab: 'lms' },
    { label: 'Transport', tab: 'transport' }
  ];

  const classStudents = useMemo(() => {
    return students.filter((student) => {
      const sameSchool = !user.schoolName || normalize(student.schoolName) === normalize(user.schoolName);
      const classMatch = !teacherClassName || normalize(student.className) === normalize(teacherClassName);
      const sectionMatch = !teacherSection || normalize(student.section || student.sec) === normalize(teacherSection);
      return sameSchool && classMatch && sectionMatch;
    });
  }, [students, user.schoolName, teacherClassName, teacherSection]);

  const linkStudentClasses = useMemo(
    () => [...new Set(classStudents.map((student) => student.className).filter(Boolean))],
    [classStudents]
  );
  const linkStudentSections = useMemo(
    () => [...new Set(classStudents.map((student) => student.section || student.sec).filter(Boolean))],
    [classStudents]
  );
  const linkStudentAcademicYears = useMemo(
    () => [...new Set(classStudents.map((student) => student.academicYear).filter(Boolean))],
    [classStudents]
  );
  const filteredLinkStudents = useMemo(() => {
    const search = normalize(linkStudentSearchTerm);
    return classStudents.filter((student) => {
      const classMatch = !linkStudentClassFilter || normalize(student.className) === normalize(linkStudentClassFilter);
      const sectionMatch = !linkStudentSectionFilter || normalize(student.section || student.sec) === normalize(linkStudentSectionFilter);
      const yearMatch = !linkStudentAcademicYearFilter || normalize(student.academicYear) === normalize(linkStudentAcademicYearFilter);
      const searchMatch = !search || [
        student.name,
        student.number,
        student.className,
        student.section || student.sec,
        student.academicYear
      ].some((value) => normalize(value).includes(search));

      return classMatch && sectionMatch && yearMatch && searchMatch;
    });
  }, [classStudents, linkStudentSearchTerm, linkStudentClassFilter, linkStudentSectionFilter, linkStudentAcademicYearFilter]);

  const overviewStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const classMatch = !overviewFilterClass || normalize(s.className) === normalize(overviewFilterClass);
      const sectionMatch = !overviewFilterSection || normalize(s.section || s.sec) === normalize(overviewFilterSection);
      return classMatch && sectionMatch;
    });
  }, [classStudents, overviewFilterClass, overviewFilterSection]);

  const myHomework = useMemo(() => homeworkList.filter((h) => h.teacherId === user.id), [homeworkList, user.id]);
  
  const submittedStudentIds = useMemo(() => {
    const ids = new Set();
    myHomework.forEach((hw) => {
      (hw.submissions || []).forEach((sub) => ids.add(sub.studentId));
    });
    return ids;
  }, [myHomework]);

  const homeworkDoneStudents = useMemo(
    () => overviewStudents.filter((s) => submittedStudentIds.has(s.id)),
    [overviewStudents, submittedStudentIds]
  );
  const homeworkPendingStudents = useMemo(
    () => overviewStudents.filter((s) => !submittedStudentIds.has(s.id)),
    [overviewStudents, submittedStudentIds]
  );


  const classStudentIds = useMemo(() => new Set(overviewStudents.map((s) => s.id)), [overviewStudents]);
  const classAttendanceRecords = useMemo(
    () => attendanceList.filter((a) => classStudentIds.has(a.studentId)),
    [attendanceList, classStudentIds]
  );

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
      const fileType = file.type.split('/')[0];
      setHomework((prev) => ({
        ...prev,
        attachmentUrl: typeof reader.result === 'string' ? reader.result : '',
        attachmentName: file.name,
        attachmentType: fileType
      }));
    };
    reader.onerror = () => {
      showMessage('Error reading file', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMaterialFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showMessage('File must be 10MB or smaller', 'error');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setMaterial((prev) => ({
        ...prev,
        url: typeof reader.result === 'string' ? reader.result : '',
        file: file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAssignHomework = () => {
    const errors = {};
    if (!homework.dueDate) errors.dueDate = true;
    if (!homework.className) errors.className = true;
    if (!homework.section) errors.section = true;
    
    const hasFile = Boolean(homework.attachmentUrl);
    const hasText = Boolean((homework.title || '').trim() || (homework.description || '').trim());
    
    if (!hasText && !hasFile) {
      errors.title = true;
      errors.description = true;
      errors.file = true;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showMessage('Please fill all mandatory fields', 'error');
      return;
    }
    
    const title = (homework.title || '').trim() || (homework.attachmentName ? homework.attachmentName.replace(/\.[^.]+$/, '') : 'Homework');
    const description = (homework.description || '').trim() || (hasFile ? `Attachment: ${homework.attachmentName}` : '');
    
    const newHomework = {
      id: generateId(),
      title,
      description,
      dueDate: homework.dueDate,
      className: homework.className,
      section: homework.section,
      teacherId: user.id,
      teacherName: user.name,
      attachmentUrl: homework.attachmentUrl || '',
      attachmentName: homework.attachmentName || '',
      attachmentType: homework.attachmentType || '',
      submissions: [],
      createdAt: new Date().toISOString()
    };
    
    const updatedHomework = sortLatestFirst([...homeworkList, newHomework]);
    setHomeworkList(updatedHomework);
    saveLocalData(STORAGE_KEYS.HOMEWORK, updatedHomework);
    
    showMessage('Homework assigned successfully!');
    setHomework({ 
      title: '', description: '', dueDate: '', 
      attachmentUrl: '', attachmentName: '', attachmentType: '',
      className: '', section: '' 
    });
    setFormErrors({});
    refreshData();
  };

  const handleUploadMaterial = () => {
    const errors = {};
    if (!material.title) errors.materialTitle = true;
    if (!material.url) errors.materialFile = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showMessage('Please fill title and upload file', 'error');
      return;
    }
    
    const newMaterial = {
      id: generateId(),
      title: material.title,
      type: material.type,
      url: material.url,
      description: material.description || '',
      className: teacherClassName,
      section: teacherSection,
      teacherId: user.id,
      teacherName: user.name,
      fileName: material.file?.name || '',
      fileType: material.type,
      createdAt: new Date().toISOString()
    };
    
    const updatedMaterials = sortLatestFirst([...materialsList, newMaterial]);
    setMaterialsList(updatedMaterials);
    saveLocalData(STORAGE_KEYS.MATERIALS, updatedMaterials);
    
    showMessage('Learning material uploaded successfully!');
    setMaterial({ title: '', type: 'document', url: '', description: '', file: null });
    setFormErrors({});
    refreshData();
  };

  const handleUnlinkParent = (studentId) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to unlink this student from parent?')) return;
    
    const updatedUsers = allUsers.map(u => {
      if (u.id === studentId && u.role === 'student') {
        const { parentId, ...rest } = u;
        return rest;
      }
      return u;
    });
    
    setAllUsers(updatedUsers);
    saveLocalData(STORAGE_KEYS.USERS, updatedUsers);
    showMessage('Parent and child unlinked successfully');
    refreshData();
  };

  const filteredHomework = myHomework.filter((hw) => {
    const classMatch = !teacherClassName || !hw.className || normalize(hw.className) === normalize(teacherClassName);
    const sectionMatch = !teacherSection || !hw.section || normalize(hw.section) === normalize(teacherSection);
    return classMatch && sectionMatch;
  });

  const tabFilteredHomework = useMemo(() => {
    return myHomework.filter((hw) => {
      const classMatch = !homeworkFilterClass || normalize(hw.className) === normalize(homeworkFilterClass);
      const sectionMatch = !homeworkFilterSection || normalize(hw.section) === normalize(homeworkFilterSection);
      return classMatch && sectionMatch;
    });
  }, [myHomework, homeworkFilterClass, homeworkFilterSection]);

  const filteredClassStudents = useMemo(() => {
    return students.filter((s) => {
      const schoolMatch = !user.schoolName || normalize(s.schoolName) === normalize(user.schoolName);
      const classMatch = !homeworkFilterClass || normalize(s.className) === normalize(homeworkFilterClass);
      const sectionMatch = !homeworkFilterSection || normalize(s.section || s.sec) === normalize(homeworkFilterSection);
      return schoolMatch && classMatch && sectionMatch;
    });
  }, [students, user.schoolName, homeworkFilterClass, homeworkFilterSection]);

  const attendanceFilteredStudents = useMemo(() => {
    return students.filter((s) => {
      const schoolMatch = !user.schoolName || normalize(s.schoolName) === normalize(user.schoolName);
      const classMatch = !attendanceFilterClass || normalize(s.className) === normalize(attendanceFilterClass);
      const sectionMatch = !attendanceFilterSection || normalize(s.section || s.sec) === normalize(attendanceFilterSection);
      return schoolMatch && classMatch && sectionMatch;
    });
  }, [students, user.schoolName, attendanceFilterClass, attendanceFilterSection]);

  const registerStudents = useMemo(() => {
    if (attendanceFilterClass && attendanceFilterSection) return attendanceFilteredStudents;
    return classStudents;
  }, [attendanceFilterClass, attendanceFilterSection, attendanceFilteredStudents, classStudents]);

  const registerDate = attendanceFilterDate || new Date().toISOString().split('T')[0];

  const getAttendanceStatusForDate = (studentId) => {
    const rec = attendanceList.find(
      (a) => a.studentId === studentId && a.date === registerDate
    );
    return rec?.status ?? null;
  };

  const markRegisterAttendance = (studentId, status) => {
    const existingIndex = attendanceList.findIndex(
      (a) => a.studentId === studentId && a.date === registerDate
    );
    
    let updatedAttendance;
    if (existingIndex !== -1) {
      updatedAttendance = [...attendanceList];
      updatedAttendance[existingIndex] = {
        ...updatedAttendance[existingIndex],
        status,
        teacherId: user.id
      };
    } else {
      updatedAttendance = [...attendanceList, {
        id: generateId(),
        studentId,
        date: registerDate,
        status,
        teacherId: user.id
      }];
    }
    
    setAttendanceList(updatedAttendance);
    saveLocalData(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    showMessage('Attendance saved');
    refreshData();
  };

  const attendanceFilteredStudentIds = useMemo(
    () => new Set(attendanceFilteredStudents.map((s) => s.id)),
    [attendanceFilteredStudents]
  );

  const attendanceTabRecords = useMemo(() => {
    return attendanceList.filter((rec) => {
      const studentMatch = attendanceFilteredStudentIds.has(rec.studentId);
      const dateMatch = !attendanceFilterDate || rec.date === attendanceFilterDate;
      return studentMatch && dateMatch;
    });
  }, [attendanceList, attendanceFilteredStudentIds, attendanceFilterDate]);

  const attendanceChartData = useMemo(() => {
    const summary = { present: 0, absent: 0, late: 0 };
    attendanceTabRecords.forEach((rec) => {
      if (rec.status === 'present') summary.present += 1;
      else if (rec.status === 'absent') summary.absent += 1;
      else if (rec.status === 'late') summary.late += 1;
    });
    return [
      { status: 'Present', count: summary.present },
      { status: 'Absent', count: summary.absent },
      { status: 'Late', count: summary.late }
    ];
  }, [attendanceTabRecords]);

  const activeQuizzesCount = useMemo(() => {
    try {
      return quizDataUtils.getAllQuizzes().filter(q => q.status === 'active').length;
    } catch { return 0; }
  }, []);

  // Transport: find this teacher's passenger record id
  const myTransportPassengerIds = useMemo(() => {
    const p = transportUtils.getPassengers().find(x => x.name === user.name);
    return p ? [p.id] : [];
  }, [user.name]);

  const stats = [
    { label: 'Total Students', value: overviewStudents.length, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Present Today', value: attendanceChartData.find(d => d.status === 'Present')?.count || 0, icon: '✅', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Homeworks', value: myHomework.length, icon: '📝', color: 'from-orange-500 to-orange-600' },
    { label: 'LMS Quizzes', value: activeQuizzesCount, icon: '🎯', color: 'from-purple-500 to-purple-600' },
  ];

  const myMaterials = materialsList.filter((m) => m.teacherId === user.id);
  const filteredMaterials = myMaterials.filter((m) => {
    const classMatch = !teacherClassName || !m.className || normalize(m.className) === normalize(teacherClassName);
    const sectionMatch = !teacherSection || !m.section || normalize(m.section) === normalize(teacherSection);
    return classMatch && sectionMatch;
  });
  
  const overviewFilteredHomework = myHomework.filter((hw) => {
    const classMatch = !overviewFilterClass || normalize(hw.className) === normalize(overviewFilterClass);
    const sectionMatch = !overviewFilterSection || normalize(hw.section) === normalize(overviewFilterSection);
    return classMatch && sectionMatch;
  });
  
  const overviewFilteredMaterials = myMaterials.filter((m) => {
    const classMatch = !overviewFilterClass || normalize(m.className) === normalize(overviewFilterClass);
    const sectionMatch = !overviewFilterSection || normalize(m.section) === normalize(overviewFilterSection);
    return classMatch && sectionMatch;
  });

  const handleStartEditHomework = (hw) => {
    setEditHomeworkId(hw.id);
    setEditHomework({
      title: hw.title || '',
      description: hw.description || '',
      dueDate: hw.dueDate || '',
      className: hw.className || '',
      section: hw.section || ''
    });
  };

  const handleSaveHomework = () => {
    const updatedHomework = homeworkList.map(h => 
      h.id === editHomeworkId ? { ...h, ...editHomework } : h
    );
    setHomeworkList(updatedHomework);
    saveLocalData(STORAGE_KEYS.HOMEWORK, updatedHomework);
    showMessage('Homework updated successfully!');
    setEditHomeworkId(null);
    refreshData();
  };

  const handleDeleteHomework = (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this homework?')) return;
    const updatedHomework = homeworkList.filter(h => h.id !== id);
    setHomeworkList(updatedHomework);
    saveLocalData(STORAGE_KEYS.HOMEWORK, updatedHomework);
    showMessage('Homework deleted successfully!');
    if (editHomeworkId === id) setEditHomeworkId(null);
    refreshData();
  };

  const handleStartEditAttendance = (rec) => {
    setEditAttendanceId(rec.id);
    setEditAttendance({ date: rec.date, status: rec.status });
  };

  const handleSaveAttendance = () => {
    const updatedAttendance = attendanceList.map(a => 
      a.id === editAttendanceId ? { ...a, ...editAttendance } : a
    );
    setAttendanceList(updatedAttendance);
    saveLocalData(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    showMessage('Attendance updated successfully!');
    setEditAttendanceId(null);
    refreshData();
  };

  const handleStartEditMaterial = (mat) => {
    setEditMaterialId(mat.id);
    setEditMaterial({
      title: mat.title || '',
      type: mat.type || 'document',
      url: mat.url || '',
      description: mat.description || '',
      className: mat.className || '',
      section: mat.section || ''
    });
  };

  const handleSaveMaterial = () => {
    const updatedMaterials = materialsList.map(m => 
      m.id === editMaterialId ? { ...m, ...editMaterial } : m
    );
    setMaterialsList(updatedMaterials);
    saveLocalData(STORAGE_KEYS.MATERIALS, updatedMaterials);
    showMessage('Learning material updated successfully!');
    setEditMaterialId(null);
    refreshData();
  };

  const handleDeleteMaterial = (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this material?')) return;
    const updatedMaterials = materialsList.filter(m => m.id !== id);
    setMaterialsList(updatedMaterials);
    saveLocalData(STORAGE_KEYS.MATERIALS, updatedMaterials);
    showMessage('Learning material deleted successfully!');
    if (editMaterialId === id) setEditMaterialId(null);
    refreshData();
  };

  const handleLinkParent = () => {
    if (!linkStudentId || !linkParentId) {
      showMessage('Please select both student and parent', 'error');
      return;
    }
    
    const updatedUsers = allUsers.map(u => {
      if (u.id === parseInt(linkStudentId) && u.role === 'student') {
        return { ...u, parentId: parseInt(linkParentId) };
      }
      if (u.id === parseInt(linkParentId) && u.role === 'parents') {
        const student = allUsers.find(s => s.id === parseInt(linkStudentId));
        return { ...u, childName: student?.name, childClass: student?.className, childSection: student?.section };
      }
      return u;
    });
    
    setAllUsers(updatedUsers);
    saveLocalData(STORAGE_KEYS.USERS, updatedUsers);
    showMessage('Parent linked successfully!');
    setLinkStudentId('');
    setLinkParentId('');
    setLinkStudentSearchTerm('');
    setLinkStudentClassFilter('');
    setLinkStudentSectionFilter('');
    setLinkStudentAcademicYearFilter('');
    refreshData();
  };

  const startReviewSubmission = (hw, sub) => {
    setReviewingSubmission({
      homeworkId: hw.id,
      studentId: sub.studentId,
      correctedSubmission: sub.correctedSubmission || sub.submission || '',
      feedback: sub.teacherFeedback || '',
      verdict: sub.verdict || 'needs_correction'
    });
  };

  const saveSubmissionReview = () => {
    const updatedHomework = homeworkList.map(hw => {
      if (hw.id === reviewingSubmission.homeworkId) {
        const updatedSubmissions = (hw.submissions || []).map(sub => {
          if (sub.studentId === reviewingSubmission.studentId) {
            return {
              ...sub,
              correctedSubmission: reviewingSubmission.correctedSubmission,
              teacherFeedback: reviewingSubmission.feedback,
              verdict: reviewingSubmission.verdict,
              reviewedAt: new Date().toISOString()
            };
          }
          return sub;
        });
        return { ...hw, submissions: updatedSubmissions };
      }
      return hw;
    });
    
    setHomeworkList(updatedHomework);
    saveLocalData(STORAGE_KEYS.HOMEWORK, updatedHomework);
    showMessage('Homework review saved successfully!');
    setReviewingSubmission({
      homeworkId: null,
      studentId: null,
      correctedSubmission: '',
      feedback: '',
      verdict: 'needs_correction'
    });
    refreshData();
  };

  const renderFilePreview = (attachmentUrl, attachmentName, attachmentType) => {
    if (!attachmentUrl) return null;
    
    const isImage = attachmentUrl.startsWith('data:image') || attachmentType === 'image' || attachmentType === 'photo';
    const isPdf = attachmentUrl.startsWith('data:application/pdf') || attachmentType === 'pdf';
    const isVideo = attachmentUrl.startsWith('data:video') || attachmentType === 'video';
    
    if (isImage) {
      return <img src={attachmentUrl} alt={attachmentName} className="max-w-full h-32 object-contain rounded border mt-2" />;
    } else if (isPdf) {
      return (
        <div className="mt-2">
          <embed src={attachmentUrl} type="application/pdf" className="w-full h-40 rounded border" />
          <a href={attachmentUrl} download={attachmentName} className="text-blue-600 hover:underline text-sm mt-1 inline-block">📄 Download PDF</a>
        </div>
      );
    } else if (isVideo) {
      return <video src={attachmentUrl} controls className="w-full max-h-40 rounded border mt-2" />;
    } else {
      return (
        <a href={attachmentUrl} download={attachmentName} className="text-blue-600 hover:underline text-sm mt-1 inline-block">
          📎 Download: {attachmentName || 'Attachment'}
        </a>
      );
    }
  };

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
        
        {/* Profile Info in Sidebar */}
        <div className={`mb-6 pb-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-200'}`}>
          <div className="relative inline-block mt-4 mb-3 text-center w-full">
            {profilePhoto ? (
              <img src={profilePhoto} alt={user.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto" />
            ) : (
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold border-3 border-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'}`}>
                👩‍🏫
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

          <h3 className={`text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name || 'Teacher'}</h3>
          <p className="text-sm font-semibold text-blue-600 text-center">Teacher</p>
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
            <div className='space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'>
              {/* Overview Filters */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-4 rounded-xl border border-blue-100 shadow-sm`}>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>Dashboard Overview</h2>
                  <div className='flex gap-3'>
                    <select value={overviewFilterClass} onChange={(e) => setOverviewFilterClass(e.target.value)} className={`px-3 py-1.5 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-blue-200 text-blue-900'}`}>
                      <option value=''>Select Class (All)</option>
                      {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select value={overviewFilterSection} onChange={(e) => setOverviewFilterSection(e.target.value)} className={`px-3 py-1.5 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-blue-200 text-blue-900'}`}>
                      <option value=''>Select Section (All)</option>
                      {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {stats.map((stat, i) => (
                  <div key={i} className={`relative overflow-hidden bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-5 rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110`} />
                    <div className='flex items-center gap-4'>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{stat.label}</p>
                        <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Left Column */}
                <div className='space-y-6'>
                  {/* Attendance Summary - Directly using the chart component as it has its own card styling */}
                  <div className="overflow-hidden rounded-2xl shadow-sm border border-slate-100">
                    <AnalyticsChart 
                      title="Today's Attendance"
                      data={attendanceChartData} 
                      xKey="status" 
                      type="bar" 
                      series={[{ dataKey: 'count', name: 'Students', color: '#3b82f6' }]} 
                      height={180}
                    />
                  </div>

                  {/* Homework Brief */}
                  <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-6 rounded-2xl border border-slate-100 shadow-sm`}>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Homework Progress</h3>
                      <button onClick={() => setActiveTab('homework')} className='text-xs font-semibold text-blue-600 hover:underline'>Manage →</button>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'>
                        <p className='text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1'>Submitted</p>
                        <p className='text-2xl font-bold text-emerald-900 dark:text-emerald-100'>{homeworkDoneStudents.length}</p>
                      </div>
                      <div className='p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'>
                        <p className='text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1'>Pending</p>
                        <p className='text-2xl font-bold text-amber-900 dark:text-amber-100'>{homeworkPendingStudents.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className='space-y-6'>
                  {/* Recent Materials */}
                  <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-6 rounded-2xl border border-slate-100 shadow-sm`}>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent Materials</h3>
                      <button onClick={() => setActiveTab('materials')} className='text-xs font-semibold text-blue-600 hover:underline'>View All →</button>
                    </div>
                    <div className='space-y-3'>
                      {overviewFilteredMaterials.slice(0, 3).length === 0 ? (
                        <p className='text-sm text-slate-500 py-4'>No materials uploaded yet.</p>
                      ) : (
                        overviewFilteredMaterials.slice(0, 3).map((mat) => (
                          <div key={mat.id} className='flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600'>
                            <div className='w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600'>
                              📚
                            </div>
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-semibold truncate'>{mat.title}</p>
                              <p className='text-xs text-slate-500'>{mat.className} | {mat.type}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Active Quizzes */}
                  <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-6 rounded-2xl border border-slate-100 shadow-sm`}>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Active Quizzes</h3>
                      <button onClick={() => setActiveTab('lms')} className='text-xs font-semibold text-blue-600 hover:underline'>Open LMS →</button>
                    </div>
                    <div className='space-y-3'>
                      {activeQuizzesCount === 0 ? (
                        <p className='text-sm text-slate-500 py-4'>No active quizzes found.</p>
                      ) : (
                        <div className='p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800'>
                          <p className='text-sm font-semibold text-purple-900 dark:text-purple-100'>Currently managing {activeQuizzesCount} active assessments.</p>
                          <p className='text-xs text-purple-700 dark:text-purple-400 mt-1'>Check LMS tab for detailed performance reports.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Homework Assignments (Condensed) */}
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700' : ''} p-6 rounded-2xl border border-slate-100 shadow-sm`}>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Recent Homework Assignments</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {overviewFilteredHomework.slice(0, 3).length === 0 ? (
                    <p className='text-slate-500 col-span-full'>No homework assigned for this class.</p>
                  ) : (
                    overviewFilteredHomework.slice(0, 3).map((hw) => (
                      <div key={hw.id} className='p-4 rounded-xl border border-blue-50 dark:border-gray-700 bg-blue-50/20 dark:bg-gray-700/20'>
                        <p className='font-semibold text-blue-900 dark:text-blue-100 truncate'>{hw.title}</p>
                        <p className='text-xs text-blue-700 dark:text-blue-400 mt-1'>Due: {hw.dueDate} | Class: {hw.className}</p>
                        <p className='text-xs text-slate-600 dark:text-gray-400 mt-2 line-clamp-2'>{hw.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LMS TAB */}
          {activeTab === 'lms' && (
            <LMSDashboard 
              user={user} 
              isDarkMode={isDarkMode} 
              showMessage={showMessage} 
              classOptions={classOptions}
              yearOptions={yearOptions}
            />
          )}

          {/* HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className='space-y-6'>
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Assign Homework</h2>
                <div className='space-y-4'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <select 
                      value={homework.className} 
                      onChange={(e) => { setHomework({...homework, className: e.target.value}); if(formErrors.className) setFormErrors(prev => ({...prev, className: false})); }}
                      className={`px-3 py-2 border rounded-md transition-all ${formErrors.className ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                      required
                    >
                      <option value=''>Select Class *</option>
                      {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select 
                      value={homework.section} 
                      onChange={(e) => { setHomework({...homework, section: e.target.value}); if(formErrors.section) setFormErrors(prev => ({...prev, section: false})); }}
                      className={`px-3 py-2 border rounded-md transition-all ${formErrors.section ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`}
                      required
                    >
                      <option value=''>Select Section *</option>
                      {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>
                  
                  <input 
                    type='text' 
                    placeholder='Homework Title * (optional if file uploaded)' 
                    value={homework.title} 
                    onChange={(e) => { setHomework({...homework, title: e.target.value}); if(formErrors.title) setFormErrors(prev => ({...prev, title: false})); }} 
                    className={`w-full px-3 py-2 border rounded-md transition-all ${formErrors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`} 
                  />
                  
                  <textarea 
                    placeholder='Homework Description * (optional if file uploaded)' 
                    value={homework.description} 
                    onChange={(e) => { setHomework({...homework, description: e.target.value}); if(formErrors.description) setFormErrors(prev => ({...prev, description: false})); }} 
                    className={`w-full px-3 py-2 border rounded-md transition-all ${formErrors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`} 
                    rows={3} 
                  />
                  
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='space-y-1'>
                      <label className='text-xs font-semibold text-slate-600'>Due Date *</label>
                      <input 
                        type='date' 
                        value={homework.dueDate} 
                        onChange={(e) => { setHomework({...homework, dueDate: e.target.value}); if(formErrors.dueDate) setFormErrors(prev => ({...prev, dueDate: false})); }} 
                        className={`w-full px-3 py-2 border rounded-md transition-all ${formErrors.dueDate ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`} 
                      />
                    </div>
                  </div>
                  
                  <div className='rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4'>
                    <p className='text-sm font-medium text-blue-900 mb-2'>Upload homework file (PDF, Word, images, videos — max 10MB)</p>
                    <div className='flex flex-wrap items-center gap-3'>
                      <label className='cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>
                        Choose file
                        <input type='file' className='hidden' accept='.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm' onChange={handleHomeworkFileChange} />
                      </label>
                      {homework.attachmentName ? (
                        <>
                          <span className='text-sm text-blue-800'>{homework.attachmentName}</span>
                          <button
                            type='button'
                            onClick={() => setHomework((prev) => ({ ...prev, attachmentUrl: '', attachmentName: '', attachmentType: '' }))}
                            className='text-sm font-medium text-red-600 hover:underline'
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className='text-sm text-blue-700'>No file selected</span>
                      )}
                    </div>
                  </div>
                  
                  <input 
                    type='date' 
                    value={homework.dueDate} 
                    onChange={(e) => setHomework({...homework, dueDate: e.target.value})} 
                    className='px-3 py-2 border border-slate-300 rounded-md' 
                    required
                  />
                  
                  <button onClick={handleAssignHomework} className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'>
                    Assign Homework
                  </button>
                </div>
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Manage Homework</h2>
                <div className='grid gap-3 md:grid-cols-2 mb-4'>
                  <select value={homeworkFilterClass} onChange={(e) => setHomeworkFilterClass(e.target.value)} className='px-3 py-2 border border-slate-300 rounded-md'>
                    <option value=''>Filter by Class</option>
                    {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                  <select value={homeworkFilterSection} onChange={(e) => setHomeworkFilterSection(e.target.value)} className='px-3 py-2 border border-slate-300 rounded-md'>
                    <option value=''>Filter by Section</option>
                    {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
                
                <div className='space-y-3'>
                  {tabFilteredHomework.length === 0 ? (
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>No homework found.</p>
                  ) : tabFilteredHomework.map((hw) => (
                    <div key={hw.id} className={`border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded p-3`}>
                      {editHomeworkId === hw.id ? (
                        <div className='space-y-2'>
                          <input value={editHomework.title} onChange={(e) => setEditHomework({ ...editHomework, title: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md' />
                          <textarea value={editHomework.description} onChange={(e) => setEditHomework({ ...editHomework, description: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md' rows={2} />
                          <div className='grid gap-2 md:grid-cols-3'>
                            <input type='date' value={editHomework.dueDate} onChange={(e) => setEditHomework({ ...editHomework, dueDate: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md' />
                            <select value={editHomework.className} onChange={(e) => setEditHomework({ ...editHomework, className: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md'>
                              <option value=''>Select Class</option>
                              {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                            </select>
                            <select value={editHomework.section} onChange={(e) => setEditHomework({ ...editHomework, section: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md'>
                              <option value=''>Select Section</option>
                              {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                          </div>
                          <div className='flex gap-2'>
                            <button onClick={handleSaveHomework} className='bg-blue-600 text-white px-3 py-1 rounded-md'>Save</button>
                            <button onClick={() => setEditHomeworkId(null)} className='bg-slate-200 px-3 py-1 rounded-md'>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className='flex items-center justify-between gap-3'>
                            <div className='flex-1'>
                              <p className='font-semibold'>{hw.title}</p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Due: {hw.dueDate} | Class: {hw.className || 'N/A'} | Section: {hw.section || 'N/A'}</p>
                              <p className='text-sm text-slate-600 mt-1'>{hw.description}</p>
                              {renderFilePreview(hw.attachmentUrl, hw.attachmentName, hw.attachmentType)}
                            </div>
                            <div className='flex gap-2'>
                              <button onClick={() => handleStartEditHomework(hw)} className='bg-yellow-500 text-white px-3 py-1 rounded-md'>Modify</button>
                              <button onClick={() => handleDeleteHomework(hw.id)} className='bg-red-500 text-white px-3 py-1 rounded-md'>Delete</button>
                            </div>
                          </div>
                          <div className='mt-3 grid gap-3 md:grid-cols-2'>
                            <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
                              <h4 className='font-semibold text-green-800 mb-1'>Submitted</h4>
                              {(hw.submissions || []).length === 0 ? (
                                <p className='text-sm text-green-700'>No submissions yet.</p>
                              ) : (
                                <div className='space-y-2'>
                                  {(hw.submissions || []).map((sub) => (
                                    <div key={sub.studentId} className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} border border-green-200 rounded p-2`}>
                                      <p className='text-sm font-semibold text-slate-800'>{sub.studentName}</p>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'} mt-1`}>Original: {sub.submission}</p>
                                      {sub.correctedSubmission && (
                                        <p className='text-sm mt-1 text-red-600 font-semibold'>Corrected: {sub.correctedSubmission}</p>
                                      )}
                                      {sub.teacherFeedback && (
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-700'} mt-1`}>Feedback: {sub.teacherFeedback}</p>
                                      )}
                                      {reviewingSubmission.homeworkId === hw.id && reviewingSubmission.studentId === sub.studentId ? (
                                        <div className='mt-2 space-y-2'>
                                          <textarea
                                            value={reviewingSubmission.correctedSubmission}
                                            onChange={(e) => setReviewingSubmission({ ...reviewingSubmission, correctedSubmission: e.target.value })}
                                            className='w-full px-2 py-1 border border-red-300 rounded text-red-700'
                                            rows={2}
                                          />
                                          <input
                                            value={reviewingSubmission.feedback}
                                            onChange={(e) => setReviewingSubmission({ ...reviewingSubmission, feedback: e.target.value })}
                                            placeholder='Teacher feedback'
                                            className='w-full px-2 py-1 border border-slate-300 rounded'
                                          />
                                          <select
                                            value={reviewingSubmission.verdict}
                                            onChange={(e) => setReviewingSubmission({ ...reviewingSubmission, verdict: e.target.value })}
                                            className='px-2 py-1 border border-slate-300 rounded'
                                          >
                                            <option value='correct'>Correct</option>
                                            <option value='needs_correction'>Needs correction</option>
                                          </select>
                                          <div className='flex gap-2'>
                                            <button onClick={saveSubmissionReview} className='bg-blue-600 text-white px-2 py-1 rounded'>Save Review</button>
                                            <button onClick={() => setReviewingSubmission({ homeworkId: null, studentId: null, correctedSubmission: '', feedback: '', verdict: 'needs_correction' })} className='bg-slate-200 px-2 py-1 rounded'>Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button onClick={() => startReviewSubmission(hw, sub)} className='mt-2 bg-yellow-500 text-white px-2 py-1 rounded text-sm'>
                                          Check / Correct
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className='p-3 bg-red-50 border border-red-200 rounded-md'>
                              <h4 className='font-semibold text-red-800 mb-1'>Not Submitted</h4>
                              {filteredClassStudents.filter((s) => !(hw.submissions || []).some((sub) => sub.studentId === s.id)).length === 0 ? (
                                <p className='text-sm text-red-700'>All students submitted.</p>
                              ) : (
                                <ul className='text-sm text-red-900 space-y-1'>
                                  {filteredClassStudents
                                    .filter((s) => !(hw.submissions || []).some((sub) => sub.studentId === s.id))
                                    .map((s) => <li key={s.id}>• {s.name}</li>)}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className='space-y-6'>
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-4'>Attendance Filters</h2>
                <div className='grid gap-3 md:grid-cols-3'>
                  <select value={attendanceFilterClass} onChange={(e) => setAttendanceFilterClass(e.target.value)} className='px-3 py-2 border border-blue-300 rounded-md text-blue-900'>
                    <option value=''>Select Class (All)</option>
                    {classOptions.map((cls) => <option key={`att-${cls}`} value={cls}>{cls}</option>)}
                  </select>
                  <select value={attendanceFilterSection} onChange={(e) => setAttendanceFilterSection(e.target.value)} className='px-3 py-2 border border-blue-300 rounded-md text-blue-900'>
                    <option value=''>Select Section (All)</option>
                    {sectionOptions.map((sec) => <option key={`att-${sec}`} value={sec}>{sec}</option>)}
                  </select>
                  <input type='date' value={attendanceFilterDate} onChange={(e) => setAttendanceFilterDate(e.target.value)} className='px-3 py-2 border border-blue-300 rounded-md text-blue-900' />
                </div>
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-blue-200`}>
                <h2 className='text-lg font-semibold text-blue-900 mb-2'>Attendance register</h2>
                <p className='text-sm text-blue-800 mb-4'>
                  Date: <span className='font-semibold'>{registerDate}</span>
                  {attendanceFilterClass && attendanceFilterSection
                    ? ` · Class ${attendanceFilterClass} · Section ${attendanceFilterSection}`
                    : ' · Showing your assigned class/section (use filters above to change)'}
                </p>
                {registerStudents.length === 0 ? (
                  <p className='text-blue-800'>No students found for this class/section. Adjust filters or check student records.</p>
                ) : (
                  <div className='overflow-x-auto rounded-lg border border-blue-200'>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr className='bg-blue-100 text-blue-900'>
                          <th className='text-left p-3 font-semibold'>#</th>
                          <th className='text-left p-3 font-semibold'>Student name</th>
                          <th className='text-left p-3 font-semibold'>Class</th>
                          <th className='text-left p-3 font-semibold'>Sec</th>
                          <th className='text-center p-3 font-semibold'>Present</th>
                          <th className='text-center p-3 font-semibold'>Absent</th>
                          <th className='text-center p-3 font-semibold'>Late</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registerStudents.map((s, idx) => {
                          const current = getAttendanceStatusForDate(s.id);
                          return (
                            <tr key={s.id} className='border-t border-blue-100 hover:bg-blue-50/50'>
                              <td className='p-3 text-blue-900'>{idx + 1}</td>
                              <td className='p-3 font-medium text-blue-900'>{s.name}</td>
                              <td className='p-3 text-blue-800'>{s.className || '—'}</td>
                              <td className='p-3 text-blue-800'>{s.section || s.sec || '—'}</td>
                              <td className='p-2 text-center'>
                                <button
                                  type='button'
                                  onClick={() => markRegisterAttendance(s.id, 'present')}
                                  className={`min-w-[88px] rounded-md px-3 py-1.5 font-medium transition ${
                                    current === 'present'
                                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                      : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                  }`}
                                >
                                  Present
                                </button>
                              </td>
                              <td className='p-2 text-center'>
                                <button
                                  type='button'
                                  onClick={() => markRegisterAttendance(s.id, 'absent')}
                                  className={`min-w-[88px] rounded-md px-3 py-1.5 font-medium transition ${
                                    current === 'absent'
                                      ? 'bg-red-600 text-white ring-2 ring-red-300'
                                      : 'bg-red-100 text-red-900 hover:bg-red-200'
                                  }`}
                                >
                                  Absent
                                </button>
                              </td>
                              <td className='p-2 text-center'>
                                <button
                                  type='button'
                                  onClick={() => markRegisterAttendance(s.id, 'late')}
                                  className={`min-w-[88px] rounded-md px-3 py-1.5 font-medium transition ${
                                    current === 'late'
                                      ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                  }`}
                                >
                                  Late
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Manage Attendance Records</h2>
                <div className='space-y-3'>
                  {attendanceTabRecords.length === 0 ? (
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>No attendance records found for this class/section.</p>
                  ) : attendanceTabRecords.map((rec) => {
                    const student = attendanceFilteredStudents.find((s) => s.id === rec.studentId);
                    return (
                      <div key={rec.id} className={`border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded p-3`}>
                        {editAttendanceId === rec.id ? (
                          <div className='grid gap-2 md:grid-cols-3 items-center'>
                            <input type='date' value={editAttendance.date} onChange={(e) => setEditAttendance({ ...editAttendance, date: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md' />
                            <select value={editAttendance.status} onChange={(e) => setEditAttendance({ ...editAttendance, status: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md'>
                              <option value='present'>Present</option>
                              <option value='absent'>Absent</option>
                              <option value='late'>Late</option>
                            </select>
                            <div className='flex gap-2'>
                              <button onClick={handleSaveAttendance} className='bg-blue-600 text-white px-3 py-1 rounded-md'>Update</button>
                              <button onClick={() => setEditAttendanceId(null)} className='bg-slate-200 px-3 py-1 rounded-md'>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className='flex items-center justify-between'>
                            <p className='text-sm text-slate-800'>
                              {student?.name || `Student #${rec.studentId}`} | Class: {student?.className || 'N/A'} | Sec: {student?.section || student?.sec || 'N/A'} | {rec.date} | <span className='capitalize font-semibold'>{rec.status}</span>
                            </p>
                            <button onClick={() => handleStartEditAttendance(rec)} className='bg-yellow-500 text-white px-3 py-1 rounded-md'>Modify</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <AnalyticsChart
                title='Attendance Graph (Present / Absent / Late)'
                data={attendanceChartData}
                xKey='status'
                type='bar'
                series={[{ dataKey: 'count', name: 'Students', color: '#2563eb' }]}
                height={280}
              />
            </div>
          )}

          {/* TRANSPORT TAB */}
          {activeTab === 'transport' && (
            <div className="space-y-6">
               <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-xl">
                  <h2 className="text-3xl font-black mb-2">Transport Commute Log</h2>
                  <p className="text-blue-100 font-bold opacity-90">Record your daily bus boarding and dropping status here. Your logs are synced with the transport office.</p>
               </div>
               <UserTransportLog isDarkMode={isDarkMode} user={user} showMessage={showMessage} />
               <TransportStatsPanel
                 isDarkMode={isDarkMode}
                 showMessage={showMessage}
                 passengerIds={myTransportPassengerIds}
               />
            </div>
          )}

          {/* LEARNING MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className='space-y-6'>
              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Upload Learning Material</h2>
                <div className='space-y-4'>
                  <input type='text' placeholder='Material Title *' value={material.title} onChange={(e) => { setMaterial({...material, title: e.target.value}); if(formErrors.materialTitle) setFormErrors(prev => ({...prev, materialTitle: false})); }} className={`w-full px-3 py-2 border rounded-md transition-all ${formErrors.materialTitle ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`} />
                  <select value={material.type} onChange={(e) => setMaterial({...material, type: e.target.value})} className='w-full px-3 py-2 border border-slate-300 rounded-md'>
                    <option value='document'>Document</option>
                    <option value='video'>Video</option>
                    <option value='pdf'>PDF</option>
                    <option value='photo'>Photo</option>
                  </select>
                  
                  <div className={`rounded-lg border-2 border-dashed p-4 transition-all ${formErrors.materialFile ? 'border-red-500 bg-red-50' : 'border-purple-300 bg-purple-50/40'}`}>
                    <p className={`text-sm font-medium mb-2 ${formErrors.materialFile ? 'text-red-800' : 'text-purple-900'}`}>Upload file (PDF, Word, images, videos — max 10MB) *</p>
                    <div className='flex flex-wrap items-center gap-3'>
                      <label className='cursor-pointer rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700'>
                        Choose file
                        <input type='file' className='hidden' accept='.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm' onChange={(e) => { handleMaterialFileChange(e); if(formErrors.materialFile) setFormErrors(prev => ({...prev, materialFile: false})); }} />
                      </label>
                      {material.file ? (
                        <>
                          <span className='text-sm text-purple-800'>{material.file.name}</span>
                          <button
                            type='button'
                            onClick={() => setMaterial((prev) => ({ ...prev, url: '', file: null }))}
                            className='text-sm font-medium text-red-600 hover:underline'
                          >
                            Remove
                          </button>
                        </>
                      ) : material.url ? (
                        <>
                          <span className='text-sm text-purple-800'>File uploaded</span>
                          <button
                            type='button'
                            onClick={() => setMaterial((prev) => ({ ...prev, url: '', file: null }))}
                            className='text-sm font-medium text-red-600 hover:underline'
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className='text-sm text-purple-700'>No file selected</span>
                      )}
                    </div>
                  </div>
                  
                  <textarea placeholder='Description (optional)' value={material.description} onChange={(e) => setMaterial({...material, description: e.target.value})} className='w-full px-3 py-2 border border-slate-300 rounded-md' rows={3} />
                  <button onClick={handleUploadMaterial} className='bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700'>Upload Material</button>
                </div>
              </div>

              <div className={`bg-white ${isDarkMode ? 'dark:bg-gray-800 border-gray-700 text-white' : ''} p-6 rounded-lg border border-slate-200`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Manage Study Materials</h2>
                <div className='space-y-3'>
                  {filteredMaterials.length === 0 ? (
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>No study material found.</p>
                  ) : filteredMaterials.map((mat) => (
                    <div key={mat.id} className={`border ${isDarkMode ? 'border-gray-700' : 'border-slate-200'} rounded p-3`}>
                      {editMaterialId === mat.id ? (
                        <div className='space-y-2'>
                          <input value={editMaterial.title} onChange={(e) => setEditMaterial({ ...editMaterial, title: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md' />
                          <select value={editMaterial.type} onChange={(e) => setEditMaterial({ ...editMaterial, type: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md'>
                            <option value='document'>Document</option>
                            <option value='video'>Video</option>
                            <option value='pdf'>PDF</option>
                            <option value='photo'>Photo</option>
                          </select>
                          <input value={editMaterial.url} onChange={(e) => setEditMaterial({ ...editMaterial, url: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md' />
                          <textarea value={editMaterial.description} onChange={(e) => setEditMaterial({ ...editMaterial, description: e.target.value })} className='w-full px-3 py-2 border border-slate-300 rounded-md' rows={2} />
                          <div className='grid gap-2 md:grid-cols-2'>
                            <select value={editMaterial.className} onChange={(e) => setEditMaterial({ ...editMaterial, className: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md'>
                              <option value=''>Select Class</option>
                              {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                            </select>
                            <select value={editMaterial.section} onChange={(e) => setEditMaterial({ ...editMaterial, section: e.target.value })} className='px-3 py-2 border border-slate-300 rounded-md'>
                              <option value=''>Select Section</option>
                              {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                          </div>
                          <div className='flex gap-2'>
                            <button onClick={handleSaveMaterial} className='bg-blue-600 text-white px-3 py-1 rounded-md'>Save</button>
                            <button onClick={() => setEditMaterialId(null)} className='bg-slate-200 px-3 py-1 rounded-md'>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className='flex items-center justify-between gap-3'>
                            <div className='flex-1'>
                              <p className='font-semibold'>{mat.title} <span className='text-xs text-slate-500'>({mat.type})</span></p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Class: {mat.className || 'N/A'} | Section: {mat.section || 'N/A'}</p>
                              <p className='text-sm text-slate-600 mt-1'>{mat.description}</p>
                              {renderFilePreview(mat.url, mat.fileName, mat.type)}
                            </div>
                            <div className='flex gap-2'>
                              <button onClick={() => handleStartEditMaterial(mat)} className='bg-yellow-500 text-white px-3 py-1 rounded-md'>Modify</button>
                              <button onClick={() => handleDeleteMaterial(mat.id)} className='bg-red-500 text-white px-3 py-1 rounded-md'>Delete</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>
      </main>
    </div>
  );
}
