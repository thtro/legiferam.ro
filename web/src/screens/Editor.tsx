import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AIProposalCard, ChecklistPanel, ValidatorCard, VAL_TONES } from "../components/cards";
import { ActBadge, Avatar, Btn, ComplianceBar, Eyebrow, Icon, StateMark, iconBtn } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";
import { ACT_TYPES, AI_QUICK_ACTIONS, WIZARD_STEPS } from "../lib/constants";
import type { ActType, Article, ChecklistItem, CopilotReply, ProjectDetail } from "../lib/types";

const DEMO_SLUG = "transparenta-preturilor-medicamentelor-compensate";

// Expunerea de motive, conform Art. 31 din Legea 24/2000 (instrumentul de prezentare
// și motivare). Secțiunile a–d sunt esențiale (impun check 11); e–g sunt încurajate.
interface MotiveField {
  key: string;
  letter: string;
  label: string;
  required: boolean;
  help: string;
}
const MOTIVE_FIELDS: MotiveField[] = [
  {
    key: "motiv-emitere",
    letter: "a",
    label: "Motivul emiterii actului",
    required: true,
    help: "Ce problemă există și de ce e nevoie de reglementare: insuficiențele reglementărilor în vigoare, principiile de bază, schimbările preconizate. Folosește date concrete, statistici, surse.",
  },
  {
    key: "impact-socioeconomic",
    letter: "b",
    label: "Impactul socioeconomic",
    required: true,
    help: "Efectele asupra mediului economic, de afaceri, social și asupra mediului înconjurător, cu evaluarea costurilor și a beneficiilor.",
  },
  {
    key: "impact-financiar",
    letter: "c",
    label: "Impactul financiar asupra bugetului",
    required: true,
    help: "Efectele asupra bugetului general consolidat, pe termen scurt (anul curent) și lung (5 ani): cheltuieli și venituri estimate.",
  },
  {
    key: "impact-juridic",
    letter: "d",
    label: "Impactul asupra sistemului juridic",
    required: true,
    help: "Implicațiile asupra legislației în vigoare și compatibilitatea cu dreptul UE (directive, regulamente). Ce acte se modifică sau se corelează.",
  },
  {
    key: "consultari",
    letter: "e",
    label: "Consultări derulate",
    required: false,
    help: "Organizațiile și instituțiile consultate la elaborare și recomandările primite.",
  },
  {
    key: "informare-publica",
    letter: "f",
    label: "Activități de informare publică",
    required: false,
    help: "Cum a fost (sau va fi) informat publicul despre elaborarea și implementarea actului.",
  },
  {
    key: "masuri-implementare",
    letter: "g",
    label: "Măsuri de implementare",
    required: false,
    help: "Modificările instituționale și funcționale necesare la nivelul administrației publice centrale și locale.",
  },
];
const MOTIVE_REQUIRED = MOTIVE_FIELDS.filter((f) => f.required).map((f) => f.key);

export default function EditorScreen({ mode }: { mode: "new" | "work" }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, demoMode } = useApp();
  const slug = mode === "work" ? params.slug ?? DEMO_SLUG : null;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState("");
  const [activeStep, setActiveStep] = useState(4);
  const [activeOutline, setActiveOutline] = useState("art3");
  const [showChecks, setShowChecks] = useState(false);
  const [newActType, setNewActType] = useState<ActType | null>(null);
  const [semanticBusy, setSemanticBusy] = useState(false);

  const reload = (s: string) =>
    api.getProject(s).then((p) => {
      setProject(p);
      setArticles(p.articles);
      setChecklist(p.checklist);
      setTitle(p.title);
    });

  useEffect(() => {
    if (mode === "work" && slug) reload(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug]);

  const passed = checklist.filter((c) => c.state === "ok" || c.ignored).length;
  const total = checklist.length || 12;
  const canEdit = !!user && !project?.is_demo && !demoMode;

  // Outline derived live from the article tree + fixed sections.
  const outline = useMemo(() => {
    const arts = articles.map((a) => ({
      id: `art${a.num}`,
      label: `Art. ${a.num} — ${a.title}`,
      kind: "article" as const,
      state: a.single_idea ? "ok" : "warn",
    }));
    return [
      { id: "titlu", label: "Titlu", kind: "section" as const, state: "ok" },
      ...arts,
      { id: "vigoare", label: "Intrare în vigoare", kind: "section" as const, state: project?.vigoare_days ? "ok" : "empty" },
      { id: "expunere", label: "Expunere de motive", kind: "section" as const, state: "warn" },
    ];
  }, [articles, project]);

  // Wizard step states from the checklist + structure.
  const stepState = (id: number): "done" | "current" | "todo" | "warn" => {
    const motiveSections = new Set((project?.motives ?? []).map((m) => m.section));
    const motiveComplete = MOTIVE_REQUIRED.every((s) => motiveSections.has(s));
    if (id === activeStep) return "current";
    if (id === 1) return newActType || project ? "done" : "todo";
    if (id === 2) return title ? "done" : "todo";
    if (id === 3) return articles.some((a) => /defini/i.test(a.title)) ? "done" : "todo";
    if (id === 4) return articles.length ? "done" : "todo";
    if (id === 5) return articles.some((a) => /sanc[țt]i/i.test(a.title)) ? "done" : "todo";
    if (id === 6) return project?.vigoare_days != null ? "done" : "todo";
    if (id === 7) return motiveSections.size === 0 ? "todo" : motiveComplete ? "done" : "warn";
    return "todo";
  };

  if (mode === "new") {
    return (
      <EditorShell
        title="Proiect nou"
        actType={newActType ?? "lege-ordinara"}
        passed={0}
        total={12}
        checklist={[]}
        showChecks={false}
        setShowChecks={() => {}}
        onHome={() => navigate("/")}
        hideRail
        copilot={<Copilot projectId={undefined} onInsert={() => {}} />}
      >
        <NewProjectFlow
          actType={newActType}
          setActType={setNewActType}
          isAuthed={!!user}
          onCreated={(p) => navigate(`/editor/${p.slug}`)}
        />
      </EditorShell>
    );
  }

  if (!project) return <div style={{ padding: 48, color: "var(--muted)" }}>Se încarcă editorul…</div>;

  const ps = project.slug;
  const saveArticle = async (a: Article) => {
    if (canEdit && a.id > 0) {
      await api.updateArticle(ps, a.id, { title: a.title, single_idea: a.single_idea, alineate: a.alineate });
      await reload(ps);
    }
  };
  const addArticle = async (a: { title: string; single_idea: boolean; alineate: string[] }) => {
    if (!canEdit) return;
    await api.addArticle(ps, a);
    await reload(ps);
  };
  const deleteArticle = async (id: number) => {
    if (canEdit && id > 0) {
      await api.deleteArticle(ps, id);
      await reload(ps);
    }
  };
  const setVigoare = async (days: number) => {
    if (canEdit) await api.patchProject(ps, { vigoare_days: days }).then(() => reload(ps));
  };
  const saveMotives = async (sections: { section: string; body: string }[]) => {
    if (canEdit) await api.replaceMotives(ps, sections).then(() => reload(ps));
  };
  const setActTypeProj = async (t: ActType) => {
    if (canEdit) await api.patchProject(ps, { act_type: t }).then(() => reload(ps));
  };
  const runSemantic = async () => {
    setSemanticBusy(true);
    try {
      const updated = await api.refreshSemantic(ps);
      setChecklist(updated);
    } finally {
      setSemanticBusy(false);
    }
  };
  const ignoreCheck = async (checkId: number, ignored: boolean) => {
    const updated = ignored ? await api.ignoreCheck(ps, checkId) : await api.unignoreCheck(ps, checkId);
    setChecklist(updated);
  };
  const publish = async () => {
    if (canEdit && !project.is_published) await api.publishProject(ps).then(() => reload(ps));
  };
  const addCoauthor = async (email: string) => {
    await api.addCoauthor(ps, email).then(() => reload(ps));
  };

  return (
    <EditorShell
      title={title}
      onTitle={setTitle}
      onTitleCommit={async (v) => {
        if (canEdit && v.trim() && v !== project.title) await api.patchProject(ps, { title: v }).then(() => reload(ps));
      }}
      actType={project.act_type}
      passed={passed}
      total={total}
      checklist={checklist}
      showChecks={showChecks}
      setShowChecks={setShowChecks}
      onHome={() => navigate(`/proiect/${ps}`)}
      onPreview={() => navigate(`/proiect/${ps}`)}
      isDraft={!project.is_published && !project.is_demo}
      canEdit={canEdit}
      readOnlyNote={
        canEdit
          ? undefined
          : project.is_demo
            ? "Vizualizezi un proiect DEMO — doar citire. Pornește propriul proiect ca să editezi."
            : "Nu ești inițiator al acestui proiect. Propune o modificare din pagina publică."
      }
      isCurator={project.viewer_is_curator}
      contributors={project.contributors}
      onPublish={publish}
      onAddCoauthor={addCoauthor}
      rail={
        <OutlineRail
          onStep={setActiveStep}
          stepState={stepState}
          outline={outline}
          activeOutline={activeOutline}
          onOutline={setActiveOutline}
        />
      }
      copilot={
        <Copilot
          projectId={project.id}
          onInsert={(art) =>
            canEdit
              ? addArticle({ title: art.title, single_idea: true, alineate: art.alineate })
              : setArticles((prev) => [
                  ...prev,
                  { id: -Date.now(), num: prev.length + 1, title: art.title, single_idea: true, alineate: art.alineate },
                ])
          }
        />
      }
    >
      <CentreStage
        step={activeStep}
        projectId={project.id}
        articles={articles}
        canEdit={canEdit}
        checklist={checklist}
        onRunSemantic={runSemantic}
        onIgnoreCheck={ignoreCheck}
        semanticBusy={semanticBusy}
        actType={project.act_type}
        onSetActType={setActTypeProj}
        title={title}
        onSaveTitle={(v) => {
          if (canEdit && v.trim() && v !== project.title) api.patchProject(ps, { title: v }).then(() => reload(ps));
        }}
        vigoareDays={project.vigoare_days}
        onSetVigoare={setVigoare}
        motives={project.motives}
        onSaveMotives={saveMotives}
        onSaveArticle={saveArticle}
        onAddArticle={addArticle}
        onDeleteArticle={deleteArticle}
      />
    </EditorShell>
  );
}

