import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DemoBanner, PublicBanner, TopNav } from "../components/chrome";
import { ValidatorCard, VAL_TONES } from "../components/cards";
import { DiffView } from "../components/diff";
import { ActBadge, Avatar, Btn, ComplianceRing, Icon, StatusBadge } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";
import type { Amendment, Article, ProjectDetail, ProjectEvent } from "../lib/types";

const EVENT_LABEL: Record<string, string> = {
  created: "a creat proiectul",
  added_article: "a adăugat un articol",
  edited_article: "a modificat un articol",
  deleted_article: "a șters un articol",
  published: "a publicat proiectul",
  set_vigoare: "a stabilit intrarea în vigoare",
  edited_motives: "a actualizat expunerea de motive",
  added_coauthor: "a adăugat un co-inițiator",
  amendment_proposed: "a propus un amendament",
  amendment_accepted: "a acceptat un amendament",
  amendment_rejected: "a respins un amendament",
};

export function Dotted() {
  return <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--border-3)" }} />;
}

const SECTION_LABELS: Record<string, string> = {
  problema: "Problema",
  solutie: "Soluția propusă",
  "impact-bugetar": "Impact bugetar",
  efecte: "Efecte așteptate",
};

export default function ProjectScreen() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tab, setTab] = useState("text");

  const reload = () => {
    if (slug) return api.getProject(slug).then(setProject);
    return Promise.resolve();
  };

  useEffect(() => {
    if (slug) api.getProject(slug).then(setProject).catch(() => setProject(null));
  }, [slug]);

  if (!project)
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopNav active="project" />
        <div style={{ padding: 48, color: "var(--muted)" }}>Se încarcă proiectul…</div>
      </div>
    );

  const remaining = project.total - project.passed;
  const tabs = [
    { id: "text", label: "Text" },
    { id: "motive", label: "Expunere de motive" },
    { id: "amend", label: "Amendamente", count: project.amendments.length },
    { id: "discutii", label: "Discuții", count: 0 },
    { id: "istoric", label: "Istoric" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopNav active="project" />
      <DemoBanner />
      <div className="lf-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 32px 0" }}>
            <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
                  <ActBadge type={project.act_type} size="sm" />
                  <StatusBadge status={project.status} size="sm" />
                  <PublicBanner />
                </div>
                <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1.2, fontWeight: 700, color: "var(--navy-deep)", margin: "0 0 14px", letterSpacing: "-.01em", maxWidth: 640 }}>
                  {project.title}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  {project.curator && (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar initials={project.curator_initials} color="var(--navy)" size={28} />
                      <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
                        Curator <b style={{ color: "var(--ink)" }}>{project.curator}</b>
                      </span>
                    </span>
                  )}
                  <Dotted />
                  <span style={{ fontSize: 13.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="clock" size={15} /> {project.updated_label}
                  </span>
                  <Dotted />
                  <span style={{ fontSize: 13.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="heart" size={15} /> <b style={{ color: "var(--ink)" }}>{project.supporters.toLocaleString("ro-RO")}</b> susținători
                  </span>
                </div>
              </div>
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "12px 16px" }}>
                  <ComplianceRing passed={project.passed} total={project.total} size={58} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>Conformitate</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, maxWidth: 120, lineHeight: 1.4 }}>
                      {remaining} verificări rămase până la depunere
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <Btn variant="accent" size="md" icon="heart" style={{ flex: 1, justifyContent: "center" }}>
                    Susține
                  </Btn>
                  <Btn variant="outline" size="md" icon="bell">
                    Urmărește
                  </Btn>
                </div>
                <Btn variant="primary" size="md" icon="draft" iconR="arrow" onClick={() => navigate(`/editor/${project.slug}`)} style={{ width: "100%", justifyContent: "center" }}>
                  Continuă editarea
                </Btn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 22 }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    position: "relative",
                    background: "none",
                    border: "none",
                    padding: "11px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: tab === t.id ? "var(--navy)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                  {typeof t.count === "number" && (
                    <span style={{ marginLeft: 7, fontSize: 11.5, fontWeight: 700, color: tab === t.id ? "var(--navy)" : "var(--faint)", background: "var(--paper-2)", borderRadius: 99, padding: "1px 7px" }}>
                      {t.count}
                    </span>
                  )}
                  {tab === t.id && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5, background: "var(--navy)", borderRadius: 2 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 32px 60px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
          <div>
            {tab === "text" && <LawDocument project={project} loggedIn={!!user} onReload={reload} />}
            {tab === "motive" && <MotiveTab project={project} />}
            {tab === "amend" && <AmendListTab project={project} onReload={reload} />}
            {tab === "discutii" && <DiscussEmpty />}
            {tab === "istoric" && <HistoryTab project={project} />}
          </div>
          <ProjectSidebar project={project} />
        </div>
      </div>
    </div>
  );
}

