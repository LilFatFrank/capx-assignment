import { NextApiRequest } from "next";
import { auth } from "@/utils/firebaseAdmin";

export async function verifyToken(req: NextApiRequest) {
  try {
    // Check for token in cookies
    let token = req.cookies.token;
    console.log("verifyToken: Cookie token:", token ? "Token exists" : "No token in cookies");
    
    // If no token in cookies, check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      console.log("verifyToken: Authorization header:", authHeader);
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log("verifyToken: Extracted token from Authorization header");
      }
    }
    
    if (!token) {
      console.log("verifyToken: No token found in cookies or Authorization header");
      return null;
    }

    console.log("verifyToken: Verifying token");
    const decodedToken = await auth.verifyIdToken(token);
    console.log("verifyToken: Token verified successfully");
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
} 