import { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { getApp } from "firebase-admin/app";

interface AuthStatusResponse {
  isAuthenticated: boolean;
  expiresIn?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthStatusResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ isAuthenticated: false });
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(200).json({ isAuthenticated: false });
    }
    
    // Verify the token with Firebase Admin
    const decodedToken = await getAuth(getApp()).verifyIdToken(token);
    
    // Calculate expiration time
    const expiresIn = decodedToken.exp ? decodedToken.exp - Math.floor(Date.now() / 1000) : undefined;
    
    return res.status(200).json({ 
      isAuthenticated: true,
      expiresIn
    });
  } catch (error) {
    console.error("Auth status check error:", error);
    return res.status(200).json({ isAuthenticated: false });
  }
}
