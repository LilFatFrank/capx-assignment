"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import EntriesList from "@/components/EntriesList";

export default function AllEntriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <a
          href="/admin"
          className="text-blue-500 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to Dashboard
        </a>
        <h1 className="text-2xl font-bold mb-4">All Entries</h1>
        
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by topic name..."
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <EntriesList topicName={searchTerm} />
    </div>
  );
}
