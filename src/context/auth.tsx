import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getStoredToken, setStoredToken, type Permissions, type StaffProfile } from "@/lib/api";

interface AuthState {
  user: { id: string; email: string } | null;
  profile: StaffProfile | null;
  permissions: Permissions | null;
  loading: boolean;
  login: (email: string, password: string, portal: "admin" | "staff") => Promise<StaffProfile>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setPermissions(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.auth.me();
      setUser(res.user);
      setProfile(res.profile);
      setPermissions(res.permissions);
    } catch {
      setStoredToken(null);
      setUser(null);
      setProfile(null);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, portal: "admin" | "staff") => {
    const res = await api.auth.login({ email, password, portal });
    setStoredToken(res.access_token);
    setUser(res.user);
    setProfile(res.profile);
    setPermissions(res.permissions);
    return res.profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout network failures
    } finally {
      setStoredToken(null);
      setUser(null);
      setProfile(null);
      setPermissions(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, profile, permissions, loading, login, logout, refresh }),
    [user, profile, permissions, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
