// Thin API client. All calls go to the backend via the /api proxy (nginx in prod,
// vite proxy in dev). Cookies (httpOnly session) are sent automatically.
import type {
  AIStatus,
  Amendment,
  Article,
  ChecklistItem,
  CopilotReply,
  ProjectDetail,
  ProjectSummary,
  User,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = `Eroare ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    req<User>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => req<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => req<User | null>("/auth/me"),

  // Projects
  listProjects: (demo?: boolean) =>
    req<ProjectSummary[]>(`/projects${demo === undefined ? "" : `?demo=${demo}`}`),
  getProject: (slugOrId: string | number) => req<ProjectDetail>(`/projects/${slugOrId}`),
  getChecklist: (slugOrId: string | number) => req<ChecklistItem[]>(`/projects/${slugOrId}/checklist`),
  createProject: (body: { title: string; act_type: string; domain?: string }) =>
    req<ProjectDetail>("/projects", { method: "POST", body: JSON.stringify(body) }),
  patchProject: (
    slugOrId: string | number,
    body: { title?: string; status?: string; domain?: string; vigoare_days?: number },
  ) => req<ProjectDetail>(`/projects/${slugOrId}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateArticle: (
    slugOrId: string | number,
    articleId: number,
    body: { title: string; single_idea: boolean; alineate: string[] },
  ) =>
    req<Article>(`/projects/${slugOrId}/articles/${articleId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  addArticle: (
    slugOrId: string | number,
    body: { title: string; single_idea: boolean; alineate: string[] },
  ) => req<Article>(`/projects/${slugOrId}/articles`, { method: "POST", body: JSON.stringify(body) }),
  deleteArticle: (slugOrId: string | number, articleId: number) =>
    req<void>(`/projects/${slugOrId}/articles/${articleId}`, { method: "DELETE" }),
  replaceMotives: (slugOrId: string | number, sections: { section: string; body: string }[]) =>
    req<ProjectDetail>(`/projects/${slugOrId}/motives`, { method: "PUT", body: JSON.stringify({ sections }) }),

  // Validator
  refreshSemantic: (slugOrId: string | number) =>
    req<ChecklistItem[]>(`/validator/${slugOrId}/semantic`, { method: "POST" }),

  // AI co-pilot
  aiStatus: () => req<AIStatus>("/ai/status"),
  copilot: (body: { project_id?: number; action?: string; text?: string }) =>
    req<CopilotReply>("/ai/copilot", { method: "POST", body: JSON.stringify(body) }),

  // Amendments (read-only round 1)
  getAmendment: (id: number) => req<Amendment>(`/amendments/${id}`),
};
