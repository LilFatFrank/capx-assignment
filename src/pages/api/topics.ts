// /pages/api/topics.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { verifyToken } from "@/utils/auth";
import cookie from "cookie";
import { z } from "zod";

// Define schemas for topic operations
const CreateTopicSchema = z.object({
  name: z.string().min(1, "Topic name is required").max(100, "Topic name is too long"),
  description: z.string().min(1, "Description is required").max(500, "Description is too long"),
});

const UpdateTopicSchema = z.object({
  id: z.string().min(1, "Topic ID is required"),
  isActive: z.boolean(),
});

interface Topic {
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get token from cookies
  const { token } = cookie.parse(req.headers.cookie || "");
  const admin = verifyToken(token || "");

  if (!admin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const topicsCollection = firestoreDB.collection("topics");

  if (req.method === "GET") {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const totalSnapshot = await topicsCollection.count().get();
      const total = totalSnapshot.data().count;

      // Get paginated data
      const snapshot = await topicsCollection
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const topics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json({ 
        topics,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  } else if (req.method === "POST") {
    try {
      // Validate the incoming data
      const validatedData = CreateTopicSchema.parse(req.body);
      
      const newTopic: Topic = {
        ...validatedData,
        isActive: true,
        createdAt: Date.now(),
      };
      const docRef = await topicsCollection.add(newTopic);
      res.status(201).json({ id: docRef.id, ...newTopic });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create topic" });
    }
  } else if (req.method === "PATCH") {
    try {
      // Validate the update data
      const validatedData = UpdateTopicSchema.parse(req.body);
      
      await topicsCollection.doc(validatedData.id).update({ 
        isActive: validatedData.isActive 
      });
      res.status(200).json({ message: "Topic status updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to update topic" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Topic ID is required" });
      }
      await topicsCollection.doc(id).delete();
      res.status(200).json({ message: "Topic deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topic" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
