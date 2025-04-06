import { cookies } from 'next/headers';
import { verifyToken } from './auth';

/**
 * Check if the user is authenticated on the server side
 * @returns boolean indicating if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const admin = verifyToken(token);
    return !!admin;
  } catch (error) {
    console.error('Authentication check error:', error);
    return false;
  }
}
