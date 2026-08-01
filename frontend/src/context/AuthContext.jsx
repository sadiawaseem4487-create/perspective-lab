import { createContext, useContext, useEffect, useState } from "react";
import {
  fetchAuthMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setAuthToken,
} from "@/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [personalKey, setPersonalKey] = useState(null);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await fetchAuthMe();
      setAuthRequired(Boolean(data.auth_required));
      setUser(data.user || null);
      setPersonalKey(data.personal_key || null);
      setLlmConfigured(Boolean(data.llm?.configured));
      return data;
    } catch {
      setUser(null);
      setPersonalKey(null);
      setLlmConfigured(false);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    const data = await apiLogin(email, password);
    setUser(data.user);
    const me = await refresh();
    return { ...data, me };
  }

  async function register(email, password, name) {
    const data = await apiRegister(email, password, name);
    setUser(data.user);
    const me = await refresh();
    return { ...data, me };
  }

  async function logout() {
    await apiLogout().catch(() => {});
    setAuthToken("");
    setUser(null);
    setPersonalKey(null);
    setLlmConfigured(false);
  }

  const value = {
    user,
    authRequired,
    personalKey,
    llmConfigured,
    loading,
    isAdmin: user?.role === "admin",
    isAuthenticated: Boolean(user),
    refresh,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
