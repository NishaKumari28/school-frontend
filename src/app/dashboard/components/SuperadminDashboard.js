'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Papa from 'papaparse';
import AnalyticsChart from "./Charts";
import DashboardCard from "./DashboardCard";
import UserEditModal from "./UserEditModal";
import { getUserList, setUserList, sanitizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from '../../components/auth/authService';
import PasswordResetModal from "./PasswordResetModal";
import DownloadCSVModal from "./DownloadCSVModal";
import MultiSelect from "./MultiSelect";

// Local storage keys
const STORAGE_KEYS = {
  USERS: 'school_users',
  THEME: 'app_theme',
  PROFILE_PIC: 'profile_picture',
  CLASSES: 'school_classes',
  SECTIONS: 'school_sections',
  ACADEMIC_YEARS: 'academic_years',
  BOARDS: 'school_boards',
  SCHOOL_TYPES: 'school_types'
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

const loadUserData = () => {
  if (typeof window === 'undefined') return [];
  const legacyUsers = getLocalData(STORAGE_KEYS.USERS);
  const authUsers = getUserList();
  const mergedUsers = [...authUsers, ...legacyUsers];
  const uniqueUsers = [];
  const seen = new Set();

  mergedUsers.forEach((user) => {
    if (!user) return;
    const key = [user.id, user.number, user.role].join("::");
    if (!seen.has(key)) {
      seen.add(key);
      uniqueUsers.push(user);
    }
  });
  return sortLatestFirst(uniqueUsers);
};

const saveUserData = (users) => {
  if (typeof window === 'undefined') return;
  const orderedUsers = sortLatestFirst(users);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(orderedUsers));
  setUserList(orderedUsers);
};

// Generate default classes in proper order: Nursery, LKG, UKG, then 1-12
const generateDefaultClasses = () => {
  const classes = ["Nursery", "LKG", "UKG"];
  for (let i = 1; i <= 12; i++) {
    classes.push(i.toString());
  }
  return classes;
};

// Generate default sections A to F
const generateDefaultSections = () => {
  return ["A", "B", "C", "D", "E", "F"];
};

// Generate academic years from 2026-27 to 2050-51
const generateDefaultAcademicYears = () => {
  const years = [];
  for (let i = 2026; i <= 2050; i++) {
    years.push(`${i}-${(i+1).toString().slice(-2)}`);
  }
  return years;
};

// Generate default boards
const generateDefaultBoards = () => {
  return ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"];
};

const generateDefaultSchoolTypes = () => {
  return ["Govt", "Private"];
};

const getLatestTimestamp = (item) => {
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

const sortLatestFirst = (items = []) => [...items].sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a));

