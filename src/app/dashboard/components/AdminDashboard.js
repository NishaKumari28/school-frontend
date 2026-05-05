'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import AnalyticsChart from './Charts';
import DashboardCard from './DashboardCard';
import UserEditModal from './UserEditModal';
import DownloadCSVModal from './DownloadCSVModal';
import PasswordResetModal from './PasswordResetModal';
import MultiSelect from './MultiSelect';
import { getUserList, setUserList, sanitizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from '../../components/auth/authService';

/* ============================================================
SHARED STORAGE KEYS
=============================================================== */
const STORAGE_KEYS = {
  USERS: 'school_users',
  HOMEWORK: 'school_homework',
  ATTENDANCE: 'school_attendance',
  MATERIALS: 'school_materials',
  NOTIFICATIONS: 'school_notifications',
  FEES: 'school_fees',
  CLASSES: 'school_classes',
  SECTIONS: 'school_sections',
  ACADEMIC_YEARS: 'academic_years',
  THEME: 'app_theme',
  PROFILE_PIC: 'profile_picture'
};

const HOMEWORK_KEYS = ['teacher_homework', 'school_homework', 'school-homework'];

/* -------- helpers -------- */
const getLocal = (k) => {
  if (typeof window === 'undefined') return [];
  const s = localStorage.getItem(k); 
  return s ? JSON.parse(s) : [];
};

const saveLocal = (k, v) => { 
  if (typeof window !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); 
};

const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

const sortLatestFirst = (items = []) => [...items].sort((a, b) => {
  const getTimestamp = (item) => {
    const dateFields = ['createdAt', 'updatedAt', 'uploadedAt', 'sentAt', 'requestedAt', 'paidAt', 'markedAt', 'date'];
    for (const field of dateFields) {
      const value = item?.[field];
      if (!value) continue;
      const parsed = new Date(value).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    const numericId = Number(item?.id);
    return Number.isNaN(numericId) ? 0 : numericId;
  };
  return getTimestamp(b) - getTimestamp(a);
});

const loadAllUsers = () => {
  const legacy = getLocal(STORAGE_KEYS.USERS);
  const auth = getUserList ? getUserList() : [];
  const merged = [...auth, ...legacy];
  const seen = new Set();
  const out = [];
  merged.forEach(u => { 
    if (!u) return; 
    const k = `${u.id}::${u.number}::${u.role}`; 
    if (!seen.has(k)) { 
      seen.add(k); 
      out.push(u); 
    } 
  });
  return sortLatestFirst(out);
};

const saveAllUsers = (users) => {
  const orderedUsers = sortLatestFirst(users);
  saveLocal(STORAGE_KEYS.USERS, orderedUsers);
  if (setUserList) setUserList(orderedUsers);
};

const parseMultiValueField = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const matchesAllowedValues = (value, allowedValues = []) => {
  if (!allowedValues.length) return true;
  return parseMultiValueField(value).some((item) => allowedValues.includes(item));
};

const resolveBoardValue = (user, fallbackBoard = '') => {
  if (user?.board) return user.board;
  return fallbackBoard;
};

const DEFAULT_CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const DEFAULT_SECTIONS = ['A','B','C','D','E','F'];
const DEFAULT_YEARS = ['2025-26','2026-27','2027-28','2028-29','2029-30'];

export default function AdminDashboard({ user, allUsers: propUsers, showMessage, loadData }) {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const videoRef = useRef(null);
  
  /* ---------- state ---------- */
  const [activeTab, setActiveTab] = useState('overview');
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [listFilterRole, setListFilterRole] = useState('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('');
  const [selectedBoardFilters, setSelectedBoardFilters] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
  const [selectedSubjectFilters, setSelectedSubjectFilters] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [attendancePeriod, setAttendancePeriod] = useState('day');
  const [usersPerPage, setUsersPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Overview page filters
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  const [overviewClassFilter, setOverviewClassFilter] = useState('');
  const [overviewSectionFilter, setOverviewSectionFilter] = useState('');
  const [overviewYearFilter, setOverviewYearFilter] = useState('');
  const [overviewRoleFilter, setOverviewRoleFilter] = useState('all');

  // Master data
  const [localUsers, setLocalUsers] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  // Dynamic class/section/year
  const [availableClasses, setAvailableClasses] = useState(DEFAULT_CLASSES);
  const [availableSections, setAvailableSections] = useState(DEFAULT_SECTIONS);
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);
  const [newItemName, setNewItemName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  
  // Create-user form
  const [newUser, setNewUser] = useState({
    name: '', number: '', password: '', role: '',
    className: '', section: '', subject: '', qualification: '',
    address: '', academicYear: '2026-27', parentName: '',
    childName: '', childClass: '', childSection: '', relationWithChild: '',
    designation: '',
  });
  const [inlineLinkStudent, setInlineLinkStudent] = useState('');
  const [inlineLinkParent, setInlineLinkParent] = useState('');
  const [inlineLinkSearchTerm, setInlineLinkSearchTerm] = useState('');
  const [inlineLinkAcademicYearFilter, setInlineLinkAcademicYearFilter] = useState('');
  const [inlineLinkClassFilter, setInlineLinkClassFilter] = useState('');
  const [inlineLinkSectionFilter, setInlineLinkSectionFilter] = useState('');

  // CSV Upload States
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // CSV Download Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvDownloadUsers, setCsvDownloadUsers] = useState([]);
  const [csvDownloadRole, setCsvDownloadRole] = useState('all');

  // Reset password modal
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  // Load theme preference and profile picture
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    const savedProfilePic = localStorage.getItem(STORAGE_KEYS.PROFILE_PIC);
    if (savedProfilePic) {
      setProfilePicture(savedProfilePic);
    }
    setLocalUsers(loadAllUsers());
    setAttendanceList(sortLatestFirst(getLocal(STORAGE_KEYS.ATTENDANCE)));
    const c = getLocal(STORAGE_KEYS.CLASSES); 
    if (c.length) setAvailableClasses(c);
    const s = getLocal(STORAGE_KEYS.SECTIONS); 
    if (s.length) setAvailableSections(s);
    const y = getLocal(STORAGE_KEYS.ACADEMIC_YEARS); 
    if (y.length) setAvailableYears(y);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  };

  // Profile picture handlers
  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
        localStorage.setItem(STORAGE_KEYS.PROFILE_PIC, reader.result);
        showMessage("Profile picture updated successfully!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    localStorage.removeItem(STORAGE_KEYS.PROFILE_PIC);
    showMessage("Profile picture removed successfully!", "success");
  };

  const refreshData = () => {
    setLocalUsers(loadAllUsers());
    setAttendanceList(sortLatestFirst(getLocal(STORAGE_KEYS.ATTENDANCE)));
    if (loadData) loadData();
  };

  /* ---------- RBAC: admin cannot see superadmin OR other admins ---------- */
  const myScopeSchool = user?.schoolName || '';
  const assignedClasses = useMemo(() => parseMultiValueField(user?.className), [user?.className]);
  const assignedSections = useMemo(() => parseMultiValueField(user?.section), [user?.section]);
  const assignedYears = useMemo(() => parseMultiValueField(user?.academicYear), [user?.academicYear]);
  const assignedBoards = useMemo(() => parseMultiValueField(user?.board), [user?.board]);
  const scopedClassOptions = useMemo(() => assignedClasses.length ? assignedClasses : availableClasses, [assignedClasses, availableClasses]);
  const scopedSectionOptions = useMemo(() => assignedSections.length ? assignedSections : availableSections, [assignedSections, availableSections]);
  const scopedYearOptions = useMemo(() => assignedYears.length ? assignedYears : availableYears, [assignedYears, availableYears]);

  const isUserWithinAdminScope = (userItem) => {
    if (!userItem || userItem.role === 'superadmin' || userItem.role === 'admin') return false;
    if (myScopeSchool && userItem.schoolName && userItem.schoolName !== myScopeSchool) return false;

    const resolvedBoard = resolveBoardValue(userItem, user?.board || '');
    if (!matchesAllowedValues(resolvedBoard, assignedBoards)) return false;

    const classValue = userItem.role === 'parents' ? userItem.childClass : userItem.className;
    const sectionValue = userItem.role === 'parents' ? userItem.childSection : (userItem.section || userItem.sec);
    const yearValue = userItem.academicYear || userItem.admissionYear;

    if (userItem.role === 'student' || userItem.role === 'teacher' || userItem.role === 'parents') {
      if (classValue && !matchesAllowedValues(classValue, assignedClasses)) return false;
      if (sectionValue && !matchesAllowedValues(sectionValue, assignedSections)) return false;
    }

    if (userItem.role === 'student' && yearValue && !matchesAllowedValues(yearValue, assignedYears)) return false;

    return true;
  };

  const visibleUsers = useMemo(() => {
    return localUsers.filter(isUserWithinAdminScope);
  }, [localUsers, myScopeSchool, assignedBoards, assignedClasses, assignedSections, assignedYears, user?.board]);

  const students = visibleUsers.filter(u => u.role === 'student');
  const teachers = visibleUsers.filter(u => u.role === 'teacher');
  const parents = visibleUsers.filter(u => u.role === 'parents');
  const staff = visibleUsers.filter(u => u.role === 'staff');

  const filteredInlineLinkStudents = useMemo(() => {
    return students.filter(s => {
      if (inlineLinkAcademicYearFilter && s.academicYear !== inlineLinkAcademicYearFilter) return false;
      if (inlineLinkClassFilter && s.className !== inlineLinkClassFilter) return false;
      if (inlineLinkSectionFilter && s.section !== inlineLinkSectionFilter) return false;
      if (inlineLinkSearchTerm) {
        const term = inlineLinkSearchTerm.toLowerCase();
        return (
          s.name?.toLowerCase().includes(term) ||
          s.number?.includes(term) ||
          s.className?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [students, inlineLinkSearchTerm, inlineLinkAcademicYearFilter, inlineLinkClassFilter, inlineLinkSectionFilter]);

  // Overview filtered users for card clicks
  const overviewFilteredUsers = useMemo(() => {
    let list = visibleUsers;
    
    if (overviewRoleFilter !== 'all') {
      list = list.filter(u => u.role === overviewRoleFilter);
    }
    
    if (overviewSearchTerm) {
      const term = overviewSearchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(term) ||
        (u.number || '').includes(term)
      );
    }
    
    if (overviewClassFilter) {
      list = list.filter(u => 
        u.className === overviewClassFilter || 
        u.childClass === overviewClassFilter
      );
    }
    
    if (overviewSectionFilter) {
      list = list.filter(u => 
        (u.section || u.sec) === overviewSectionFilter || 
        u.childSection === overviewSectionFilter
      );
    }
    
    if (overviewYearFilter) {
      list = list.filter(u => 
        u.academicYear === overviewYearFilter || 
        u.admissionYear === overviewYearFilter
      );
    }
    
    return list;
  }, [visibleUsers, overviewRoleFilter, overviewSearchTerm, overviewClassFilter, overviewSectionFilter, overviewYearFilter]);

  // Pagination for overview
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewTotalPages = Math.ceil(overviewFilteredUsers.length / usersPerPage);
  const overviewPaginatedUsers = useMemo(() => {
    const startIndex = (overviewPage - 1) * usersPerPage;
    return overviewFilteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [overviewFilteredUsers, overviewPage, usersPerPage]);

  // Reset overview page when filters change
  useEffect(() => {
    setOverviewPage(1);
  }, [overviewRoleFilter, overviewSearchTerm, overviewClassFilter, overviewSectionFilter, overviewYearFilter]);

  const handleCardClick = (role) => {
    setOverviewRoleFilter(role);
    setOverviewPage(1);
    setActiveTab('detail-list');
  };

  // Pagination for main user list
  const filteredUsers = useMemo(() => {
    let list = visibleUsers;
    if (listFilterRole !== 'all') list = list.filter(u => u.role === listFilterRole);
    if (selectedSchoolFilter) list = list.filter((u) => u.schoolName === selectedSchoolFilter);
    if (selectedBoardFilters.length > 0) list = list.filter((u) => selectedBoardFilters.some(board => parseMultiValueField(resolveBoardValue(u, user?.board || '')).includes(board)));
    if (selectedAcademicYear && listFilterRole === 'student') list = list.filter((u) => u.academicYear === selectedAcademicYear || u.admissionYear === selectedAcademicYear);
    if (selectedClassFilter && listFilterRole === 'student') list = list.filter((u) => u.className === selectedClassFilter);
    if (selectedSectionFilter && listFilterRole === 'student') list = list.filter((u) => (u.section || u.sec) === selectedSectionFilter);
    if (selectedSubjectFilters.length > 0 && listFilterRole === 'teacher') list = list.filter((u) => selectedSubjectFilters.some(subject => parseMultiValueField(u.subject).includes(subject)));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(t) ||
        (u.number || '').includes(t) ||
        (u.schoolName || '').toLowerCase().includes(t) ||
        resolveBoardValue(u, user?.board || '').toLowerCase().includes(t) ||
        (u.subject || '').toLowerCase().includes(t) ||
        (u.className || '').toLowerCase().includes(t) ||
        (u.section || u.sec || '').toLowerCase().includes(t)
      );
    }
    return list;
  }, [visibleUsers, user, listFilterRole, searchTerm, selectedSchoolFilter, selectedBoardFilters, selectedAcademicYear, selectedClassFilter, selectedSectionFilter, selectedSubjectFilters]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, currentPage, usersPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [listFilterRole, searchTerm, selectedSchoolFilter, selectedBoardFilters, selectedAcademicYear, selectedClassFilter, selectedSectionFilter, selectedSubjectFilters]);

  const schoolFilterOptions = useMemo(() => {
    const values = new Set();
    visibleUsers.forEach((user) => {
      if (user.schoolName) values.add(user.schoolName);
    });
    return Array.from(values).sort();
  }, [visibleUsers]);

  const boardFilterOptions = useMemo(() => {
    const values = new Set();
    visibleUsers.forEach((u) => {
      const board = resolveBoardValue(u, user?.board || '');
      if (board) values.add(board);
    });
    const scopedBoards = Array.from(values);
    return assignedBoards.length ? scopedBoards.filter((board) => assignedBoards.includes(board)) : scopedBoards;
  }, [visibleUsers, assignedBoards, user]);

  const subjectFilterOptions = useMemo(() => {
    const values = new Set();
    visibleUsers.forEach((u) => {
      if (u.role === 'teacher' && u.subject) {
        parseMultiValueField(u.subject).forEach(s => values.add(s));
      }
    });
    return Array.from(values).sort();
  }, [visibleUsers]);

  // Scoped attendance for charts
  const scopedAttendance = useMemo(() => {
    if (!myScopeSchool && !assignedClasses.length && !assignedSections.length && !assignedYears.length && !assignedBoards.length) 
      return attendanceList;
    return attendanceList.filter(r => {
      const teacherRecord = teachers.find(t => t.id === r.teacherId);
      const schoolValue = r.schoolName || teacherRecord?.schoolName || myScopeSchool;
      const boardValue = resolveBoardValue(r, teacherRecord?.board || user?.board || '');
      const classValue = r.className || teacherRecord?.className || '';
      const sectionValue = r.section || teacherRecord?.section || teacherRecord?.sec || '';
      const yearValue = r.academicYear || r.admissionYear || '';

      if (myScopeSchool && schoolValue && schoolValue !== myScopeSchool) return false;
      if (!matchesAllowedValues(boardValue, assignedBoards)) return false;
      if (classValue && !matchesAllowedValues(classValue, assignedClasses)) return false;
      if (sectionValue && !matchesAllowedValues(sectionValue, assignedSections)) return false;
      if (yearValue && !matchesAllowedValues(yearValue, assignedYears)) return false;
      return true;
    });
  }, [attendanceList, teachers, myScopeSchool, assignedBoards, assignedClasses, assignedSections, assignedYears, user]);

  /* ---------- Class / Section / Year add & remove ---------- */
  const persistDynamic = (cls = availableClasses, sec = availableSections, yr = availableYears) => {
    saveLocal(STORAGE_KEYS.CLASSES, cls);
    saveLocal(STORAGE_KEYS.SECTIONS, sec);
    saveLocal(STORAGE_KEYS.ACADEMIC_YEARS, yr);
  };

  const handleAddClass = () => {
    if (!newItemName) return;
    if (availableClasses.includes(newItemName)) return showMessage?.('Class already exists', 'error');
    const updated = [...availableClasses, newItemName].sort();
    setAvailableClasses(updated); 
    persistDynamic(updated);
    setNewItemName(''); 
    setShowAddClass(false);
    showMessage?.(`Class "${newItemName}" added`, 'success');
  };

  const handleAddSection = () => {
    if (!newItemName) return;
    if (availableSections.includes(newItemName)) return showMessage?.('Section already exists', 'error');
    const updated = [...availableSections, newItemName].sort();
    setAvailableSections(updated); 
    persistDynamic(availableClasses, updated);
    setNewItemName(''); 
    setShowAddSection(false);
    showMessage?.(`Section "${newItemName}" added`, 'success');
  };

  const handleAddYear = () => {
    if (!newItemName) return;
    if (availableYears.includes(newItemName)) return showMessage?.('Academic Year already exists', 'error');
    const updated = [...availableYears, newItemName].sort();
    setAvailableYears(updated); 
    persistDynamic(availableClasses, availableSections, updated);
    setNewItemName(''); 
    setShowAddYear(false);
    showMessage?.(`Academic Year "${newItemName}" added`, 'success');
  };

  const handleDeleteItem = () => {
    if (deleteType === 'class') {
      if (localUsers.some(u => u.className === itemToDelete || u.childClass === itemToDelete)) {
        showMessage?.(`Cannot delete "${itemToDelete}" — in use`, 'error'); 
        setItemToDelete(null); 
        return;
      }
      const updated = availableClasses.filter(c => c !== itemToDelete);
      setAvailableClasses(updated); 
      persistDynamic(updated);
    } else if (deleteType === 'section') {
      if (localUsers.some(u => u.section === itemToDelete || u.sec === itemToDelete || u.childSection === itemToDelete)) {
        showMessage?.(`Cannot delete section "${itemToDelete}" — in use`, 'error'); 
        setItemToDelete(null); 
        return;
      }
      const updated = availableSections.filter(s => s !== itemToDelete);
      setAvailableSections(updated); 
      persistDynamic(availableClasses, updated);
    } else if (deleteType === 'year') {
      if (localUsers.some(u => u.admissionYear === itemToDelete || u.academicYear === itemToDelete)) {
        showMessage?.(`Cannot delete Year "${itemToDelete}" — in use`, 'error'); 
        setItemToDelete(null); 
        return;
      }
      const updated = availableYears.filter(y => y !== itemToDelete);
      setAvailableYears(updated); 
      persistDynamic(availableClasses, availableSections, updated);
    }
    showMessage?.(`Removed "${itemToDelete}"`, 'success');
    setItemToDelete(null); 
    setDeleteType('');
  };

  const askDelete = (type, value) => { 
    setDeleteType(type); 
    setItemToDelete(value); 
  };

  /* ---------- User CRUD ---------- */
  const handleCreateUser = () => {
    if (!newUser.name || !newUser.number || !newUser.role) {
      return showMessage?.('Please fill name, number, role', 'error');
    }
    const normalizedNumber = sanitizePhoneNumber(newUser.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      return showMessage?.(getPhoneValidationMessage(), 'error');
    }
    if (newUser.role === 'admin' || newUser.role === 'superadmin') {
      return showMessage?.('Admins cannot create Admin/SuperAdmin accounts', 'error');
    }
    if (newUser.role === 'teacher' || newUser.role === 'student') {
      if (newUser.className && !scopedClassOptions.includes(newUser.className)) 
        return showMessage?.('Only assigned classes are allowed', 'error');
      if (newUser.section && !scopedSectionOptions.includes(newUser.section)) 
        return showMessage?.('Only assigned sections are allowed', 'error');
    }
    if (newUser.role === 'student' && newUser.academicYear && !scopedYearOptions.includes(newUser.academicYear)) {
      return showMessage?.('Only assigned academic years are allowed', 'error');
    }
    if (newUser.role === 'parents') {
      if (newUser.childClass && !scopedClassOptions.includes(newUser.childClass)) 
        return showMessage?.('Only assigned classes are allowed', 'error');
      if (newUser.childSection && !scopedSectionOptions.includes(newUser.childSection)) 
        return showMessage?.('Only assigned sections are allowed', 'error');
    }
    const u = { 
      id: generateId(), 
      schoolName: myScopeSchool || '', 
      board: user?.board || '', 
      createdByAdminId: user?.id, 
      ...newUser 
    };
    Object.keys(u).forEach(k => { 
      if (u[k] === '' || u[k] === undefined) delete u[k]; 
    });
    u.role = newUser.role; 
    u.name = newUser.name; 
    u.number = normalizedNumber; 
    u.password = newUser.password && String(newUser.password).trim() !== '' ? newUser.password : `VSMS@${String(normalizedNumber).slice(-4)}`;

    const updated = [u, ...localUsers];
    setLocalUsers(updated); 
    saveAllUsers(updated);
    showMessage?.('User created successfully!', 'success');
    setNewUser({ 
      name:'', number:'', password:'', role:'', className:'', section:'', 
      subject:'', qualification:'', address:'', academicYear:'2026-27', parentName:'', 
      childName:'', childClass:'', childSection:'', relationWithChild:'', designation:'' 
    });
    refreshData();
  };

  const handleEditUser = (u) => { 
    setEditingUser(u); 
    setIsModalOpen(true); 
  };

  const handleSaveUser = (updated) => {
    if (updated.role === 'admin' || updated.role === 'superadmin') {
      return showMessage?.('Admins cannot assign Admin/SuperAdmin role', 'error');
    }
    const normalizedNumber = sanitizePhoneNumber(updated.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      return showMessage?.(getPhoneValidationMessage(), 'error');
    }
    const list = localUsers.map(u => u.id === updated.id ? { ...u, ...updated } : u);
    const sanitizedList = list.map((u) => u.id === updated.id ? { ...u, number: normalizedNumber } : u);
    setLocalUsers(sanitizedList); 
    saveAllUsers(sanitizedList);
    showMessage?.(`User ${updated.name} updated`, 'success');
    setIsModalOpen(false); 
    setEditingUser(null); 
    refreshData();
  };

  const handleDeleteUser = (id) => {
    if (!window.confirm('Remove this user?')) return;
    const list = localUsers.filter(u => u.id !== id);
    setLocalUsers(list); 
    saveAllUsers(list);
    showMessage?.('User deleted', 'success'); 
    refreshData();
  };

  const handleResetPassword = (user) => {
    setResetPasswordUser(user);
    setShowResetModal(true);
  };

  const confirmResetPassword = () => {
    if (!resetPasswordUser) return;
    
    const originalUser = localUsers.find(u => u.id === resetPasswordUser.id);
    if (originalUser && originalUser.number) {
      const numberStr = String(originalUser.number);
      const last4 = numberStr.slice(-4);
      const newPassword = `VSMS@${last4}`;
      
      const updatedUsers = localUsers.map(u => 
        u.id === resetPasswordUser.id 
          ? { ...u, password: newPassword }
          : u
      );
      
      setLocalUsers(updatedUsers);
      saveAllUsers(updatedUsers);
      showMessage?.(`Password reset successful for ${resetPasswordUser.name}!`, "success");
    } else {
      showMessage?.("Unable to reset password", "error");
    }
    
    setShowResetModal(false);
    setResetPasswordUser(null);
  };

  /* ---------- Parent-Student link ---------- 
  const handleLinkStudent = (sid, pid) => {
    if (!sid || !pid) return showMessage?.('Select both student and parent', 'error');
    const list = localUsers.map(u => {
      if (String(u.id) === String(sid) && u.role === 'student') return { ...u, parentId: pid };
      if (String(u.id) === String(pid) && u.role === 'parents') {
        const s = localUsers.find(x => String(x.id) === String(sid));
        return { ...u, childName: s?.name, childClass: s?.className, childSection: s?.section || s?.sec };
      }
      return u;
    });
    setLocalUsers(list); 
    saveAllUsers(list);
    showMessage?.('Linked successfully', 'success');
    setInlineLinkStudent(''); 
    setInlineLinkParent(''); 
    refreshData();
  };  */

  /* ---------- charts data ---------- */
  const attendanceData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    if (attendancePeriod === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (attendancePeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (attendancePeriod === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (attendancePeriod === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const counts = {
      Student: { present: 0, absent: 0, late: 0 },
      Teacher: { present: 0, absent: 0, late: 0 },
      Staff: { present: 0, absent: 0, late: 0 }
    };

    scopedAttendance.forEach(a => {
      const aDate = new Date(a.date || a.createdAt || Date.now());
      if (aDate >= startDate && aDate <= now) {
        let role = 'Student';
        if (a.role) {
          const r = a.role.toLowerCase();
          if (r === 'teacher') role = 'Teacher';
          else if (r === 'staff') role = 'Staff';
        } else {
          const userObj = localUsers.find(u => String(u.id) === String(a.studentId || a.userId || a.teacherId) || u.name === (a.studentName || a.name));
          if (userObj && userObj.role) {
            const r = userObj.role.toLowerCase();
            if (r === 'teacher') role = 'Teacher';
            else if (r === 'staff') role = 'Staff';
          }
        }
        
        const st = (a.status || '').toLowerCase();
        if (st === 'present') counts[role].present += 1;
        else if (st === 'absent') counts[role].absent += 1;
        else if (st === 'late') counts[role].late += 1;
      }
    });

    return [
      { name: 'Student', ...counts.Student },
      { name: 'Teacher', ...counts.Teacher },
      { name: 'Staff', ...counts.Staff }
    ];
  }, [scopedAttendance, localUsers, attendancePeriod]);

  /* ---------- CSV bulk upload ---------- */
  const handleCsvUpload = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => {
      const data = res.data.filter(r => Object.values(r).some(v => v && String(v).trim()));
      if (!data.length) { 
        setCsvErrors(['No valid rows']); 
        return; 
      }
      const hs = Object.keys(data[0] || {}).map(h => h.toLowerCase());
      if (!hs.includes('name') || !hs.includes('role') || !hs.includes('number')) {
        return showMessage?.('CSV needs name, role, number columns', 'error');
      }
      setCsvData(data); 
      setCsvErrors([]);
    }});
  };

  const processBulkUpload = () => {
    setIsProcessingCsv(true);
    const created = [];
    csvData.forEach(r => {
      if (!r.name || !r.role || !r.number) return;
      if (['admin','superadmin'].includes(String(r.role).toLowerCase())) return;
      const normalizedNumber = sanitizePhoneNumber(r.number);
      if (!isValidPhoneNumber(normalizedNumber)) return;
      const classValue = r.classname || r.className || '';
      const sectionValue = r.sec || r.section || '';
      const yearValue = r.admissionyear || r.admissionYear || r.academicYear || '';
      const childClassValue = r.childclass || r.childClass || '';
      const childSectionValue = r.childsec || r.childSection || '';
      if (classValue && !scopedClassOptions.includes(classValue)) return;
      if (sectionValue && !scopedSectionOptions.includes(sectionValue)) return;
      if (yearValue && !scopedYearOptions.includes(yearValue)) return;
      if (childClassValue && !scopedClassOptions.includes(childClassValue)) return;
      if (childSectionValue && !scopedSectionOptions.includes(childSectionValue)) return;
      created.push({
        id: generateId(), 
        name: r.name, 
        number: normalizedNumber, 
        password: r.password && String(r.password).trim() !== '' ? r.password : `VSMS@${String(normalizedNumber).slice(-4)}`,
        role: String(r.role).toLowerCase(), 
        schoolName: myScopeSchool || r.schoolName || '',
        className: classValue, 
        section: sectionValue,
        subject: r.subject || '', 
        qualification: r.qualification || '',
        address: r.address || '', 
        academicYear: yearValue,
        childName: r.childname || r.childName || '', 
        childClass: childClassValue,
        childSection: childSectionValue, 
        designation: r.designation || '',
      });
    });
    if (created.length !== csvData.length) {
      showMessage?.(`Some CSV rows were skipped. ${getPhoneValidationMessage()}`, 'error');
    }
    const updated = [...created, ...localUsers];
    setLocalUsers(updated); 
    saveAllUsers(updated);
    showMessage?.(`Bulk upload: ${created.length} users`, 'success');
    setCsvData([]); 
    setIsProcessingCsv(false); 
    refreshData();
  };

  const downloadSampleCSV = () => {
    const c = `name,number,password,role,className,section,subject,qualification,address,academicYear,childName,childClass,childSection,designation
John Student,9876543210,123456,student,10,A,,,123 Main St,2026-27,,,,
Jane Teacher,9876543211,123456,teacher,10,A,Math,B.Ed,,,,,,
Robert Parent,9876543212,123456,parents,,,,,456 Oak Ave,,John Student,10,A,
Lisa Staff,9876543213,123456,staff,,,,,Graduate,,,,,Librarian`;
    const url = URL.createObjectURL(new Blob([c], { type: 'text/csv' }));
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'user_sample.csv'; 
    a.click();
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Modals */}
      <DownloadCSVModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        users={csvDownloadUsers}
        role={csvDownloadRole}
        isDarkMode={isDarkMode}
      />

      {isModalOpen && editingUser && (
        <UserEditModal 
          isOpen={true} 
          user={editingUser} 
          onClose={() => { setIsModalOpen(false); setEditingUser(null); }} 
          onSave={handleSaveUser} 
        />
      )}

      {/* Reset Password Modal */}
      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetPasswordUser(null);
        }}
        onConfirm={confirmResetPassword}
        userName={resetPasswordUser?.name}
        userNumber={resetPasswordUser?.number}
        isDarkMode={isDarkMode}
      />

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Remove</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Remove "{itemToDelete}"?</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteItem} className="bg-red-600 text-white px-4 py-2 rounded">Remove</button>
              <button onClick={() => setItemToDelete(null)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Class</h3>
            <input 
              value={newItemName} 
              onChange={e => setNewItemName(e.target.value)} 
              className={`w-full border px-3 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
              placeholder="Class name" 
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddClass} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
              <button onClick={() => setShowAddClass(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Section</h3>
            <input 
              value={newItemName} 
              onChange={e => setNewItemName(e.target.value)} 
              className={`w-full border px-3 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
              placeholder="Section name" 
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddSection} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
              <button onClick={() => setShowAddSection(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Academic Year</h3>
            <input 
              value={newItemName} 
              onChange={e => setNewItemName(e.target.value)} 
              className={`w-full border px-3 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
              placeholder="e.g. 2030-31" 
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddYear} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
              <button onClick={() => setShowAddYear(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
        
        {/* SIDEBAR */}
        <aside className={`w-80 flex-shrink-0 border-r shadow-lg z-40 flex flex-col h-screen sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Profile Section */}
          <div className={`p-5 text-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative inline-block">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-20 h-20 rounded-full mx-auto object-cover border-3 border-blue-500" />
              ) : (
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold border-3 border-blue-500 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer hover:bg-blue-700 transition">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
              </label>
            </div>
            {profilePicture && (
              <button onClick={handleRemoveProfilePicture} className="mt-1 text-xs text-red-500 hover:text-red-700 transition block mx-auto">
                Remove
              </button>
            )}
            <h3 className={`mt-2 font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name || 'Admin'}</h3>
            <p className={`text-xs font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Admin</p>
            <p className={`text-xs mt-0.5 border-b pb-2 ${isDarkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>{user?.number || 'admin@school.com'}</p>
            
            {user?.schoolName && (
              <p className={`text-xs font-semibold mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                🏫 {user.schoolName}
              </p>
            )}
            <p className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              📚 Board: {user?.board || 'N/A'}
            </p>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`mt-3 w-full py-1.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-all duration-300 ${isDarkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              {isDarkMode ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>MENU</p>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setFilterRole('all'); }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === 'overview' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              >
                Overview
              </button>
              <button
                onClick={() => { setActiveTab('users'); setFilterRole('all'); }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === 'users' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
              >
                Create User
              </button>
            </div>
          </div>

          {/* Logout Button 
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
              Logout
            </button>
          </div>  */}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 min-h-screen">
          {/* Header */}
          <div className={`mb-4 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {activeTab === 'overview' ? 'Dashboard Overview' : 'User Management'}
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
              Welcome, {user?.name || 'Admin'} :: {user?.role || 'admin'}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className={`flex flex-wrap gap-2 mb-4 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => { setActiveTab('overview'); setFilterRole('all'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              Overview
            </button>
            <button
              onClick={() => { setActiveTab('users'); setFilterRole('all'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              Create User
            </button>
          </div>

          {/* Content Area */}
          <div className="space-y-5">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Video Section */}
                <div className={`rounded-xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <video
                    ref={videoRef}
                    className="w-full aspect-video object-cover"
                    controls
                    autoPlay={false}
                    poster="https://via.placeholder.com/1920x1080?text=School+Management+Video"
                  >
                    <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="p-4 text-center">
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Welcome to School Management System
                    </h3>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Manage students, teachers, parents, and staff efficiently
                    </p>
                  </div>
                </div>

                {/* Attendance Chart */}
                <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-slate-50'}`}>
                  <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Attendance Period:</label>
                  <select 
                    value={attendancePeriod} 
                    onChange={e => setAttendancePeriod(e.target.value)} 
                    className={`px-3 py-1.5 border rounded bg-white ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    <option value="day">Day-wise</option>
                    <option value="week">Week-wise</option>
                    <option value="month">Month-wise</option>
                    <option value="year">Year-wise</option>
                  </select>
                </div>
                <AnalyticsChart 
                  title={`Overall Attendance (${attendancePeriod.charAt(0).toUpperCase() + attendancePeriod.slice(1)}-wise)`} 
                  data={attendanceData} 
                  xKey="name" 
                  type="bar" 
                  series={[
                    {dataKey:"present", name:"Present", color:"#10b981"},
                    {dataKey:"absent", name:"Absent", color:"#ef4444"},
                    {dataKey:"late", name:"Late", color:"#f59e0b"}
                  ]} 
                />

                {/* Overview Filters */}
                <div className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Overview Filters</h3>
                  <div className="grid gap-3 md:grid-cols-4">
                    <input 
                      placeholder="Search by name or phone..." 
                      value={overviewSearchTerm} 
                      onChange={e => setOverviewSearchTerm(e.target.value)} 
                      className={`w-full border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                    />
                    <select 
                      value={overviewClassFilter} 
                      onChange={e => setOverviewClassFilter(e.target.value)} 
                      className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">All Classes</option>
                      {scopedClassOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select 
                      value={overviewSectionFilter} 
                      onChange={e => setOverviewSectionFilter(e.target.value)} 
                      className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">All Sections</option>
                      {scopedSectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
                    </select>
                    <select 
                      value={overviewYearFilter} 
                      onChange={e => setOverviewYearFilter(e.target.value)} 
                      className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">All Academic Years</option>
                      {scopedYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>

                {/* Dashboard Cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                  <DashboardCard 
                    onClick={() => handleCardClick('student')} 
                    title="Students" 
                    icon="🎓" 
                    value={students.length} 
                    color="blue" 
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                  <DashboardCard 
                    onClick={() => handleCardClick('teacher')} 
                    title="Teachers" 
                    icon="🏫" 
                    value={teachers.length} 
                    color="green" 
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                  <DashboardCard 
                    onClick={() => handleCardClick('parents')} 
                    title="Parents" 
                    icon="👨‍👩‍👧" 
                    value={parents.length} 
                    color="slate" 
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                  <DashboardCard 
                    onClick={() => handleCardClick('staff')} 
                    title="Non teaching Staff" 
                    icon="👔" 
                    value={staff.length} 
                    color="orange" 
                    className="cursor-pointer transition-transform hover:scale-105"
                  />
                </div>

                {/* Search Results List */}
                {overviewSearchTerm && (
                  <div className={`mt-6 p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        Search Results ({overviewFilteredUsers.length} users found)
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {overviewFilteredUsers.slice(0, 50).map((user) => (
                        <div key={user.id} className={`flex justify-between items-center p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-700'}`}>
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user.name}</p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {user.role?.toUpperCase()} | {user.number}
                                {user.className && ` | Class: ${user.className}`}
                                {user.section && ` | Section: ${user.section}`}
                                {user.subject && ` | Subject: ${user.subject}`}
                                {user.designation && ` | Designation: ${user.designation}`}
                                {user.childName && ` | Child: ${user.childName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <button onClick={() => handleEditUser(user)} className="px-3 py-1 border border-blue-500 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900">Edit</button>
                            <button onClick={() => handleResetPassword(user)} className="px-3 py-1 border border-yellow-500 text-yellow-600 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900">Reset</button>
                            <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1 border border-red-500 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900">Delete</button>
                          </div>
                        </div>
                      ))}
                      {overviewFilteredUsers.length > 50 && (
                        <p className={`text-center text-sm py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Showing top 50 results. Please refine your search.
                        </p>
                      )}
                      {overviewFilteredUsers.length === 0 && (
                        <p className={`text-center text-sm py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No users found matching your search.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DETAIL LIST TAB */}
            {activeTab === 'detail-list' && (
              <div id="user-list-section" className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {overviewRoleFilter === 'student' ? 'Students List' : 
                     overviewRoleFilter === 'teacher' ? 'Teachers List' : 
                     overviewRoleFilter === 'parents' ? 'Parents List' : 
                     overviewRoleFilter === 'staff' ? 'Non Teaching Staff List' : 'All Users'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setOverviewRoleFilter('all');
                        setOverviewPage(1);
                        setActiveTab('overview');
                      }}
                      className={`px-3 py-1 text-sm rounded ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      ← Back to Dashboard
                    </button>
                    <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                      Total: {overviewFilteredUsers.length}
                    </span>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-2">
                  {overviewPaginatedUsers.map(u => (
                    <div key={u.id} className={`flex justify-between items-center p-3 border rounded hover:bg-slate-50 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : ''}`}>
                      <div>
                        <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {u.name}
                          <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-slate-100 text-slate-700'} capitalize`}>
                            {u.role}
                          </span>
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Phone: {u.number}</p>
                        {(u.className || u.section || u.academicYear) && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                            {u.className && `Class: ${u.className} `}
                            {(u.section || u.sec) && `| Section: ${u.section || u.sec} `}
                            {(u.academicYear || u.admissionYear) && `| Year: ${u.academicYear || u.admissionYear}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 text-sm">
                        <button onClick={() => handleEditUser(u)} className="px-3 py-1 border border-blue-500 text-blue-600 rounded">Edit</button>
                        <button onClick={() => handleResetPassword(u)} className="px-3 py-1 border border-yellow-500 text-yellow-600 rounded">Reset Password</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1 border border-red-500 text-red-600 rounded">Delete</button>
                      </div>
                    </div>
                  ))}
                  {overviewFilteredUsers.length === 0 && (
                    <p className={`text-center text-sm py-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                      No users found.
                    </p>
                  )}
                </div>

                {/* Pagination Controls */}
                {overviewTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4 pt-3 border-t">
                    <button
                      onClick={() => setOverviewPage(p => Math.max(1, p - 1))}
                      disabled={overviewPage === 1}
                      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-600">
                      Page {overviewPage} of {overviewTotalPages}
                    </span>
                    <button
                      onClick={() => setOverviewPage(p => Math.min(overviewTotalPages, p + 1))}
                      disabled={overviewPage === overviewTotalPages}
                      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CREATE USER TAB */}
            {activeTab === 'users' && (
              <div className="space-y-5">
                {/* Create User Form */}
                <div className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Create New User Account</h2>
                  {/* Step 1: Admin Assigned Rights Display */}
                  <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
                    <h3 className={`font-semibold mb-3 text-blue-800`}>Your Assigned Access Rights</h3>
                    <div className="grid gap-4 md:grid-cols-4">
                      {/* Academic Year */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Academic Years</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignedYears.length > 0 ? assignedYears.map(year => (
                            <span key={year} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{year}</span>
                          )) : <span className="text-sm text-gray-500">All</span>}
                        </div>
                      </div>

                      {/* Board */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Boards</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignedBoards.length > 0 ? assignedBoards.map(board => (
                            <span key={board} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{board}</span>
                          )) : <span className="text-sm text-gray-500">All</span>}
                        </div>
                      </div>

                      {/* Class */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Classes</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignedClasses.length > 0 ? assignedClasses.map(cls => (
                            <span key={cls} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{cls}</span>
                          )) : <span className="text-sm text-gray-500">All</span>}
                        </div>
                      </div>

                      {/* Section */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Sections</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {assignedSections.length > 0 ? assignedSections.map(sec => (
                            <span key={sec} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{sec}</span>
                          )) : <span className="text-sm text-gray-500">All</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <input 
                      placeholder="Full Name *" 
                      value={newUser.name} 
                      onChange={e => setNewUser({...newUser, name: e.target.value})} 
                      className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                    />
                    <input 
                      placeholder="Phone Number *" 
                      value={newUser.number} 
                      onChange={e => setNewUser({...newUser, number: sanitizePhoneNumber(e.target.value)})} 
                      inputMode="numeric" 
                      maxLength={10} 
                      className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                    />
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password (leave blank for default)" 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        className={`px-3 py-2 pr-10 border rounded-lg w-full text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-2.5"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                    <select 
                      value={newUser.role} 
                      onChange={e => setNewUser({...newUser, role: e.target.value})} 
                      className={`px-3 py-2 border rounded-lg col-span-full font-medium text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    >
                      <option value="">Select Role *</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                      <option value="parents">Parent</option>
                      <option value="staff">Non teaching Staff</option>
                    </select>
                  </div>

                  {/* role-specific fields */}
                  {newUser.role === 'teacher' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input 
                        placeholder="Subject" 
                        value={newUser.subject} 
                        onChange={e => setNewUser({...newUser, subject: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <input 
                        placeholder="Qualification" 
                        value={newUser.qualification} 
                        onChange={e => setNewUser({...newUser, qualification: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'student' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-5">
                      <select 
                        value={newUser.className} 
                        onChange={e => setNewUser({...newUser, className: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                      >
                        <option value="">Select Class</option>
                        {scopedClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={newUser.section} 
                        onChange={e => setNewUser({...newUser, section: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                      >
                        <option value="">Select Section</option>
                        {scopedSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select 
                        value={newUser.academicYear} 
                        onChange={e => setNewUser({...newUser, academicYear: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                      >
                        <option value="">Academic Year</option>
                        {scopedYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <input 
                        placeholder="Address" 
                        value={newUser.address} 
                        onChange={e => setNewUser({...newUser, address: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <input 
                        placeholder="Parent Name" 
                        value={newUser.parentName} 
                        onChange={e => setNewUser({...newUser, parentName: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'parents' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-5">
                      <input 
                        placeholder="Address" 
                        value={newUser.address} 
                        onChange={e => setNewUser({...newUser, address: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <input 
                        placeholder="Child Name" 
                        value={newUser.childName} 
                        onChange={e => setNewUser({...newUser, childName: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <select 
                        value={newUser.childClass} 
                        onChange={e => setNewUser({...newUser, childClass: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                      >
                        <option value="">Child Class</option>
                        {scopedClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={newUser.childSection} 
                        onChange={e => setNewUser({...newUser, childSection: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                      >
                        <option value="">Child Section</option>
                        {scopedSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input 
                        placeholder="Relation" 
                        value={newUser.relationWithChild} 
                        onChange={e => setNewUser({...newUser, relationWithChild: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'staff' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input 
                        placeholder="Qualification" 
                        value={newUser.qualification} 
                        onChange={e => setNewUser({...newUser, qualification: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                      <input 
                        placeholder="Designation" 
                        value={newUser.designation} 
                        onChange={e => setNewUser({...newUser, designation: e.target.value})} 
                        className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} 
                      />
                    </div>
                  )}

                  {/* Parent-Student Linking 
                  <div className={`mt-5 border rounded-lg p-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Parent-Student Linking</h3>
                    <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4 mb-3'>
                      <input
                        type="text"
                        value={inlineLinkSearchTerm}
                        onChange={(e) => setInlineLinkSearchTerm(e.target.value)}
                        placeholder="Search student by name, number, class..."
                        className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-300' : 'border-gray-300'}`}
                      />
                      <select value={inlineLinkAcademicYearFilter} onChange={(e) => setInlineLinkAcademicYearFilter(e.target.value)} className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value=''>All Academic Years</option>
                        {scopedYearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                      <select value={inlineLinkClassFilter} onChange={(e) => setInlineLinkClassFilter(e.target.value)} className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value=''>All Classes</option>
                        {scopedClassOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                      <select value={inlineLinkSectionFilter} onChange={(e) => setInlineLinkSectionFilter(e.target.value)} className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value=''>All Sections</option>
                        {scopedSectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                      </select>
                    </div>
                    <div className='flex gap-2 flex-wrap items-center'>
                      <select value={inlineLinkStudent} onChange={(e) => setInlineLinkStudent(e.target.value)} className={`flex-1 min-w-[150px] px-2 py-1.5 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value=''>Select Student</option>
                        {filteredInlineLinkStudents.map(s => <option key={s.id} value={s.id}>{s.name} - {s.className} {s.section} ({s.academicYear || 'No Year'})</option>)}
                      </select>
                      <span className='text-gray-400'>→</span>
                      <select value={inlineLinkParent} onChange={(e) => setInlineLinkParent(e.target.value)} className={`flex-1 min-w-[150px] px-2 py-1.5 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value=''>Select Parent</option>
                        {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={() => handleLinkStudent(inlineLinkStudent, inlineLinkParent)} className='bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700'>Link</button>
                    </div>
                    <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Showing {filteredInlineLinkStudents.length} student{filteredInlineLinkStudents.length === 1 ? '' : 's'} for linking.
                    </p>
                  </div>

                  <div className="mt-4">
                    <button onClick={handleCreateUser} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Create User</button>
                  </div>   */}

                  {/* CSV Upload */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-dashed border-emerald-200">
                    <h3 className="text-sm font-bold text-emerald-800 mb-1">📁 Bulk Upload Users via CSV</h3>
                    <p className="text-xs text-gray-600 mb-2">Required fields: <b>name, number, password, role</b></p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleCsvUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="csv-file-input"
                          />
                          <button 
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 cursor-pointer"
                          >
                            📁 Choose File
                          </button>
                        </div>
                        <span className="text-xs text-gray-500">
                          {csvData.length > 0 ? `${csvData.length} file(s) selected` : "No file chosen"}
                        </span>
                        <button onClick={() => { setCsvData([]); setCsvErrors([]); }} className="px-2 py-1 bg-red-500 rounded text-xs text-white">Clear</button>
                        <button onClick={downloadSampleCSV} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">⬇️ Sample CSV</button>
                      </div>
                      
                      {csvData.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-xs font-semibold text-emerald-800">{csvData.length} rows parsed</span>
                          <button onClick={processBulkUpload} disabled={isProcessingCsv || csvErrors.length > 0} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs disabled:opacity-50">
                            {isProcessingCsv ? 'Uploading...' : 'Upload CSV'}
                          </button>
                        </div>
                      )}
                      
                      {csvErrors.length > 0 && (
                        <div className="p-2 bg-red-50 rounded">
                          <ul className="text-xs text-red-800">
                            {csvErrors.slice(0, 3).map((e, i) => <li key={i}>• {e}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Users List with Pagination */}
                <div className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>All System Users</h2>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing {paginatedUsers.length} of {filteredUsers.length} user(s)
                      </span>
                      <button
                        onClick={() => {
                          setCsvDownloadUsers(filteredUsers);
                          setCsvDownloadRole(listFilterRole);
                          setIsCsvModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow flex items-center gap-2 text-sm transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="grid gap-3 mb-4 md:grid-cols-4">
                    <input 
                      placeholder="Search by name, phone, school, board, subject…" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className={`w-full border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                    />
                    <select
                      value={listFilterRole}
                      onChange={e => {
                        setListFilterRole(e.target.value);
                        setSelectedSchoolFilter('');
                        setSelectedBoardFilters([]);
                        setSelectedAcademicYear('');
                        setSelectedClassFilter('');
                        setSelectedSectionFilter('');
                        setSelectedSubjectFilters([]);
                      }}
                      className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="all">All Roles</option>
                      <option value="teacher">Teachers</option>
                      <option value="student">Students</option>
                      <option value="parents">Parents</option>
                      <option value="staff">Non teaching Staff</option>
                    </select>

                    {listFilterRole !== "all" && listFilterRole !== "staff" && listFilterRole !== "parents" && (
                      <div className="z-10 relative">
                        <MultiSelect
                          options={boardFilterOptions}
                          selectedValues={selectedBoardFilters}
                          onChange={setSelectedBoardFilters}
                          placeholder="Select Boards"
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 mb-4 md:grid-cols-4">
                    {listFilterRole === 'student' && (
                      <>
                        <select 
                          value={selectedAcademicYear} 
                          onChange={e => setSelectedAcademicYear(e.target.value)} 
                          className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        >
                          <option value="">All Academic Years</option>
                          {scopedYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                        <select 
                          value={selectedClassFilter} 
                          onChange={e => setSelectedClassFilter(e.target.value)} 
                          className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        >
                          <option value="">All Classes</option>
                          {scopedClassOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                        <select 
                          value={selectedSectionFilter} 
                          onChange={e => setSelectedSectionFilter(e.target.value)} 
                          className={`border rounded px-4 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                        >
                          <option value="">All Sections</option>
                          {scopedSectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
                        </select>
                      </>
                    )}
                    {listFilterRole === 'teacher' && (
                      <div className="z-10 relative">
                        <MultiSelect
                          options={subjectFilterOptions}
                          selectedValues={selectedSubjectFilters}
                          onChange={setSelectedSubjectFilters}
                          placeholder="Select Subjects"
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    )}
                  </div>

                  {/* Users List */}
                  <div className="space-y-2">
                    {paginatedUsers.map(u => (
                      <div key={u.id} className={`flex justify-between items-center p-3 border rounded hover:bg-slate-50 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : ''}`}>
                        <div>
                          {(() => {
                            const resolvedBoard = resolveBoardValue(u, user?.board || '');
                            return (
                              <>
                                <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {u.name}
                                  <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-slate-100 text-slate-700'} capitalize`}>
                                    {u.role}
                                  </span>
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Phone: {u.number}</p>
                                {(u.schoolName || resolvedBoard || u.subject || u.className || u.section || u.academicYear || u.designation || u.childName) && (
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                                    {u.schoolName && `School: ${u.schoolName} `}
                                    {resolvedBoard && `| Board: ${resolvedBoard} `}
                                    {u.subject && `| Subject: ${u.subject} `}
                                    {u.className && `| Class: ${u.className} `}
                                    {(u.section || u.sec) && `| Section: ${u.section || u.sec} `}
                                    {(u.academicYear || u.admissionYear) && `| Year: ${u.academicYear || u.admissionYear} `}
                                    {u.designation && `| Designation: ${u.designation} `}
                                    {u.childName && `| Child: ${u.childName}`}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex gap-2 text-sm">
                          <button onClick={() => handleEditUser(u)} className="px-3 py-1 border border-blue-500 text-blue-600 rounded hover:bg-blue-50">Edit</button>
                          <button onClick={() => handleResetPassword(u)} className="px-3 py-1 border border-yellow-500 text-yellow-600 rounded hover:bg-yellow-50">Reset Password</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1 border border-red-500 text-red-600 rounded hover:bg-red-50">Delete</button>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className={`text-center text-sm py-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        No users found.
                      </p>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4 pt-3 border-t">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}