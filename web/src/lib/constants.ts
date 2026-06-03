// Presentation metadata (labels, descriptions, wizard chrome). Project *content*
// comes from the API; these are UI constants ported from the design.
import type { ActType, ProjectStatus } from "./types";

export const ACT_TYPES: Record<
  ActType,
  { label: string; short: string; desc: string; who: string; disabled?: boolean }
> = {
  "lege-ordinara": {
    label: "Lege ordinară",
    short: "Lege ordinară",
    desc: "Reglementează domenii care nu sunt rezervate legii organice. Se adoptă cu votul majorității simple.",
    who: "Cel mai frecvent tip de inițiativă cetățenească.",
  },
  "lege-organica": {
    label: "Lege organică",
    short: "Lege organică",
    desc: "Pentru domenii fundamentale (drepturi, alegeri, instituții). Necesită majoritate absolută.",
    who: "Pentru subiecte de bază ale statului.",
  },
  oug: {
    label: "OUG",
    short: "Ordonanță de urgență",
    desc: "Act al Guvernului, în situații extraordinare. Nu poate fi inițiat de cetățeni.",
    who: "Doar Guvernul, în urgențe.",
    disabled: true,
  },
  hg: {
    label: "HG",
    short: "Hotărâre de Guvern",
    desc: "Pune în aplicare legi existente. Detaliază, nu creează norme primare.",
    who: "Doar Guvernul, pentru aplicare.",
    disabled: true,
  },
};

export const STATUSES: Record<ProjectStatus, { label: string; tone: "neutral" | "blue" | "green" }> = {
  schita: { label: "Schiță", tone: "neutral" },
  "in-lucru": { label: "În lucru", tone: "blue" },
  candidat: { label: "Candidat de depunere", tone: "green" },
};

export interface WizardStep {
  id: number;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: "Tip act" },
  { id: 2, label: "Titlu" },
  { id: 3, label: "Definiții" },
  { id: 4, label: "Articole" },
  { id: 5, label: "Sancțiuni" },
  { id: 6, label: "Intrare în vigoare" },
  { id: 7, label: "Expunere de motive" },
  { id: 8, label: "Verificare finală" },
];

export const AI_QUICK_ACTIONS: { icon: string; label: string; action: string }[] = [
  { icon: "wand", label: "Transformă ideea mea în articol conform", action: "idea_to_article" },
  { icon: "book", label: "Explică-mi regula asta simplu", action: "explain" },
  { icon: "search", label: "Caută legi existente pe acest subiect", action: "search" },
  { icon: "draft", label: "Scrie-mi un draft de expunere de motive", action: "motives" },
];

export const DEFAULT_DOMAINS = [
  "Toate domeniile",
  "Sănătate",
  "Educație",
  "Mediu",
  "Transparență",
  "Consumatori",
];