function CoauthorMenu({
  contributors,
  onAdd,
}: {
  contributors: { name: string; initials: string; role: string; color: string }[];
  onAdd: (email: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await onAdd(email.trim());
      setEmail("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ position: "relative", flex: "none" }}>
      <button onClick={() => setOpen((v) => !v)} title="Co-inițiatori" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 11px", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        <Icon name="user" size={14} /> {contributors.length}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50, width: 290, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-3)", padding: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Inițiatori</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {contributors.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar initials={c.initials} color={c.color} size={26} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--muted)" }}>{c.role}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>Adaugă co-inițiator (după email)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="email@exemplu.ro"
                style={{ flex: 1, border: "1.5px solid var(--border-2)", borderRadius: 8, padding: "7px 9px", fontSize: 13, outline: "none" }}
              />
              <Btn variant="primary" size="sm" onClick={submit} disabled={busy}>
                {busy ? "…" : "Adaugă"}
              </Btn>
            </div>
            {err && <div style={{ color: "var(--alert)", fontSize: 12, marginTop: 8 }}>{err}</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shell: header + 3-column body ──────────────────────────────────────────
function EditorShell({
  title,
  onTitle,
  onTitleCommit,
  actType,
  passed,
  total,
  checklist,
  showChecks,
  setShowChecks,
  onHome,
  onPreview,
  rail,
  copilot,
  children,
  hideRail,
  isDraft,
  canEdit,
  readOnlyNote,
  isCurator,
  contributors,
  onPublish,
  onAddCoauthor,
}: {
  title: string;
  onTitle?: (v: string) => void;
  onTitleCommit?: (v: string) => void;
  actType: ActType;
  passed: number;
  total: number;
  checklist: ChecklistItem[];
  showChecks: boolean;
  setShowChecks: (v: boolean) => void;
  onHome: () => void;
  onPreview?: () => void;
  rail?: React.ReactNode;
  copilot: React.ReactNode;
  children: React.ReactNode;
  hideRail?: boolean;
  isDraft?: boolean;
  canEdit?: boolean;
  readOnlyNote?: string;
  isCurator?: boolean;
  contributors?: { name: string; initials: string; role: string; color: string }[];
  onPublish?: () => void | Promise<void>;
  onAddCoauthor?: (email: string) => void | Promise<void>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)" }}>
      <header style={{ position: "relative", zIndex: 30, display: "flex", alignItems: "center", gap: 16, padding: "0 20px", height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={onHome} title="Acasă proiect" style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--navy)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontFamily: "var(--serif)", fontSize: 16 }}>§</span>
        </button>
        <div style={{ width: 1, height: 26, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: 1 }}>
          <ActBadge type={actType} size="sm" />
          <input
            value={title}
            onChange={(e) => onTitle?.(e.target.value)}
            readOnly={!onTitle}
            style={{ flex: 1, minWidth: 0, border: "1px solid transparent", background: "transparent", fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 600, color: "var(--ink)", padding: "5px 8px", borderRadius: 7, maxWidth: 560 }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--border-2)";
              e.target.style.background = "var(--surface-2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "transparent";
              e.target.style.background = "transparent";
              onTitleCommit?.(e.target.value);
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--ok)" }} /> Salvat automat
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowChecks(!showChecks)}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 7px 5px 13px", cursor: "pointer" }}
          >
            <div style={{ display: "flex", gap: 2 }}>
              {(checklist.length ? checklist : Array.from({ length: 12 }, () => ({ state: "todo" }) as ChecklistItem)).map((c, i) => (
                <span
                  key={i}
                  style={{
                    width: 4,
                    height: 13,
                    borderRadius: 2,
                    background: c.state === "ok" ? "var(--ok)" : c.state === "warn" ? "var(--warn)" : c.state === "alert" ? "var(--alert)" : "var(--paper-2)",
                    border: c.state === "todo" ? "1px solid var(--border-2)" : "none",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {passed} <span style={{ color: "var(--faint)", fontWeight: 600 }}>/ {total}</span>
            </span>
            <Icon name="chevronD" size={15} style={{ color: "var(--muted)" }} />
          </button>
          {showChecks && checklist.length > 0 && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowChecks(false)} />
              <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50 }}>
                <ChecklistPanel checklist={checklist} onClose={() => setShowChecks(false)} />
              </div>
            </>
          )}
        </div>
        {isDraft && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", background: "var(--paper-2)", border: "1px solid var(--border-2)", borderRadius: 99, padding: "4px 11px", flex: "none" }}>
            Schiță
          </span>
        )}
        {isCurator && onAddCoauthor && <CoauthorMenu contributors={contributors ?? []} onAdd={onAddCoauthor} />}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" size="sm" icon="eye" onClick={onPreview}>
            Previzualizează
          </Btn>
          {isDraft && canEdit ? (
            <Btn variant="accent" size="sm" icon="flag" onClick={onPublish}>
              Publică
            </Btn>
          ) : (
            <Btn variant="primary" size="sm" icon="export">
              Export
            </Btn>
          )}
        </div>
      </header>
      {readOnlyNote && (
        <div style={{ flex: "none", background: "var(--amber-soft)", borderBottom: "1px solid var(--warn-line)", color: "var(--warn)", fontSize: 13, fontWeight: 600, padding: "8px 26px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="eye" size={15} /> {readOnlyNote}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {!hideRail && rail}
        <main className="lf-scroll" style={{ flex: 1, overflowY: "auto", padding: hideRail ? "44px 32px" : "30px 36px", minWidth: 0 }}>
          <div style={{ maxWidth: hideRail ? "none" : 720, margin: "0 auto" }}>{children}</div>
        </main>
        {copilot}
      </div>
    </div>
  );
}

// ── Left rail ──────────────────────────────────────────────────────────────
function OutlineRail({
  onStep,
  stepState,
  outline,
  activeOutline,
  onOutline,
}: {
  onStep: (id: number) => void;
  stepState: (id: number) => "done" | "current" | "todo" | "warn";
  outline: { id: string; label: string; kind: "section" | "article"; state: string }[];
  activeOutline: string;
  onOutline: (id: string) => void;
}) {
  return (
    <aside className="lf-scroll" style={{ width: 270, flex: "none", borderRight: "1px solid var(--border)", background: "var(--surface)", overflowY: "auto", padding: "18px 0" }}>
      <div style={{ padding: "0 18px" }}>
        <Eyebrow>Ghid pas cu pas</Eyebrow>
      </div>
      <div style={{ padding: "10px 14px 4px", display: "flex", flexDirection: "column", gap: 1 }}>
        {WIZARD_STEPS.map((s, i) => {
          const st = stepState(s.id);
          const active = st === "current";
          const dotColor = st === "done" ? "var(--ok)" : st === "warn" ? "var(--warn)" : active ? "var(--navy)" : "var(--surface)";
          return (
            <button
              key={s.id}
              onClick={() => onStep(s.id)}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, textAlign: "left", background: active ? "var(--blue-soft)" : "transparent", border: "none", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}
            >
              {i < WIZARD_STEPS.length - 1 && <span style={{ position: "absolute", left: 19, top: 28, bottom: -1, width: 2, background: "var(--border)" }} />}
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: dotColor,
                  color: st === "todo" && !active ? "var(--muted)" : "#fff",
                  border: st === "todo" && !active ? "1.5px solid var(--border-2)" : "none",
                }}
              >
                {st === "done" ? <Icon name="check" size={12} stroke={2.8} /> : st === "warn" ? "!" : s.id}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 600, color: active ? "var(--navy)" : st === "todo" ? "var(--muted)" : "var(--ink)" }}>{s.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ height: 1, background: "var(--border)", margin: "16px 18px" }} />
      <div style={{ padding: "0 18px" }}>
        <Eyebrow>Structura proiectului</Eyebrow>
      </div>
      <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 1 }}>
        {outline.map((o) => {
          const active = o.id === activeOutline;
          return (
            <button
              key={o.id}
              onClick={() => onOutline(o.id)}
              style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: active ? "var(--surface-2)" : "transparent", border: "1px solid", borderColor: active ? "var(--border-2)" : "transparent", borderRadius: 8, padding: "7px 9px", cursor: "pointer", paddingLeft: o.kind === "article" ? 16 : 9 }}
            >
              <StateMark state={o.state} size={15} />
              <span style={{ fontSize: 13, fontWeight: o.kind === "section" ? 600 : 500, color: o.state === "empty" ? "var(--muted)" : "var(--ink-2)" }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ── Centre stage ───────────────────────────────────────────────────────────
function StageHeader({ step, label, title, sub }: { step: number; label: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--amber)" }}>
        Pasul {step} · {label}
      </div>
      <h1 style={{ fontFamily: "var(--sans)", fontSize: 24, fontWeight: 800, color: "var(--ink)", margin: "7px 0 0", letterSpacing: "-.01em" }}>{title}</h1>
      {sub && <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "7px 0 0", lineHeight: 1.55, maxWidth: 580 }}>{sub}</p>}
    </div>
  );
}

function CentreStage({
  step,
  projectId,
  articles,
  canEdit,
  checklist,
  onRunSemantic,
  onIgnoreCheck,
  semanticBusy,
  actType,
  onSetActType,
  title,
  onSaveTitle,
  vigoareDays,
  onSetVigoare,
  motives,
  onSaveMotives,
  onSaveArticle,
  onAddArticle,
  onDeleteArticle,
}: {
  step: number;
  projectId: number;
  articles: Article[];
  canEdit: boolean;
  checklist: ChecklistItem[];
  onRunSemantic: () => void | Promise<void>;
  onIgnoreCheck: (checkId: number, ignored: boolean) => void | Promise<void>;
  semanticBusy: boolean;
  actType: ActType;
  onSetActType: (t: ActType) => void | Promise<void>;
  title: string;
  onSaveTitle: (v: string) => void;
  vigoareDays: number | null;
  onSetVigoare: (days: number) => void | Promise<void>;
  motives: { section: string; body: string }[];
  onSaveMotives: (sections: { section: string; body: string }[]) => void | Promise<void>;
  onSaveArticle: (a: Article) => void | Promise<void>;
  onAddArticle: (a: { title: string; single_idea: boolean; alineate: string[] }) => void | Promise<void>;
  onDeleteArticle: (id: number) => void | Promise<void>;
}) {
  if (step === 1) return <TipActStep actType={actType} canEdit={canEdit} onSet={onSetActType} />;
  if (step === 2) return <TitleStep title={title} canEdit={canEdit} onSave={onSaveTitle} />;
  if (step === 3)
    return (
      <DefinitionsStep
        articles={articles}
        canEdit={canEdit}
        onAddArticle={onAddArticle}
        onSaveArticle={onSaveArticle}
        onDeleteArticle={onDeleteArticle}
      />
    );
  if (step === 5) return <SanctionsStep articles={articles} canEdit={canEdit} onAddArticle={onAddArticle} />;
  if (step === 6) return <VigoareStep vigoareDays={vigoareDays} canEdit={canEdit} onSet={onSetVigoare} />;
  if (step === 7) return <MotivesStep motives={motives} canEdit={canEdit} onSave={onSaveMotives} projectId={projectId} />;

  if (step === 4) {
    return (
      <div>
        <StageHeader
          step={4}
          label="Articole"
          title="Scrie articolele legii"
          sub="Fiecare articol exprimă o singură idee sau obligație. Numerotarea alineatelor se face automat. Te anunțăm dacă un articol pare să spună prea multe deodată."
        />
        {articles.length === 0 && (
          <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "30px 24px", textAlign: "center", color: "var(--muted)", marginBottom: 14 }}>
            Încă nu ai niciun articol. Adaugă primul articol sau cere co-pilotului „Transformă ideea mea în articol conform”.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {articles.map((art) => (
            <ArticleCard
              key={art.id}
              art={art}
              canEdit={canEdit}
              onSave={onSaveArticle}
              onDelete={() => onDeleteArticle(art.id)}
              onVerify={onRunSemantic}
              verifyBusy={semanticBusy}
            />
          ))}
        </div>
        <button
          onClick={() => onAddArticle({ title: "Articol nou", single_idea: true, alineate: [""] })}
          disabled={!canEdit}
          title={canEdit ? "" : "Doar inițiatorii pot edita acest proiect"}
          style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r)", padding: "14px", color: "var(--blue)", fontWeight: 600, fontSize: 14, fontFamily: "var(--sans)", cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.6 }}
        >
          <Icon name="plus" size={17} /> Adaugă articol
        </button>
      </div>
    );
  }

  if (step === 8) {
    return (
      <div>
        <StageHeader step={8} label="Verificare finală" title="Aproape gata de depunere" sub="Trecem în revistă toate verificările de conformitate." />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: 22 }}>
          <ComplianceBar checklist={checklist} expandable={false} />
          {canEdit && checklist.some((c) => c.kind !== "determinist" && c.state === "todo") && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, background: "var(--blue-soft)", border: "1px solid #d7e3f1", borderRadius: "var(--r)", padding: "12px 14px" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--navy)", color: "var(--amber)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name="spark" size={17} />
              </span>
              <div style={{ flex: 1, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                Unele verificări (titlu, definiții, sancțiuni, claritate) cer o analiză de sens. Asistentul le poate evalua acum.
              </div>
              <Btn variant="primary" size="md" icon="spark" disabled={semanticBusy} onClick={onRunSemantic}>
                {semanticBusy ? "Se verifică…" : "Verifică cu AI"}
              </Btn>
            </div>
          )}
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checklist
              .filter((c) => c.state !== "ok" || c.ignored)
              .map((c) => (
                <CheckRow
                  key={c.check_id}
                  check={c}
                  canEdit={canEdit}
                  semanticBusy={semanticBusy}
                  onVerify={onRunSemantic}
                  onIgnore={() => onIgnoreCheck(c.check_id, true)}
                  onUnignore={() => onIgnoreCheck(c.check_id, false)}
                />
              ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 9 }}>
            <Btn variant="accent" size="md" icon="flag">
              Marchează drept candidat de depunere
            </Btn>
            <Btn variant="outline" size="md" icon="eye">
              Previzualizează legea
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StageHeader step={step} label="Pas" title="Pas în lucru" sub="Folosește co-pilotul din dreapta pentru ajutor la redactare." />
    </div>
  );
}

// ── Step 1: Tip act ────────────────────────────────────────────────────────
function TipActStep({ actType, canEdit, onSet }: { actType: ActType; canEdit: boolean; onSet: (t: ActType) => void | Promise<void> }) {
  const cards: ActType[] = ["lege-ordinara", "lege-organica", "oug", "hg"];
  return (
    <div>
      <StageHeader
        step={1}
        label="Tip act"
        title="Ce fel de act normativ scrii?"
        sub="Tipul actului stabilește regulile de adoptare. Pentru inițiative cetățenești, cele mai potrivite sunt legea ordinară și legea organică."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        {cards.map((id) => {
          const a = ACT_TYPES[id];
          const disabled = !!a.disabled;
          const active = actType === id;
          return (
            <button
              key={id}
              disabled={disabled || !canEdit}
              onClick={() => onSet(id)}
              style={{ textAlign: "left", background: active ? "var(--blue-soft)" : "var(--surface)", border: "1.5px solid", borderColor: active ? "var(--blue)" : "var(--border)", borderRadius: "var(--r-lg)", padding: 18, cursor: disabled || !canEdit ? "default" : "pointer", opacity: disabled ? 0.62 : 1, boxShadow: active ? "var(--sh-2)" : "var(--sh-1)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontSize: 16.5, fontWeight: 800, color: "var(--navy-deep)" }}>{a.label}</span>
                <span style={{ width: 22, height: 22, borderRadius: 99, border: "2px solid", borderColor: active ? "var(--blue)" : "var(--border-2)", display: "grid", placeItems: "center", background: active ? "var(--blue)" : "transparent" }}>
                  {active && <Icon name="check" size={12} stroke={3} style={{ color: "#fff" }} />}
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, margin: "0 0 10px" }}>{a.desc}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: disabled ? "var(--alert)" : "var(--ok)" }}>
                <Icon name={disabled ? "info" : "user"} size={14} /> {a.who}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <ValidatorCard variant="soft" state="ok" title="Tip de act selectat" text={`${ACT_TYPES[actType].label} — potrivit pentru o inițiativă cetățenească.`} />
      </div>
    </div>
  );
}

// ── Step 2: Titlu ──────────────────────────────────────────────────────────
function TitleStep({ title, canEdit, onSave }: { title: string; canEdit: boolean; onSave: (v: string) => void }) {
  const [val, setVal] = useState(title);
  useEffect(() => setVal(title), [title]);
  const stripped = val.replace(/^Lege privind\s*/i, "");
  const check = title.length > 25;
  return (
    <div>
      <StageHeader
        step={2}
        label="Titlu"
        title="Cum se va numi legea ta?"
        sub="Titlul trebuie să spună exact ce reglementează legea. Un titlu precis ajută oamenii — și instituțiile — să înțeleagă din prima despre ce e vorba."
      />
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: ".02em" }}>TITLUL PROIECTULUI DE LEGE</label>
      <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: "var(--r)", padding: "4px 4px 4px 16px", boxShadow: "var(--sh-1)" }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--muted)", whiteSpace: "nowrap" }}>Lege privind</span>
        <input
          value={stripped}
          readOnly={!canEdit}
          onChange={(e) => setVal(`Lege privind ${e.target.value}`)}
          onBlur={() => canEdit && onSave(val)}
          placeholder="transparența prețurilor medicamentelor compensate"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--serif)", fontSize: 19, color: "var(--navy-deep)", padding: "12px 8px", fontWeight: 600 }}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <ValidatorCard
          variant="soft"
          state={check ? "ok" : "warn"}
          title={check ? "Titlu precis și complet" : "Titlul pare prea scurt sau vag"}
          text={check ? "Indică obiectul reglementării. Regula de formă e îndeplinită." : "Spune clar ce, pentru cine și în ce domeniu reglementează legea."}
        />
      </div>
    </div>
  );
}

