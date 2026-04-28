'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import AnalyticsChart from './Charts';
import DashboardCard from './DashboardCard';
import UserEditModal from './UserEditModal';
import DownloadCSVModal from './DownloadCSVModal';
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
    address: '', admissionYear: '', parentName: '',
    childName: '', childClass: '', childSection: '', relationWithChild: '',
    designation: '',
  });
  const [inlineLinkStudent, setInlineLinkStudent] = useState('');
  const [inlineLinkParent, setInlineLinkParent] = useState('');

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
    // Scroll to user list section
    setTimeout(() => {
      const element = document.getElementById('user-list-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
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
    if (!newUser.name || !newUser.number || !newUser.password || !newUser.role) {
      return showMessage?.('Please fill name, number, password, role', 'error');
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
    if (newUser.role === 'student' && newUser.admissionYear && !scopedYearOptions.includes(newUser.admissionYear)) {
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
    u.password = newUser.password;

    const updated = [...localUsers, u];
    setLocalUsers(updated); 
    saveAllUsers(updated);
    showMessage?.('User created successfully!', 'success');
    setNewUser({ 
      name:'', number:'', password:'', role:'', className:'', section:'', 
      subject:'', qualification:'', address:'', admissionYear:'', parentName:'', 
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
    setNewPassword('');
    setShowResetModal(true);
  };

  const confirmResetPassword = () => {
    if (!newPassword || newPassword.length < 4) {
      showMessage?.('Password must be at least 4 characters', 'error');
      return;
    }
    const updatedUsers = localUsers.map(u => 
      u.id === resetPasswordUser.id ? { ...u, password: newPassword } : u
    );
    setLocalUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    showMessage?.(`Password reset for ${resetPasswordUser.name}`, 'success');
    setShowResetModal(false);
    setResetPasswordUser(null);
    setNewPassword('');
  };

  /* ---------- Parent-Student link ---------- */
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
  };

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
        password: r.password || 'default123',
        role: String(r.role).toLowerCase(), 
        schoolName: myScopeSchool || r.schoolName || '',
        className: classValue, 
        section: sectionValue,
        subject: r.subject || '', 
        qualification: r.qualification || '',
        address: r.address || '', 
        admissionYear: yearValue,
        childName: r.childname || r.childName || '', 
        childClass: childClassValue,
        childSection: childSectionValue, 
        designation: r.designation || '',
      });
    });
    if (created.length !== csvData.length) {
      showMessage?.(`Some CSV rows were skipped. ${getPhoneValidationMessage()}`, 'error');
    }
    const updated = [...localUsers, ...created];
    setLocalUsers(updated); 
    saveAllUsers(updated);
    showMessage?.(`Bulk upload: ${created.length} users`, 'success');
    setCsvData([]); 
    setIsProcessingCsv(false); 
    refreshData();
  };

  const downloadSampleCSV = () => {
    const c = `name,number,password,role,className,section,subject,qualification,address,admissionYear,childName,childClass,childSection,designation
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
      {showResetModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Reset Password for {resetPasswordUser.name}
            </h3>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className={`w-full border px-3 py-2 rounded mb-4 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
            />
            <div className="flex gap-2">
              <button onClick={confirmResetPassword} className="bg-blue-600 text-white px-4 py-2 rounded">Reset</button>
              <button onClick={() => setShowResetModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

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
      <div className="flex gap-6 p-6">
        
        {/* SIDEBAR */}
        <aside className={`w-80 flex-shrink-0 rounded-2xl shadow-lg flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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

          {/* Logout Button */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto min-h-screen">
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

                {/* Filtered Users List Section */}
                <div id="user-list-section" className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {overviewRoleFilter === 'student' ? 'Students List' : 
                       overviewRoleFilter === 'teacher' ? 'Teachers List' : 
                       overviewRoleFilter === 'parents' ? 'Parents List' : 
                       overviewRoleFilter === 'staff' ? 'Non Teaching Staff List' : 'All Users'}
                    </h3>
                    <div className="flex gap-2">
                      {overviewRoleFilter !== 'all' && (
                        <button
                          onClick={() => {
                            setOverviewRoleFilter('all');
                            setOverviewPage(1);
                          }}
                          className={`px-3 py-1 text-sm rounded ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          ← Back to All
                        </button>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                        Total: {overviewFilteredUsers.length}
                      </span>
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                    <div className="flex justify-between items-center mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                        <select
                          value={usersPerPage}
                          onChange={(e) => {
                            setUsersPerPage(Number(e.target.value));
                            setOverviewPage(1);
                          }}
                          className={`px-2 py-1 border rounded text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Page {overviewPage} of {overviewTotalPages}
                        </span>
                        <button
                          onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
                          disabled={overviewPage === 1}
                          className={`px-3 py-1 border rounded text-sm transition-colors ${
                            overviewPage === 1 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setOverviewPage(prev => Math.min(overviewTotalPages, prev + 1))}
                          disabled={overviewPage === overviewTotalPages}
                          className={`px-3 py-1 border rounded text-sm transition-colors ${
                            overviewPage === overviewTotalPages 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CREATE USER TAB */}
            {activeTab === 'users' && (
              <div className="space-y-5">
                {/* Create User Form */}
                <div className={`p-5 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Create New User Account</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <select 
                      value={newUser.role} 
                      onChange={e => setNewUser({...newUser, role: e.target.value})} 
                      className={`px-3 py-2 border rounded col-span-full font-medium ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">Select Role First *</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                      <option value="parents">Parent</option>
                      <option value="staff">Non teaching Staff</option>
                    </select>
                    <input 
                      placeholder="Full Name *" 
                      value={newUser.name} 
                      onChange={e => setNewUser({...newUser, name: e.target.value})} 
                      className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                    />
                    <input 
                      placeholder="Phone Number *" 
                      value={newUser.number} 
                      onChange={e => setNewUser({...newUser, number: sanitizePhoneNumber(e.target.value)})} 
                      inputMode="numeric" 
                      maxLength={10} 
                      className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                    />
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password *" 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        className={`px-3 py-2 pr-10 border rounded w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-2.5"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* role-specific fields */}
                  {newUser.role === 'teacher' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <select 
                        value={newUser.className} 
                        onChange={e => setNewUser({...newUser, className: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Select Class</option>
                        {scopedClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={newUser.section} 
                        onChange={e => setNewUser({...newUser, section: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Select Section</option>
                        {scopedSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input 
                        placeholder="Subject" 
                        value={newUser.subject} 
                        onChange={e => setNewUser({...newUser, subject: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <input 
                        placeholder="Qualification" 
                        value={newUser.qualification} 
                        onChange={e => setNewUser({...newUser, qualification: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'student' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-5">
                      <select 
                        value={newUser.className} 
                        onChange={e => setNewUser({...newUser, className: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Select Class</option>
                        {scopedClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={newUser.section} 
                        onChange={e => setNewUser({...newUser, section: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Select Section</option>
                        {scopedSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select 
                        value={newUser.admissionYear} 
                        onChange={e => setNewUser({...newUser, admissionYear: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Academic Year</option>
                        {scopedYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <input 
                        placeholder="Address" 
                        value={newUser.address} 
                        onChange={e => setNewUser({...newUser, address: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <input 
                        placeholder="Parent Name" 
                        value={newUser.parentName} 
                        onChange={e => setNewUser({...newUser, parentName: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'parents' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-5">
                      <input 
                        placeholder="Address" 
                        value={newUser.address} 
                        onChange={e => setNewUser({...newUser, address: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <input 
                        placeholder="Child Name" 
                        value={newUser.childName} 
                        onChange={e => setNewUser({...newUser, childName: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <select 
                        value={newUser.childClass} 
                        onChange={e => setNewUser({...newUser, childClass: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Child Class</option>
                        {scopedClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={newUser.childSection} 
                        onChange={e => setNewUser({...newUser, childSection: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      >
                        <option value="">Child Section</option>
                        {scopedSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input 
                        placeholder="Relation" 
                        value={newUser.relationWithChild} 
                        onChange={e => setNewUser({...newUser, relationWithChild: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                    </div>
                  )}
                  {newUser.role === 'staff' && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input 
                        placeholder="Qualification" 
                        value={newUser.qualification} 
                        onChange={e => setNewUser({...newUser, qualification: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                      <input 
                        placeholder="Designation" 
                        value={newUser.designation} 
                        onChange={e => setNewUser({...newUser, designation: e.target.value})} 
                        className={`px-3 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`} 
                      />
                    </div>
                  )}

                  {/* ADD + REMOVE chips */}
                  <div className="mt-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Classes</label>
                        {!assignedClasses.length && <button onClick={() => setShowAddClass(true)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">+ Add Class</button>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scopedClassOptions.map(c => (
                          <span key={c} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs ${isDarkMode ? 'bg-blue-900 border-blue-700 text-white' : ''}`}>
                            {c} {!assignedClasses.length && <button onClick={() => askDelete("class", c)} className="text-red-600 hover:text-red-800 font-bold ml-1">×</button>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Sections</label>
                        {!assignedSections.length && <button onClick={() => setShowAddSection(true)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">+ Add Section</button>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scopedSectionOptions.map(s => (
                          <span key={s} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs ${isDarkMode ? 'bg-green-900 border-green-700 text-white' : ''}`}>
                            {s} {!assignedSections.length && <button onClick={() => askDelete("section", s)} className="text-red-600 hover:text-red-800 font-bold ml-1">×</button>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Academic Years</label>
                        {!assignedYears.length && <button onClick={() => setShowAddYear(true)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">+ Add Year</button>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scopedYearOptions.map(y => (
                          <span key={y} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs ${isDarkMode ? 'bg-purple-900 border-purple-700 text-white' : ''}`}>
                            {y} {!assignedYears.length && <button onClick={() => askDelete("year", y)} className="text-red-600 hover:text-red-800 font-bold ml-1">×</button>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Parent-Student Linking */}
                  <div className={`mt-5 border rounded-lg p-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Parent-Student Linking</h3>
                    <div className="flex gap-2 flex-wrap items-center">
                      <select 
                        value={inlineLinkStudent} 
                        onChange={e => setInlineLinkStudent(e.target.value)} 
                        className={`flex-1 min-w-[180px] px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-slate-300'}`}
                      >
                        <option value="">Select Student</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.className} {s.section} - {s.schoolName}</option>)}
                      </select>
                      <span>↔</span>
                      <select 
                        value={inlineLinkParent} 
                        onChange={e => setInlineLinkParent(e.target.value)} 
                        className={`flex-1 min-w-[180px] px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-slate-300'}`}
                      >
                        <option value="">Select Parent</option>
                        {parents.map(p => <option key={p.id} value={p.id}>{p.name} - {p.schoolName}</option>)}
                      </select>
                      <button 
                        onClick={() => handleLinkStudent(inlineLinkStudent, inlineLinkParent)} 
                        className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700"
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 items-center">
                    <button onClick={handleCreateUser} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Create User</button>
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="text-sm" />
                    <button onClick={downloadSampleCSV} className="px-4 py-2 bg-emerald-500 text-white rounded text-sm">⬇️ Sample CSV</button>
                    {csvData.length > 0 && 
                      <button onClick={processBulkUpload} disabled={isProcessingCsv} className="px-4 py-2 bg-emerald-600 text-white rounded">
                        {isProcessingCsv ? "Uploading…" : `Import ${csvData.length} rows`}
                      </button>
                    }
                  </div>
                  {csvErrors.length > 0 && 
                    <div className="mt-3 text-red-700 text-xs">
                      {csvErrors.map((e,i) => <p key={i}>• {e}</p>)}
                    </div>
                  }
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
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                    <div className="flex justify-between items-center mt-6 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
                        <select
                          value={usersPerPage}
                          onChange={(e) => {
                            setUsersPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className={`px-2 py-1 border rounded text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 border rounded text-sm transition-colors ${
                            currentPage === 1 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 border rounded text-sm transition-colors ${
                            currentPage === totalPages 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
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