// Thin API client. All calls go to the backend via the /api proxy (nginx in prod,
// vite proxy in dev). Cookies (httpOnly session) are sent automatically.
import type {
  AIStatus,
  Amendment,
  Article,
  ChecklistItem,
  CopilotReply,
  MyProject,
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
  register: (body: { email: string; first_name: string; last_name: string; password: string }) =>
    req<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  demoLogin: (role: "user" | "coauthor") =>
    req<User>(`/auth/demo-login?role=${role}`, { method: "POST" }),
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
    body: { title?: string; act_type?: string; status?: string; domain?: string; vigoare_days?: number },
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
  addArticlesBulk: (
    slugOrId: string | number,
    articles: { title: string; single_idea: boolean; alineate: string[] }[],
  ) => req<ProjectDetail>(`/projects/${slugOrId}/articles/bulk`, { method: "POST", body: JSON.stringify({ articles }) }),
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
  motivesDraft: (projectId: number) =>
    req<{ sections: Record<string, string>; scripted: boolean }>("/ai/motives-draft", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId }),
    }),
  researchDraft: (projectId: number, idea: string) =>
    req<{ research: string; articles: { title: string; single_idea: boolean; alineate: string[] }[]; scripted: boolean }>(
      "/ai/research-draft",
      { method: "POST", body: JSON.stringify({ project_id: projectId, idea }) },
    ),

  // My projects + lifecycle
  myProjects: () => req<MyProject[]>("/projects/mine"),
  publishProject: (slugOrId: string | number) =>
    req<ProjectDetail>(`/projects/${slugOrId}/publish`, { method: "POST" }),
  addCoauthor: (slugOrId: string | number, email: string) =>
    req<ProjectDetail>(`/projects/${slugOrId}/coauthors`, { method: "POST", body: JSON.stringify({ email }) }),
  toggleSupport: (slugOrId: string | number) =>
    req<ProjectDetail>(`/projects/${slugOrId}/support`, { method: "POST" }),
  toggleWatch: (slugOrId: string | number) =>
    req<ProjectDetail>(`/projects/${slugOrId}/watch`, { method: "POST" }),
  ignoreCheck: (slugOrId: string | number, checkId: number) =>
    req<ChecklistItem[]>(`/projects/${slugOrId}/checks/${checkId}/ignore`, { method: "POST" }),
  unignoreCheck: (slugOrId: string | number, checkId: number) =>
    req<ChecklistItem[]>(`/projects/${slugOrId}/checks/${checkId}/ignore`, { method: "DELETE" }),

  // Amendments
  getAmendment: (id: number) => req<Amendment>(`/amendments/${id}`),
  proposeAmendment: (body: {
    target_article_id: number;
    proposed_title: string;
    proposed_alineate: string[];
    reason: string;
  }) => req<Amendment>("/amendments", { method: "POST", body: JSON.stringify(body) }),
  decideAmendment: (id: number, decision: "accept" | "reject", reason: string) =>
    req<Amendment>(`/amendments/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, reason }) }),
};
