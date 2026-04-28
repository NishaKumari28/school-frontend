'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { register, getCurrentUser, sanitizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from './authService';

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    // Redirect if not super admin
    if (!user || user.role !== 'superadmin') {
      router.push('/login');
      return;
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !number || !password || !schoolName) {
      setError('Please fill all fields.');
      return;
    }

    const normalizedNumber = sanitizePhoneNumber(number);

    if (!isValidPhoneNumber(normalizedNumber)) {
      setError(getPhoneValidationMessage());
      return;
    }

    const res = register({ name, number: normalizedNumber, password, role: 'admin', schoolName });
    if (!res.success) {
      setError(res.message);
      return;
    }

    setSuccess('Admin account created successfully! Credentials will be provided to the school administrator.');
    setName('');
    setNumber('');
    setPassword('');
    setSchoolName('');

    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  if (!currentUser || currentUser.role !== 'superadmin') {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <div className='text-4xl mb-4'>🔒</div>
          <h2 className='text-xl font-semibold text-slate-900 mb-2'>Access Denied</h2>
          <p className='text-slate-600'>Only super administrators can create accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='flex justify-center mb-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg'>
            👑
          </div>
        </div>
        <h2 className='text-2xl font-bold text-slate-900 mb-2'>Create School Admin Account</h2>
        <p className='text-slate-600'>Create login credentials for school administrators</p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='schoolName' className='text-sm font-medium text-slate-700'>School Name</label>
          <input
            type='text'
            id='schoolName'
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder='Enter school name'
            className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200'
          />
        </div>

        <div>
          <label htmlFor='name' className='text-sm font-medium text-slate-700'>Administrator Name</label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Enter admin full name'
            className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200'
          />
        </div>

        <div>
          <label htmlFor='number' className='text-sm font-medium text-slate-700'>Admin Phone Number</label>
          <input
          type='text'
          id='number'
          value={number}
          onChange={(e) => setNumber(sanitizePhoneNumber(e.target.value))}
          placeholder='10-digit phone number'
          inputMode='numeric'
          maxLength={10}
          className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200'
        />
        </div>

        <div>
          <label htmlFor='password' className='text-sm font-medium text-slate-700'>Login Password</label>
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              id='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Create secure password'
              className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-3.5 transform text-slate-600 hover:text-slate-900'
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && <p className='text-sm text-red-600 bg-red-50 p-3 rounded-md'>{error}</p>}
        {success && <p className='text-sm text-green-600 bg-green-50 p-3 rounded-md'>{success}</p>}

        <button type='submit' className='w-full rounded bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 transition shadow-lg'>
          Create Admin Account
        </button>
      </form>

      <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
        <h3 className='text-sm font-semibold text-blue-900 mb-2'>📋 Admin Responsibilities:</h3>
        <ul className='text-xs text-blue-800 space-y-1'>
          <li>• Create teacher, student, parent, and non teaching staff accounts</li>
          <li>• Assign roles and provide login credentials</li>
          <li>• Link students to their parents</li>
          <li>• Manage school-specific data</li>
        </ul>
      </div>
    </div>
  );
}