function LawDocument({
  project,
  loggedIn,
  onReload,
}: {
  project: ProjectDetail;
  loggedIn: boolean;
  onReload: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<number | null>(null); // article id being amended
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "40px 48px" }}>
      <div style={{ textAlign: "center", marginBottom: 30, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>Proiect de lege</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, color: "var(--navy-deep)", margin: "12px auto 0", lineHeight: 1.35, maxWidth: 480 }}>{project.title}</h2>
      </div>
      {project.articles.map((art) => (
        <div key={art.id} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 16.5, color: "var(--navy-deep)", marginBottom: 8 }}>
            Art. {art.num}. — {art.title}
          </div>
          {art.alineate.map((al, i) => (
            <p key={i} style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.75, color: "var(--ink)", margin: "0 0 8px" }}>
              {art.alineate.length > 1 && <span style={{ color: "var(--muted)" }}>({i + 1}) </span>}
              {al}
            </p>
          ))}
          {editing === art.id ? (
            <ProposeForm
              article={art}
              onCancel={() => setEditing(null)}
              onSubmitted={async () => {
                setEditing(null);
                await onReload();
              }}
            />
          ) : (
            <button
              onClick={() => {
                if (!loggedIn) return navigate("/login");
                if (!project.is_published) return;
                if (project.viewer_can_edit) return; // initiators edit directly, don't amend
                setEditing(art.id);
              }}
              title={!project.is_published ? "Disponibil după publicarea legii" : project.viewer_can_edit ? "Ești inițiator — editează direct" : ""}
              disabled={!project.is_published || project.viewer_can_edit}
              style={{
                marginTop: 4,
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 99,
                padding: "5px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                color: !project.is_published || project.viewer_can_edit ? "var(--faint)" : "var(--blue)",
                cursor: !project.is_published || project.viewer_can_edit ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="branch" size={14} /> Propune o modificare
            </button>
          )}
        </div>
      ))}
      {!loggedIn && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)" }}>
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--blue)", fontWeight: 600, cursor: "pointer", padding: 0 }}>Autentifică-te</button> ca să propui modificări.
        </div>
      )}
    </div>
  );
}

