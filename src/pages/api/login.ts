// /pages/api/admin/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { signToken } from '@/utils/auth';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  // Validate against environment variables (for simplicity)
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Create a JWT token
    const token = signToken({ username });
    // Set HttpOnly cookie
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
    }));
    return res.status(200).json({ message: 'Login successful' });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}
