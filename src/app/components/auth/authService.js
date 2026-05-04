const USER_STORAGE_KEYS = ['school-users', 'school_users', 'superadmin_users'];
const MOBILE_NUMBER_REGEX = /^[6-9]\d{9}$/;

export function sanitizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export function isValidPhoneNumber(value) {
  return MOBILE_NUMBER_REGEX.test(sanitizePhoneNumber(value));
}

export function getPhoneValidationMessage() {
  return 'Enter a valid 10-digit mobile number.';
}

const getLatestTimestamp = (item) => {
  const dateFields = [
    'createdAt',
    'updatedAt',
    'uploadedAt',
    'sentAt',
    'requestedAt',
    'paidAt',
    'markedAt',
    'submittedAt',
    'reviewedAt',
    'date'
  ];

  for (const field of dateFields) {
    const value = item?.[field];
    if (!value) continue;
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  const numericId = Number(item?.id);
  return Number.isNaN(numericId) ? 0 : numericId;
};

const sortLatestFirst = (items = []) => {
  return [...items].sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a));
};

export function getUserList() {
  if (typeof window === 'undefined') return [];
  try {
    const mergedUsers = USER_STORAGE_KEYS.flatMap((key) => {
      try {
        const data = localStorage.getItem(key);
        const parsed = data ? JSON.parse(data) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });

    const uniqueUsers = [];
    const seen = new Set();

    mergedUsers.forEach((user) => {
      if (!user) return;
      const key = [user.id, user.number, user.role].join('::');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueUsers.push(user);
      }
    });

    return sortLatestFirst(uniqueUsers);
  } catch {
    return [];
  }
}

export function setUserList(users) {
  if (typeof window === 'undefined') return;
  const orderedUsers = sortLatestFirst(users);
  localStorage.setItem('school-users', JSON.stringify(orderedUsers));
  localStorage.setItem('school_users', JSON.stringify(orderedUsers));
  localStorage.setItem('superadmin_users', JSON.stringify(orderedUsers));
}

// Initialize default super admin if no users exist or update if needed
export function initializeDefaultSuperAdmin() {
  if (typeof window === 'undefined') return;

  

  const users = getUserList();
  const superAdminIndex = users.findIndex(u => u.role === 'superadmin');

  if (superAdminIndex === -1) {
    const defaultSuperAdmin = {
      id: 1,
      name: 'Super Admin',
      number: '9832112469',
      password: 'admin123',
      role: 'superadmin',
      createdAt: new Date().toISOString()
    };
    users.push(defaultSuperAdmin);
    setUserList(users);
    console.log('Default super admin created:', defaultSuperAdmin);
  } else {
    // Force the super admin to have the correct number if they had an email previously
    let updated = false;
    if (users[superAdminIndex].number !== '9832112469') {
       users[superAdminIndex].number = '9832112469';
       updated = true;
    }
    if (users[superAdminIndex].password !== 'admin123') {
       users[superAdminIndex].password = 'admin123';
       updated = true;
    }
    if (updated) {
       setUserList(users);
       console.log('Default super admin updated to match new credentials.');
    }
  }
}

// Only super admin can register (create admin accounts)
export function register({ name, number, password, role, schoolName }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot register server side' };
  const normalizedNumber = sanitizePhoneNumber(number);

  // Check if current user is super admin
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only super admin can create accounts' };
  }

  const users = getUserList();

  // Only allow creating admin accounts
  if (role !== 'admin') {
    return { success: false, message: 'Super admin can only create admin accounts' };
  }

  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }

  if (users.some((u) => u.number === normalizedNumber)) {
    return { success: false, message: 'Number already registered' };
  }

  const newUser = {
    id: Date.now(),
    name,
    number: normalizedNumber,
    password,
    role,
    schoolName: schoolName || '',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  setUserList(users);
  return { success: true, user: newUser };
}

