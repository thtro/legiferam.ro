// Global app state: the authenticated user and DEMO mode.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { AIStatus, User } from "./types";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  loadingUser: boolean;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  aiStatus: AIStatus | null;
}

const Ctx = createContext<AppState | null>(null);
const DEMO_KEY = "legiferam_demo_mode";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [demoMode, setDemoModeState] = useState<boolean>(() => localStorage.getItem(DEMO_KEY) === "1");
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  const setDemoMode = (v: boolean) => {
    setDemoModeState(v);
    localStorage.setItem(DEMO_KEY, v ? "1" : "0");
  };

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
    api
      .aiStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, []);

  return (
    <Ctx.Provider value={{ user, setUser, loadingUser, demoMode, setDemoMode, aiStatus }}>{children}</Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
