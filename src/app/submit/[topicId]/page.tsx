import { redirect } from 'next/navigation';
import { firestoreDB } from '@/utils/firebaseAdmin';
import EntryForm from './EntryForm';

interface PageProps {
  params: {
    topicId: string;
  };
}

export default async function SubmitEntryPage({ params }: PageProps) {
  try {
    // Fetch the topic to verify it exists and is active
    const topicDoc = await firestoreDB.collection('topics').doc(params.topicId).get();
    
    if (!topicDoc.exists) {
      redirect('/'); // Redirect to home if topic doesn't exist
    }

    const topic = topicDoc.data();
    
    if (!topic?.isActive) {
      redirect('/'); // Redirect to home if topic is not active
    }

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Submit Entry for {topic.name}</h1>
        <p className="mb-6 text-gray-600">{topic.description}</p>
        <EntryForm topicId={params.topicId} topicName={topic.name} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching topic:', error);
    redirect('/'); // Redirect to home on error
  }
} 