// Superadmin creates user accounts for any role (including admin)
export function createUserBySuperAdmin({ name, number, password, role, schoolName, ...rest }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot create user server side' };
  const normalizedNumber = sanitizePhoneNumber(number);

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can create user accounts' };
  }

  if (!name || !number || !password || !role) {
    return { success: false, message: 'Please fill all fields' };
  }

  const users = getUserList();
  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }
  if (users.some((u) => u.number === normalizedNumber)) {
    return { success: false, message: 'Number already registered' };
  }

  const newUser = {
    id: Date.now(),
    name,
    number: normalizedNumber,
    password,
    role,
    schoolName: schoolName || '',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    parentId: null,
    ...rest
  };

  users.push(newUser);
  setUserList(users);
  return { success: true, user: newUser };
}

// Superadmin update user details including admins
export function updateUserBySuperAdmin({ id, name, number, password, role, schoolName }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update user server side' };
  const normalizedNumber = sanitizePhoneNumber(number);

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can update user accounts' };
  }

  const users = getUserList();
  const userToUpdate = users.find((u) => u.id === id);
  if (!userToUpdate || userToUpdate.role === 'superadmin') {
    return { success: false, message: 'User not found or cannot update superadmin' };
  }

  if (!name || !number || !role) {
    return { success: false, message: 'Name, number and role are required' };
  }

  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }

  if (users.some((u) => u.id !== id && u.number === normalizedNumber)) {
    return { success: false, message: 'Number already in use' };
  }

  userToUpdate.name = name;
  userToUpdate.number = normalizedNumber;
  if (password) userToUpdate.password = password;
  userToUpdate.role = role;
  userToUpdate.schoolName = schoolName || userToUpdate.schoolName;

  setUserList(users);
  return { success: true, user: userToUpdate };
}

// Admin delete non-admin users (teacher/student/parents/non teaching staff)
export function deleteUserByAdmin(userId) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot delete user server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, message: 'Only admin can delete users' };
  }

  const users = getUserList();
  const index = users.findIndex((u) => u.id === userId && ['teacher', 'student', 'parents', 'staff'].includes(u.role));
  if (index === -1) {
    return { success: false, message: 'User account not found or cannot be deleted' };
  }

  users.splice(index, 1);
  setUserList(users);
  return { success: true, message: 'User account deleted successfully' };
}

// Superadmin delete any user except superadmin
export function deleteUserBySuperAdmin(userId) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot delete user server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can delete user accounts' };
  }

  const users = getUserList();
  const index = users.findIndex((u) => u.id === userId && u.role !== 'superadmin');
  if (index === -1) {
    return { success: false, message: 'User account not found or protected' };
  }

  users.splice(index, 1);
  setUserList(users);
  return { success: true, message: 'User account deleted successfully' };
}

// Superadmin update admin details
export function updateAdminBySuperAdmin({ id, name, number, password, schoolName }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update admin server side' };
  const normalizedNumber = sanitizePhoneNumber(number);

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can update admin accounts' };
  }

  const users = getUserList();
  const admin = users.find((u) => u.id === id && u.role === 'admin');
  if (!admin) {
    return { success: false, message: 'Admin account not found' };
  }

  if (!name || !number || !schoolName) {
    return { success: false, message: 'Name, number, and school name are required' };
  }

  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }

  if (users.some((u) => u.id !== id && u.number === normalizedNumber)) {
    return { success: false, message: 'Number already in use' };
  }

  admin.name = name;
  admin.number = normalizedNumber;
  if (password) {
    admin.password = password;
  }
  admin.schoolName = schoolName;

  setUserList(users);
  return { success: true, user: admin };
}

// Superadmin delete admin account
export function deleteAdminBySuperAdmin(adminId) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot delete admin server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can delete admin accounts' };
  }

  const users = getUserList();
  const index = users.findIndex((u) => u.id === adminId && u.role === 'admin');
  if (index === -1) {
    return { success: false, message: 'Admin account not found' };
  }

  users.splice(index, 1);
  setUserList(users);
  return { success: true, message: 'Admin account deleted successfully' };
}

