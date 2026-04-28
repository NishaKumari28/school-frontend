'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, initializeDefaultSuperAdmin, sanitizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from './authService';

export default function LoginForm() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize default super admin on login page load
    initializeDefaultSuperAdmin();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const normalizedNumber = sanitizePhoneNumber(number);

    if (!normalizedNumber || !password) {
      setError('Please fill all fields.');
      return;
    }

    if (!isValidPhoneNumber(normalizedNumber)) {
      setError(getPhoneValidationMessage());
      return;
    }

   const res = login({
  number: normalizedNumber,
  password: password.trim()
                        }); 
    if (!res.success) {
      setError(res.message);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label htmlFor='number' className='text-sm font-medium text-slate-700'>Phone Number</label>
        <input
          type='text'
          id='number'
          placeholder='Enter your phone number'
          value={number}
          onChange={(e) => setNumber(sanitizePhoneNumber(e.target.value))}
          inputMode='numeric'
          maxLength={10}
          className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
        />
      </div>

      <div>
        <label htmlFor='password' className='text-sm font-medium text-slate-700'>Password</label>
        <div className='relative'>
          <input
            type={showPassword ? 'text' : 'password'}
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
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

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <button
        type='submit'
        className='w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
      >
        Login
      </button>

      <div className='text-center'>
        {/* <Link href='/forgot-password' className='text-sm text-blue-600 hover:text-blue-800 hover:underline'>
          Forgot Password?
        </Link> */}
      </div>
    </form>
  );
}
