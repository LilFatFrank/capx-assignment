import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/utils/auth";
import cookie from "cookie";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { token } = cookie.parse(req.headers.cookie || "");
    const admin = verifyToken(token || "");
    
    return res.status(200).json({ isAuthenticated: !!admin });
  } catch (error) {
    console.error("Auth status check error:", error);
    return res.status(200).json({ isAuthenticated: false });
  }
}
