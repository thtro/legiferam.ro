import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DemoBanner, PublicBanner, TopNav } from "../components/chrome";
import { ValidatorCard, VAL_TONES } from "../components/cards";
import { ActBadge, Avatar, Btn, ComplianceRing, Icon, StatusBadge } from "../components/ui";
import { api } from "../lib/api";
import type { ProjectDetail } from "../lib/types";

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
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tab, setTab] = useState("text");

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
            {tab === "text" && <LawDocument project={project} />}
            {tab === "motive" && <MotiveTab project={project} />}
            {tab === "amend" && <AmendListTab project={project} onOpen={(id) => navigate(`/amendament/${id}`)} />}
            {tab === "discutii" && <DiscussEmpty />}
            {tab === "istoric" && <HistoryTab project={project} />}
          </div>
          <ProjectSidebar project={project} />
        </div>
      </div>
    </div>
  );
}

function LawDocument({ project }: { project: ProjectDetail }) {
  const navigate = useNavigate();
  const firstAmendId = project.amendments[0]?.id;
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
          <button
            onClick={() => firstAmendId && navigate(`/amendament/${firstAmendId}`)}
            style={{
              marginTop: 4,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 99,
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--blue)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="branch" size={14} /> Propune o modificare
          </button>
        </div>
      ))}
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

function AmendListTab({ project, onOpen }: { project: ProjectDetail; onOpen: (id: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {project.amendments.map((a, i) => (
        <button
          key={a.id}
          onClick={() => onOpen(a.id)}
          style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "16px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}
        >
          <Avatar initials={a.author_initials} color={a.author_color} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--serif)" }}>Art. {a.article_num}</span>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>· {a.author_name} · {a.when_label}</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{a.summary}</div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: i === 0 ? "var(--warn)" : "var(--muted)",
              background: i === 0 ? "var(--warn-bg)" : "var(--paper-2)",
              border: "1px solid",
              borderColor: i === 0 ? "var(--warn-line)" : "var(--border)",
              borderRadius: 99,
              padding: "4px 11px",
            }}
          >
            {i === 0 ? "În așteptare" : "În discuție"}
          </span>
          <Icon name="chevron" size={17} style={{ color: "var(--faint)" }} />
        </button>
      ))}
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
  const items = [
    { who: project.curator || "Curator", what: "a actualizat Art. 3 — Obligația de afișare", when: "acum 2 ore", color: "var(--navy)", ini: project.curator_initials || "AM" },
    { who: "Radu Pavel", what: "a propus un amendament la Art. 3", when: "ieri", color: "#2f7d5b", ini: "RP" },
    { who: project.curator || "Curator", what: "a adăugat Art. 2 — Definiții", when: "acum 3 zile", color: "var(--navy)", ini: project.curator_initials || "AM" },
    { who: project.curator || "Curator", what: "a creat proiectul", when: "acum 1 săptămână", color: "var(--navy)", ini: project.curator_initials || "AM" },
  ];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "26px 28px" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < items.length - 1 ? 20 : 0, position: "relative" }}>
          {i < items.length - 1 && <span style={{ position: "absolute", left: 17, top: 38, bottom: 0, width: 2, background: "var(--border)" }} />}
          <Avatar initials={it.ini} color={it.color} size={36} />
          <div style={{ paddingTop: 2 }}>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>
              <b>{it.who}</b> {it.what}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 3 }}>{it.when}</div>
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
