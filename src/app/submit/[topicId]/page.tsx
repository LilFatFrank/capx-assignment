import { redirect } from 'next/navigation';
import { firestoreDB } from '@/utils/firebaseAdmin';
import EntryForm from '../../../components/EntryForm';
import Link from 'next/link';

export default async function SubmitEntryPage(
  props: Awaited<ReturnType<() => Promise<{ params: { topicId: string } }>>>
) {
  const { params } = props;
  try {
    const topicDoc = await firestoreDB.collection('topics').doc(params.topicId).get();

    if (!topicDoc.exists) {
      redirect('/');
    }

    const topic = topicDoc.data();

    if (!topic?.isActive) {
      redirect('/');
    }

    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Link 
            href="/" 
            className="mr-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Topics
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-4">Submit Entry for {topic.name}</h1>
        <p className="mb-6 text-gray-600">{topic.description}</p>
        <EntryForm topicId={params.topicId} topicName={topic.name} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching topic:', error);
    redirect('/');
  }
}
