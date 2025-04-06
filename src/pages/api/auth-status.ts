import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/utils/auth";
import cookie from "cookie";
import jwt from "jsonwebtoken";

interface AuthStatusResponse {
  isAuthenticated: boolean;
  expiresIn?: number;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthStatusResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { token } = cookie.parse(req.headers.cookie || "");
    
    if (!token) {
      return res.status(200).json({ isAuthenticated: false });
    }
    
    // Verify the token
    const admin = verifyToken(token);
    
    if (!admin) {
      return res.status(200).json({ isAuthenticated: false });
    }
    
    // Decode the token to get expiration time
    const decoded = jwt.decode(token) as { exp?: number };
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : undefined;
    
    return res.status(200).json({ 
      isAuthenticated: true,
      expiresIn
    });
  } catch (error) {
    console.error("Auth status check error:", error);
    return res.status(200).json({ isAuthenticated: false });
  }
}
