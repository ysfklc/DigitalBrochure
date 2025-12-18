import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { useLocation } from "wouter";
import { apiRequest } from "./queryClient";

/**
 * Verify user's role against the server to prevent client-side role tampering
 * This is a critical security check for pages that require specific roles
 */
export function useRoleVerification(requiredRoles: string[]) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;

    // Verify role integrity
    const verifyRole = async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/me") as any;
        
        // If server role doesn't match client role, logout immediately
        if (response?.role !== user.role) {
          console.warn("Security violation: Client role does not match server role. Logging out.");
          logout();
          setLocation("/login");
          return;
        }

        // If user doesn't have required role, redirect to dashboard
        if (!requiredRoles.includes(response?.role)) {
          console.warn("Security violation: User does not have required role. Redirecting.");
          setLocation("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Role verification failed:", error);
        logout();
        setLocation("/login");
      }
    };

    verifyRole();
  }, [user, logout, setLocation, requiredRoles.join(",")]);
}
