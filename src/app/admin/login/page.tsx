import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/utils/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const admin = verifyToken(token);

  if (admin) {
    redirect('/admin');
  }

  return <LoginForm />;
}