// Admin creates user accounts for their school
export function createUserByAdmin({ name, number, password, role, schoolId, ...rest }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot create user server side' };
  const normalizedNumber = sanitizePhoneNumber(number);

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, message: 'Only admin can create user accounts' };
  }

  const users = getUserList();

  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }

  if (users.some((u) => u.number === normalizedNumber)) {
    return { success: false, message: 'Number already registered' };
  }

  const newUser = {
    id: Date.now(),
    name,
    number: normalizedNumber,
    password,
    role,
    schoolId: currentUser.id, // Link to admin's school
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    parentId: null,
    ...rest
  };

  users.push(newUser);
  setUserList(users);
  return { success: true, user: newUser };
}

export function login({ number, password }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot login server side' };
  const normalizedNumber = sanitizePhoneNumber(number);
  if (!isValidPhoneNumber(normalizedNumber)) {
    return { success: false, message: getPhoneValidationMessage() };
  }
  const users = getUserList();
  const match = users.find((u) => u.number === normalizedNumber && u.password === password);
  if (!match) {
    return { success: false, message: 'Invalid number/password' };
  }
  const { password: _password, ...safeUser } = match;
  localStorage.setItem('school-current-user', JSON.stringify(safeUser));
  return { success: true, user: safeUser };
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('school-current-user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('school-current-user');
}

export function updateUserProfilePhoto({ userId, profilePhoto }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update profile photo server side' };

  const users = getUserList();
  const user = users.find((entry) => entry.id === userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  user.profilePhoto = profilePhoto || '';
  setUserList(users);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    localStorage.setItem('school-current-user', JSON.stringify({ ...currentUser, profilePhoto: user.profilePhoto }));
  }

  return { success: true, user };
}

export function requestPasswordReset(number) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot reset password server side' };
  const users = getUserList();
  const user = users.find((u) => u.number === number);

  // Always return success for security (don't reveal if number exists)
  if (user) {
    // In a real app, this would generate a reset token and send sms/email
    console.log(`Password reset requested for user: ${user.name} (${user.number})`);
  }

  return { success: true, message: 'If an account with this number exists, a reset link has been sent.' };
}

export function resetPassword(token, newPassword) {
  // This would be implemented in a real backend
  // For now, just return success
  return { success: true, message: 'Password reset successfully.' };
}

export function linkParentToStudent({ studentId, parentId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot link server side' };
  const users = getUserList();
  const student = users.find((u) => u.id === studentId);
  if (!student || student.role !== 'student') {
    return { success: false, message: 'Student not found' };
  }
  const parent = users.find((u) => u.id === parentId);
  if (!parent || parent.role !== 'parents') {
    return { success: false, message: 'Parent not found' };
  }
  student.parentId = parentId;
  setUserList(users);
  return { success: true, message: 'Student linked to parent' };
}

export function unlinkParentFromStudent({ studentId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot unlink server side' };
  const users = getUserList();
  const student = users.find((u) => u.id === studentId);
  if (!student) {
    return { success: false, message: 'Student not found' };
  }
  student.parentId = null;
  setUserList(users);
  return { success: true, message: 'Student unlinked from parent' };
}

export function getParentName(parentId) {
  if (typeof window === 'undefined') return null;
  const users = getUserList();
  const parent = users.find((u) => u.id === parentId);
  return parent ? parent.name : null;
}

// Homework Management Functions
export function getHomeworkList() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-homework');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setHomeworkList(homework) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-homework', JSON.stringify(sortLatestFirst(homework)));
}

export function assignHomework({ title, description, dueDate, classId, className, section, teacherId, attachmentUrl, attachmentName }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot assign homework server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can assign homework' };
  }

  const homework = getHomeworkList();
  const newHomework = {
    id: Date.now(),
    title,
    description,
    dueDate,
    classId,
    className: className || currentUser.className || '',
    section: section || currentUser.section || currentUser.sec || '',
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    createdAt: new Date().toISOString(),
    attachmentUrl: attachmentUrl || '',
    attachmentName: attachmentName || '',
    submissions: []
  };

  homework.push(newHomework);
  setHomeworkList(homework);
  return { success: true, homework: newHomework };
}

