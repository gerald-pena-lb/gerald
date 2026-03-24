"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => "Not initialized",
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("alumni_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("alumni_user");
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      return err.error || "Login failed";
    }
    const data = await res.json();
    setUser(data.user);
    localStorage.setItem("alumni_user", JSON.stringify(data.user));
    return null;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("alumni_user");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
