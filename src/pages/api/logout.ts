import type { NextApiRequest, NextApiResponse } from 'next';

interface LogoutResponse {
  message: string;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  try {
    // Clear the token cookie
    const cookieOptions = [
      'token=',
      'Path=/',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'HttpOnly',
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Logout failed',
      error: 'Internal server error' 
    });
  }
}