// ── Step 3: Definiții ──────────────────────────────────────────────────────
function DefinitionsStep({
  articles,
  canEdit,
  onAddArticle,
  onSaveArticle,
  onDeleteArticle,
}: {
  articles: Article[];
  canEdit: boolean;
  onAddArticle: (a: { title: string; single_idea: boolean; alineate: string[] }) => void | Promise<void>;
  onSaveArticle: (a: Article) => void | Promise<void>;
  onDeleteArticle: (id: number) => void | Promise<void>;
}) {
  const defs = articles.filter((a) => /defini/i.test(a.title));
  return (
    <div>
      <StageHeader
        step={3}
        label="Definiții"
        title="Definește termenii cheie"
        sub="Termenii tehnici sau ambigui se definesc explicit, de regulă într-un articol dedicat (ex. Art. 2). Definițiile clare evită interpretările greșite — un singur articol, cu enumerare: a), b), c)."
      />
      {defs.length === 0 ? (
        <>
          <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "30px 24px", textAlign: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--paper-2)", color: "var(--muted)", display: "inline-grid", placeItems: "center", marginBottom: 12 }}>
              <Icon name="book" size={22} />
            </span>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>Încă nu ai un articol de definiții</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, maxWidth: 440, marginInline: "auto", lineHeight: 1.55 }}>
              Adaugă un articol care definește termenii cheie din lege, sau cere-i co-pilotului „Explică-mi regula asta simplu".
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn
                variant="primary"
                size="md"
                icon="plus"
                disabled={!canEdit}
                onClick={() =>
                  onAddArticle({
                    title: "Definiții",
                    single_idea: true,
                    alineate: [
                      "În înțelesul prezentei legi, termenii de mai jos au următoarea semnificație:",
                      "___ — definiția primului termen;",
                    ],
                  })
                }
              >
                Adaugă articol de definiții
              </Btn>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ValidatorCard variant="soft" state="warn" title="Termenii cheie nu sunt încă definiți" text="Fără definiții, termenii pot fi interpretați diferit. Adaugă un articol dedicat." />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {defs.map((art) => (
              <ArticleCard key={art.id} art={art} canEdit={canEdit} onSave={onSaveArticle} onDelete={() => onDeleteArticle(art.id)} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <ValidatorCard variant="soft" state="ok" title="Ai un articol de definiții" text="Termenii cheie sunt definiți explicit. Verifică să acoperi toți termenii ambigui din lege." />
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 5: Sancțiuni ──────────────────────────────────────────────────────
function SanctionsStep({
  articles,
  canEdit,
  onAddArticle,
}: {
  articles: Article[];
  canEdit: boolean;
  onAddArticle: (a: { title: string; single_idea: boolean; alineate: string[] }) => void | Promise<void>;
}) {
  const hasSanctions = articles.some((a) => /sanc[țt]i|amend|contraven/i.test(a.title));
  return (
    <div>
      <StageHeader
        step={5}
        label="Sancțiuni"
        title="Ce se întâmplă dacă regula nu e respectată?"
        sub="Orice obligație din lege are nevoie de o sancțiune, altfel rămâne fără efect. Adaugă un articol de sancțiuni proporțional cu fapta."
      />
      {hasSanctions ? (
        <ValidatorCard variant="soft" state="ok" title="Ai un articol de sancțiuni" text="Obligațiile din lege au o consecință. Verifică să fie proporțională cu fapta." />
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "30px 24px", textAlign: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--paper-2)", color: "var(--muted)", display: "inline-grid", placeItems: "center", marginBottom: 12 }}>
              <Icon name="scale" size={22} />
            </span>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>Încă nu ai un articol de sancțiuni</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, maxWidth: 420, marginInline: "auto", lineHeight: 1.55 }}>
              Obligațiile introduse nu au deocamdată o consecință. Adaugă un articol de sancțiuni sau cere-i co-pilotului unul proporțional.
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn
                variant="primary"
                size="md"
                icon="plus"
                disabled={!canEdit}
                onClick={() =>
                  onAddArticle({
                    title: "Sancțiuni",
                    single_idea: true,
                    alineate: ["Nerespectarea obligațiilor prevăzute de prezenta lege constituie contravenție și se sancționează cu amendă de la ___ la ___ lei."],
                  })
                }
              >
                Adaugă articol de sancțiuni
              </Btn>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ValidatorCard variant="soft" state="alert" title="Lipsește sancțiunea pentru o obligație" text="Fără sancțiune, regula nu poate fi aplicată în practică." />
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 6: Intrare în vigoare ─────────────────────────────────────────────
function VigoareStep({ vigoareDays, canEdit, onSet }: { vigoareDays: number | null; canEdit: boolean; onSet: (d: number) => void | Promise<void> }) {
  const options: { days: number; label: string; note: string }[] = [
    { days: 3, label: "La 3 zile de la publicarea în Monitorul Oficial", note: "Regula implicită din Constituție." },
    { days: 30, label: "La 30 de zile de la publicare", note: "Timp ca cei vizați să se pregătească." },
    { days: 180, label: "La 6 luni de la publicare", note: "Pentru obligații care cer pregătire amplă." },
  ];
  const valid = vigoareDays != null && vigoareDays >= 3;
  return (
    <div>
      <StageHeader
        step={6}
        label="Intrare în vigoare"
        title="Când intră legea în vigoare?"
        sub="Regula generală: legea intră în vigoare la minimum 3 zile de la publicare, sau la o dată ulterioară prevăzută în text."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((o) => {
          const on = vigoareDays === o.days;
          return (
            <button
              key={o.days}
              disabled={!canEdit}
              onClick={() => onSet(o.days)}
              style={{ display: "flex", alignItems: "center", gap: 13, textAlign: "left", background: on ? "var(--blue-soft)" : "var(--surface)", border: "1.5px solid", borderColor: on ? "var(--blue)" : "var(--border)", borderRadius: "var(--r)", padding: "14px 16px", cursor: canEdit ? "pointer" : "default", boxShadow: "var(--sh-1)" }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 99, border: "2px solid", borderColor: on ? "var(--blue)" : "var(--border-2)", display: "grid", placeItems: "center", flex: "none" }}>
                {on && <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--blue)" }} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 600, color: "var(--navy-deep)" }}>{o.label}</span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{o.note}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <ValidatorCard
          variant="soft"
          state={valid ? "ok" : "warn"}
          title={valid ? "Intrare în vigoare validă" : "Alege un termen de intrare în vigoare"}
          text={valid ? `Termenul de ${vigoareDays} de zile e clar și conform normelor de tehnică legislativă.` : "Minimul legal este de 3 zile de la publicare."}
        />
      </div>
    </div>
  );
}

// ── Step 7: Expunere de motive ─────────────────────────────────────────────
const MOTIVE_EXAMPLES: { ref: string; text: string; url: string }[] = [
  {
    ref: "Lege privind transparența prețurilor medicamentelor compensate",
    text: "Motivul emiterii: „Conform unui studiu CNAS din 2024, același medicament compensat variază ca preț cu până la 300% între farmacii în același oraș, iar 62% dintre pacienții cronici nu cunosc prețul de referință. Reglementarea este compatibilă cu Directiva 89/105/CEE privind transparența prețurilor.”",
    url: "https://legislatie.just.ro/",
  },
  {
    ref: "Expunere de motive — Lege privind registrul comerțului (PL-x 154/2022)",
    text: "Exemplu real de expunere de motive depusă la Camera Deputaților (PDF).",
    url: "https://www.cdep.ro/proiecte/2022/100/30/3/em154.pdf",
  },
  {
    ref: "Expunere de motive — modificarea Codului penal (Comisia juridică, 2018)",
    text: "Alt exemplu real, cu structura completă a motivării (PDF).",
    url: "https://www.cdep.ro/comisii/suasl_justitie/pdf/2018/rd_0418.pdf",
  },
];

function MotivesStep({
  motives,
  canEdit,
  onSave,
  projectId,
}: {
  motives: { section: string; body: string }[];
  canEdit: boolean;
  onSave: (sections: { section: string; body: string }[]) => void | Promise<void>;
  projectId: number;
}) {
  const build = () => MOTIVE_FIELDS.map((f) => ({ section: f.key, body: motives.find((m) => m.section === f.key)?.body ?? "" }));
  const [draft, setDraft] = useState(build);
  const [dirty, setDirty] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  useEffect(() => {
    setDraft(build());
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motives]);

  const setBody = (section: string, body: string) => {
    setDraft((d) => d.map((x) => (x.section === section ? { ...x, body } : x)));
    setDirty(true);
  };
  const bodyOf = (key: string) => draft.find((d) => d.section === key)?.body ?? "";
  const requiredFilled = MOTIVE_REQUIRED.filter((k) => bodyOf(k).trim()).length;
  const complete = requiredFilled === MOTIVE_REQUIRED.length;

  const prepareDraft = async () => {
    setDrafting(true);
    try {
      const res = await api.motivesDraft(projectId);
      setAiDrafts(res.sections);
    } finally {
      setDrafting(false);
    }
  };
  const acceptDraft = (key: string) => {
    const text = aiDrafts[key];
    if (text == null) return;
    const next = MOTIVE_FIELDS.map((f) => ({ section: f.key, body: f.key === key ? text : bodyOf(f.key) }));
    setDraft(next);
    setDirty(true);
    onSave(next); // single save, outside any state updater (StrictMode-safe)
    setAiDrafts((a) => {
      const { [key]: _removed, ...rest } = a;
      return rest;
    });
  };

  return (
    <div>
      <StageHeader
        step={7}
        label="Expunere de motive"
        title="De ce e nevoie de această lege?"
        sub="Document obligatoriu care însoțește proiectul. Structura urmează Art. 31 din Legea nr. 24/2000 — instrumentul de prezentare și motivare. Nu e text de lege, ci argumentul tău pentru cei care o vor citi și vota."
      />
      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, background: "var(--blue-soft)", border: "1px solid #d7e3f1", borderRadius: "var(--r)", padding: "12px 14px" }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--navy)", color: "var(--amber)", display: "grid", placeItems: "center", flex: "none" }}>
            <Icon name="spark" size={17} />
          </span>
          <div style={{ flex: 1, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
            Asistentul poate pregăti o primă variantă pentru toate secțiunile, pe baza articolelor tale. Apoi accepți sau ajustezi fiecare.
          </div>
          <Btn variant="primary" size="md" icon="spark" disabled={drafting} onClick={prepareDraft}>
            {drafting ? "Se pregătește…" : "Pregătește un Draft cu AI"}
          </Btn>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {MOTIVE_FIELDS.map((f) => (
          <div key={f.key}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--amber)" }}>
                {f.letter}) {f.label}
              </span>
              {f.required ? (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--alert)", background: "var(--alert-bg)", border: "1px solid var(--alert-line)", borderRadius: 99, padding: "1px 7px" }}>obligatoriu</span>
              ) : (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", background: "var(--paper-2)", border: "1px solid var(--border-2)", borderRadius: 99, padding: "1px 7px" }}>opțional</span>
              )}
            </label>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginBottom: 7 }}>{f.help}</div>
            <textarea
              value={bodyOf(f.key)}
              readOnly={!canEdit}
              placeholder={`Scrie ${f.label.toLowerCase()}…`}
              onChange={(e) => setBody(f.key, e.target.value)}
              onBlur={() => canEdit && dirty && onSave(draft)}
              rows={3}
              style={{ width: "100%", border: "1.5px solid var(--border-2)", borderRadius: "var(--r)", padding: "11px 13px", fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, color: "var(--ink)", resize: "vertical", outline: "none", background: canEdit ? "var(--surface)" : "var(--surface-2)" }}
            />
            {canEdit && aiDrafts[f.key] && (
              <div style={{ marginTop: 8, background: "var(--surface)", border: "1px solid var(--border)", borderLeft: "3px solid var(--amber)", borderRadius: "var(--r)", padding: "11px 13px", boxShadow: "var(--sh-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 6, background: "var(--navy)", color: "var(--amber)", display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon name="spark" size={11} />
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--navy)" }}>Draft AI</span>
                </div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.6, color: "var(--ink)", margin: "0 0 10px" }}>{aiDrafts[f.key]}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="primary" size="sm" icon="check" onClick={() => acceptDraft(f.key)}>
                    Acceptă
                  </Btn>
                  <Btn variant="ghost" size="sm" icon="x" onClick={() => setAiDrafts((a) => { const { [f.key]: _x, ...rest } = a; return rest; })}>
                    Respinge
                  </Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        {canEdit && (
          <Btn variant="primary" size="md" icon="save" disabled={!dirty} onClick={() => onSave(draft)}>
            Salvează expunerea
          </Btn>
        )}
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{requiredFilled}/{MOTIVE_REQUIRED.length} secțiuni obligatorii completate</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <ValidatorCard
          variant="soft"
          state={complete ? "ok" : "warn"}
          title={complete ? "Expunere de motive completă" : "Expunerea de motive e incompletă"}
          text={complete ? "Secțiunile obligatorii (a–d) sunt prezente." : "Completează secțiunile obligatorii (a–d), inclusiv impactul financiar asupra bugetului."}
        />
      </div>

      {/* Exemple din legi reale */}
      <div style={{ marginTop: 20, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Icon name="book" size={16} style={{ color: "var(--amber)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Exemple din legi reale</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOTIVE_EXAMPLES.map((ex) => (
            <div key={ex.url} style={{ borderLeft: "2px solid var(--amber)", paddingLeft: 12 }}>
              <a href={ex.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                {ex.ref} <Icon name="link" size={12} />
              </a>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 4 }}>{ex.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sumar Art. 31 din Legea 24/2000 */}
      <div style={{ marginTop: 16, background: "var(--blue-soft)", border: "1px solid #d7e3f1", borderRadius: "var(--r-lg)", padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon name="scale" size={16} style={{ color: "var(--navy)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy)" }}>Ce cere Art. 31 din Legea nr. 24/2000</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 8px" }}>
          Instrumentul de prezentare și motivare cuprinde o evaluare a impactului, cu următoarele secțiuni:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.7 }}>
          {MOTIVE_FIELDS.map((f) => (
            <li key={f.key}>
              <b>{f.letter})</b> {f.label.toLowerCase()}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "8px 0 0" }}>
          Forma finală cuprinde și referiri la <b>avizul Consiliului Legislativ</b> și la alte avize obligatorii (art. 31 alin. 3).
          Expunerea se semnează de inițiatori (art. 34).
        </p>
      </div>
    </div>
  );
}

function ArticleCard({
  art,
  canEdit,
  onSave,
  onDelete,
  onVerify,
  verifyBusy,
}: {
  art: Article;
  canEdit: boolean;
  onSave: (a: Article) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onVerify?: () => void | Promise<void>;
  verifyBusy?: boolean;
}) {
  // Local draft so typing doesn't round-trip on every keystroke; persisted on blur.
  const [draft, setDraft] = useState<Article>(art);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(art);
    setDirty(false);
  }, [art]);

  const commit = () => {
    if (dirty) {
      onSave(draft);
      setDirty(false);
    }
  };
  const change = (next: Article) => {
    setDraft(next);
    setDirty(true);
  };
  const setAlineat = (i: number, text: string) => change({ ...draft, alineate: draft.alineate.map((a, j) => (j === i ? text : a)) });
  const addAlineat = () => change({ ...draft, alineate: [...draft.alineate, ""] });
  const removeAlineat = (i: number) => change({ ...draft, alineate: draft.alineate.filter((_, j) => j !== i) });

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--serif)" }}>Art. {draft.num}</span>
        <SingleIdeaChip single={draft.single_idea} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, color: "var(--faint)" }}>
          {canEdit && dirty && (
            <button style={{ ...iconBtn, color: "var(--blue)" }} title="Salvează" onClick={commit}>
              <Icon name="save" size={15} />
            </button>
          )}
          {canEdit && (
            <button style={iconBtn} title="Șterge articolul" onClick={() => onDelete()}>
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <input
          value={draft.title}
          readOnly={!canEdit}
          placeholder="Titlul articolului"
          onChange={(e) => change({ ...draft, title: e.target.value })}
          onBlur={commit}
          style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 16, color: "var(--navy-deep)", marginBottom: 9, border: "1px solid transparent", borderRadius: 6, padding: "2px 4px", width: "100%", background: "transparent" }}
        />
        {draft.alineate.map((al, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", margin: "0 0 8px" }}>
            {draft.alineate.length > 1 && <span style={{ fontFamily: "var(--serif)", color: "var(--muted)", fontWeight: 600, paddingTop: 6 }}>({i + 1})</span>}
            <textarea
              value={al}
              readOnly={!canEdit}
              placeholder="Textul alineatului…"
              onChange={(e) => setAlineat(i, e.target.value)}
              onBlur={commit}
              rows={2}
              style={{ flex: 1, fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.68, color: "var(--ink)", border: "1px solid transparent", borderRadius: 6, padding: "4px 6px", background: canEdit ? "var(--surface-2)" : "transparent", resize: "vertical", outline: "none" }}
            />
            {canEdit && draft.alineate.length > 1 && (
              <button style={iconBtn} title="Șterge alineat" onClick={() => removeAlineat(i)}>
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <button onClick={addAlineat} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "4px 0" }}>
            <Icon name="plus" size={14} /> Adaugă alineat
          </button>
        )}
      </div>
      {!draft.single_idea && (
        <div style={{ padding: "0 16px 16px" }}>
          <ValidatorCard
            variant="soft"
            state="warn"
            repair={canEdit && !!onVerify && !verifyBusy}
            onRepair={onVerify}
            title="Pare să conțină mai multe obligații"
            text={verifyBusy ? "Se verifică cu asistentul…" : "Acest articol pare să spună mai multe lucruri deodată. Le putem separa în articole proprii ca fiecare să fie clar."}
          />
        </div>
      )}
    </div>
  );
}

function CheckRow({
  check,
  canEdit,
  semanticBusy,
  onVerify,
  onIgnore,
  onUnignore,
}: {
  check: ChecklistItem;
  canEdit: boolean;
  semanticBusy: boolean;
  onVerify: () => void | Promise<void>;
  onIgnore: () => void | Promise<void>;
  onUnignore: () => void | Promise<void>;
}) {
  const t = check.state === "ok" ? VAL_TONES.ok : check.state === "warn" ? VAL_TONES.warn : check.state === "alert" ? VAL_TONES.alert : null;
  const isSemantic = check.kind !== "determinist";
  if (check.ignored) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 99, background: "var(--paper-2)", border: "1px solid var(--border-2)" }}>
        <Icon name="eye" size={14} style={{ color: "var(--faint)" }} />
        <span style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through" }}>{check.label}</span>
        <span style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>· ignorat</span>
        {canEdit && (
          <button onClick={onUnignore} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--blue)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Anulează
          </button>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px 8px 10px", borderRadius: 10, background: t ? t.bg : "var(--surface-2)", border: `1px solid ${t ? t.line : "var(--border-2)"}` }}>
      <span style={{ color: t ? t.c : "var(--faint)", display: "inline-flex" }}>
        <Icon name={t ? t.icon : "circle"} size={15} stroke={2.4} />
      </span>
      <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.3, flex: 1 }}>
        <b style={{ color: t ? t.c : "var(--muted)", fontWeight: 700 }}>{check.label}</b>
        {check.detail ? ` — ${check.detail}` : ""}
      </span>
      {canEdit && isSemantic && (
        <button
          onClick={onVerify}
          disabled={semanticBusy}
          style={{ flex: "none", background: "#fff", border: `1px solid ${t ? t.line : "var(--border-2)"}`, color: t ? t.c : "var(--muted)", fontWeight: 600, fontSize: 12, padding: "4px 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}
        >
          <Icon name="spark" size={12} /> Verifică cu AI
        </button>
      )}
      {canEdit && (
        <button
          onClick={onIgnore}
          title="Marchează ca fiind în regulă"
          style={{ flex: "none", background: "transparent", border: "1px solid var(--border-2)", color: "var(--muted)", fontWeight: 600, fontSize: 12, padding: "4px 10px", borderRadius: 99, cursor: "pointer" }}
        >
          Ignoră
        </button>
      )}
    </div>
  );
}

function SingleIdeaChip({ single }: { single: boolean }) {
  const c = single ? "var(--ok)" : "var(--warn)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: c }}>
      <Icon name={single ? "check" : "dot"} size={single ? 13 : 11} stroke={2.6} />
      {single ? "O singură idee" : "Mai multe obligații"}
    </span>
  );
}

// ── New project: act type → title → create ─────────────────────────────────
function NewProjectFlow({
  actType,
  setActType,
  isAuthed,
  onCreated,
}: {
  actType: ActType | null;
  setActType: (t: ActType) => void;
  isAuthed: boolean;
  onCreated: (p: ProjectDetail) => void;
}) {
  const navigate = useNavigate();
  const [sub, setSub] = useState<"act" | "title">("act");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sub === "act") {
    return (
      <ActTypeChooser
        onPick={(t) => {
          setActType(t);
          setSub("title");
        }}
      />
    );
  }

  const fullTitle = title.trim().startsWith("Lege") ? title.trim() : `Lege privind ${title.trim()}`;
  const create = async () => {
    if (!title.trim()) {
      setError("Scrie un titlu pentru proiect.");
      return;
    }
    if (!isAuthed) {
      // Writes require a session — send to login (demo/demo), then come back here.
      navigate("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject({ title: fullTitle, act_type: actType ?? "lege-ordinara" });
      onCreated(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu am putut crea proiectul.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <StageHeader
        step={2}
        label="Titlu"
        title="Cum se va numi legea ta?"
        sub="Titlul trebuie să spună exact ce reglementează legea. Un titlu precis ajută oamenii — și instituțiile — să înțeleagă din prima despre ce e vorba."
      />
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: ".02em" }}>TITLUL PROIECTULUI DE LEGE</label>
      <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: "var(--r)", padding: "4px 4px 4px 16px", boxShadow: "var(--sh-1)" }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 19, color: "var(--muted)", whiteSpace: "nowrap" }}>Lege privind</span>
        <input
          autoFocus
          value={title.replace(/^Lege privind\s*/i, "")}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
          placeholder="transparența prețurilor medicamentelor compensate"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--serif)", fontSize: 19, color: "var(--navy-deep)", padding: "12px 8px", fontWeight: 600 }}
        />
      </div>
      {error && <div style={{ color: "var(--alert)", fontSize: 13.5, marginTop: 10 }}>{error}</div>}
      {!isAuthed && (
        <div style={{ marginTop: 12 }}>
          <ValidatorCard variant="soft" state="warn" title="Trebuie să fii autentificat ca să creezi un proiect" text="Folosește contul demo/demo. Te ducem la autentificare." />
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <Btn variant="outline" size="md" onClick={() => setSub("act")}>
          Înapoi
        </Btn>
        <Btn variant="primary" size="md" iconR="arrow" disabled={busy} onClick={create}>
          {busy ? "Se creează…" : isAuthed ? "Creează proiectul" : "Autentifică-te și creează"}
        </Btn>
      </div>
    </div>
  );
}

