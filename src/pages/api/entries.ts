import { NextApiRequest, NextApiResponse } from "next";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { z } from "zod";
import { isAddress } from "viem";
import { verifyToken } from "@/utils/auth";
import cookie from "cookie";
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
      /^[a-zA-Z0-9_]+$/,
      "Telegram username can only contain letters, numbers, and underscores"
    ),
  platformUsername: z
    .string()
    .min(1, "Platform username is required")
    .max(50, "Platform username is too long"),
  walletAddress: z
    .string()
    .min(1, "Wallet address is required")
    .refine((address) => isAddress(address), "Invalid Ethereum wallet address"),
  discordUsername: z
    .string()
    .max(32, "Discord username is too long")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Discord username can only contain letters, numbers, and underscores"
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

const handleAuthError = (error: Error, res: NextApiResponse) => {
  if (error.message.includes("expired")) {
    return res.status(401).json({ error: "Token has expired", code: "TOKEN_EXPIRED" });
  }
  if (error.message.includes("Invalid token")) {
    return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
  }
  return res.status(500).json({ error: "Authentication error" });
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

    // Check for any duplicates in the same topic
    const duplicatesQuery = await firestoreDB.collection("entries")
      .where("topicId", "==", data.topicId)
      .get();

    const duplicates = duplicatesQuery.docs;
    
    // Check for duplicates in the same topic
    const duplicateWallet = duplicates.some(doc => doc.data().walletAddress === data.walletAddress);
    const duplicateEmail = duplicates.some(doc => doc.data().email === data.email);
    const duplicateUser = duplicates.some(
      doc => 
        doc.data().telegramUsername === data.telegramUsername && 
        doc.data().platformUsername === data.platformUsername
    );

    if (duplicateWallet) {
      return res.status(400).json({
        error: "This wallet address has already been used for this topic",
      });
    }

    if (duplicateEmail) {
      return res.status(400).json({
        error: "This email address has already been used for this topic",
      });
    }

    if (duplicateUser) {
      return res.status(400).json({
        error: "You have already submitted an entry for this topic",
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

    const entryRef = firestoreDB.collection("entries").doc(id);
    const entry = await entryRef.get();

    if (!entry.exists) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await entryRef.delete();
    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return handleAuthError(error, res);
    }
    res.status(500).json({ error: "Failed to delete entry" });
  }
};

// Main Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Only verify token for admin operations (GET and DELETE)
  if (req.method !== "POST") {
    const { token } = cookie.parse(req.headers.cookie || "");
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