const parseMultiValueField = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getUniqueFilterOptions = (users, field) => {
  const values = new Set();

  users.forEach((user) => {
    parseMultiValueField(user?.[field]).forEach((item) => values.add(item));
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

const matchesFilterValue = (value, selectedValue) => {
  if (!selectedValue) return true;
  return parseMultiValueField(value).includes(selectedValue);
};

const resolveBoardValue = (user, adminUsers, fallbackBoard = "") => {
  if (user?.board) return user.board;
  if (user?.schoolName) {
    const matchedAdmin = adminUsers.find((admin) => admin.role === "admin" && admin.schoolName === user.schoolName && admin.board);
    if (matchedAdmin?.board) return matchedAdmin.board;
  }
  return fallbackBoard;
};

const DEFAULT_CLASSES = generateDefaultClasses();
const DEFAULT_SECTIONS = generateDefaultSections();
const DEFAULT_ACADEMIC_YEARS = generateDefaultAcademicYears();
const DEFAULT_BOARDS = generateDefaultBoards();
const DEFAULT_SCHOOL_TYPES = generateDefaultSchoolTypes();

export default function SuperadminDashboard({ user: currentUser, allUsers: propUsers, showMessage, loadData }) {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [filterRole, setFilterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [listFilterRole, setListFilterRole] = useState("all");
  const [selectedAdminFilter, setSelectedAdminFilter] = useState("all");
  const [overviewSearchTerm, setOverviewSearchTerm] = useState("");
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  
  // User Management Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2026-27");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState("");
  const [selectedBoardFilter, setSelectedBoardFilter] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("");
  
  // New multi-select states
  const [selectedBoardFilters, setSelectedBoardFilters] = useState([]);
  const [selectedSubjectFilters, setSelectedSubjectFilters] = useState([]);
  
  // CSV Download Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvDownloadUsers, setCsvDownloadUsers] = useState([]);
  const [csvDownloadRole, setCsvDownloadRole] = useState("all");
  const [selectedAdminBoardFilter, setSelectedAdminBoardFilter] = useState("");
  
  // Dynamic data management
  const [availableClasses, setAvailableClasses] = useState(DEFAULT_CLASSES);
  const [availableSections, setAvailableSections] = useState(DEFAULT_SECTIONS);
  const [availableAcademicYears, setAvailableAcademicYears] = useState(DEFAULT_ACADEMIC_YEARS);
  const [availableBoards, setAvailableBoards] = useState(DEFAULT_BOARDS);
  const [availableSchoolTypes, setAvailableSchoolTypes] = useState(DEFAULT_SCHOOL_TYPES);
  
  // Multi-select modal states
  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [multiSelectType, setMultiSelectType] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [defaultItemsList, setDefaultItemsList] = useState([]);
  
  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemType, setAddItemType] = useState("");
  const [newItemInput, setNewItemInput] = useState("");

  // Admin CSV Bulk Upload States
  const [adminCsvData, setAdminCsvData] = useState([]);
  const [adminCsvErrors, setAdminCsvErrors] = useState([]);
  const [isProcessingAdminCsv, setIsProcessingAdminCsv] = useState(false);
  const [showAdminCsvModal, setShowAdminCsvModal] = useState(false);
  
  // Local state for all data
  const [allUsers, setAllUsers] = useState([]);
  // Pagination states - YEH ADD KARO
const [adminPage, setAdminPage] = useState(1);
const [userPage, setUserPage] = useState(1);
const ADMIN_PER_PAGE = 50;
const USER_PER_PAGE = 50;
  // CSV States
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [newUser, setNewUser] = useState({
    name: "", number: "", password: "", role: "",
    schoolName: "", schoolArea: "", board: "", schoolType: "",
    subject: "", qualification: "",
    address: "", childName: "", childClass: "", childSection: "", relationWithChild: "",
    designation: "",
    className: "", section: "", academicYear: "2026-27", parentName: ""
  });
  
  const [editingAdminId, setEditingAdminId] = useState(null);

  // Admin Edit Modal states (Create Admin tab ke liye - separate from user edit)
const [showAdminEditModal, setShowAdminEditModal] = useState(false);
const [editingAdminData, setEditingAdminData] = useState(null);

  // passward state variable
const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [inlineLinkStudent, setInlineLinkStudent] = useState('');
  const [inlineLinkParent, setInlineLinkParent] = useState('');
  const [inlineLinkSearchTerm, setInlineLinkSearchTerm] = useState('');
  const [inlineLinkAcademicYearFilter, setInlineLinkAcademicYearFilter] = useState('');
  const [inlineLinkClassFilter, setInlineLinkClassFilter] = useState('');
  const [inlineLinkSectionFilter, setInlineLinkSectionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // School name dropdown state for user management
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const schoolDropdownRef = useRef(null);

  // New state for the detail list page
  const [detailListRole, setDetailListRole] = useState(null);
  const [detailListFilter, setDetailListFilter] = useState("");
  const [detailListPage, setDetailListPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // New state for admin creation wizard - added boards
  const [selectedAdminClasses, setSelectedAdminClasses] = useState([]);
  const [selectedAdminSections, setSelectedAdminSections] = useState([]);
  const [selectedAdminAcademicYears, setSelectedAdminAcademicYears] = useState([]);
  const [selectedAdminBoards, setSelectedAdminBoards] = useState([]);
  const [showClassSelectorModal, setShowClassSelectorModal] = useState(false);
  const [showSectionSelectorModal, setShowSectionSelectorModal] = useState(false);
  const [showYearSelectorModal, setShowYearSelectorModal] = useState(false);
  const [showBoardSelectorModal, setShowBoardSelectorModal] = useState(false);
  const [tempSelectedClasses, setTempSelectedClasses] = useState([]);
  const [tempSelectedSections, setTempSelectedSections] = useState([]);
  const [tempSelectedYears, setTempSelectedYears] = useState([]);
  const [tempSelectedBoards, setTempSelectedBoards] = useState([]);

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
    initializeData();
    loadDynamicData();
  }, []);

  // Reset admin page when filters change
useEffect(() => {
  setAdminPage(1);
}, [adminSearchTerm, selectedAdminBoardFilter]);

// Reset user page when filters change
useEffect(() => {
  setUserPage(1);
}, [searchTerm, listFilterRole, selectedAcademicYear, selectedClassFilter, selectedSectionFilter, selectedSchoolFilter, selectedBoardFilter, selectedSubjectFilter]);

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

  const loadDynamicData = () => {
    const savedClasses = getLocalData(STORAGE_KEYS.CLASSES);
    const savedSections = getLocalData(STORAGE_KEYS.SECTIONS);
    const savedYears = getLocalData(STORAGE_KEYS.ACADEMIC_YEARS);
    const savedBoards = getLocalData(STORAGE_KEYS.BOARDS);
    const savedSchoolTypes = getLocalData(STORAGE_KEYS.SCHOOL_TYPES);
    
    if (savedClasses.length > 0) setAvailableClasses(savedClasses);
    if (savedSections.length > 0) setAvailableSections(savedSections);
    if (savedYears.length > 0) setAvailableAcademicYears(savedYears);
    if (savedBoards.length > 0) setAvailableBoards(savedBoards);
    if (savedSchoolTypes.length > 0) setAvailableSchoolTypes(savedSchoolTypes);
  };

  const saveDynamicData = () => {
    saveLocalData(STORAGE_KEYS.CLASSES, availableClasses);
    saveLocalData(STORAGE_KEYS.SECTIONS, availableSections);
    saveLocalData(STORAGE_KEYS.ACADEMIC_YEARS, availableAcademicYears);
    saveLocalData(STORAGE_KEYS.BOARDS, availableBoards);
    saveLocalData(STORAGE_KEYS.SCHOOL_TYPES, availableSchoolTypes);
  };

  // Open multi-select modal
  const openMultiSelectModal = (type) => {
    setMultiSelectType(type);
    if (type === "class") {
      setDefaultItemsList([...DEFAULT_CLASSES]);
      setSelectedItems([]);
    } else if (type === "section") {
      setDefaultItemsList([...DEFAULT_SECTIONS]);
      setSelectedItems([]);
    } else if (type === "year") {
      setDefaultItemsList([...DEFAULT_ACADEMIC_YEARS]);
      setSelectedItems([]);
    } else if (type === "board") {
      setDefaultItemsList([...DEFAULT_BOARDS]);
      setSelectedItems([]);
    } else if (type === "schooltype") {  
      setDefaultItemsList([...DEFAULT_SCHOOL_TYPES]);
      setSelectedItems([]);
    }
    setShowMultiSelectModal(true);
  };

  const handleItemToggle = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === defaultItemsList.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...defaultItemsList]);
    }
  };

  const addSelectedItems = () => {
    if (selectedItems.length === 0) {
      showMessage("Please select at least one item to add", "error");
      return;
    }
    
    if (multiSelectType === "class") {
      const newClasses = selectedItems.filter(item => !availableClasses.includes(item));
      if (newClasses.length > 0) {
        const sortedNewClasses = [...newClasses].sort((a, b) => {
          const order = { "Nursery": 1, "LKG": 2, "UKG": 3 };
          const aOrder = order[a] || (isNaN(a) ? 999 : parseInt(a) + 10);
          const bOrder = order[b] || (isNaN(b) ? 999 : parseInt(b) + 10);
          return aOrder - bOrder;
        });
        setAvailableClasses([...availableClasses, ...sortedNewClasses]);
        showMessage(`${newClasses.length} class(es) added successfully!`, "success");
      } else {
        showMessage("Selected classes already exist!", "error");
      }
    } else if (multiSelectType === "section") {
      const newSections = selectedItems.filter(item => !availableSections.includes(item));
      if (newSections.length > 0) {
        setAvailableSections([...availableSections, ...newSections].sort());
        showMessage(`${newSections.length} section(s) added successfully!`, "success");
      } else {
        showMessage("Selected sections already exist!", "error");
      }
    } else if (multiSelectType === "year") {
      const newYears = selectedItems.filter(item => !availableAcademicYears.includes(item));
      if (newYears.length > 0) {
        setAvailableAcademicYears([...availableAcademicYears, ...newYears].sort());
        showMessage(`${newYears.length} academic year(s) added successfully!`, "success");
      } else {
        showMessage("Selected academic years already exist!", "error");
      }
    } else if (multiSelectType === "board") {
      const newBoards = selectedItems.filter(item => !availableBoards.includes(item));
      if (newBoards.length > 0) {
        setAvailableBoards([...availableBoards, ...newBoards].sort());
        showMessage(`${newBoards.length} board(s) added successfully!`, "success");
      } else {
        showMessage("Selected boards already exist!", "error");
      }
    } else if (multiSelectType === "schooltype") {
      const newTypes = selectedItems.filter(item => !availableSchoolTypes.includes(item));
      if (newTypes.length > 0) {
        setAvailableSchoolTypes([...availableSchoolTypes, ...newTypes].sort());
        showMessage(`${newTypes.length} school type(s) added successfully!`, "success");
      } else {
        showMessage("Selected school types already exist!", "error");
      }
    }
    saveDynamicData();
    setShowMultiSelectModal(false);
    setSelectedItems([]);
  };

  const handleAddMore = () => {
    setShowMultiSelectModal(false);
    setTimeout(() => {
      openMultiSelectModal(multiSelectType);
    }, 100);
  };

  const initializeData = () => {
    setIsLoading(true);
    let users = loadUserData();
    if (users.length === 0) {
      users = [];
      saveUserData(users);
    }
    setAllUsers(users);
    setIsLoading(false);
  };

  const refreshData = () => {
    setAllUsers(loadUserData());
    if (loadData) loadData();
  };

  // Filter users by selected admin
  const filteredByAdminUsers = useMemo(() => {
    if (selectedAdminFilter === "all") return allUsers;
    return allUsers.filter(u => u.schoolName === selectedAdminFilter);
  }, [allUsers, selectedAdminFilter]);

  const admins = useMemo(() => allUsers.filter((u) => u.role === "admin"), [allUsers]);
  const students = useMemo(() => filteredByAdminUsers.filter((u) => u.role === "student"), [filteredByAdminUsers]);
  const teachers = useMemo(() => filteredByAdminUsers.filter((u) => u.role === "teacher"), [filteredByAdminUsers]);
  const parents = useMemo(() => filteredByAdminUsers.filter((u) => u.role === "parents"), [filteredByAdminUsers]);
  const staff = useMemo(() => filteredByAdminUsers.filter((u) => u.role === "staff"), [filteredByAdminUsers]);
  const filteredInlineLinkStudents = useMemo(() => {
    const search = inlineLinkSearchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const classMatch = !inlineLinkClassFilter || student.className === inlineLinkClassFilter;
      const sectionMatch = !inlineLinkSectionFilter || student.section === inlineLinkSectionFilter;
      const yearMatch = !inlineLinkAcademicYearFilter || student.academicYear === inlineLinkAcademicYearFilter;
      const searchMatch = !search || [
        student.name,
        student.number,
        student.className,
        student.section,
        student.academicYear
      ].some((value) => String(value ?? '').toLowerCase().includes(search));

      return classMatch && sectionMatch && yearMatch && searchMatch;
    });
  }, [students, inlineLinkSearchTerm, inlineLinkClassFilter, inlineLinkSectionFilter, inlineLinkAcademicYearFilter]);
  const nonSuperadminUsers = useMemo(() => allUsers.filter((u) => u.role !== "superadmin"), [allUsers]);
  const userFilterBase = useMemo(() => {
    if (listFilterRole === "all") return nonSuperadminUsers;
    return nonSuperadminUsers.filter((u) => u.role === listFilterRole);
  }, [nonSuperadminUsers, listFilterRole]);
  const enrichedUserFilterBase = useMemo(() => userFilterBase.map((user) => ({
    ...user,
    resolvedBoard: resolveBoardValue(user, admins)
  })), [userFilterBase, admins]);
  const schoolFilterOptions = useMemo(() => getUniqueFilterOptions(userFilterBase, "schoolName"), [userFilterBase]);
  const boardFilterOptions = useMemo(() => getUniqueFilterOptions(enrichedUserFilterBase, "resolvedBoard"), [enrichedUserFilterBase]);
  const subjectFilterOptions = useMemo(() => getUniqueFilterOptions(userFilterBase, "subject"), [userFilterBase]);
  const adminSchoolOptions = useMemo(() => getUniqueFilterOptions(admins, "schoolName"), [admins]);
  const adminBoardOptions = useMemo(() => getUniqueFilterOptions(admins, "board"), [admins]);

  // Filter admins for overview search
  const filteredOverviewAdmins = useMemo(() => {
    if (!overviewSearchTerm) return admins;
    const term = overviewSearchTerm.toLowerCase();
    return admins.filter(admin => 
      admin.name?.toLowerCase().includes(term) ||
      admin.schoolName?.toLowerCase().includes(term) ||
      admin.number?.includes(term)
    );
  }, [admins, overviewSearchTerm]);

  // Filter all users based on overview search (show only selected admin's data)
  const filteredOverviewUsers = useMemo(() => {
    if (!overviewSearchTerm) return allUsers;
    // Find admin(s) matching search
    const matchingAdmins = filteredOverviewAdmins.map(admin => admin.schoolName);
    if (matchingAdmins.length === 0) return [];
    // Return users from matching schools
    return allUsers.filter(user => matchingAdmins.includes(user.schoolName));
  }, [allUsers, filteredOverviewAdmins, overviewSearchTerm]);

  // Filter admins for admin management
  const filteredAdmins = useMemo(() => {
    let list = admins;

    if (selectedAdminFilter !== "all") {
      list = list.filter((admin) => admin.schoolName === selectedAdminFilter);
    }

    if (selectedAdminBoardFilter) {
      list = list.filter((admin) => matchesFilterValue(admin.board, selectedAdminBoardFilter));
    }

    if (adminSearchTerm) {
      const term = adminSearchTerm.toLowerCase();
      list = list.filter((admin) =>
        admin.name.toLowerCase().includes(term) ||
        admin.schoolName?.toLowerCase().includes(term) ||
        admin.number?.includes(term) ||
        admin.board?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [admins, adminSearchTerm, selectedAdminBoardFilter, selectedAdminFilter]);

  const navButtons = [
    { label: "Overview", tab: "overview", filter: "all" },
    { label: "Create Admin", tab: "admin-management", filter: "all" },
    { label: "User Management", tab: "users", filter: "all" }
  ];

  // Reset form for new admin
  const resetAdminForm = () => {
    setNewUser({
      name: "", number: "", password: "", role: "admin",
      schoolName: "", schoolArea: "", board: "", schoolType: "",
      className: "", section: "", academicYear: ""
    });
    setEditingAdminId(null);
    setShowPassword(false);
    setSelectedAdminClasses([]);
    setSelectedAdminSections([]);
    setSelectedAdminAcademicYears([]);
    setSelectedAdminBoards([]);
  };

  // Open selector modals for admin creation
  const openClassSelector = () => {
    setTempSelectedClasses([...selectedAdminClasses]);
    setShowClassSelectorModal(true);
  };

  const openSectionSelector = () => {
    setTempSelectedSections([...selectedAdminSections]);
    setShowSectionSelectorModal(true);
  };

  const openYearSelector = () => {
    setTempSelectedYears([...selectedAdminAcademicYears]);
    setShowYearSelectorModal(true);
  };

  const openBoardSelector = () => {
    setTempSelectedBoards([...selectedAdminBoards]);
    setShowBoardSelectorModal(true);
  };

  const confirmClassSelection = () => {
    setSelectedAdminClasses([...tempSelectedClasses]);
    setShowClassSelectorModal(false);
    if (tempSelectedClasses.length > 0) {
      setNewUser(prev => ({ ...prev, className: tempSelectedClasses.join(", ") }));
    } else {
      setNewUser(prev => ({ ...prev, className: "" }));
    }
  };

  const confirmSectionSelection = () => {
    setSelectedAdminSections([...tempSelectedSections]);
    setShowSectionSelectorModal(false);
    if (tempSelectedSections.length > 0) {
      setNewUser(prev => ({ ...prev, section: tempSelectedSections.join(", ") }));
    } else {
      setNewUser(prev => ({ ...prev, section: "" }));
    }
  };

  const confirmYearSelection = () => {
    setSelectedAdminAcademicYears([...tempSelectedYears]);
    setShowYearSelectorModal(false);
    if (tempSelectedYears.length > 0) {
      setNewUser(prev => ({ ...prev, academicYear: tempSelectedYears.join(", ") }));
    } else {
      setNewUser(prev => ({ ...prev, academicYear: "" }));
    }
  };

  const confirmBoardSelection = () => {
    setSelectedAdminBoards([...tempSelectedBoards]);
    setShowBoardSelectorModal(false);
    if (tempSelectedBoards.length > 0) {
      setNewUser(prev => ({ ...prev, board: tempSelectedBoards.join(", ") }));
    } else {
      setNewUser(prev => ({ ...prev, board: "" }));
    }
  };

  // Admin Management Functions
  const handleCreateAdmin = () => {
    if (!newUser.name || !newUser.number || !newUser.schoolName) {
      showMessage("Please fill all fields", "error");
      return;
    }
    const normalizedNumber = sanitizePhoneNumber(newUser.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      showMessage(getPhoneValidationMessage(), "error");
      return;
    }
    
    if (selectedAdminClasses.length === 0 || selectedAdminSections.length === 0 || selectedAdminAcademicYears.length === 0 || selectedAdminBoards.length === 0) {
      showMessage("Please select at least one Class, Section, Academic Year, and Board for the admin", "error");
      return;
    }
    
    const newAdmin = {
      id: generateId(),
      name: newUser.name,
      number: newUser.number,
      password: newUser.password && String(newUser.password).trim() !== '' ? newUser.password : `VSMS@${String(newUser.number).slice(-4)}`,
      role: "admin",
      schoolName: newUser.schoolName,
      schoolArea: newUser.schoolArea || "",
      board: selectedAdminBoards.join(", "),
      schoolType: newUser.schoolType || "",
      className: selectedAdminClasses.join(", "),
      section: selectedAdminSections.join(", "),
      academicYear: selectedAdminAcademicYears.join(", ")
    };
    
    const updatedUsers = [newAdmin, ...allUsers];
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("Admin account created successfully!");
    resetAdminForm();
    refreshData();
  };

  // const handleEditAdmin = (admin) => {
  //   setEditingAdminId(admin.id);
  //   setNewUser({
  //     name: admin.name || "",
  //     number: admin.number || "",
  //     password: "",
  //     role: "admin",
  //     schoolName: admin.schoolName || "",
  //     schoolArea: admin.schoolArea || "",
  //     board: admin.board || "",
  //     schoolType: admin.schoolType || "",
  //     className: admin.className || "",
  //     section: admin.section || "",
  //     academicYear: admin.academicYear || ""
  //   });
  //   setSelectedAdminClasses(admin.className ? admin.className.split(", ") : []);
  //   setSelectedAdminSections(admin.section ? admin.section.split(", ") : []);
  //   setSelectedAdminAcademicYears(admin.academicYear ? admin.academicYear.split(", ") : []);
  //   setSelectedAdminBoards(admin.board ? admin.board.split(", ") : []);
  //   setShowPassword(false);
  // };


  const handleEditAdmin = (admin) => {
  // Create Admin tab ke liye - popup open karega
  setEditingAdminData(admin);
  setShowAdminEditModal(true);
};

  const handleUpdateAdmin = () => {
    if (!editingAdminId) {
      showMessage("No admin selected for update", "error");
      return;
    }
    if (!newUser.name || !newUser.number || !newUser.schoolName) {
      showMessage("Please fill all fields", "error");
      return;
    }
    const normalizedNumber = sanitizePhoneNumber(newUser.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      showMessage(getPhoneValidationMessage(), "error");
      return;
    }
    
    if (selectedAdminClasses.length === 0 || selectedAdminAcademicYears.length === 0 || selectedAdminBoards.length === 0) {
      showMessage("Please select at least one Class, Academic Year, and Board for the admin", "error");
      return;
    }
    
    const updatedUsers = allUsers.map(u => 
      u.id === editingAdminId ? { 
        ...u, 
        name: newUser.name, 
        number: normalizedNumber, 
        password: newUser.password || u.password, 
        schoolName: newUser.schoolName, 
        schoolArea: newUser.schoolArea, 
        board: selectedAdminBoards.join(", "),
        schoolType: newUser.schoolType,
        className: selectedAdminClasses.join(", "),
       // section: selectedAdminSections.join(", "),
        academicYear: selectedAdminAcademicYears.join(", ")
      } : u
    );
    
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("Admin account updated successfully!");
    resetAdminForm();
    refreshData();
  };


  // Save Admin Edit from Modal (Create Admin tab ke liye)
const handleSaveAdminEdit = (updatedAdmin) => {
  const normalizedNumber = sanitizePhoneNumber(updatedAdmin.number);
  if (!isValidPhoneNumber(normalizedNumber)) {
    showMessage(getPhoneValidationMessage(), 'error');
    return;
  }
  const updatedUsers = allUsers.map(u => 
    u.id === updatedAdmin.id ? { ...u, ...updatedAdmin, number: normalizedNumber } : u
  );
  
  setAllUsers(updatedUsers);
  saveUserData(updatedUsers);
  showMessage(`Admin "${updatedAdmin.name}" updated successfully!`, 'success');
  setShowAdminEditModal(false);
  setEditingAdminData(null);
  refreshData();
};

  const handleDeleteAdmin = (adminId) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this admin?")) return;
    
    const updatedUsers = allUsers.filter(u => u.id !== adminId);
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("Admin account deleted successfully");
    refreshData();
  };

  // Password Reset Handler Function
const handleResetPassword = (user) => {
  setPasswordResetUser(user);
  setShowPasswordResetModal(true);
};

const confirmPasswordReset = () => {
  if (!passwordResetUser) return;
  
  const originalUser = allUsers.find(u => u.id === passwordResetUser.id);
  
  if (originalUser) {
    const last4 = String(originalUser.number).slice(-4);
    const newPassword = `VSMS@${last4}`;
    
    const updatedUsers = allUsers.map(u => 
      u.id === passwordResetUser.id 
        ? { ...u, password: newPassword }
        : u
    );
    
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    showMessage(`Password reset successful for ${passwordResetUser.name}!`, "success");
    refreshData();
  } else {
    showMessage("Unable to reset password", "error");
  }
  
  setShowPasswordResetModal(false);
  setPasswordResetUser(null);
};

  // User Management Functions - with new users first
  const handleCreateUser = () => {
    if (!newUser.name || !newUser.number || !newUser.role) {
      showMessage("Please fill all fields", "error");
      return;
    }
    const normalizedNumber = sanitizePhoneNumber(newUser.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      showMessage(getPhoneValidationMessage(), "error");
      return;
    }

    const resolvedSchoolName = newUser.schoolName || (selectedAdminFilter !== "all" ? selectedAdminFilter : "");
    const mappedAdmin = admins.find((admin) => admin.schoolName === resolvedSchoolName);
    
    const userData = {
      id: generateId(),
      name: newUser.name,
      number: normalizedNumber,
      password: newUser.password && String(newUser.password).trim() !== '' ? newUser.password : `VSMS@${String(normalizedNumber).slice(-4)}`,
      role: newUser.role,
      schoolName: resolvedSchoolName,
      board: mappedAdmin?.board || "",
    };
    
    if (newUser.role === "teacher") {
      userData.subject = newUser.subject;
      userData.qualification = newUser.qualification;
    } else if (newUser.role === "student") {
      userData.className = newUser.className;
      userData.section = newUser.section;
      userData.academicYear = newUser.academicYear || selectedAcademicYear;
      userData.address = newUser.address;
      userData.parentName = newUser.parentName;
    } else if (newUser.role === "parents") {
      userData.address = newUser.address;
      userData.childName = newUser.childName;
      userData.childClass = newUser.childClass;
      userData.childSection = newUser.childSection;
      userData.relationWithChild = newUser.relationWithChild;
    } else if (newUser.role === "staff") {
      userData.qualification = newUser.qualification;
      userData.designation = newUser.designation;
    }
    
    const updatedUsers = [userData, ...allUsers];
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("User created successfully!");
    setNewUser({ name: "", number: "", password: "", role: "", schoolName: "", academicYear: "2026-27" });
    refreshData();
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    if (!newUser.name || !newUser.number || !newUser.role) {
      showMessage("Please fill all fields", "error");
      return;
    }
    const normalizedNumber = sanitizePhoneNumber(newUser.number);
    if (!isValidPhoneNumber(normalizedNumber)) {
      showMessage(getPhoneValidationMessage(), "error");
      return;
    }
    
    const updatedUsers = allUsers.map(u => 
      u.id === editingUser.id ? { ...u, ...newUser, number: normalizedNumber, password: newUser.password || u.password } : u
    );
    
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("User updated successfully!");
    setEditingUser(null);
    setNewUser({ name: "", number: "", password: "", role: "", schoolName: "" });
    setIsEditModalOpen(false);
    refreshData();
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser(userToEdit);
    setNewUser({ ...userToEdit, password: "" });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to remove this user?")) return;
    
    const updatedUsers = allUsers.filter(u => u.id !== userId);
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage("User removed successfully");
    refreshData();
  };

  const handleLinkStudent = (studId, parId) => {
    if (!studId || !parId) {
      showMessage('Please select both student and parent', 'error');
      return;
    }
    
    const updatedUsers = allUsers.map(u => {
      if (u.id === parseInt(studId) && u.role === 'student') {
        return { ...u, parentId: parseInt(parId) };
      }
      if (u.id === parseInt(parId) && u.role === 'parents') {
        const student = allUsers.find(s => s.id === parseInt(studId));
        return { ...u, childName: student?.name, childClass: student?.className, childSection: student?.section };
      }
      return u;
    });
    
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage('Student linked to parent successfully!');
    refreshData();
    setInlineLinkStudent('');
    setInlineLinkParent('');
    setInlineLinkSearchTerm('');
    setInlineLinkAcademicYearFilter('');
    setInlineLinkClassFilter('');
    setInlineLinkSectionFilter('');
  };

  // CSV Bulk Upload
  const handleCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filteredData = results.data.filter(row => {
          const values = Object.values(row);
          return values.some(val => val && String(val).trim().length > 0);
        });
        
        if (filteredData.length === 0) {
          setCsvErrors(['No valid data found in CSV']);
          setCsvData([]);
          return;
        }
        
        const errors = [];
        filteredData.forEach((row, idx) => {
          if (!row.name || !row.number || !row.role) {
            errors.push(`Row ${idx + 1}: Missing required fields (name, number, role)`);
          }
        });
        
        setCsvErrors(errors);
        setCsvData(filteredData);
      },
      error: () => {
        showMessage('Invalid CSV file', 'error');
        setCsvErrors(['Invalid CSV format']);
      }
    });
  };

  const processBulkUpload = () => {
    if (csvData.length === 0) {
      showMessage("No data to upload", "error");
      return;
    }
    if (csvErrors.length > 0) {
      showMessage(`Please fix ${csvErrors.length} errors first`, "error");
      return;
    }
    
    setIsProcessingCsv(true);
    
    const newUsers = csvData.reduce((acc, row) => {
      const normalizedNumber = sanitizePhoneNumber(row.number);
      if (!isValidPhoneNumber(normalizedNumber)) {
        return acc;
      }
      const resolvedSchoolName = row.schoolName || (selectedAdminFilter !== "all" ? selectedAdminFilter : "");
      const mappedAdmin = admins.find((admin) => admin.schoolName === resolvedSchoolName);

      acc.push({
        id: generateId(),
        name: row.name,
        number: normalizedNumber,
        password: row.password && String(row.password).trim() !== '' ? String(row.password).trim() : `VSMS@${String(normalizedNumber).slice(-4)}`,
        role: row.role.toLowerCase(),
        schoolName: resolvedSchoolName,
        board: row.board || mappedAdmin?.board || "",
        className: row.className || row.classname || "",
        section: row.section || row.sec || "",
        subject: row.subject || "",
        qualification: row.qualification || "",
        address: row.address || "",
        childName: row.childName || row.childname || "",
        childClass: row.childClass || row.childclass || "",
        childSection: row.childSection || row.childsection || "",
        designation: row.designation || "",
        academicYear: row.academicYear || selectedAcademicYear
      });
      return acc;
    }, []);

    if (newUsers.length !== csvData.length) {
      showMessage(`Some rows skipped due to invalid phone numbers. ${getPhoneValidationMessage()}`, 'error');
    }
    
    const updatedUsers = [...newUsers, ...allUsers];
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage(`Bulk upload complete: ${newUsers.length} users created`, 'success');
    setCsvData([]);
    setCsvErrors([]);
    setIsProcessingCsv(false);
    refreshData();
  };

  const downloadSampleCSV = () => {
    const csvContent = `name,number,password,role,schoolName,className,section,subject,qualification,address,childName,childClass,childSection,designation,academicYear
John Doe,9876543210,123456,student,City School,10,A,,,123 Main St,,,,,2026-27
Jane Smith,9876543211,123456,teacher,City School,,,Math,B.Ed,,,,,,2026-27
Robert Parent,9876543212,123456,parents,City School,,,,,456 Oak Ave,Mike Student,10,A,,2026-27
Lisa Staff,9876543213,123456,staff,City School,,,,,Graduate,,,,,Librarian,2026-27`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "user_sample_format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Admin CSV File Selection
  const handleAdminCsvFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filteredData = results.data.filter(row => {
          const values = Object.values(row);
          return values.some(val => val && String(val).trim().length > 0);
        });
        
        if (filteredData.length === 0) {
          setAdminCsvErrors(['No valid data found in CSV']);
          setAdminCsvData([]);
          return;
        }
        
        const errors = [];
        const requiredFields = ['name', 'number', 'schoolName'];
        
        filteredData.forEach((row, idx) => {
        const missingFields = requiredFields.filter(field => !row[field] || !row[field].trim());
        if (missingFields.length > 0) {
          errors.push(`Row ${idx + 1}: Missing required fields - ${missingFields.join(', ')}`);
        } else if (!isValidPhoneNumber(sanitizePhoneNumber(row.number))) {
          errors.push(`Row ${idx + 1}: ${getPhoneValidationMessage()}`);
        }
      });
        
        setAdminCsvErrors(errors);
        setAdminCsvData(filteredData);
      },
      error: () => {
        showMessage('Invalid CSV file', 'error');
        setAdminCsvErrors(['Invalid CSV format']);
      }
    });
  };

  // Download Sample CSV for Admin Creation
  const downloadAdminSampleCSV = () => {
    const csvContent = `name,number,password,schoolName,schoolArea,board,schooltype,className,section,academicYear
Springfield Admin,9876543210,admin123,Springfield School,Delhi,"CBSE, ICSE",gov,"Nursery, LKG, UKG, 1, 2, 3","A, B, C, D","2026-27, 2027-28, 2028-29"
Riverside Admin,9876543211,admin456,Riverside Academy,Mumbai,"State Board",pvt,"1, 2, 3, 4, 5, 6","A, B, C","2026-27, 2027-28"
Sunrise Admin,9876543212,admin789,Sunrise School,Bangalore,"IB, IGCSE",pvt,"7, 8, 9, 10","A, B","2026-27"`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "admin_sample_format.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process Bulk Admin Upload
  const processAdminBulkUpload = () => {
    if (adminCsvData.length === 0) {
      showMessage("No data to upload", "error");
      return;
    }
    if (adminCsvErrors.length > 0) {
      showMessage(`Please fix ${adminCsvErrors.length} errors first`, "error");
      return;
    }
    
    setIsProcessingAdminCsv(true);
    
    const newAdmins = [];
    const errors = [];
    
    adminCsvData.forEach((row, index) => {
      try {
        let classArray = [];
        if (row.className) {
          classArray = row.className.split(',').map(c => c.trim()).filter(c => c);
        }
        
        let sectionArray = [];
        if (row.section) {
          sectionArray = row.section.split(',').map(s => s.trim()).filter(s => s);
        }
        
        let yearArray = [];
        if (row.academicYear) {
          yearArray = row.academicYear.split(',').map(y => y.trim()).filter(y => y);
        }
        
        let boardArray = [];
        if (row.board) {
          boardArray = row.board.split(',').map(b => b.trim()).filter(b => b);
        }
        
        const newAdmin = {
          id: generateId(),
          name: row.name.trim(),
          number: sanitizePhoneNumber(row.number),
          password: row.password && String(row.password).trim() !== '' ? String(row.password).trim() : `VSMS@${String(sanitizePhoneNumber(row.number)).slice(-4)}`,
          role: "admin",
          schoolName: row.schoolName?.trim() || "",
          schoolArea: row.schoolArea?.trim() || "",
          board: boardArray.join(", "),
          medium: row.medium?.trim() || "",
          className: classArray.join(", "),
          section: sectionArray.join(", "),
          academicYear: yearArray.join(", ")
        };
        
        if (!newAdmin.name || !newAdmin.number || !newAdmin.schoolName) {
          errors.push(`Row ${index + 1}: Missing required fields`);
          return;
        }
        if (!isValidPhoneNumber(newAdmin.number)) {
          errors.push(`Row ${index + 1}: ${getPhoneValidationMessage()}`);
          return;
        }
        
        if (classArray.length === 0 || sectionArray.length === 0 || yearArray.length === 0 || boardArray.length === 0) {
          errors.push(`Row ${index + 1}: Please select at least one Class, Section, Academic Year, and Board`);
          return;
        }
        
        newAdmins.push(newAdmin);
      } catch (err) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    });
    
    if (errors.length > 0) {
      setAdminCsvErrors(errors);
      setIsProcessingAdminCsv(false);
      showMessage(`${errors.length} errors found. Please fix and try again.`, "error");
      return;
    }
    
    const updatedUsers = [...newAdmins, ...allUsers];
    setAllUsers(updatedUsers);
    saveUserData(updatedUsers);
    
    showMessage(`Bulk upload complete: ${newAdmins.length} admin(s) created successfully!`, 'success');
    setAdminCsvData([]);
    setAdminCsvErrors([]);
    setIsProcessingAdminCsv(false);
    setShowAdminCsvModal(false);
    refreshData();
  };

  // Filter users for display
  const filteredUsers = useMemo(() => {
    let list = allUsers.filter((u) => u.role !== "superadmin");
    
    if (listFilterRole !== "all") {
      list = list.filter((u) => u.role === listFilterRole);
    }
    
    if (selectedSchoolFilter) {
      list = list.filter((u) => u.schoolName === selectedSchoolFilter);
    }

    if (selectedBoardFilters.length > 0) {
      list = list.filter((u) => selectedBoardFilters.some(board => matchesFilterValue(resolveBoardValue(u, admins), board)));
    }

    if (selectedAcademicYear && listFilterRole === "student") {
      list = list.filter((u) => u.academicYear === selectedAcademicYear);
    }
    
    if (selectedClassFilter && listFilterRole === "student") {
      list = list.filter((u) => u.className === selectedClassFilter);
    }
    
   // if (selectedSectionFilter && listFilterRole === "student") {
   //   list = list.filter((u) => u.section === selectedSectionFilter);
  //  }

    if (selectedSubjectFilters.length > 0 && listFilterRole === "teacher") {
      list = list.filter((u) => selectedSubjectFilters.some(subject => matchesFilterValue(u.subject, subject)));
    }
   
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((u) =>
        u.name.toLowerCase().includes(term) ||
        (u.number && u.number.includes(term)) ||
        u.schoolName?.toLowerCase().includes(term) ||
        resolveBoardValue(u, admins).toLowerCase().includes(term) ||
        u.subject?.toLowerCase().includes(term) ||
        u.className?.toLowerCase().includes(term) ||
        u.section?.toLowerCase().includes(term)
      );
    }
    
    return list;
  }, [allUsers, admins, listFilterRole, searchTerm, selectedAcademicYear, selectedClassFilter, selectedSectionFilter, selectedSchoolFilter, selectedBoardFilters, selectedSubjectFilters]);

  // Close school dropdown on click outside and revert invalid entries
  useEffect(() => {
    function handleClickOutside(event) {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(event.target)) {
        setShowSchoolDropdown(false);
        if (!adminSchoolOptions.includes(schoolSearchQuery)) {
          setSchoolSearchQuery(newUser.schoolName || "");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [schoolSearchQuery, adminSchoolOptions, newUser.schoolName]);

  // Keep search query in sync with schoolName value (e.g. on reset)
  useEffect(() => {
    setSchoolSearchQuery(newUser.schoolName || "");
  }, [newUser.schoolName]);

  // Handlers for the detail list page
  const handleCardClick = (role) => {
    setDetailListRole(role);
    setDetailListFilter("");
    setDetailListPage(1);
    setActiveTab("detail-list");
  };

  const handleBackToOverview = () => {
    setDetailListRole(null);
    setActiveTab("overview");
  };

  const handleDetailListFilterChange = (e) => {
    setDetailListFilter(e.target.value);
    setDetailListPage(1);
  };

  const getFilteredDetailData = () => {
    let data = [];
    switch(detailListRole) {
      case "admins":
        data = admins;
        break;
      case "teachers":
        data = teachers;
        break;
      case "staff":
        data = staff;
        break;
      case "parents":
        data = parents;
        break;
      case "students":
        data = students;
        break;
      default:
        return [];
    }

    if (!detailListFilter) return data;

    const term = detailListFilter.toLowerCase();
    switch(detailListRole) {
      case "admins":
        return data.filter(item => 
          item.name?.toLowerCase().includes(term) ||
          item.number?.includes(term) ||
          item.schoolName?.toLowerCase().includes(term)
        );
      case "teachers":
        return data.filter(item => 
          item.name?.toLowerCase().includes(term) ||
          item.number?.includes(term) ||
          item.schoolName?.toLowerCase().includes(term) ||
          item.subject?.toLowerCase().includes(term)
        );
      case "students":
        return data.filter(item => 
          item.name?.toLowerCase().includes(term) ||
          item.number?.includes(term) ||
          item.schoolName?.toLowerCase().includes(term) ||
          item.className?.toLowerCase().includes(term) ||
          item.section?.toLowerCase().includes(term)
        );
      case "parents":
        return data.filter(item => 
          item.name?.toLowerCase().includes(term) ||
          item.number?.includes(term) ||
          item.childName?.toLowerCase().includes(term)
        );
      case "staff":
        return data.filter(item => 
          item.name?.toLowerCase().includes(term) ||
          item.number?.includes(term) ||
          item.schoolName?.toLowerCase().includes(term) ||
          item.designation?.toLowerCase().includes(term)
        );
      default:
        return data;
    }
  };

  const filteredDetailData = getFilteredDetailData();
  const totalPages = Math.ceil(filteredDetailData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredDetailData.slice(
    (detailListPage - 1) * ITEMS_PER_PAGE,
    detailListPage * ITEMS_PER_PAGE
  );

  if (isLoading && allUsers.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* All Modals - Keeping all modals */}
      {isEditModalOpen && editingUser && (
        <UserEditModal 
          isOpen={true}
          user={editingUser}
          isAdminMode={false}       
          isDarkMode={isDarkMode}
          availableSchools={adminSchoolOptions}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingUser(null);
            setNewUser({ name: "", number: "", password: "", role: "", schoolName: "" });
          }}
          onSave={(updatedUser) => {
            const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
            setAllUsers(updatedUsers);
            saveUserData(updatedUsers);
            showMessage(`User ${updatedUser.name} updated successfully!`, 'success');
            setIsEditModalOpen(false);
            setEditingUser(null);
            refreshData();
          }}
        />
      )}

      {/* Multi-Select Modal for Bulk Add */}
      {showMultiSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[500px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Add Multiple {multiSelectType === "class" ? "Classes" : multiSelectType === "section" ? "Sections" : multiSelectType === "board" ? "Boards" : multiSelectType === "schooltype" ? "School Types" : "Academic Years"}
            </h3>
            <div className="mb-4">
              <button 
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
              >
                {selectedItems.length === defaultItemsList.length ? "Deselect All" : "Select All"}
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {defaultItemsList.map((item, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item)}
                      onChange={() => handleItemToggle(item)}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addSelectedItems} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add Selected ({selectedItems.length})</button>
              <button onClick={handleAddMore} className="bg-green-600 text-white px-4 py-2 rounded-lg">Add More</button>
              <button onClick={() => setShowMultiSelectModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Year Selector Modal for Admin Creation */}
      {showYearSelectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[500px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Academic Years for Admin</h3>
            <div className="mb-4">
              <button 
                onClick={() => {
                  if (tempSelectedYears.length === availableAcademicYears.length) {
                    setTempSelectedYears([]);
                  } else {
                    setTempSelectedYears([...availableAcademicYears]);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
              >
                {tempSelectedYears.length === availableAcademicYears.length ? "Deselect All" : "Select All"}
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {availableAcademicYears.map((year, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSelectedYears.includes(year)}
                      onChange={() => {
                        if (tempSelectedYears.includes(year)) {
                          setTempSelectedYears(tempSelectedYears.filter(y => y !== year));
                        } else {
                          setTempSelectedYears([...tempSelectedYears, year]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-white-300' : 'text-gray-700'}`}>{year}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={confirmYearSelection} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Confirm ({tempSelectedYears.length})</button>
              <button 
                onClick={() => {
                  setAddItemType("year");
                  setNewItemInput("");
                  setShowAddItemModal(true);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add New Year
              </button>
              <button onClick={() => setShowYearSelectorModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}


      {/* Class Selector Modal for Admin Creation */}
      {showClassSelectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[500px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Classes for Admin</h3>
            <div className="mb-4">
              <button 
                onClick={() => {
                  if (tempSelectedClasses.length === availableClasses.length) {
                    setTempSelectedClasses([]);
                  } else {
                    setTempSelectedClasses([...availableClasses]);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
              >
                {tempSelectedClasses.length === availableClasses.length ? "Deselect All" : "Select All"}
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {availableClasses.map((cls, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSelectedClasses.includes(cls)}
                      onChange={() => {
                        if (tempSelectedClasses.includes(cls)) {
                          setTempSelectedClasses(tempSelectedClasses.filter(c => c !== cls));
                        } else {
                          setTempSelectedClasses([...tempSelectedClasses, cls]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cls}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={confirmClassSelection} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Confirm ({tempSelectedClasses.length})</button>
              <button 
                onClick={() => {
                  setAddItemType("class");
                  setNewItemInput("");
                  setShowAddItemModal(true);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add New Class
              </button>
              <button onClick={() => setShowClassSelectorModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Section Selector Modal for Admin Creation */}
      {showSectionSelectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[500px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Sections for Admin</h3>
            <div className="mb-4">
              <button 
                onClick={() => {
                  if (tempSelectedSections.length === availableSections.length) {
                    setTempSelectedSections([]);
                  } else {
                    setTempSelectedSections([...availableSections]);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
              >
                {tempSelectedSections.length === availableSections.length ? "Deselect All" : "Select All"}
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {availableSections.map((sec, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSelectedSections.includes(sec)}
                      onChange={() => {
                        if (tempSelectedSections.includes(sec)) {
                          setTempSelectedSections(tempSelectedSections.filter(s => s !== sec));
                        } else {
                          setTempSelectedSections([...tempSelectedSections, sec]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{sec}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={confirmSectionSelection} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Confirm ({tempSelectedSections.length})</button>
              <button 
                onClick={() => {
                  setAddItemType("section");
                  setNewItemInput("");
                  setShowAddItemModal(true);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add New Section
              </button>
              <button onClick={() => setShowSectionSelectorModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      
      {/* Board Selector Modal for Admin Creation */}
      {showBoardSelectorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[500px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Boards for Admin</h3>
            <div className="mb-4">
              <button 
                onClick={() => {
                  if (tempSelectedBoards.length === availableBoards.length) {
                    setTempSelectedBoards([]);
                  } else {
                    setTempSelectedBoards([...availableBoards]);
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
              >
                {tempSelectedBoards.length === availableBoards.length ? "Deselect All" : "Select All"}
              </button>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                {availableBoards.map((board, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSelectedBoards.includes(board)}
                      onChange={() => {
                        if (tempSelectedBoards.includes(board)) {
                          setTempSelectedBoards(tempSelectedBoards.filter(b => b !== board));
                        } else {
                          setTempSelectedBoards([...tempSelectedBoards, board]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{board}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={confirmBoardSelection} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Confirm ({tempSelectedBoards.length})</button>
              <button 
                onClick={() => {
                  setAddItemType("board");
                  setNewItemInput("");
                  setShowAddItemModal(true);
                }} 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add New Board
              </button>
              <button onClick={() => setShowBoardSelectorModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin CSV Bulk Upload Modal */}
      {showAdminCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-xl p-6 w-[600px] max-w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📁 Bulk Upload Admins via CSV
            </h3>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold mb-2">📋 CSV Format Instructions:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                <li><b>Required fields:</b> name, number, password, schoolName</li>
                <li><b>Optional fields:</b> schoolArea, board, medium</li>
                <li><b>For multiple values (classes/sections/years/boards):</b> Use comma separated values</li>
                <li><b>Example for className:</b> "Nursery, LKG, UKG, 1, 2, 3"</li>
                <li><b>Example for section:</b> "A, B, C, D"</li>
                <li><b>Example for academicYear:</b> "2026-27, 2027-28, 2028-29"</li>
                <li><b>Example for board:</b> "CBSE, ICSE, State Board"</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select CSV File
              </label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleAdminCsvFileSelect}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
              />
            </div>
            
            {adminCsvData.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ {adminCsvData.length} rows parsed successfully
                </p>
              </div>
            )}
            
            {adminCsvErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm font-semibold text-red-800 mb-2">❌ Errors found:</p>
                <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                  {adminCsvErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 mt-4">
              <button 
                onClick={processAdminBulkUpload}
                disabled={isProcessingAdminCsv || adminCsvData.length === 0 || adminCsvErrors.length > 0}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingAdminCsv ? 'Processing...' : `Upload ${adminCsvData.length} Admins`}
              </button>
              <button 
                onClick={() => {
                  setShowAdminCsvModal(false);
                  setAdminCsvData([]);
                  setAdminCsvErrors([]);
                }} 
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Add New {addItemType === "class" ? "Class" : addItemType === "section" ? "Section" : addItemType === "board" ? "Board" : addItemType === "schooltype" ? "School Type" : "Academic Year"}
            </h3>
            <input 
              type="text" 
              value={newItemInput} 
              onChange={(e) => setNewItemInput(e.target.value)} 
              placeholder={
                addItemType === "class" ? "Enter class name" : 
                addItemType === "section" ? "Enter section name" : 
                addItemType === "board" ? "Enter board name" :
                addItemType === "schooltype" ? "Enter school type (Govt/Private)" :
                "Enter year (e.g., 2051-52)"
              } 
              className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
            />
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  if (!newItemInput.trim()) {
                    showMessage("Please enter a value", "error");
                    return;
                  }
                  
                  if (addItemType === "class") {
                    if (availableClasses.includes(newItemInput)) {
                      showMessage("Class already exists!", "error");
                      return;
                    }
                    const updatedClasses = [...availableClasses, newItemInput].sort((a, b) => {
                      const order = { "Nursery": 1, "LKG": 2, "UKG": 3 };
                      const aOrder = order[a] || (isNaN(a) ? 999 : parseInt(a) + 10);
                      const bOrder = order[b] || (isNaN(b) ? 999 : parseInt(b) + 10);
                      return aOrder - bOrder;
                    });
                    setAvailableClasses(updatedClasses);
                    saveLocalData(STORAGE_KEYS.CLASSES, updatedClasses);
                    if (!tempSelectedClasses.includes(newItemInput)) {
                      setTempSelectedClasses([...tempSelectedClasses, newItemInput]);
                    }
                    showMessage(`Class "${newItemInput}" added successfully!`, "success");
                  } 
                  else if (addItemType === "section") {
                    if (availableSections.includes(newItemInput)) {
                      showMessage("Section already exists!", "error");
                      return;
                    }
                    const updatedSections = [...availableSections, newItemInput].sort();
                    setAvailableSections(updatedSections);
                    saveLocalData(STORAGE_KEYS.SECTIONS, updatedSections);
                    if (!tempSelectedSections.includes(newItemInput)) {
                      setTempSelectedSections([...tempSelectedSections, newItemInput]);
                    }
                    showMessage(`Section "${newItemInput}" added successfully!`, "success");
                  } 
                  else if (addItemType === "year") {
                    if (availableAcademicYears.includes(newItemInput)) {
                      showMessage("Academic Year already exists!", "error");
                      return;
                    }
                    const updatedYears = [...availableAcademicYears, newItemInput].sort();
                    setAvailableAcademicYears(updatedYears);
                    saveLocalData(STORAGE_KEYS.ACADEMIC_YEARS, updatedYears);
                    if (!tempSelectedYears.includes(newItemInput)) {
                      setTempSelectedYears([...tempSelectedYears, newItemInput]);
                    }
                    showMessage(`Academic Year "${newItemInput}" added successfully!`, "success");
                  }
                  else if (addItemType === "board") {
                    if (availableBoards.includes(newItemInput)) {
                      showMessage("Board already exists!", "error");
                      return;
                    }
                    const updatedBoards = [...availableBoards, newItemInput].sort();
                    setAvailableBoards(updatedBoards);
                    saveLocalData(STORAGE_KEYS.BOARDS, updatedBoards);
                    if (!tempSelectedBoards.includes(newItemInput)) {
                      setTempSelectedBoards([...tempSelectedBoards, newItemInput]);
                    }
                    showMessage(`Board "${newItemInput}" added successfully!`, "success");
                  }
                  else if (addItemType === "schooltype") {
                    if (availableSchoolTypes.includes(newItemInput)) {
                      showMessage("School type already exists!", "error");
                      return;
                    }
                    const updatedTypes = [...availableSchoolTypes, newItemInput].sort();
                    setAvailableSchoolTypes(updatedTypes);
                    saveLocalData(STORAGE_KEYS.SCHOOL_TYPES, updatedTypes);
                    showMessage(`School Type "${newItemInput}" added successfully!`, "success");
                  }
                  
                  setShowAddItemModal(false);
                  setNewItemInput("");
                }} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button onClick={() => setShowAddItemModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showPasswordResetModal && passwordResetUser && (
        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => {
            setShowPasswordResetModal(false);
            setPasswordResetUser(null);
          }}
          onConfirm={confirmPasswordReset}
          userName={passwordResetUser.name}
          userNumber={passwordResetUser.number}
          isDarkMode={isDarkMode}
        />
      )}

      {/* CSV Download Modal */}
      <DownloadCSVModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        users={csvDownloadUsers}
        role={csvDownloadRole}
        isDarkMode={isDarkMode}
      />

      {/* SIDEBAR */}
      <aside className={`w-80 flex-shrink-0 border-r shadow-lg z-40 flex flex-col h-screen sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Profile Section */}
        <div className={`p-4 text-center border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative inline-block">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-500 shadow-lg" />
            ) : (
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold border-4 border-blue-500 shadow-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-100 text-blue-700'}`}>
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 cursor-pointer hover:bg-blue-700 transition">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
            </label>
          </div>
          {profilePicture && (
            <button onClick={handleRemoveProfilePicture} className="mt-2 text-xs text-red-500 hover:text-red-700 transition block mx-auto">
              Remove Photo
            </button>
          )}
          <h3 className={`mt-3 font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{currentUser?.name || 'Super Admin'}</h3>
          <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Super Admin</p>
          <p className={`text-xs mt-1 border-b pb-2 ${isDarkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>{currentUser?.number || 'admin@school.com'}</p>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`mt-4 w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all duration-300 ${isDarkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-500'}`}
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
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>MENU</p>
          <div className="space-y-1">
            {navButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => { setActiveTab(btn.tab); setFilterRole(btn.filter); setDetailListRole(null); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === btn.tab && filterRole === btn.filter ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')}`}
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
        </div> */}
      </aside> 

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 min-h-screen">
        {/* Header */}
        <div className="mb-6 pb-4 border-b">
          {activeTab === "detail-list" ? (
            <div className="flex items-center gap-4">
              <button onClick={handleBackToOverview} className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1">
                ← Back
              </button>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {detailListRole === "admins" && "Admin List"}
                {detailListRole === "teachers" && "Teacher List"}
                {detailListRole === "students" && "Student List"}
                {detailListRole === "parents" && "Parent List"}
                {detailListRole === "staff" && "Non teaching Staff List"}
              </h2>
            </div>
          ) : (
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {navButtons.find(b => b.tab === activeTab)?.label || 'Dashboard'}
            </h2>
          )}
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Welcome, {currentUser?.name || 'Super Admin'} :: {currentUser?.role || 'superadmin'}
          </p>
        </div>

        {/* Tab Navigation - Hide when in detail list mode */}
        {activeTab !== "detail-list" && (
          <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b overflow-x-auto">
            {navButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => { setActiveTab(btn.tab); setFilterRole(btn.filter); setDetailListRole(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === btn.tab && filterRole === btn.filter ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div>
              {/* Admin Filter */}
             {/* Admin Filter with Search */}
<div className={`mb-6 p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
    🔍 Search Admin / School
  </label>
  
  {/* Search Input */}
  <input 
    type="text"
    placeholder="Search by school name, admin name, or phone number..."
    value={overviewSearchTerm}
    onChange={(e) => setOverviewSearchTerm(e.target.value)}
    className={`w-full md:w-96 px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
  />
  
  {/* Search Results Count */}
  {overviewSearchTerm && (
    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      Found {filteredOverviewAdmins.length} admin(s)
    </p>
  )}
  
  {/* Optional: Clear button */}
  {overviewSearchTerm && (
    <button 
      onClick={() => setOverviewSearchTerm("")}
      className="text-xs text-blue-500 hover:text-blue-700 mt-1 ml-2"
    >
      Clear Search
    </button>
  )}
</div>
<div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
  <div onClick={() => handleCardClick("admins")} className="cursor-pointer transform transition hover:scale-105">
    <DashboardCard 
      title="Admins" 
      icon="🏢" 
      value={overviewSearchTerm ? filteredOverviewAdmins.length : admins.length} 
      color="blue" 
    />
  </div>
  <div onClick={() => handleCardClick("teachers")} className="cursor-pointer transform transition hover:scale-105">
    <DashboardCard 
      title="Teachers" 
      icon="👨‍🏫" 
      value={overviewSearchTerm ? filteredOverviewUsers.filter(u => u.role === "teacher").length : teachers.length} 
      color="purple" 
    />
  </div>
  <div onClick={() => handleCardClick("staff")} className="cursor-pointer transform transition hover:scale-105">
    <DashboardCard 
      title="Non teaching Staff" 
      icon="👔" 
      value={overviewSearchTerm ? filteredOverviewUsers.filter(u => u.role === "staff").length : staff.length} 
      color="green" 
    />
  </div>
  <div onClick={() => handleCardClick("parents")} className="cursor-pointer transform transition hover:scale-105">
    <DashboardCard 
      title="Parents" 
      icon="👨‍👩‍👧‍👦" 
      value={overviewSearchTerm ? filteredOverviewUsers.filter(u => u.role === "parents").length : parents.length} 
      color="orange" 
    />
  </div>
  <div onClick={() => handleCardClick("students")} className="cursor-pointer transform transition hover:scale-105">
    <DashboardCard 
      title="Students" 
      icon="👨‍🎓" 
      value={overviewSearchTerm ? filteredOverviewUsers.filter(u => u.role === "student").length : students.length} 
      color="red" 
    />
  </div>
</div>

{/* Search Results List */}
{overviewSearchTerm && (
  <div className={`mt-6 p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
    <div className="flex justify-between items-center mb-4">
      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        Search Results ({filteredOverviewUsers.filter(u => u.role !== 'superadmin').length} users found)
      </h3>
      <button
        onClick={() => {
          setCsvDownloadUsers(filteredOverviewUsers.filter(u => u.role !== 'superadmin'));
          setCsvDownloadRole("search_results");
          setIsCsvModalOpen(true);
        }}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow flex items-center gap-2 text-sm transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export
      </button>
    </div>
    <div className="space-y-2">
      {filteredOverviewUsers.filter(u => u.role !== 'superadmin').map((user) => (
        <div key={user.id} className={`flex justify-between items-center p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-700'}`}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user.name}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {user.role?.toUpperCase()} | {user.number}
                {user.schoolName && ` | School: ${user.schoolName}`}
                {user.className && ` | Class: ${user.className}`}
                {user.section && ` | Section: ${user.section}`}
                {user.subject && ` | Subject: ${user.subject}`}
                {user.designation && ` | Designation: ${user.designation}`}
                {user.childName && ` | Child: ${user.childName}`}
              </p>
            </div>
          </div>
          <div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
              user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
              user.role === 'student' ? 'bg-red-100 text-red-700' :
              user.role === 'parents' ? 'bg-orange-100 text-orange-700' :
              'bg-green-100 text-green-700'
            }`}>
              {user.role?.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
      {filteredOverviewUsers.filter(u => u.role !== 'superadmin').length === 0 && (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No users found for this search</div>
      )}
    </div>
  </div>
)}

</div>
          )}

          {/* CREATE ADMIN TAB */}
          {activeTab === "admin-management" && (
            <div className="space-y-6">
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {editingAdminId ? "Update Admin Account" : "Create Admin Account"}
                </h2>

                               {/* Step 1: Select Access Rights for this Admin */}
                <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
                  <h3 className={`font-semibold mb-3 text-blue-800`}>Step 1: Select Access Rights for this Admin</h3>
                  <div className="grid gap-4 md:grid-cols-4">
                    {/* Academic Year - Pehle */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Academic Years</label>
                      <button onClick={openYearSelector} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        {selectedAdminAcademicYears.length > 0 ? `Selected (${selectedAdminAcademicYears.length})` : "Select Academic Years"}
                      </button>
                      {selectedAdminAcademicYears.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedAdminAcademicYears.map(year => (
                            <span key={year} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{year}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Board - Dusra */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Boards</label>
                      <button onClick={openBoardSelector} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        {selectedAdminBoards.length > 0 ? `Selected (${selectedAdminBoards.length})` : "Select Boards"}
                      </button>
                      {selectedAdminBoards.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedAdminBoards.map(board => (
                            <span key={board} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{board}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Class - Teesra */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Classes</label>
                      <button onClick={openClassSelector} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        {selectedAdminClasses.length > 0 ? `Selected (${selectedAdminClasses.length})` : "Select Classes"}
                      </button>
                      {selectedAdminClasses.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedAdminClasses.map(cls => (
                            <span key={cls} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{cls}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section - Chautha */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Sections</label>
                      <button onClick={openSectionSelector} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        {selectedAdminSections.length > 0 ? `Selected (${selectedAdminSections.length})` : "Select Sections"}
                      </button>
                      {selectedAdminSections.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedAdminSections.map(sec => (
                            <span key={sec} className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{sec}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Admin Details Form */}
                <div className="mb-4">
                  <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Step 2: Admin Details</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <input type="text" placeholder="Full Name *" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="tel" placeholder="Phone Number *" value={newUser.number} onChange={(e) => setNewUser({...newUser, number: sanitizePhoneNumber(e.target.value)})} inputMode="numeric" maxLength={10} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder="Password (Optional)" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={`px-3 py-2 pr-8 border rounded-lg w-full text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2.5">{showPassword ? "🙈" : "👁️"}</button>
                    </div>
                    <input type="text" placeholder="School Name *" value={newUser.schoolName} onChange={(e) => setNewUser({...newUser, schoolName: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="text" placeholder="School Area" value={newUser.schoolArea} onChange={(e) => setNewUser({...newUser, schoolArea: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <select value={newUser.schoolType} onChange={(e) => setNewUser({...newUser, schoolType: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select School Type</option>
                      {availableSchoolTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    
                    {/* Read-only display of selected items */}
                    <div className={`p-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Academic Years</label>
                      <p className="text-sm text-gray-400">{selectedAdminAcademicYears.length > 0 ? selectedAdminAcademicYears.join(", ") : "Not selected"}</p>
                    </div>
                    <div className={`p-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Classes</label>
                      <p className="text-sm text-gray-400">{selectedAdminClasses.length > 0 ? selectedAdminClasses.join(", ") : "Not selected"}</p>
                    </div>
                    <div className={`p-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Sections</label>
                      <p className="text-sm text-gray-400">{selectedAdminSections.length > 0 ? selectedAdminSections.join(", ") : "Not selected"}</p>
                    </div>
                   
                    <div className={`p-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Assigned Boards</label>
                      <p className="text-sm text-gray-400">{selectedAdminBoards.length > 0 ? selectedAdminBoards.join(", ") : "Not selected"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start gap-3 mt-4">
                  <button onClick={() => setShowAdminCsvModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 shadow-md">
                    📁 Bulk Upload CSV
                  </button>
                  <button onClick={downloadAdminSampleCSV} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 shadow-md">
                    📥 Download Sample CSV
                  </button>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button onClick={editingAdminId ? handleUpdateAdmin : handleCreateAdmin} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                    {editingAdminId ? "Update Admin" : "Create Admin"}
                  </button>
                  {editingAdminId && (
                    <button onClick={resetAdminForm} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
                  )}
                </div>
              </div>

              {/* All Admin Accounts List - Newest first */}
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>All Admin Accounts</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {filteredAdmins.length} admin(s)
                    </span>
                    <button
                      onClick={() => {
                        setCsvDownloadUsers(filteredAdmins);
                        setCsvDownloadRole("admin");
                        setIsCsvModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export
                    </button>
                  </div>
                </div>
                
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  {/* <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>School</label>
                    <select value={selectedAdminFilter} onChange={(e) => setSelectedAdminFilter(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="all">All Schools</option>
                      {adminSchoolOptions.map((school) => (
                        <option key={school} value={school}>{school}</option>
                      ))}
                    </select>
                  </div> */}
                  {/* <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Board</label>
                    <select value={selectedAdminBoardFilter} onChange={(e) => setSelectedAdminBoardFilter(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">All Boards</option>
                      {adminBoardOptions.map((board) => (
                        <option key={board} value={board}>{board}</option>
                      ))}
                    </select>
                  </div> */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Search</label>
                    <input type="text" placeholder="Search by name, school, board, or phone..." value={adminSearchTerm} onChange={(e) => setAdminSearchTerm(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  </div>
                </div>
                
                <div className="space-y-2">
                 {filteredAdmins.slice((adminPage - 1) * ADMIN_PER_PAGE, adminPage * ADMIN_PER_PAGE).map((admin) => (
                    <div key={admin.id} className={`flex justify-between items-center p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{admin.name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ADMIN | {admin.number}</p>
                        {admin.schoolName && <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>School: {admin.schoolName}</p>}
                        {(admin.className || admin.section || admin.academicYear || admin.board || admin.schoolType) && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {admin.className && `Classes: ${admin.className} `} 
                            {admin.section && `| Sections: ${admin.section} `}
                            {admin.academicYear && `| Years: ${admin.academicYear} `}
                            {admin.board && `| Boards: ${admin.board} `}
                            {admin.schoolType && `| Type: ${admin.schoolType}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditAdmin(admin)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                        <button onClick={() => handleResetPassword(admin)} className="px-2 py-1 bg-purple-500 text-white rounded text-xs">Reset Pwd</button>
                        <button onClick={() => handleDeleteAdmin(admin.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                  {filteredAdmins.length === 0 && (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No admin accounts found</div>
                  )}
                  

                </div>

                {/* Pagination for Admins */}
{Math.ceil(filteredAdmins.length / ADMIN_PER_PAGE) > 1 && (
  <div className="flex justify-center gap-2 mt-4 pt-3 border-t">
    <button
      onClick={() => setAdminPage(p => Math.max(1, p - 1))}
      disabled={adminPage === 1}
      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
    >
      Previous
    </button>
    <span className="px-3 py-1 text-sm text-gray-600">
      Page {adminPage} of {Math.ceil(filteredAdmins.length / ADMIN_PER_PAGE)}
    </span>
    <button
      onClick={() => setAdminPage(p => Math.min(Math.ceil(filteredAdmins.length / ADMIN_PER_PAGE), p + 1))}
      disabled={adminPage === Math.ceil(filteredAdmins.length / ADMIN_PER_PAGE)}
      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
    >
      Next
    </button>
  </div>
)}

 {showAdminEditModal && editingAdminData && (
                  <UserEditModal 
                    isOpen={showAdminEditModal}
                    user={editingAdminData}
                    isAdminMode={true}
                    isDarkMode={isDarkMode}
                    availableSchools={adminSchoolOptions}
                    onClose={() => {
                      setShowAdminEditModal(false);
                      setEditingAdminData(null);
                    }}
                    onSave={handleSaveAdminEdit}
                  />
                )}
  </div>

  
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Create User Form */}
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Create User Account</h2>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <input type="text" placeholder="Full Name *" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  <input type="tel" placeholder="Phone Number *" value={newUser.number} onChange={(e) => setNewUser({...newUser, number: sanitizePhoneNumber(e.target.value)})} inputMode="numeric" maxLength={10} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="Password (Optional)" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className={`px-3 py-2 pr-8 border rounded-lg w-full text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2.5">{showPassword ? "🙈" : "👁️"}</button>
                  </div>
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                    <option value="">Select Role *</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parents">Parent</option>
                    <option value="staff">Non teaching Staff</option>
                  </select>
                  <div className="relative" ref={schoolDropdownRef}>
                    <input 
                      type="text" 
                      placeholder="School Name" 
                      value={schoolSearchQuery}
                      onChange={(e) => {
                        setSchoolSearchQuery(e.target.value);
                        setShowSchoolDropdown(true);
                      }}
                      onFocus={() => setShowSchoolDropdown(true)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    />
                    {showSchoolDropdown && adminSchoolOptions.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 max-h-40 overflow-y-auto border rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                        {adminSchoolOptions
                          .filter(school => school.toLowerCase().includes(schoolSearchQuery.toLowerCase()))
                          .map(school => (
                            <div 
                              key={school} 
                              onClick={() => {
                                setSchoolSearchQuery(school);
                                setNewUser(prev => ({...prev, schoolName: school}));
                                setShowSchoolDropdown(false);
                              }}
                              className={`px-3 py-2 cursor-pointer text-sm ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-gray-800 hover:bg-gray-100'}`}
                            >
                              {school}
                            </div>
                          ))}
                        {adminSchoolOptions.filter(school => school.toLowerCase().includes(schoolSearchQuery.toLowerCase())).length === 0 && (
                          <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No schools found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Dynamic fields */}
                {newUser.role === "teacher" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input type="text" placeholder="Subject" value={newUser.subject} onChange={(e) => setNewUser({...newUser, subject: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="text" placeholder="Qualification" value={newUser.qualification} onChange={(e) => setNewUser({...newUser, qualification: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  </div>
                )}
                
                {newUser.role === "parents" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-5">
                    <input type="text" placeholder="Address" value={newUser.address} onChange={(e) => setNewUser({...newUser, address: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="text" placeholder="Child Name" value={newUser.childName} onChange={(e) => setNewUser({...newUser, childName: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <select value={newUser.childClass} onChange={(e) => setNewUser({...newUser, childClass: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select Child Class</option>
                      {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select value={newUser.childSection} onChange={(e) => setNewUser({...newUser, childSection: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select Child Section</option>
                      {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                    <input type="text" placeholder="Relation" value={newUser.relationWithChild} onChange={(e) => setNewUser({...newUser, relationWithChild: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  </div>
                )}
                
                {newUser.role === "staff" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input type="text" placeholder="Qualification" value={newUser.qualification} onChange={(e) => setNewUser({...newUser, qualification: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="text" placeholder="Designation" value={newUser.designation} onChange={(e) => setNewUser({...newUser, designation: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  </div>
                )}
                
                {newUser.role === "student" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-5">
                    <select value={newUser.className} onChange={(e) => setNewUser({...newUser, className: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select Class</option>
                      {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select value={newUser.section} onChange={(e) => setNewUser({...newUser, section: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select Section</option>
                      {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                    <select value={newUser.academicYear} onChange={(e) => setNewUser({...newUser, academicYear: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                      <option value="">Select Academic Year</option>
                      {availableAcademicYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <input type="text" placeholder="Address" value={newUser.address} onChange={(e) => setNewUser({...newUser, address: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                    <input type="text" placeholder="Parent Name" value={newUser.parentName} onChange={(e) => setNewUser({...newUser, parentName: e.target.value})} className={`px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                  </div>
                )}

                {/* Parent-Student Linking 
                <div className={`mt-4 border rounded-lg p-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Parent-Student Linking</h3>
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
                      {availableAcademicYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select value={inlineLinkClassFilter} onChange={(e) => setInlineLinkClassFilter(e.target.value)} className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                      <option value=''>All Classes</option>
                      {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <select value={inlineLinkSectionFilter} onChange={(e) => setInlineLinkSectionFilter(e.target.value)} className={`px-3 py-2 text-sm border rounded ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                      <option value=''>All Sections</option>
                      {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
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
      onChange={handleCsvFileSelect}
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
  <button onClick={() => { setCsvData([]); setCsvErrors([]); }} className="px-2 py-1 bg-red-500 rounded text-xs">Clear</button>
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

              {/* All Users List - Newest first */}
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>All Users</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {filteredUsers.length} user(s)
                    </span>
                    <button
                      onClick={() => {
                        setCsvDownloadUsers(filteredUsers);
                        setCsvDownloadRole(listFilterRole);
                        setIsCsvModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export
                    </button>
                  </div>
                </div>
                
                <div className="mb-4 p-3 rounded-lg">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>School</label>
                      <select value={selectedSchoolFilter} onChange={(e) => {
                          setSelectedSchoolFilter(e.target.value);
                          setListFilterRole("all");
                          setSelectedBoardFilters([]);
                          setSelectedSubjectFilters([]);
                          setSelectedClassFilter("");
                          setSelectedSectionFilter("");
                          setSelectedAcademicYear("");
                      }} className={`w-full px-2 py-1.5 border rounded text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                        <option value="">All Schools</option>
                        {schoolFilterOptions.map((school) => <option key={school} value={school}>{school}</option>)}
                      </select>
                    </div>

                    {selectedSchoolFilter && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Role</label>
                        <select
                          value={listFilterRole}
                          onChange={(e) => {
                            setListFilterRole(e.target.value);
                            setSelectedBoardFilters([]);
                            setSelectedSubjectFilters([]);
                            setSelectedClassFilter("");
                            setSelectedSectionFilter("");
                            setSelectedAcademicYear("");
                          }}
                          className={`w-full px-2 py-1.5 border rounded text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}
                        >
                          <option value="all">All Roles</option>
                          <option value="admin">Admins</option>
                          <option value="teacher">Teachers</option>
                          <option value="student">Students</option>
                          <option value="parents">Parents</option>
                          <option value="staff">Non teaching Staff</option>
                        </select>
                      </div>
                    )}

                    {selectedSchoolFilter && listFilterRole !== "all" && listFilterRole !== "staff" && listFilterRole !== "parents" && listFilterRole !== "admin" && (
                      <div className="z-10 relative">
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Board</label>
                        <MultiSelect
                          options={boardFilterOptions}
                          selectedValues={selectedBoardFilters}
                          onChange={setSelectedBoardFilters}
                          placeholder="Select Boards"
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    )}
                    
                    {selectedSchoolFilter && listFilterRole === "student" && (
                      <>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Academic Year</label>
                          <select value={selectedAcademicYear} onChange={(e) => setSelectedAcademicYear(e.target.value)} className={`w-full px-2 py-1.5 border rounded text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                            <option value="">All Years</option>
                            {availableAcademicYears.map(year => <option key={year} value={year}>{year}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class</label>
                          <select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} className={`w-full px-2 py-1.5 border rounded text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                            <option value="">All Classes</option>
                            {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Section</label>
                          <select value={selectedSectionFilter} onChange={(e) => setSelectedSectionFilter(e.target.value)} className={`w-full px-2 py-1.5 border rounded text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'}`}>
                            <option value="">All Sections</option>
                            {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedSchoolFilter && listFilterRole === "teacher" && (
                      <div className="z-10 relative">
                        <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subject</label>
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
                </div>
                
                <div className="mb-4">
                  <input type="text" placeholder="Search by name, phone, school, board, subject, class..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full md:w-96 px-3 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`} />
                </div>
                
                <div className="space-y-2">
                  {filteredUsers.slice((userPage - 1) * USER_PER_PAGE, userPage * USER_PER_PAGE).map((u) =>(
                    <div key={u.id} className={`flex justify-between items-center p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-700'}`}>
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          {(() => {
                            const resolvedBoard = resolveBoardValue(u, admins);
                            return (
                              <>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{u.name}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.role?.toUpperCase()} | {u.number}</p>
                          {(u.schoolName || resolvedBoard || u.subject || u.className || u.section || u.academicYear || u.designation || u.childName) && (
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {u.schoolName && `School: ${u.schoolName} `}
                              {resolvedBoard && `| Board: ${resolvedBoard} `}
                              {u.subject && `| Subject: ${u.subject} `}
                              {u.className && `| Class: ${u.className} `}
                              {u.section && `| Section: ${u.section} `}
                              {u.academicYear && `| Year: ${u.academicYear} `}
                              {u.designation && `| Designation: ${u.designation} `}
                              {u.childName && `| Child: ${u.childName}`}
                            </p>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditUser(u)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                        <button onClick={() => handleResetPassword(u)} className="px-2 py-1 bg-purple-500 text-white rounded text-xs">Reset Pwd</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No users found</div>
                  )}
                </div>

                {/* Pagination for Users */}
{Math.ceil(filteredUsers.length / USER_PER_PAGE) > 1 && (
  <div className="flex justify-center gap-2 mt-4 pt-3 border-t">
    <button
      onClick={() => setUserPage(p => Math.max(1, p - 1))}
      disabled={userPage === 1}
      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
    >
      Previous
    </button>
    <span className="px-3 py-1 text-sm text-gray-600">
      Page {userPage} of {Math.ceil(filteredUsers.length / USER_PER_PAGE)}
    </span>
    <button
      onClick={() => setUserPage(p => Math.min(Math.ceil(filteredUsers.length / USER_PER_PAGE), p + 1))}
      disabled={userPage === Math.ceil(filteredUsers.length / USER_PER_PAGE)}
      className="px-3 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
    >

      Next
    </button>
  </div>
)}
              </div>
            </div>
          )}

          {/* DETAIL LIST PAGE */}
          {activeTab === "detail-list" && detailListRole && (
            <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <div className="flex gap-4 items-center mb-4">
                  <input 
                    type="text" 
                    placeholder={
                      detailListRole === "admins" ? "Search by name, number, or school..." :
                      detailListRole === "teachers" ? "Search by name, number, school, or subject..." :
                      detailListRole === "students" ? "Search by name, number, school, class, or section..." :
                      detailListRole === "parents" ? "Search by name, number, or child name..." :
                      "Search by name, number, school, or designation..."
                    }
                    value={detailListFilter}
                    onChange={handleDetailListFilterChange}
                    className={`flex-1 px-4 py-2 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                  />
                  
                  <button
        onClick={() => {
        setCsvDownloadUsers(filteredOverviewUsers.filter(u => u.role !== 'superadmin'));
          setCsvDownloadRole("search_results");
          setIsCsvModalOpen(true);
        }}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow flex items-center gap-2 text-sm transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export
      </button>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing {paginatedData.length} of {filteredDetailData.length} entries | Page {detailListPage} of {totalPages}
                </p>
              </div>


             
                

              <div className="space-y-3">
                {paginatedData.map((item) => {
                  if (detailListRole === "admins") {
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.number}</p>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.schoolName}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Area: {item.schoolArea || "N/A"}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Board: {item.board || "N/A"}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Type: {item.schoolType || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (detailListRole === "teachers") {
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.number}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>School: {item.schoolName || "N/A"}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Subject: {item.subject || "N/A"}</p>
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.qualification || "No qualification"}</div>
                        </div>
                      </div>
                    );
                  } else if (detailListRole === "students") {
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.number}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>School: {item.schoolName || "N/A"} | Class: {item.className || "N/A"} | Section: {item.section || "N/A"} | Year: {item.academicYear || "N/A"}</p>
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Parent: {item.parentName || "Not linked"}</div>
                        </div>
                      </div>
                    );
                  } else if (detailListRole === "parents") {
                    const children = students.filter(s => s.parentId === item.id);
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Phone: {item.number}</p>
                        </div>
                        <div className="mt-2">
                          <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Children ({children.length}):</p>
                          {children.map(child => (
                            <div key={child.id} className="pl-3 border-l-2 border-orange-300 text-sm">
                              {child.name} - Class {child.className} Section {child.section} ({child.academicYear})
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else if (detailListRole === "staff") {
                    return (
                      <div key={item.id} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.number}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>School: {item.schoolName || "N/A"} | Designation: {item.designation || "Not specified"}</p>
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.qualification || "No qualification"}</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
                {paginatedData.length === 0 && (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No {detailListRole} found</div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setDetailListPage(p => Math.max(1, p - 1))}
                    disabled={detailListPage === 1}
                    className={`px-3 py-1 rounded text-sm ${detailListPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Previous
                  </button>
                  <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Page {detailListPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setDetailListPage(p => Math.min(totalPages, p + 1))}
                    disabled={detailListPage === totalPages}
                    className={`px-3 py-1 rounded text-sm ${detailListPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
