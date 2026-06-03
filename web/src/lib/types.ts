// Shared types mirroring the backend Pydantic schemas.

export type CheckState = "ok" | "warn" | "alert" | "todo";
export type ActType = "lege-ordinara" | "lege-organica" | "oug" | "hg";
export type ProjectStatus = "schita" | "in-lucru" | "candidat";

export interface ChecklistItem {
  check_id: number;
  state: CheckState;
  label: string;
  detail: string;
  kind: string; // determinist | semantic | determinist+semantic
  ignored: boolean;
}

export interface DiffOp {
  n: number;
  kind: "unchanged" | "ins" | "mixed";
  text: string;
  text_del: string;
  text_ins: string;
  text_end: string;
}

export interface ProjectEvent {
  kind: string;
  summary: string;
  actor_name: string;
  actor_initials: string;
  diff: { title: string; ops: DiffOp[] } | null;
  when: string;
}

export interface MyProject {
  id: number;
  slug: string;
  title: string;
  act_type: ActType;
  status: ProjectStatus;
  is_published: boolean;
  role: string;
  passed: number;
  total: number;
  updated_label: string;
}

export interface Article {
  id: number;
  num: number;
  title: string;
  single_idea: boolean;
  alineate: string[];
}

export interface Motive {
  section: string;
  body: string;
}

export interface Contributor {
  name: string;
  initials: string;
  role: string;
  color: string;
}

export interface SimilarLaw {
  ref: string;
  title: string;
  match: string;
}

export type AmendmentOp = DiffOp;

export interface Amendment {
  id: number;
  article_num: number;
  article_title: string;
  target_article_id: number | null;
  proposed_title: string;
  proposed_alineate: string[];
  author_name: string;
  author_initials: string;
  author_color: string;
  summary: string;
  reason: string;
  status: string;
  when_label: string;
  decision_reason: string;
  ops: AmendmentOp[];
}

export interface ProjectDetail {
  id: number;
  slug: string;
  title: string;
  act_type: ActType;
  status: ProjectStatus;
  domain: string;
  curator: string;
  curator_initials: string;
  supporters: number;
  watchers: number;
  updated_label: string;
  is_demo: boolean;
  is_published: boolean;
  viewer_can_edit: boolean;
  viewer_is_curator: boolean;
  viewer_supports: boolean;
  viewer_watches: boolean;
  vigoare_days: number | null;
  passed: number;
  total: number;
  articles: Article[];
  motives: Motive[];
  contributors: Contributor[];
  similar_laws: SimilarLaw[];
  checklist: ChecklistItem[];
  amendments: Amendment[];
  events: ProjectEvent[];
}

export interface ProjectSummary {
  id: number;
  slug: string;
  title: string;
  act_type: ActType;
  status: ProjectStatus;
  domain: string;
  supporters: number;
  passed: number;
  total: number;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  initials: string;
  provider: string;
}

export interface ProposalArticle {
  num: number;
  title: string;
  alineate: string[];
}

export interface CopilotReply {
  role: string;
  kind: "text" | "proposal";
  text: string;
  intro: string;
  note: string;
  article: ProposalArticle | null;
  scripted: boolean;
}

export interface AIStatus {
  ai_enabled: boolean;
  scripted: boolean;
  model: string;
}