// ── New project: act-type chooser ──────────────────────────────────────────
function ActTypeChooser({ onPick }: { onPick: (t: ActType) => void }) {
  const [sel, setSel] = useState<ActType | null>(null);
  const cards: ActType[] = ["lege-ordinara", "lege-organica", "oug", "hg"];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <span style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 14, background: "var(--navy)", color: "#fff", alignItems: "center", justifyContent: "center", fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, marginBottom: 14 }}>§</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-.01em" }}>Să începem un proiect nou</h1>
        <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>Mai întâi, ce fel de act normativ scriem? Te ghidăm noi mai departe, pas cu pas.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        {cards.map((id) => {
          const a = ACT_TYPES[id];
          const disabled = !!a.disabled;
          const active = sel === id;
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => setSel(id)}
              style={{ textAlign: "left", background: active ? "var(--blue-soft)" : "var(--surface)", border: "1.5px solid", borderColor: active ? "var(--blue)" : "var(--border)", borderRadius: "var(--r-lg)", padding: 18, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.62 : 1, position: "relative", boxShadow: active ? "var(--sh-2)" : "var(--sh-1)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontSize: 16.5, fontWeight: 800, color: "var(--navy-deep)" }}>{a.label}</span>
                <span style={{ width: 22, height: 22, borderRadius: 99, border: "2px solid", borderColor: active ? "var(--blue)" : "var(--border-2)", display: "grid", placeItems: "center", background: active ? "var(--blue)" : "transparent" }}>
                  {active && <Icon name="check" size={12} stroke={3} style={{ color: "#fff" }} />}
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, margin: "0 0 10px" }}>{a.desc}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: disabled ? "var(--alert)" : "var(--ok)" }}>
                <Icon name={disabled ? "info" : "user"} size={14} /> {a.who}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <Btn variant="primary" size="lg" iconR="arrow" disabled={!sel} onClick={() => sel && onPick(sel)}>
          Continuă către titlu
        </Btn>
      </div>
    </div>
  );
}

