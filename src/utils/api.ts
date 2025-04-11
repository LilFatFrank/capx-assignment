import { auth } from "./firebase";

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Utility function to make API requests with Firebase authentication
 * @param url The API endpoint URL
 * @param options Fetch options including whether authentication is required
 * @returns The response data
 */
export async function fetchWithAuth<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;
  
  // Prepare headers
  const headers = new Headers(fetchOptions.headers);
  
  // Add content type if not already set
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }
  
  // Add authorization header if authentication is required
  if (requiresAuth) {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        
        // Reset inactivity timer when making authenticated requests
        // This is a workaround since we can't directly access the AuthContext here
        // The actual reset will happen in components that use this function
        const event = new CustomEvent('userActivity');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
  }
  
  // Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });
  
  // Parse the response
  const data = await response.json();
  
  // Check if the response is successful
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  
  return data as T;
} 