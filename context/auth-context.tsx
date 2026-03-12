"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadSession() {
    const res = await authClient.getSession();

    if (res.data) {
      setUser(res.data.user);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function login(email: string, password: string) {
    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    await loadSession();
  }

  async function register(name: string, email: string, password: string) {
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) throw new Error(error.message);

    await loadSession();
  }

  async function logout() {
    await authClient.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}