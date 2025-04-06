import type { NextApiRequest, NextApiResponse } from 'next';
import { signToken } from '@/utils/auth';
import cookie from 'cookie';
import { z } from 'zod';

// Types
interface LoginResponse {
  message: string;
  error?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

// Constants
const COOKIE_MAX_AGE = 3600; // 1 hour in seconds
const COOKIE_PATH = '/';

// Validation Schema
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Helper Functions
const validateCredentials = (credentials: LoginCredentials): boolean => {
  return (
    credentials.username === process.env.ADMIN_USERNAME &&
    credentials.password === process.env.ADMIN_PASSWORD
  );
};

const setAuthCookie = (res: NextApiResponse, token: string): void => {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: COOKIE_PATH,
    })
  );
};

// Main Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Validate request body
    const credentials = LoginSchema.parse(req.body);

    // Check credentials
    if (!validateCredentials(credentials)) {
      res.status(401).json({ 
        message: 'Login failed',
        error: 'Invalid credentials' 
      });
      return;
    }

    // Create and set JWT token
    const token = signToken({ username: credentials.username });
    setAuthCookie(res, token);

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Login failed',
        error: 'Invalid request format' 
      });
      return;
    }
    
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: 'Internal server error' 
    });
  }
}
