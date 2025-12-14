import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  token: string | null;
  isImpersonating: boolean;
  originalSuperAdmin: User | null;
  startImpersonation: (tenantUser: User, tenantToken: string, originalUser: User, originalToken: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalSuperAdmin, setOriginalSuperAdmin] = useState<User | null>(null);
  const [originalToken, setOriginalToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("authUser");
    const storedOriginalSuperAdmin = localStorage.getItem("originalSuperAdmin");
    const storedOriginalToken = localStorage.getItem("originalSuperAdminToken");
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedOriginalSuperAdmin && storedOriginalToken) {
          setOriginalSuperAdmin(JSON.parse(storedOriginalSuperAdmin));
          setOriginalToken(storedOriginalToken);
        }
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        localStorage.removeItem("originalSuperAdmin");
        localStorage.removeItem("originalSuperAdminToken");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((user: User, authToken: string) => {
    setUser(user);
    setToken(authToken);
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("authUser", JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setOriginalSuperAdmin(null);
    setOriginalToken(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("originalSuperAdmin");
    localStorage.removeItem("originalSuperAdminToken");
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
  }, []);

  const startImpersonation = useCallback((tenantUser: User, tenantToken: string, origUser: User, origToken: string) => {
    setOriginalSuperAdmin(origUser);
    setOriginalToken(origToken);
    setUser(tenantUser);
    setToken(tenantToken);
    localStorage.setItem("authToken", tenantToken);
    localStorage.setItem("authUser", JSON.stringify(tenantUser));
    localStorage.setItem("originalSuperAdmin", JSON.stringify(origUser));
    localStorage.setItem("originalSuperAdminToken", origToken);
  }, []);

  const stopImpersonation = useCallback(() => {
    if (originalSuperAdmin && originalToken) {
      setUser(originalSuperAdmin);
      setToken(originalToken);
      localStorage.setItem("authToken", originalToken);
      localStorage.setItem("authUser", JSON.stringify(originalSuperAdmin));
    }
    setOriginalSuperAdmin(null);
    setOriginalToken(null);
    localStorage.removeItem("originalSuperAdmin");
    localStorage.removeItem("originalSuperAdminToken");
  }, [originalSuperAdmin, originalToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        updateUser,
        token,
        isImpersonating: !!originalSuperAdmin,
        originalSuperAdmin,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
