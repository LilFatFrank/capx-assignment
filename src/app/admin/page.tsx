import AdminDashboardClient from './AdminDashboardClient';
import { firestoreDB } from '@/utils/firebaseAdmin';

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

export default async function AdminDashboard() {
  // Fetch initial topics from the server
  const topicsSnapshot = await firestoreDB.collection('topics').orderBy('createdAt', 'desc').get();
  const initialTopics = topicsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Topic[];

  return <AdminDashboardClient initialTopics={initialTopics} />;
}
