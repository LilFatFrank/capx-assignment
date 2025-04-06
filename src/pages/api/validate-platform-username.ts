import { NextApiRequest, NextApiResponse } from "next";

// Mock validation function
const validatePlatformUsername = (username: string): boolean => {
  // This is a mock implementation that simulates an external API
  // In a real application, this would call an actual third-party service
  
  // For demonstration purposes, we'll consider usernames with special characters as invalid
  const hasSpecialChars = /[^a-zA-Z0-9_\.]/.test(username);
  
  // Usernames that are too short or too long are invalid
  const isInvalidLength = username.length < 3 || username.length > 20;
  
  // Usernames that start with a number are invalid
  const startsWithNumber = /^[0-9]/.test(username);
  
  return !hasSpecialChars && !isInvalidLength && !startsWithNumber;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const isValid = validatePlatformUsername(username);

    return res.status(200).json({ isValid });
  } catch (error) {
    console.error("Error validating platform username:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
