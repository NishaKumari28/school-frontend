'use client';
import { roles } from './rolePermissions';

export default function RoleSelect({ value, onChange }) {
  return (
    <div>
      <label className='text-sm font-medium text-slate-700' htmlFor='role'>Role</label>
      <select
        id='role'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
      >
        <option value=''>Select a role</option>
        {roles.map((role) => (
          <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}
