import type { NextApiRequest, NextApiResponse } from "next";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { z } from "zod";
import {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";
import { verifyToken } from "@/utils/auth";

// Types
interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

interface TopicResponse {
  topics: Topic[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TopicError {
  error: string;
  details?: any;
}

// Constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Validation Schemas
const CreateTopicSchema = z.object({
  name: z
    .string()
    .min(1, "Topic name is required")
    .max(100, "Topic name is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
});

const UpdateTopicSchema = z.object({
  id: z.string().min(1, "Topic ID is required"),
  isActive: z.boolean(),
});

// Helper Functions
const getPaginationParams = (query: NextApiRequest["query"]) => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit as string) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Route Handlers
const handleGetTopics = async (
  req: NextApiRequest,
  res: NextApiResponse<TopicResponse | TopicError>
) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { type } = req.query;

    // Build base query
    let baseQuery: CollectionReference<DocumentData> | Query<DocumentData> =
      firestoreDB.collection("topics");

    // Conditionally filter by 'isActive'
    if (type === "active") {
      baseQuery = baseQuery.where("isActive", "==", true);
    }

    // Get total count *after* applying filter
    const totalSnapshot = await baseQuery.count().get();
    const total = totalSnapshot.data().count;

    // Add sort and pagination
    let paginatedQuery = baseQuery
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset);

    const snapshot = await paginatedQuery.get();

    const topics = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Topic)
    );

    res.status(200).json({
      topics,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
};

const handleCreateTopic = async (
  req: NextApiRequest,
  res: NextApiResponse,
  decodedToken: any
) => {
  try {
    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = CreateTopicSchema.parse(req.body);

    const newTopic = {
      ...validatedData,
      isActive: true,
      createdAt: Date.now(),
    };

    const docRef = await firestoreDB.collection("topics").add(newTopic);
    res.status(201).json({ id: docRef.id, ...newTopic });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors,
      });
    }
    console.error("Error creating topic:", error);
    res.status(500).json({ error: "Failed to create topic" });
  }
};

const handleUpdateTopic = async (
  req: NextApiRequest,
  res: NextApiResponse,
  decodedToken: any
) => {
  try {
    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = UpdateTopicSchema.parse(req.body);

    await firestoreDB.collection("topics").doc(validatedData.id).update({
      isActive: validatedData.isActive,
    });
    res.status(200).json({ message: "Topic status updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors,
      });
    }
    console.error("Error updating topic:", error);
    res.status(500).json({ error: "Failed to update topic" });
  }
};

const handleDeleteTopic = async (
  req: NextApiRequest,
  res: NextApiResponse,
  decodedToken: any
) => {
  try {
    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Topic ID is required" });
    }

    // Delete all entries related to this topic
    const entriesSnapshot = await firestoreDB.collection('entries')
      .where('topicId', '==', id)
      .get();

    // Batch delete all related entries
    const batch = firestoreDB.batch();
    entriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the topic
    batch.delete(firestoreDB.collection("topics").doc(id));

    // Commit the batch
    await batch.commit();

    res.status(200).json({ message: "Topic and related entries deleted successfully" });
  } catch (error) {
    console.error("Error deleting topic:", error);
    res.status(500).json({ error: "Failed to delete topic" });
  }
};

// Main Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const decodedToken = await verifyToken(req);

  switch (req.method) {
    case "GET":
      return handleGetTopics(req, res);
    case "POST":
      return handleCreateTopic(req, res, decodedToken);
    case "PATCH":
      return handleUpdateTopic(req, res, decodedToken);
    case "DELETE":
      return handleDeleteTopic(req, res, decodedToken);
    default:
      res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
