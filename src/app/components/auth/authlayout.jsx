'use client';
import Link from 'next/link';

export default function AuthLayout({ title, children }) {
  return (
    <main className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
      <div className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm'>
        <header className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900'>{title}</h1>
          <p className='mt-1 text-sm text-slate-600'>Use your school account.</p>
        </header>

        {children}

        <div className='mt-6 text-sm text-slate-500'>
          <Link href='/' className='text-blue-600 hover:underline'>Go back to Home</Link>
        </div>
      </div>
    </main>
  );
}
