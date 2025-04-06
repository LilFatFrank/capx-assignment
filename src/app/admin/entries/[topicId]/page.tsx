import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/utils/auth';
import { firestoreDB } from '@/utils/firebaseAdmin';
import EntriesList from './EntriesList';

interface PageProps {
  params: {
    topicId: string;
  };
}

export default async function TopicEntriesPage({ params }: PageProps) {
  // Verify admin authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const admin = verifyToken(token);
  if (!admin) {
    redirect('/admin/login');
  }

  // Fetch the topic to verify it exists
  const topicDoc = await firestoreDB.collection('topics').doc(params.topicId).get();
  
  if (!topicDoc.exists) {
    redirect('/admin'); // Redirect to admin dashboard if topic doesn't exist
  }

  const topic = topicDoc.data();

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{topic?.name}</h1>
        <p className="text-gray-600 mb-4">{topic?.description}</p>
        <a
          href="/admin"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          ← Back to Dashboard
        </a>
      </div>
      <EntriesList topicId={params.topicId} topicName={topic?.name || ''} />
    </div>
  );
} 