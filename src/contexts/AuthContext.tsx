"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "@/utils/firebase";
import { useViewport } from "@/hooks/useViewport";

// Allowed email domain
const ALLOWED_DOMAIN = "capx.global";

// Inactivity timeout in milliseconds (1 minute)
const INACTIVITY_TIMEOUT = 60 * 1000;

// Function to validate email domain
const isValidEmailDomain = (email: string): boolean => {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;
  getIdToken: () => Promise<string | null>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useViewport();

  // Function to reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear any existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set a new timer if the user is authenticated
    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(async () => {
        // Log the user out after inactivity
        await logout();
        toast.info("You have been logged out due to inactivity");
      }, INACTIVITY_TIMEOUT);
    }
  }, [isAuthenticated]);

  // Function to handle user activity
  const handleUserActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (isAuthenticated) {
      // Add event listeners for user activity
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);
      window.addEventListener('touchstart', handleUserActivity);
      window.addEventListener('userActivity', handleUserActivity);
      
      // Initial timer setup
      resetInactivityTimer();
      
      // Clean up event listeners
      return () => {
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
        window.removeEventListener('userActivity', handleUserActivity);
        
        // Clear the timer
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }
  }, [isAuthenticated, handleUserActivity, resetInactivityTimer]);

  // Check auth status on mount and handle redirects for admin pages
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle redirects for admin pages
  useEffect(() => {
    if (!isLoading) {
      // Check if the current path is an admin path
      const isAdminPath = pathname?.startsWith('/admin');
      
      if (isAdminPath && !isAuthenticated) {
        // Redirect to login page if not authenticated
        router.push('/admin/login');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if email domain is valid
      if (!isValidEmailDomain(email)) {
        toast.error(`Only @${ALLOWED_DOMAIN} email addresses are allowed`);
        return false;
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful");
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "An error occurred during login";
      
      if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "User not found";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Wrong password";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later";
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if email domain is valid
      if (!isValidEmailDomain(email)) {
        toast.error(`Only @${ALLOWED_DOMAIN} email addresses are allowed`);
        return false;
      }
      
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("Registration successful");
      return true;
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "An error occurred during registration";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already in use";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading,
      user,
      login, 
      logout,
      register,
      getIdToken,
      resetInactivityTimer
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
