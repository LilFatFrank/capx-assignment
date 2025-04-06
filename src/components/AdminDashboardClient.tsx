"use client";

import { useState, useEffect } from "react"
import { toast } from "sonner";
import Link from "next/link";
import { ErrorBoundary } from './ErrorBoundary';

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

interface AdminDashboardClientProps {
  initialTopics: Topic[];
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminDashboardClient({
  initialTopics,
}: AdminDashboardClientProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [isLoading, setIsLoading] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);

  const refreshTopics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      if (res.ok && !data.error) {
        setTopics(data.topics);
      }
    } catch (e) {
      console.log(e);
      toast.error("Error refreshing topics!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <AddTopicForm 
          onTopicAdded={refreshTopics} 
          isSubmitting={operationInProgress === 'creating'}
          setOperationInProgress={setOperationInProgress}
        />
        <TopicsList 
          topics={topics} 
          setTopics={setTopics}
          isLoading={isLoading}
          operationInProgress={operationInProgress}
          setOperationInProgress={setOperationInProgress}
        />
        <div className="mb-4">
          <Link 
            href="/admin/entries"
            className="text-blue-500 hover:text-blue-700 inline-flex items-center"
          >
            View All Entries →
          </Link>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function TopicsList({
  topics,
  setTopics,
  isLoading,
  operationInProgress,
  setOperationInProgress,
}: {
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
  isLoading: boolean;
  operationInProgress: string | null;
  setOperationInProgress: (operation: string | null) => void;
}) {
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, [pagination.page]);

  const fetchTopics = async () => {
    try {
      const response = await fetch(
        `/api/topics?page=${pagination.page}&limit=${pagination.limit}`
      );
      const data = await response.json();
      if (!response.ok || data.error) {
        toast.error("Failed to fetch topics");
        return;
      }
      setTopics(data.topics);
      setPagination(data.pagination);
    } catch (err) {
      setError("An error occurred! Please try again.");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setOperationInProgress(`toggling-${id}`);
    try {
      const res = await fetch("/api/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setTopics(
          topics.map((topic) =>
            topic.id === id ? { ...topic, isActive: !currentStatus } : topic
          )
        );
        toast.success(`Topic ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      }
    } catch (e) {
      toast.error("Error updating topic status! Something went wrong.");
      console.log(e);
    } finally {
      setOperationInProgress(null);
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    setOperationInProgress(`deleting-${id}`);
    try {
      const res = await fetch("/api/topics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setTopics(topics.filter((topic) => topic.id !== id));
        toast.success("Topic deleted successfully");
      }
    } catch (e) {
      toast.error("Error deleting topic! Something went wrong.");
      console.log(e);
    } finally {
      setOperationInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Topics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {topic.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {topic.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        topic.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {topic.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button
                      onClick={() => toggleStatus(topic.id, topic.isActive)}
                      disabled={operationInProgress === `toggling-${topic.id}`}
                      className={`text-blue-600 hover:text-blue-900 cursor-pointer ${
                        operationInProgress === `toggling-${topic.id}` ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {operationInProgress === `toggling-${topic.id}` ? 'Updating...' : topic.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      disabled={operationInProgress === `deleting-${topic.id}`}
                      className={`text-red-600 hover:text-red-900 ml-2 cursor-pointer ${
                        operationInProgress === `deleting-${topic.id}` ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {operationInProgress === `deleting-${topic.id}` ? 'Deleting...' : 'Delete'}
                    </button>
                    <a
                      href={`/admin/entries/${topic.id}`}
                      className="text-green-600 hover:text-green-900 ml-2"
                    >
                      View Entries
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.page === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.page === pagination.totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  ).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.page
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === pagination.totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTopicForm({ onTopicAdded, isSubmitting, setOperationInProgress }: { onTopicAdded: () => void, isSubmitting: boolean, setOperationInProgress: (operation: string | null) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationInProgress('creating');
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();

      if (res.ok && !data.error) {
        setName("");
        setDescription("");
        setSuccess(true);
        onTopicAdded();
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to add topic");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setOperationInProgress(null);
    }
  };

  return (
    <section className="mb-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Add New Topic
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">Topic added successfully!</p>
        </div>
      )}

      <form onSubmit={handleAddTopic} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Topic Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter topic name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter topic description"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md text-white font-medium transition-all
              ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Adding...
              </span>
            ) : (
              "Add Topic"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