export function submitHomework({ homeworkId, studentId, submission }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot submit homework server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'student') {
    return { success: false, message: 'Only students can submit homework' };
  }

  const homework = getHomeworkList();
  const hw = homework.find(h => h.id === homeworkId);
  if (!hw) {
    return { success: false, message: 'Homework not found' };
  }

  const existingSubmission = hw.submissions.find(s => s.studentId === currentUser.id);
  if (existingSubmission) {
    existingSubmission.submission = submission;
    existingSubmission.submittedAt = new Date().toISOString();
  } else {
    hw.submissions.push({
      studentId: currentUser.id,
      studentName: currentUser.name,
      submission,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    });
  }

  setHomeworkList(homework);
  return { success: true, message: 'Homework submitted successfully' };
}

export function reviewHomeworkSubmission({
  homeworkId,
  studentId,
  feedback,
  verdict,
  correctedSubmission
}) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot review homework server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can review homework' };
  }

  const homework = getHomeworkList();
  const hw = homework.find((h) => h.id === homeworkId && h.teacherId === currentUser.id);
  if (!hw) {
    return { success: false, message: 'Homework not found' };
  }

  const sub = (hw.submissions || []).find((s) => s.studentId === studentId);
  if (!sub) {
    return { success: false, message: 'Submission not found' };
  }

  sub.teacherFeedback = feedback ?? sub.teacherFeedback ?? '';
  sub.verdict = verdict ?? sub.verdict ?? 'needs_correction';
  sub.correctedSubmission = correctedSubmission ?? sub.correctedSubmission ?? '';
  sub.reviewedBy = currentUser.id;
  sub.reviewedAt = new Date().toISOString();

  setHomeworkList(homework);
  return { success: true, submission: sub };
}

// Attendance Management Functions
export function getAttendanceList() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-attendance');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setAttendanceList(attendance) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-attendance', JSON.stringify(sortLatestFirst(attendance)));
}

export function markAttendance({ studentId, date, status, teacherId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot mark attendance server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can mark attendance' };
  }

  const attendance = getAttendanceList();
  const existingRecord = attendance.find(a => a.studentId === studentId && a.date === date);

  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.markedBy = currentUser.id;
    existingRecord.markedAt = new Date().toISOString();
  } else {
    attendance.push({
      id: Date.now(),
      studentId,
      date,
      status, // 'present', 'absent', 'late'
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      markedAt: new Date().toISOString()
    });
  }

  setAttendanceList(attendance);
  return { success: true, message: 'Attendance marked successfully' };
}

export function updateAttendanceByTeacher({ id, date, status }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update attendance server side' };
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can update attendance' };
  }

  const attendance = getAttendanceList();
  const record = attendance.find((a) => a.id === id && a.teacherId === currentUser.id);
  if (!record) {
    return { success: false, message: 'Attendance record not found' };
  }

  record.date = date || record.date;
  record.status = status || record.status;
  record.markedAt = new Date().toISOString();
  setAttendanceList(attendance);
  return { success: true, attendance: record };
}

export function updateHomeworkByTeacher({ id, title, description, dueDate, className, section, attachmentUrl, attachmentName }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update homework server side' };
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can update homework' };
  }

  const homework = getHomeworkList();
  const hw = homework.find((h) => h.id === id && h.teacherId === currentUser.id);
  if (!hw) {
    return { success: false, message: 'Homework not found' };
  }

  hw.title = title ?? hw.title;
  hw.description = description ?? hw.description;
  hw.dueDate = dueDate ?? hw.dueDate;
  hw.className = className ?? hw.className;
  hw.section = section ?? hw.section;
  if (attachmentUrl !== undefined) hw.attachmentUrl = attachmentUrl;
  if (attachmentName !== undefined) hw.attachmentName = attachmentName;
  hw.updatedAt = new Date().toISOString();
  setHomeworkList(homework);
  return { success: true, homework: hw };
}

export function deleteHomeworkByTeacher(homeworkId) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot delete homework server side' };
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can delete homework' };
  }

  const homework = getHomeworkList();
  const index = homework.findIndex((h) => h.id === homeworkId && h.teacherId === currentUser.id);
  if (index === -1) {
    return { success: false, message: 'Homework not found' };
  }

  homework.splice(index, 1);
  setHomeworkList(homework);
  return { success: true, message: 'Homework deleted successfully' };
}

