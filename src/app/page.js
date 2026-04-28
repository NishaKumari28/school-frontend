
// landing page for all the users


'use client';
import Link from 'next/link';
import { getCurrentUser, initializeDefaultSuperAdmin } from './components/auth/authService';
import { useEffect, useState } from 'react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeDefaultSuperAdmin();
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  if (!currentUser) {
    return (
      <main className='min-h-screen bg-gradient-to-b from-blue-600 via-cyan-200 to-white text-slate-900'>
        <header className='sticky top-0 z-20 bg-white border-b border-slate-200'>
          <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4'>
            <div className='flex items-center gap-3'>
              {/* Vista's Learning Proper Logo */}
              <img src='https://play-lh.googleusercontent.com/SwRA5CRtwVlGHVg75qaZbxc6ivcJ7mVkErDDudhpZ37Vr32U_PzV1NffrnnsD9dM5g' alt="Vista's Learning Logo" className='w-12 h-12 object-contain rounded-md' />
              <div>
                <h1 className='text-2xl font-bold text-blue-900'>Vista's Learning</h1>
                <p className='text-xs text-slate-500'>School Management System</p>
              </div>
            </div>
            
             {/* login button for header ...
             
             <div className='flex items-center gap-3'>
              <Link href='/login' className='rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 transition'>Login</Link>
            </div> */}
          </div>
        </header>

        <div className='mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6'>
          <section className='w-full max-w-2xl rounded-2xl border border-blue-100 bg-white/80 p-8 shadow-lg text-center'>
            <div className='mb-6'>
              <div className='flex justify-center mb-4'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-2xl font-bold text-white shadow-lg'>
                  👑
                </div>
              </div>
              <h1 className='text-3xl font-bold text-blue-900 sm:text-4xl mb-2'>User's Portal</h1>
              <p className='text-base text-slate-700'>Use your credential and login to your dashboard</p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 mb-6'>
              <div className='rounded-lg bg-blue-50 p-4'>
                <div className='text-2xl mb-2'>🏫</div>
                <h3 className='font-semibold text-blue-900'>School Management</h3>
                <p className='text-sm text-blue-700'>Create admin accounts for schools</p>
              </div>
              <div className='rounded-lg bg-green-50 p-4'>
                <div className='text-2xl mb-2'>👥</div>
                <h3 className='font-semibold text-green-900'>User Management</h3>
                <p className='text-sm text-green-700'>Admins manage teachers, students, parents</p>
              </div>
            </div>

            <div className='space-y-3'>
              <Link href='/login' className='inline-block w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition'>
Login
              </Link>
              <p className='text-xs text-slate-500'>Only authorized administrators can access this system</p>
            </div>
          </section>
        </div>

        <footer className='border-t border-slate-200 bg-white py-5'>
          <div className='mx-auto flex flex-col items-center justify-center gap-2 px-4 text-sm text-slate-500 sm:px-6 sm:flex-row sm:justify-between'>
            <div className='flex items-center gap-2'>
              <img src='https://play-lh.googleusercontent.com/SwRA5CRtwVlGHVg75qaZbxc6ivcJ7mVkErDDudhpZ37Vr32U_PzV1NffrnnsD9dM5g' alt="Vista's Learning Logo" className='w-6 h-6 object-contain rounded-sm' />
              <span>© {new Date().getFullYear()} Vista's Learning School Management System (VSMS). All rights reserved.</span>
            </div>
            <span>Built for educational management</span>
          </div>
        </footer>
      </main>
    );
  }

  // User is logged in, redirect to dashboard
  return (
    <main className='min-h-screen flex items-center justify-center bg-slate-50'>
      <div className='text-center'>
        <p className='text-lg mb-4'>Redirecting to dashboard...</p>
        <Link href='/dashboard' className='text-blue-600 hover:text-blue-800'>
          Click here if not redirected
        </Link>
      </div>
    </main>
  );
}
