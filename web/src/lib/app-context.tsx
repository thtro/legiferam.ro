// Global app state: the authenticated user and AI status.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { AIStatus, User } from "./types";

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  loadingUser: boolean;
  aiStatus: AIStatus | null;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

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
    <Ctx.Provider value={{ user, setUser, loadingUser, aiStatus }}>{children}</Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