// Learning Materials Functions
export function getLearningMaterials() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-materials');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setLearningMaterials(materials) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-materials', JSON.stringify(sortLatestFirst(materials)));
}

export function uploadLearningMaterial({ title, type, url, description, className, section, teacherId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot upload material server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can upload learning materials' };
  }

  const materials = getLearningMaterials();
  const newMaterial = {
    id: Date.now(),
    title,
    type, // 'video', 'pdf', 'photo', 'document'
    url,
    description,
    className: className || currentUser.className || '',
    section: section || currentUser.section || currentUser.sec || '',
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    uploadedAt: new Date().toISOString(),
    readBy: [] // Track which students have marked as read
  };

  materials.push(newMaterial);
  setLearningMaterials(materials);
  return { success: true, material: newMaterial };
}

export function updateLearningMaterialByTeacher({ id, title, type, url, description, className, section }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update material server side' };
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can update learning materials' };
  }

  const materials = getLearningMaterials();
  const material = materials.find((m) => m.id === id && m.teacherId === currentUser.id);
  if (!material) {
    return { success: false, message: 'Material not found' };
  }

  material.title = title ?? material.title;
  material.type = type ?? material.type;
  material.url = url ?? material.url;
  material.description = description ?? material.description;
  material.className = className ?? material.className;
  material.section = section ?? material.section;
  material.updatedAt = new Date().toISOString();
  setLearningMaterials(materials);
  return { success: true, material };
}

export function deleteLearningMaterialByTeacher(materialId) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot delete material server side' };
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'teacher') {
    return { success: false, message: 'Only teachers can delete learning materials' };
  }

  const materials = getLearningMaterials();
  const index = materials.findIndex((m) => m.id === materialId && m.teacherId === currentUser.id);
  if (index === -1) {
    return { success: false, message: 'Material not found' };
  }

  materials.splice(index, 1);
  setLearningMaterials(materials);
  return { success: true, message: 'Material deleted successfully' };
}

export function markMaterialAsRead({ materialId, studentId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot mark as read server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'student') {
    return { success: false, message: 'Only students can mark materials as read' };
  }

  const materials = getLearningMaterials();
  const material = materials.find(m => m.id === materialId);
  if (!material) {
    return { success: false, message: 'Material not found' };
  }

  const existingRead = material.readBy.find(r => r.studentId === currentUser.id);
  if (!existingRead) {
    material.readBy.push({
      studentId: currentUser.id,
      studentName: currentUser.name,
      readAt: new Date().toISOString()
    });
  }

  setLearningMaterials(materials);
  return { success: true, message: 'Material marked as read' };
}

// Notifications Functions
export function getNotifications() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-notifications');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setNotifications(notifications) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-notifications', JSON.stringify(sortLatestFirst(notifications)));
}

export function sendNotification({ title, message, targetRole, senderId, notificationDate, attachment }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot send notification server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
    return { success: false, message: 'Only admin and staff can send notifications' };
  }

  const notifications = getNotifications();
  const normalizedNotificationDate = notificationDate || new Date().toISOString().split('T')[0];
  const newNotification = {
    id: Date.now(),
    title,
    message,
    targetRole, // 'all', 'students', 'parents', 'teachers', 'staff'
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    schoolName: currentUser.schoolName || '',
    notificationDate: normalizedNotificationDate,
    sentAt: new Date().toISOString(),
    attachmentName: attachment?.name || '',
    attachmentType: attachment?.type || '',
    attachmentDataUrl: attachment?.dataUrl || '',
    readBy: []
  };

  notifications.push(newNotification);
  setNotifications(notifications);
  return { success: true, notification: newNotification };
}

export function markNotificationAsRead({ notificationId, userId }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot mark as read server side' };

  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (!notification) {
    return { success: false, message: 'Notification not found' };
  }

  const existingRead = notification.readBy.find(r => r.userId === userId);
  if (!existingRead) {
    notification.readBy.push({
      userId,
      readAt: new Date().toISOString()
    });
  }

  setNotifications(notifications);
  return { success: true, message: 'Notification marked as read' };
}

