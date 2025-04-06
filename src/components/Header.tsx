"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Don't show header on login page
  if (pathname === "/admin/login") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Topic-Based Entry Collection
        </Link>

        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : isAuthenticated ? (
            <>
              <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                Admin Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
