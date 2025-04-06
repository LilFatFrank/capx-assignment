"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function LandingPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch('/api/topics');
        const data = await res.json();
        if (res.ok) {
          // Filter active topics on the client side
          setTopics(data.topics.filter((topic: Topic) => topic.isActive));
        } else {
          setError('Failed to fetch topics');
        }
      } catch (err) {
        setError('Failed to fetch topics');
      }
    }
    fetchTopics();
  }, []);

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Active Topics</h1>
      {topics.length === 0 ? (
        <p>No active topics available.</p>
      ) : (
        <ul>
          {topics.map(topic => (
            <li key={topic.id} className="mb-4 p-4 border rounded">
              <h2 className="text-xl font-semibold">{topic.name}</h2>
              <p className="mt-2">{topic.description}</p>
              <Link 
                href={`/submit/${topic.id}`}
                className="mt-4 inline-block text-blue-500 hover:text-blue-700 underline"
              >
                Submit Entry for {topic.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
