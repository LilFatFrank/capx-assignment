import { NextApiRequest, NextApiResponse } from "next";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { z } from "zod";
import { isAddress } from "viem";
import { verifyToken } from "@/utils/auth";
import { Query, DocumentData } from "firebase-admin/firestore";

// Constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Types
interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EntryResponse {
  entries: EntryData[];
  pagination: PaginationResponse;
}

interface EntryData {
  id: string;
  topicId: string;
  telegramUsername: string;
  platformUsername: string;
  walletAddress: string;
  discordUsername?: string;
  email: string;
  createdAt: number;
}

// Validation Schema
const EntrySchema = z.object({
  topicId: z.string().min(1, "Topic ID is required"),
  topicName: z.string(),
  telegramUsername: z
    .string()
    .min(1, "Telegram username is required")
    .max(32, "Telegram username is too long")
    .regex(
      /^@[a-zA-Z0-9_]+$/,
      "Telegram username must start with '@' and can only contain letters, numbers, and underscores after the '@'"
    ),
  platformUsername: z
    .string()
    .min(1, "Platform username is required")
    .max(50, "Platform username is too long")
    .refine(
      (username) => {
        // Use the same validation rules as in validate-platform-username.ts
        const hasSpecialChars = /[^a-zA-Z0-9_\.]/.test(username);
        const isInvalidLength = username.length < 3 || username.length > 20;
        const startsWithNumber = /^[0-9]/.test(username);
        
        return !hasSpecialChars && !isInvalidLength && !startsWithNumber;
      },
      {
        message: "Platform username must be 3-20 characters long, start with a letter, and contain only letters, numbers, underscores, and dots"
      }
    ),
  walletAddress: z
    .string()
    .min(1, "Wallet address is required")
    .refine((address) => isAddress(address), "Invalid Ethereum wallet address"),
  discordUsername: z
    .string()
    .max(32, "Discord username is too long")
    .regex(
      /^[a-zA-Z0-9_#]+$/,
      "Discord username can only contain letters, numbers, underscores, and #"
    )
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .max(254, "Email address is too long"),
});

// Helper Functions
const getPaginationParams = (query: NextApiRequest['query']): PaginationParams => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit as string) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Route Handlers
const handleGetEntries = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const topicId = req.query.topicId as string;
    const topicName = req.query.topicName as string;

    let entriesQuery: Query<DocumentData> = firestoreDB.collection("entries");
    
    // Apply topicId filter if provided
    if (topicId) {
      entriesQuery = entriesQuery.where("topicId", "==", topicId);
    }
    
    // Apply topicName filter if provided and no topicId
    if (topicName && !topicId) {
      // Get all entries first since Firestore doesn't support LIKE queries
      const querySnapshot = await entriesQuery.get();
      const filteredDocs = querySnapshot.docs.filter(doc => {
        const docTopicName = doc.data().topicName as string;
        return docTopicName.toLowerCase().includes(topicName.toLowerCase());
      });

      // Calculate total for pagination
      const total = filteredDocs.length;

      // Apply manual pagination
      const entries = filteredDocs
        .slice(offset, offset + limit)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EntryData));

      const response: EntryResponse = {
        entries,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

      return res.status(200).json(response);
    }

    // Get total count for pagination if no topicName filter
    const totalSnapshot = await entriesQuery.count().get();
    const total = totalSnapshot.data().count;

    // Apply pagination with ordering
    entriesQuery = entriesQuery
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset);

    const querySnapshot = await entriesQuery.get();

    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EntryData));

    const response: EntryResponse = {
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
};

const handlePostEntry = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const data = EntrySchema.parse(req.body);

    // Check for duplicates in the same topic
    const duplicatesQuery = await firestoreDB.collection("entries")
      .where("topicId", "==", data.topicId)
      .get();

    const duplicates = duplicatesQuery.docs;
    
    // Check for duplicate wallet address
    const duplicateWallet = duplicates.some(doc => doc.data().walletAddress === data.walletAddress);
    if (duplicateWallet) {
      return res.status(400).json({
        error: "This wallet address has already been submitted for this topic",
      });
    }

    // Check for duplicate email
    const duplicateEmail = duplicates.some(doc => doc.data().email === data.email);
    if (duplicateEmail) {
      return res.status(400).json({
        error: "This email address has already been submitted for this topic",
      });
    }

    // Check for duplicate telegram username
    const duplicateTelegram = duplicates.some(doc => doc.data().telegramUsername === data.telegramUsername);
    if (duplicateTelegram) {
      return res.status(400).json({
        error: "This Telegram username has already been submitted for this topic",
      });
    }

    // Check for duplicate platform username
    const duplicatePlatform = duplicates.some(doc => doc.data().platformUsername === data.platformUsername);
    if (duplicatePlatform) {
      return res.status(400).json({
        error: "This platform username has already been submitted for this topic",
      });
    }

    const newEntry = {
      ...data,
      createdAt: Date.now(),
    };

    const docRef = await firestoreDB.collection("entries").add(newEntry);
    res.status(201).json({ id: docRef.id, ...newEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.errors,
      });
    } else {
      console.error("Error creating entry:", error);
      res.status(500).json({ error: "Failed to create entry" });
    }
  }
};

const handleDeleteEntry = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Entry ID is required" });
    }
    await firestoreDB.collection("entries").doc(id).delete();
    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
};

// Main Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Only verify token for admin operations
  if (req.method !== "POST") {
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const token = cookies?.token;
    const admin = verifyToken(token || "");

    if (!admin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  switch (req.method) {
    case "GET":
      return handleGetEntries(req, res);
    case "POST":
      return handlePostEntry(req, res);
    case "DELETE":
      return handleDeleteEntry(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
