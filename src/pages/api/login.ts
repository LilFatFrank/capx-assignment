import type { NextApiRequest, NextApiResponse } from 'next';
import { signToken, verifyPassword } from '@/utils/auth';
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
  // Get the stored password hash from environment variable
  const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!storedPasswordHash) {
    console.error('ADMIN_PASSWORD_HASH environment variable is not set');
    return false;
  }

  // Verify the password against the stored hash
  return (
    credentials.username === process.env.ADMIN_USERNAME &&
    verifyPassword(credentials.password, storedPasswordHash)
  );
};

const setAuthCookie = (res: NextApiResponse, token: string): void => {
  const cookieOptions = [
    `token=${token}`,
    `Path=${COOKIE_PATH}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
  ];
  
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
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
