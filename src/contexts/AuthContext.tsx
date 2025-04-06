"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth-status", {
        credentials: "include"
      });
      const data = await response.json();
      setIsAuthenticated(data.isAuthenticated);
      
      // Handle session expiration
      if (data.isAuthenticated && data.expiresIn) {
        // expiresIn is in seconds, convert to minutes for easier comparison
        const expiresInMinutes = data.expiresIn / 60;
        
        // If session expires in less than 5 minutes, show a warning
        if (expiresInMinutes < 5) {
          toast.warning("Your session will expire soon.");
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Login failed");
        return false;
      }

      await checkAuthStatus();
      toast.success("Login successful");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthStatus]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      
      setIsAuthenticated(false);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading,
      login, 
      logout, 
      checkAuthStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
