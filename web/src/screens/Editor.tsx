import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AIProposalCard, ChecklistPanel, ValidatorCard } from "../components/cards";
import { ActBadge, Avatar, Btn, ComplianceBar, Eyebrow, Icon, StateMark, iconBtn } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";
import { ACT_TYPES, AI_QUICK_ACTIONS, WIZARD_STEPS } from "../lib/constants";
import type { ActType, Article, ChecklistItem, CopilotReply, ProjectDetail } from "../lib/types";

const DEMO_SLUG = "transparenta-preturilor-medicamentelor-compensate";

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

  useEffect(() => {
    if (mode === "work" && slug) {
      api.getProject(slug).then((p) => {
        setProject(p);
        setArticles(p.articles);
        setChecklist(p.checklist);
        setTitle(p.title);
      });
    }
  }, [mode, slug]);

  const passed = checklist.filter((c) => c.state === "ok").length;
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
    if (id === activeStep) return "current";
    if (id === 1) return newActType || project ? "done" : "todo";
    if (id === 2) return title ? "done" : "todo";
    if (id === 3) return articles.some((a) => a.num === 2) ? "done" : "todo";
    if (id === 4) return articles.length ? "done" : "todo";
    if (id === 7) return "warn";
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
        <ActTypeChooser
          onPick={(t) => {
            setNewActType(t);
            // For round 1, jump into the demo project's editor as the working canvas.
            navigate(`/editor/${DEMO_SLUG}`);
          }}
        />
      </EditorShell>
    );
  }

  if (!project) return <div style={{ padding: 48, color: "var(--muted)" }}>Se încarcă editorul…</div>;

  return (
    <EditorShell
      title={title}
      onTitle={setTitle}
      actType={project.act_type}
      passed={passed}
      total={total}
      checklist={checklist}
      showChecks={showChecks}
      setShowChecks={setShowChecks}
      onHome={() => navigate(`/proiect/${project.slug}`)}
      onPreview={() => navigate(`/proiect/${project.slug}`)}
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
            setArticles((prev) => [
              ...prev,
              { id: -Date.now(), num: prev.length + 1, title: art.title, single_idea: true, alineate: art.alineate },
            ])
          }
        />
      }
    >
      <CentreStage
        step={activeStep}
        articles={articles}
        setArticles={setArticles}
        canEdit={canEdit}
        slug={project.slug}
        checklist={checklist}
        onRefreshChecklist={() => api.getChecklist(project.slug).then(setChecklist)}
      />
    </EditorShell>
  );
}

