'use client';
import AuthLayout from '../components/auth/authlayout';
import RegisterForm from '../components/auth/registerform';

export default function RegisterPage() {
  return (
    <AuthLayout title='Register'>
      <RegisterForm />
    </AuthLayout>
  );
}