function ProposeForm({ article, onCancel, onSubmitted }: { article: Article; onCancel: () => void; onSubmitted: () => void }) {
  const [alineate, setAlineate] = useState<string[]>(article.alineate.length ? article.alineate : [""]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return setErr("Justificarea este obligatorie.");
    setBusy(true);
    setErr(null);
    try {
      await api.proposeAmendment({
        target_article_id: article.id,
        proposed_title: article.title,
        proposed_alineate: alineate.filter((a) => a.trim() !== "" || true),
        reason: reason.trim(),
      });
      onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 10, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: "var(--r)", padding: 16 }}>
      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Propune o modificare la Art. {article.num}</div>
      {alineate.map((al, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--serif)", color: "var(--muted)", fontWeight: 600, paddingTop: 8 }}>({i + 1})</span>
          <textarea
            value={al}
            onChange={(e) => setAlineate((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
            rows={2}
            style={{ flex: 1, fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, border: "1px solid var(--border-2)", borderRadius: 6, padding: "6px 8px", background: "var(--surface)", resize: "vertical", outline: "none" }}
          />
          {alineate.length > 1 && (
            <button onClick={() => setAlineate((a) => a.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", paddingTop: 6 }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => setAlineate((a) => [...a, ""])} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "2px 0 10px" }}>
        <Icon name="plus" size={13} /> Adaugă alineat
      </button>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "4px 0 6px" }}>De ce propui asta? (obligatoriu)</div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Explică pe scurt motivul modificării…"
        style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.5, border: "1px solid var(--border-2)", borderRadius: 6, padding: "8px 10px", background: "var(--surface)", resize: "vertical", outline: "none" }}
      />
      {err && <div style={{ color: "var(--alert)", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn variant="primary" size="sm" icon="branch" onClick={submit} disabled={busy}>
          {busy ? "Se trimite…" : "Trimite propunerea"}
        </Btn>
        <Btn variant="ghost" size="sm" onClick={onCancel}>
          Renunță
        </Btn>
      </div>
    </div>
  );
}

function MotiveTab({ project }: { project: ProjectDetail }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "36px 44px" }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--navy-deep)", margin: "0 0 18px" }}>Expunere de motive</h2>
      {project.motives.map((m) => (
        <div key={m.section} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 6 }}>
            {SECTION_LABELS[m.section] ?? m.section}
          </div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.7, color: "var(--ink)", margin: 0 }}>{m.body}</p>
        </div>
      ))}
      <ValidatorCard variant="line" state="warn" title="Secțiunea de impact bugetar lipsește" text="Adaugă o estimare a costurilor pentru a completa expunerea de motive." repair />
    </div>
  );
}

const AMEND_STATUS: Record<string, { label: string; c: string; bg: string; line: string }> = {
  pending: { label: "În așteptare", c: "var(--warn)", bg: "var(--warn-bg)", line: "var(--warn-line)" },
  accepted: { label: "Acceptat", c: "var(--ok)", bg: "var(--ok-bg)", line: "var(--ok-line)" },
  rejected: { label: "Respins", c: "var(--alert)", bg: "var(--alert-bg)", line: "var(--alert-line)" },
};

function AmendListTab({ project, onReload }: { project: ProjectDetail; onReload: () => Promise<void> }) {
  if (project.amendments.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "48px 24px", textAlign: "center" }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--paper-2)", color: "var(--muted)", display: "inline-grid", placeItems: "center", marginBottom: 14 }}>
          <Icon name="branch" size={24} />
        </span>
        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>Niciun amendament încă</div>
        <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 400, margin: "8px auto 0", lineHeight: 1.55 }}>
          {project.is_published
            ? "Oricine autentificat poate propune o modificare din fila Text."
            : "Amendamentele devin posibile după ce proiectul e publicat."}
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {project.amendments.map((a) => (
        <AmendmentCard key={a.id} amendment={a} canDecide={project.viewer_is_curator} onReload={onReload} />
      ))}
    </div>
  );
}

