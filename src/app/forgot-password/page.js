'use client';
import AuthLayout from '../components/auth/authlayout';
import ForgotPasswordForm from '../components/auth/forgotpasswordform';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title='Forgot Password'>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}