'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset } from './authService';

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');

    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    if (!email.includes('@')) {
      setMessage('Please enter a valid email address.');
      return;
    }

    const result = requestPasswordReset(email);
    setMessage(result.message);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className='text-center space-y-4'>
        <div className='text-green-600 text-lg font-semibold'>✓ Check Your Email</div>
        <p className='text-sm text-slate-600'>
          If an account with this email exists, we've sent you a password reset link.
        </p>
        <div className='space-y-2'>
          <Link href='/login' className='block w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'>
            Back to Login
          </Link>
          <button
            onClick={() => {
              setIsSuccess(false);
              setMessage('');
              setEmail('');
            }}
            className='text-sm text-blue-600 hover:text-blue-800 hover:underline'
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label htmlFor='email' className='text-sm font-medium text-slate-700'>Email Address</label>
        <input
          type='email'
          id='email'
          placeholder='Enter your registered email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
        />
      </div>

      {message && (
        <p className={`text-sm ${message.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <button
        type='submit'
        className='w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
      >
        Send Reset Link
      </button>

      <div className='text-center'>
        <Link href='/login' className='text-sm text-blue-600 hover:text-blue-800 hover:underline'>
          Back to Login
        </Link>
      </div>
    </form>
  );
}