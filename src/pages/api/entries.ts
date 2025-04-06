// pages/api/entries.ts
import { NextApiRequest, NextApiResponse } from "next";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { z } from "zod";
import { isAddress } from "viem";
import { verifyToken } from "@/utils/auth";
import cookie from "cookie";
import { Query, DocumentData } from "firebase-admin/firestore";

// Define the schema for an entry using zod
const EntrySchema = z.object({
  topicId: z.string().min(1, "Topic ID is required"),
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
    .or(z.literal("")), // Allow empty string
  email: z
    .string()
    .email("Invalid email address")
    .max(254, "Email address is too long"),
});

interface EntryData {
  topicId: string;
  telegramUsername: string;
  platformUsername: string;
  walletAddress: string;
  discordUsername?: string;
  email: string;
  createdAt: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const entriesCollection = firestoreDB.collection("entries");

  // Verify admin authentication for DELETE requests
  if (req.method === "DELETE") {
    const { token } = cookie.parse(req.headers.cookie || "");
    const admin = verifyToken(token || "");

    if (!admin) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Entry ID is required" });
      }

      const entryRef = entriesCollection.doc(id);
      const entry = await entryRef.get();

      if (!entry.exists) {
        return res.status(404).json({ error: "Entry not found" });
      }

      await entryRef.delete();
      res.status(200).json({ message: "Entry deleted successfully" });
    } catch (error) {
      console.error("Error in DELETE /api/entries:", error);
      if (error instanceof Error) {
        if (error.message.includes("expired")) {
          return res
            .status(401)
            .json({ error: "Token has expired", code: "TOKEN_EXPIRED" });
        }
        if (error.message.includes("Invalid token")) {
          return res
            .status(401)
            .json({ error: "Invalid token", code: "INVALID_TOKEN" });
        }
      }
      res.status(500).json({ error: "Failed to delete entry" });
    }
  } else if (req.method === "GET") {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const topicId = req.query.topicId as string;

      // Start with collection reference
      let entriesQuery: Query<DocumentData> = entriesCollection;
      
      // Add topic filter if provided
      if (topicId) {
        entriesQuery = entriesQuery.where("topicId", "==", topicId);
      }

      // Get total count
      const totalSnapshot = await entriesQuery.count().get();
      const total = totalSnapshot.data().count;

      // Get all entries for the topic first
      const querySnapshot = await entriesQuery.get();

      // Sort and paginate in memory
      const entries = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EntryData & { id: string }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(offset, offset + limit);

      res.status(200).json({ 
        entries,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  } else if (req.method === "POST") {
    try {
      // Validate the incoming data against the schema
      const data = EntrySchema.parse(req.body);

      // Check for duplicate wallet address across all topics
      const walletQuery = await entriesCollection
        .where("walletAddress", "==", data.walletAddress)
        .get();

      if (!walletQuery.empty) {
        return res.status(400).json({
          error: "This wallet address has already been used for another submission",
        });
      }

      // Check for duplicate email across all topics
      const emailQuery = await entriesCollection
        .where("email", "==", data.email)
        .get();

      if (!emailQuery.empty) {
        return res.status(400).json({
          error: "This email address has already been used for another submission",
        });
      }

      // Check for duplicate entry in the same topic
      const duplicateQuery = await entriesCollection
        .where("topicId", "==", data.topicId)
        .where("telegramUsername", "==", data.telegramUsername)
        .where("platformUsername", "==", data.platformUsername)
        .get();

      if (!duplicateQuery.empty) {
        return res.status(400).json({
          error: "You have already submitted an entry for this topic",
        });
      }

      const newEntry = {
        ...data,
        createdAt: Date.now(),
      };

      const docRef = await entriesCollection.add(newEntry);
      res.status(201).json({ id: docRef.id, ...newEntry });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Return validation errors in a structured format
        res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      } else {
        console.error("Error creating entry:", error);
        res.status(500).json({ error: "Failed to create entry" });
      }
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
