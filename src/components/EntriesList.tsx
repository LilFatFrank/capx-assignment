"use client";
import { useState, useEffect } from "react";
import { Parser } from "json2csv";
import { format } from "date-fns";
import { toast } from "sonner";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import Loader from "./Loader";
import { redirect } from "next/navigation";

interface Entry {
  id: string;
  topicId: string;
  telegramUsername: string;
  platformUsername: string;
  walletAddress: string;
  discordUsername?: string;
  email: string;
  createdAt: number;
  topicName: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface EntriesListProps {
  topicId?: string;
  topicName?: string;
}

export default function EntriesList({ topicId, topicName }: EntriesListProps) {
  const { isLoading: isAuthLoading, isAuthenticated, getIdToken } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [debouncedTopicName, setDebouncedTopicName] = useState(topicName);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Debounce topicName changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTopicName(topicName);
    }, 500);

    return () => clearTimeout(timer);
  }, [topicName]);

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      fetchEntries();
    }
  }, [topicId, debouncedTopicName, pagination.page, isAuthenticated, isAuthLoading]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (topicId) {
        queryParams.append("topicId", topicId);
      }

      if (debouncedTopicName) {
        queryParams.append("topicName", debouncedTopicName);
      }

      
      const idToken = await getIdToken();
      
      if (!idToken) {
        throw new Error("Authentication token not available");
      }

      const response = await fetch(`/api/entries?${queryParams}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this entry? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const idToken = await getIdToken();
      
      if (!idToken) {
        throw new Error("Authentication token not available");
      }

      const response = await fetch("/api/entries", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }

      toast.success("Entry deleted successfully");
      await fetchEntries();
    } catch (err) {
      toast.error("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      toast.error("No entries to export");
      return;
    }

    setExporting(true);
    try {
      const fields = [
        { label: "Topic Name", value: "topicName" },
        { label: "Telegram Username", value: "telegramUsername" },
        { label: "Platform Username", value: "platformUsername" },
        { label: "Wallet Address", value: "walletAddress" },
        { label: "Discord Username", value: "discordUsername" },
        { label: "Email", value: "email" },
        {
          label: "Submission Date",
          value: (row: Entry) => format(row.createdAt, "MMM d, yyyy h:mm a"),
        },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(entries);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Entries${topicName ? ` - ${topicName}` : ""}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Entries exported successfully");
    } catch (err) {
      console.error("Error exporting CSV:", err);
      toast.error("Failed to export entries to CSV");
    } finally {
      setExporting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <ErrorBoundary>
        <Loader />
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
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
            <span className="text-gray-600">Loading entries...</span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </ErrorBoundary>
    );
  }

  if (entries.length === 0) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <p className="text-gray-600">No entries found.</p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {topicName ? `Entries for "${topicName}"` : "All Entries"}
          </h3>
          <button
            onClick={handleExportCSV}
            disabled={exporting || entries.length === 0}
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors ${
              exporting || entries.length === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {exporting ? (
              <span className="flex items-center space-x-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                <span>Exporting...</span>
              </span>
            ) : (
              "Export to CSV"
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telegram
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discord
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.topicName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.telegramUsername}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.platformUsername}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    <span className="text-gray-900">
                      {entry.walletAddress.slice(0, 6)}...
                      {entry.walletAddress.slice(-4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.discordUsername || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(entry.createdAt, "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className={`text-red-600 hover:text-red-900 ${
                        deletingId === entry.id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {deletingId === entry.id ? (
                        <span className="flex items-center space-x-1">
                          <svg
                            className="animate-spin h-4 w-4"
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
                          <span>Deleting...</span>
                        </span>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
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
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
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
    </ErrorBoundary>
  );
}