// ── Shell: header + 3-column body ──────────────────────────────────────────
function EditorShell({
  title,
  onTitle,
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
}: {
  title: string;
  onTitle?: (v: string) => void;
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
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" size="sm" icon="eye" onClick={onPreview}>
            Previzualizează
          </Btn>
          <Btn variant="primary" size="sm" icon="export">
            Export
          </Btn>
        </div>
      </header>
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
  articles,
  setArticles,
  canEdit,
  slug,
  checklist,
  onRefreshChecklist,
}: {
  step: number;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  canEdit: boolean;
  slug: string;
  checklist: ChecklistItem[];
  onRefreshChecklist: () => void;
}) {
  if (step === 4 || step === 3) {
    return (
      <div>
        <StageHeader
          step={4}
          label="Articole"
          title="Scrie articolele legii"
          sub="Fiecare articol exprimă o singură idee sau obligație. Numerotarea alineatelor se face automat. Te anunțăm dacă un articol pare să spună prea multe deodată."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {articles.map((art, idx) => (
            <ArticleCard
              key={art.id}
              art={art}
              canEdit={canEdit}
              onChange={(next) => setArticles((prev) => prev.map((a, i) => (i === idx ? next : a)))}
              onSave={async (next) => {
                if (canEdit && next.id > 0) {
                  await api.updateArticle(slug, next.id, { title: next.title, single_idea: next.single_idea, alineate: next.alineate });
                  onRefreshChecklist();
                }
              }}
            />
          ))}
        </div>
        <button
          onClick={() => canEdit && setArticles((prev) => [...prev, { id: -Date.now(), num: prev.length + 1, title: "Articol nou", single_idea: true, alineate: [""] }])}
          style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r)", padding: "14px", color: "var(--blue)", fontWeight: 600, fontSize: 14, fontFamily: "var(--sans)", cursor: "pointer", opacity: canEdit ? 1 : 0.6 }}
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
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checklist
              .filter((c) => c.state !== "ok")
              .map((c) => (
                <ValidatorCard key={c.check_id} variant="inline" state={c.state === "warn" ? "warn" : c.state === "alert" ? "alert" : "warn"} title={c.label} text={c.detail} repair={c.state !== "todo"} />
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

  // Generic placeholder for other wizard steps (Sancțiuni / Vigoare / Expunere).
  const labels: Record<number, [string, string]> = {
    2: ["Titlu", "Cum se va numi legea ta?"],
    5: ["Sancțiuni", "Ce se întâmplă dacă regula nu e respectată?"],
    6: ["Intrare în vigoare", "Când intră legea în vigoare?"],
    7: ["Expunere de motive", "De ce e nevoie de această lege?"],
  };
  const [label, t] = labels[step] ?? ["Pas", "În lucru"];
  return (
    <div>
      <StageHeader step={step} label={label} title={t} sub="Acest pas este disponibil în editor. Folosește co-pilotul din dreapta pentru ajutor la redactare." />
      <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "34px 24px", textAlign: "center", color: "var(--muted)" }}>
        Conținutul pasului „{label}" se redactează aici, cu verificările de conformitate live.
      </div>
    </div>
  );
}

function ArticleCard({
  art,
  canEdit,
  onChange,
  onSave,
}: {
  art: Article;
  canEdit: boolean;
  onChange: (a: Article) => void;
  onSave: (a: Article) => void;
}) {
  const setAlineat = (i: number, text: string) => {
    const alineate = art.alineate.map((a, j) => (j === i ? text : a));
    onChange({ ...art, alineate });
  };
  const addAlineat = () => onChange({ ...art, alineate: [...art.alineate, ""] });
  const removeAlineat = (i: number) => onChange({ ...art, alineate: art.alineate.filter((_, j) => j !== i) });

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--serif)" }}>Art. {art.num}</span>
        <SingleIdeaChip single={art.single_idea} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, color: "var(--faint)" }}>
          {canEdit && (
            <button style={iconBtn} title="Salvează" onClick={() => onSave(art)}>
              <Icon name="save" size={15} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <input
          value={art.title}
          readOnly={!canEdit}
          onChange={(e) => onChange({ ...art, title: e.target.value })}
          onBlur={() => onSave(art)}
          style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 16, color: "var(--navy-deep)", marginBottom: 9, border: "1px solid transparent", borderRadius: 6, padding: "2px 4px", width: "100%", background: "transparent" }}
        />
        {art.alineate.map((al, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", margin: "0 0 8px" }}>
            {art.alineate.length > 1 && <span style={{ fontFamily: "var(--serif)", color: "var(--muted)", fontWeight: 600, paddingTop: 6 }}>({i + 1})</span>}
            <textarea
              value={al}
              readOnly={!canEdit}
              onChange={(e) => setAlineat(i, e.target.value)}
              onBlur={() => onSave(art)}
              rows={2}
              style={{ flex: 1, fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.68, color: "var(--ink)", border: "1px solid transparent", borderRadius: 6, padding: "4px 6px", background: canEdit ? "var(--surface-2)" : "transparent", resize: "vertical", outline: "none" }}
            />
            {canEdit && art.alineate.length > 1 && (
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
      {!art.single_idea && (
        <div style={{ padding: "0 16px 16px" }}>
          <ValidatorCard variant="soft" state="warn" repair title="Pare să conțină mai multe obligații" text="Art. 3 spune trei lucruri: afișarea, actualizarea în 48h și bonul informativ. Le putem separa în articole proprii ca fiecare să fie clar." />
        </div>
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
