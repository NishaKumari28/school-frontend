'use client';
import AuthLayout from '../components/auth/authlayout';
import LoginForm from '../components/auth/loginform';

export default function LoginPage() {
  return (
    <AuthLayout title='Login'> 
      <LoginForm />
    </AuthLayout>
  );
}