// Fee Structure Functions (for staff)
export function getFeeStructure() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-fees');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setFeeStructure(fees) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-fees', JSON.stringify(sortLatestFirst(fees)));
}

export function getFeePayments() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('school-fee-payments');
    return sortLatestFirst(data ? JSON.parse(data) : []);
  } catch {
    return [];
  }
}

export function setFeePayments(payments) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('school-fee-payments', JSON.stringify(sortLatestFirst(payments)));
}

export function requestFeePayment({
  studentId,
  parentId,
  className,
  amount,
  plan,
  note
}) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot request payment server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'parents') {
    return { success: false, message: 'Only parents can request fee payments' };
  }

  if (!studentId || !amount || !plan) {
    return { success: false, message: 'Student, amount and payment plan are required' };
  }

  const payments = getFeePayments();
  const payment = {
    id: Date.now(),
    studentId,
    parentId: parentId || currentUser.id,
    className: className || '',
    amount: Number(amount),
    plan,
    note: note || '',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  payments.push(payment);
  setFeePayments(payments);
  return { success: true, payment };
}

export function updateFeePaymentStatus({ id, status, paidAt }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update payment server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || !['admin', 'staff', 'superadmin'].includes(currentUser.role)) {
    return { success: false, message: 'Only admin, staff, or superadmin can update payment status' };
  }

  const payments = getFeePayments();
  const payment = payments.find((item) => item.id === id);
  if (!payment) {
    return { success: false, message: 'Payment not found' };
  }

  payment.status = status || payment.status;
  payment.paidAt = paidAt || (status === 'paid' ? new Date().toISOString() : payment.paidAt);
  payment.updatedAt = new Date().toISOString();
  payment.updatedBy = currentUser.id;

  setFeePayments(payments);
  return { success: true, payment };
}

export function bulkCreateUsersFromCsv(csvData) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot bulk create server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    return { success: false, message: 'Only superadmin can bulk create users' };
  }

  const users = getUserList();
  let created = 0;
  let failed = 0;
  const errors = [];

  csvData.forEach((row, index) => {
    try {
      // Parse and trim incoming CSV row values.
      const trimmedRow = {};
      for (const [key, value] of Object.entries(row)) {
        trimmedRow[key] = String(value || '').trim();
      }
      
      const { name, number, password, role, schoolName, ...rest } = trimmedRow;
      const normalizedNumber = sanitizePhoneNumber(number);

      if (!isValidPhoneNumber(normalizedNumber)) {
        failed++;
        errors.push(`Row ${index + 1}: ${getPhoneValidationMessage()}`);
        return;
      }

      const newUser = {
        id: Date.now() + index,
        name: name || '',
        number: normalizedNumber,
        password: password || '',
        role: (role || 'staff').toLowerCase(),
        schoolName: schoolName || '',
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        parentId: null,
        ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k.trim(), v]))
      };


      users.push(newUser);
      created++;
    } catch (e) {
      // Skip only rows that cannot be processed at all.
      failed++;
      errors.push(`Row ${index + 1}: Unable to process user`);
    }
  });


  setUserList(users);
  return { success: true, created, failed, errors };
}

export function updateFeeStructure({ className, feeAmount, description }) {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot update fees server side' };

  const currentUser = getCurrentUser();
  if (!currentUser || !['admin', 'staff', 'superadmin'].includes(currentUser.role)) {
    return { success: false, message: 'Only admin, staff, or superadmin can update fee structure' };
  }

  const fees = getFeeStructure();
  const existingFee = fees.find(f => f.className === className);

  if (existingFee) {
    existingFee.feeAmount = feeAmount;
    existingFee.description = description;
    existingFee.updatedBy = currentUser.id;
    existingFee.updatedAt = new Date().toISOString();
  } else {
    fees.push({
      id: Date.now(),
      className,
      feeAmount,
      description,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    });
  }

  setFeeStructure(fees);
  return { success: true, message: 'Fee structure updated successfully' };
}

