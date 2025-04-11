"use client";
import { useState, useEffect } from "react";
import AdminDashboardClient from "../../components/AdminDashboardClient";
import { useAuth } from "@/contexts/AuthContext";

interface Topic {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

export default function AdminDashboard() {
  const [initialTopics, setInitialTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Fetch initial topics
    const fetchTopics = async () => {
      try {
        const response = await fetch("/api/topics", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setInitialTopics(data.topics);
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchTopics();
    }
  }, [isAuthenticated]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-3">
      <AdminDashboardClient initialTopics={initialTopics} />
    </div>
  );
}
