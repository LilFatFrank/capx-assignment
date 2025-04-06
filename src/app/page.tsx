"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function LandingPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchTopics() {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      if (res.ok && !data.error) {
        setTopics(data.topics.filter((topic: Topic) => topic.isActive));
      } else {
        setError("Failed to fetch topics");
      }
    } catch (err) {
      console.log("Fetch topics error", err);
      setError("Failed to fetch topics");
    }
  }

  useEffect(() => {
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
      <h1 className="text-2xl font-bold mb-6">Active Topics</h1>
      {topics.length === 0 ? (
        <p className="text-gray-500">No active topics available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {topic.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {topic.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/submit/${topic.id}`}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      Submit Entry
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
