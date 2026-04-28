import Papa from 'papaparse';

/**
 * Maps a user object to a flat CSV row based on role.
 * Includes common fields + role-specific fields.
 */
export function mapUserToCsvRow(user) {
  const base = {
    id: user.id || '',
    name: user.name || '',
    number: user.number || '',
    password: user.password || '',
    role: user.role || '',
    schoolName: user.schoolName || '',
    board: user.board || '',
    schoolArea: user.schoolArea || '',
    schoolType: user.schoolType || '',
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || ''
  };

  switch (user.role) {
    case 'admin':
      return {
        ...base,
        className: user.className || '',
        section: user.section || '',
        academicYear: user.academicYear || '',
        schoolType: user.schoolType || ''
      };
    case 'teacher':
      return {
        ...base,
        subject: user.subject || '',
        qualification: user.qualification || '',
        className: user.className || '',
        section: user.section || user.sec || ''
      };
    case 'student':
      return {
        ...base,
        className: user.className || '',
        section: user.section || user.sec || '',
        academicYear: user.academicYear || user.admissionYear || '',
        address: user.address || '',
        parentName: user.parentName || '',
        parentId: user.parentId || ''
      };
    case 'parents':
      return {
        ...base,
        address: user.address || '',
        childName: user.childName || '',
        childClass: user.childClass || '',
        childSection: user.childSection || '',
        relationWithChild: user.relationWithChild || ''
      };
    case 'staff':
      return {
        ...base,
        qualification: user.qualification || '',
        designation: user.designation || ''
      };
    default:
      return base;
  }
}

/**
 * Get human-readable headers for a given role's CSV.
 */
export function getCsvHeaders(role) {
  const common = ['ID', 'Name', 'Phone Number', 'Password', 'Role', 'School Name', 'Board', 'School Area', 'School Type', 'Created At', 'Updated At'];

  switch (role) {
    case 'admin':
      return [...common.slice(0, -2), 'Classes', 'Sections', 'Academic Years', 'School Type', 'Created At', 'Updated At'];
    case 'teacher':
      return [...common.slice(0, -2), 'Subject', 'Qualification', 'Class', 'Section', 'Created At', 'Updated At'];
    case 'student':
      return [...common.slice(0, -2), 'Class', 'Section', 'Academic Year', 'Address', 'Parent Name', 'Parent ID', 'Created At', 'Updated At'];
    case 'parents':
      return [...common.slice(0, -2), 'Address', 'Child Name', 'Child Class', 'Child Section', 'Relation With Child', 'Created At', 'Updated At'];
    case 'staff':
      return [...common.slice(0, -2), 'Qualification', 'Designation', 'Created At', 'Updated At'];
    default:
      return common;
  }
}

/**
 * Generate filename based on role, quantity, and timestamp.
 */
export function generateFilename(role, quantity) {
  const displayRole = role === 'all' ? 'All_Users' : role === 'parents' ? 'Parents' : role === 'staff' ? 'No_Teaching_Staff' : role.charAt(0).toUpperCase() + role.slice(1) + 's';
  const timestamp = new Date().toISOString().split('T')[0];
  return `${displayRole}_${quantity}_Records_${timestamp}.csv`;
}

/**
 * Generate and download CSV from user array with optional quantity limit.
 */
export function downloadUsersCsv(users, role = 'all', quantity = null) {
  if (!users || users.length === 0) {
    alert('No users available to download.');
    return;
  }

  const limit = quantity && quantity > 0 ? Math.min(quantity, users.length) : users.length;
  const slicedUsers = users.slice(0, limit);

  const rows = slicedUsers.map(mapUserToCsvRow);

  // For mixed roles, include all possible fields
  const csv = Papa.unparse({
    fields: getCsvHeaders(role),
    data: rows
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', generateFilename(role, limit));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

