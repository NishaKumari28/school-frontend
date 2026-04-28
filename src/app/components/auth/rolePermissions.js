export const rolePermissions = {
  superadmin: {
    title: 'Super Admin',
    description: 'Complete system access. Create and manage admin accounts for schools.',
    permissions: ['Create admin accounts', 'Full system access', 'Manage all schools', 'System configuration'],
  },
  admin: {
    title: 'School Admin',
    description: 'Manage school users, assign roles, and provide login credentials.',
    permissions: ['Create user accounts', 'Assign roles', 'Link students to parents', 'Manage school data', 'View all users'],
  },
  teacher: {
    title: 'Teacher',
    description: 'Assign homework, mark attendance, check submissions, and manage learning materials.',
    permissions: ['Assign homework', 'Mark attendance', 'Check homework submissions', 'Upload learning materials', 'View student progress'],
  },
  student: {
    title: 'Student',
    description: 'View homework, submit assignments, access learning materials, and track progress.',
    permissions: ['View homework', 'Submit assignments', 'Access learning materials', 'Mark materials as read', 'Track homework progress'],
  },
  parents: {
    title: 'Parent',
    description: 'View children\'s attendance, performance, notifications, and school announcements.',
    permissions: ['View child attendance', 'View child performance', 'Read notifications', 'Access school announcements'],
  },
  staff: {
    title: 'Non Teaching Staff',
    description: 'Manage fee structures, send notifications (with admin permission), and support operations.',
    permissions: ['View fee structure', 'Send notifications (with permission)', 'Manage school operations', 'Support administration'],
  },
};

export const roles = Object.keys(rolePermissions);