// ── Right rail: AI co-pilot ────────────────────────────────────────────────
interface ThreadMsg {
  role: "user" | "ai";
  text?: string;
  proposal?: { intro: string; note: string; article: { num: number; title: string; alineate: string[] } };
}

function Copilot({ projectId, onInsert }: { projectId?: number; onInsert: (art: { num: number; title: string; alineate: string[] }) => void }) {
  const { aiStatus } = useApp();
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [insertedIdx, setInsertedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  const send = async (text: string, action?: string) => {
    if (!text.trim() && !action) return;
    if (text.trim()) setThread((t) => [...t, { role: "user", text: text.trim() }]);
    setDraft("");
    setBusy(true);
    try {
      const reply: CopilotReply = await api.copilot({ project_id: projectId, action, text });
      if (reply.kind === "proposal" && reply.article) {
        setThread((t) => [...t, { role: "ai", proposal: { intro: reply.intro, note: reply.note, article: reply.article! } }]);
      } else {
        setThread((t) => [...t, { role: "ai", text: reply.text }]);
      }
    } catch (e) {
      setThread((t) => [...t, { role: "ai", text: e instanceof Error ? e.message : "Eroare la asistent." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside style={{ width: 372, flex: "none", borderLeft: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--navy)", color: "var(--amber)", display: "grid", placeItems: "center", flex: "none" }}>
          <Icon name="spark" size={19} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>Asistent Legiferam</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ok)" }} />
            {aiStatus?.scripted ? "Mod scriptat (DEMO)" : "Te ajută cu redactarea"}
          </div>
        </div>
        <button style={iconBtn}>
          <Icon name="sliders" size={17} />
        </button>
      </div>

      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <Eyebrow>Acțiuni rapide</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>
          {AI_QUICK_ACTIONS.map((a) => (
            <button
              key={a.action}
              disabled={busy}
              onClick={() => send(a.label, a.action)}
              style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", cursor: "pointer" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--blue)";
                e.currentTarget.style.background = "var(--blue-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--blue-soft)", color: "var(--blue)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name={a.icon} size={15} />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="lf-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {thread.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "86%", display: "flex", gap: 8, flexDirection: "row-reverse" }}>
              <Avatar initials="TU" color="var(--navy-700)" size={26} />
              <div style={{ background: "var(--navy)", color: "#fff", borderRadius: "12px 12px 4px 12px", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ) : m.proposal ? (
            <div key={i} style={{ maxWidth: "100%" }}>
              <AIProposalCard
                proposal={m.proposal}
                inserted={insertedIdx === i}
                onInsert={() => {
                  onInsert(m.proposal!.article);
                  setInsertedIdx(i);
                }}
                onReject={() => setThread((t) => t.filter((_, j) => j !== i))}
              />
            </div>
          ) : (
            <div key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--navy)", color: "var(--amber)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name="spark" size={14} />
              </span>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-2)" }}>{m.text}</div>
            </div>
          ),
        )}
        {busy && <div style={{ alignSelf: "flex-start", fontSize: 12.5, color: "var(--faint)", paddingLeft: 34 }}>Asistentul scrie…</div>}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: "var(--r)", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Scrie liber: „vreau ca farmaciile să afișeze prețurile…”"
            style={{ border: "none", outline: "none", resize: "none", fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5, background: "transparent" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>AI propune — tu decizi.</span>
            <Btn variant="solidBlue" size="sm" iconR="arrow" onClick={() => send(draft)} disabled={busy}>
              Trimite
            </Btn>
          </div>
        </div>
      </div>
    </aside>
  );
}
