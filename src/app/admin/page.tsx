import AdminDashboardClient from "../../components/AdminDashboardClient";
import { firestoreDB } from "@/utils/firebaseAdmin";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/utils/serverAuth";

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

export default async function AdminDashboard() {
  // Check authentication status
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  // Fetch initial topics from the server
  const topicsSnapshot = await firestoreDB
    .collection("topics")
    .orderBy("createdAt", "desc")
    .get();
  const initialTopics = topicsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Topic[];

  return (
    <div className="container mx-auto px-4 py-3">
      <AdminDashboardClient initialTopics={initialTopics} />
    </div>
  );
}