function AmendmentCard({ amendment: a, canDecide, onReload }: { amendment: Amendment; canDecide: boolean; onReload: () => Promise<void> }) {
  const [open, setOpen] = useState(a.status === "pending");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const st = AMEND_STATUS[a.status] ?? AMEND_STATUS.pending;

  const decide = async (decision: "accept" | "reject") => {
    if (decision === "reject" && !reason.trim()) {
      setRejecting(true);
      setErr("Explică de ce respingi.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.decideAmendment(a.id, decision, reason.trim());
      await onReload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "16px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar initials={a.author_initials} color={a.author_color} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--serif)" }}>Art. {a.article_num}</span>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>· {a.author_name} · {a.when_label}</span>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{a.summary}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.bg, border: `1px solid ${st.line}`, borderRadius: 99, padding: "4px 11px" }}>{st.label}</span>
        <Icon name={open ? "chevronD" : "chevron"} size={17} style={{ color: "var(--faint)" }} />
      </button>
      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {a.ops.length > 0 && <DiffView title={`Art. ${a.article_num}. — ${a.article_title}`} ops={a.ops} compact />}
          <div style={{ display: "flex", gap: 8, marginTop: 12, padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
            <Icon name="info" size={16} style={{ color: "var(--amber)", flex: "none", marginTop: 1 }} />
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <b>De ce:</b> {a.reason}
              {a.decision_reason && (
                <div style={{ marginTop: 6, color: "var(--muted)" }}>
                  <b>Răspunsul curatorului:</b> {a.decision_reason}
                </div>
              )}
            </div>
          </div>
          {canDecide && a.status === "pending" && (
            <div style={{ marginTop: 12 }}>
              {rejecting && (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Explică de ce respingi amendamentul…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13.5, border: "1px solid var(--border-2)", borderRadius: 6, padding: "8px 10px", marginBottom: 8, resize: "vertical", outline: "none" }}
                />
              )}
              {err && <div style={{ color: "var(--alert)", fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ok" size="sm" icon="check" onClick={() => decide("accept")} disabled={busy}>
                  Acceptă
                </Btn>
                <Btn variant="danger" size="sm" icon="x" onClick={() => decide("reject")} disabled={busy}>
                  {rejecting ? "Confirmă respingerea" : "Respinge"}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiscussEmpty() {
  return (
    <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "56px 24px", textAlign: "center" }}>
      <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--paper-2)", color: "var(--muted)", display: "inline-grid", placeItems: "center", marginBottom: 14 }}>
        <Icon name="book" size={24} />
      </span>
      <div style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>Încă nu există discuții</div>
      <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 380, margin: "8px auto 18px", lineHeight: 1.55 }}>
        Pune o întrebare despre un articol sau deschide o temă de dezbatere. Discuțiile sunt publice și ajută la
        îmbunătățirea textului.
      </p>
      <Btn variant="primary" size="md" icon="plus">
        Deschide o discuție
      </Btn>
    </div>
  );
}

function HistoryTab({ project }: { project: ProjectDetail }) {
  const events: ProjectEvent[] = project.events ?? [];
  if (events.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
        Încă nu există istoric pentru acest proiect.
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "26px 28px" }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < events.length - 1 ? 22 : 0, position: "relative" }}>
          {i < events.length - 1 && <span style={{ position: "absolute", left: 17, top: 38, bottom: 0, width: 2, background: "var(--border)" }} />}
          <Avatar initials={e.actor_initials || "··"} color="var(--navy)" size={36} />
          <div style={{ paddingTop: 2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>
              <b>{e.actor_name}</b> {e.summary || EVENT_LABEL[e.kind] || e.kind}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 3 }}>{e.when}</div>
            {e.diff && e.diff.ops && e.diff.ops.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <DiffView title={e.diff.title} ops={e.diff.ops} compact />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SideCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "16px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProjectSidebar({ project }: { project: ProjectDetail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0 }}>
      <SideCard
        title="Verificări de conformitate"
        action={<span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ok)" }}>{project.passed}/{project.total}</span>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {project.checklist.slice(0, 6).map((c) => {
            const t = c.state === "ok" ? VAL_TONES.ok : c.state === "warn" ? VAL_TONES.warn : c.state === "alert" ? VAL_TONES.alert : null;
            return (
              <div key={c.check_id} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                {!t ? (
                  <span style={{ width: 16, height: 16, borderRadius: 99, border: "1.6px solid var(--border-3)", flex: "none" }} />
                ) : (
                  <span style={{ width: 16, height: 16, borderRadius: 99, background: t.bg, color: t.c, display: "grid", placeItems: "center", flex: "none" }}>
                    <Icon name={t.icon} size={c.state === "ok" ? 9 : 10} stroke={2.8} />
                  </span>
                )}
                <span style={{ fontSize: 12.5, color: c.state === "todo" ? "var(--muted)" : "var(--ink-2)" }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </SideCard>

      <SideCard title="Contribuitori">
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {project.contributors.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar initials={c.initials} color={c.color} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </SideCard>

      <SideCard title="Legi similare găsite">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {project.similar_laws.map((l) => (
            <div key={l.ref} style={{ borderLeft: "2px solid var(--amber)", paddingLeft: 11 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{l.ref}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4 }}>{l.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="link" size={12} /> {l.match}
              </div>
            </div>
          ))}
        </div>
      </SideCard>
    </div>
  );
}
