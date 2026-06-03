import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DemoBanner, TopNav } from "../components/chrome";
import { Btn, Icon, StatusBadge } from "../components/ui";
import { api } from "../lib/api";
import { DEFAULT_DOMAINS } from "../lib/constants";
import type { ProjectSummary } from "../lib/types";

export default function LandingScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const [domain, setDomain] = useState("Toate domeniile");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [sort, setSort] = useState<"supporters" | "score">("supporters");

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const list = projects
    .filter((d) => domain === "Toate domeniile" || d.domain === domain)
    .filter((d) => !query || d.title.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => (sort === "supporters" ? b.supporters - a.supporters : b.passed / b.total - a.passed / a.total));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopNav active="landing" />
      <DemoBanner />
      <div className="lf-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        {/* hero */}
        <section style={{ background: "var(--navy-deep)", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.5,
              backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 2px, transparent 2px 22px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -30,
              fontFamily: "var(--serif)",
              fontSize: 360,
              lineHeight: 1,
              color: "rgba(255,255,255,.04)",
              fontWeight: 700,
              userSelect: "none",
            }}
          >
            §
          </div>
          <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "72px 32px 64px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--amber)",
                background: "rgba(201,138,26,.14)",
                border: "1px solid rgba(201,138,26,.3)",
                borderRadius: 99,
                padding: "5px 13px",
                marginBottom: 22,
              }}
            >
              <Icon name="globe" size={14} /> Platformă publică, open-source · legea scrisă împreună
            </div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 58, lineHeight: 1.05, fontWeight: 700, margin: 0, letterSpacing: "-.02em", maxWidth: 700 }}>
              Scrie o lege.
              <br />
              <span style={{ color: "var(--amber)" }}>Schimbă România.</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,.82)", maxWidth: 520, margin: "22px 0 30px" }}>
              Transformă o idee într-un proiect de lege corect, pas cu pas. Fără jargon, fără pregătire juridică — cu un
              asistent care te ghidează.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="accent" size="lg" icon="plus" onClick={() => navigate("/editor-nou")}>
                Începe un proiect
              </Btn>
              <button
                onClick={() => document.getElementById("lf-discover")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.22)",
                  color: "#fff",
                  borderRadius: "var(--r)",
                  padding: "12px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Explorează proiecte <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* 3 steps */}
        <section style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {(
              [
                ["Idee", "Spui în cuvintele tale ce vrei să schimbi. Asistentul te ajută să găsești forma potrivită.", "spark"],
                ["Redactare ghidată", "Te conducem pas cu pas prin structura legii, cu verificări automate de conformitate.", "draft"],
                ["Pregătit de depunere", "Când toate verificările sunt trecute, proiectul e gata să fie depus oficial.", "flag"],
              ] as const
            ).map(([t, d, ic], i) => (
              <div key={t} style={{ display: "flex", gap: 14 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: "var(--blue-soft)",
                    color: "var(--navy)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                    position: "relative",
                  }}
                >
                  <Icon name={ic} size={20} />
                  <span
                    style={{
                      position: "absolute",
                      top: -7,
                      left: -7,
                      width: 20,
                      height: 20,
                      borderRadius: 99,
                      background: "var(--navy)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                </span>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{t}</div>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* discovery */}
        <section id="lf-discover" style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 32px 64px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-.01em" }}>
                {query ? `Rezultate pentru „${query}”` : "Proiecte active"}
              </h2>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 0" }}>
                {query ? `${list.length} proiect(e) găsite.` : "Susține o inițiativă sau propune o modificare. Totul e public."}
              </p>
            </div>
            <button
              onClick={() => setSort((s) => (s === "supporters" ? "score" : "supporters"))}
              title="Schimbă sortarea"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "var(--surface)",
                border: "1px solid var(--border-2)",
                borderRadius: "var(--r)",
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-2)",
                cursor: "pointer",
                boxShadow: "var(--sh-1)",
              }}
            >
              <Icon name="filter" size={15} /> {sort === "supporters" ? "Cele mai susținute" : "Cea mai mare conformitate"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {DEFAULT_DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                style={{
                  background: domain === d ? "var(--navy)" : "var(--surface)",
                  color: domain === d ? "#fff" : "var(--ink-2)",
                  border: "1px solid",
                  borderColor: domain === d ? "var(--navy)" : "var(--border-2)",
                  borderRadius: 99,
                  padding: "7px 15px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {list.map((p) => (
              <DiscoverCard key={p.id} p={p} onOpen={() => navigate(`/proiect/${p.slug}`)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DiscoverCard({ p, onOpen }: { p: ProjectSummary; onOpen: () => void }) {
  const segs = Array.from({ length: p.total }, (_, i) => i < p.passed);
  return (
    <button
      onClick={onOpen}
      style={{
        textAlign: "left",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-1)",
        padding: 18,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 13,
        transition: "box-shadow .15s, transform .1s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--sh-3)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--border-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--sh-1)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", background: "var(--blue-soft)", border: "1px solid #d7e3f1", borderRadius: 99, padding: "3px 9px" }}>
          {p.domain}
        </span>
        <span style={{ marginLeft: "auto" }}>
          <StatusBadge status={p.status} size="sm" />
        </span>
      </div>
      <h3 style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: "var(--navy-deep)", margin: 0, minHeight: 70 }}>
        {p.title}
      </h3>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>Conformitate</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: p.passed === p.total ? "var(--ok)" : "var(--ink)" }}>
            {p.passed}/{p.total}
          </span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {segs.map((on, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 2,
                background: on ? (p.passed === p.total ? "var(--ok)" : "var(--navy)") : "var(--paper-2)",
                border: on ? "none" : "1px solid var(--border)",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2, borderTop: "1px solid var(--border)", marginTop: 2 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, paddingTop: 11 }}>
          <Icon name="heart" size={15} style={{ color: "var(--amber)" }} /> <b style={{ color: "var(--ink)" }}>{p.supporters.toLocaleString("ro-RO")}</b> susținători
        </span>
      </div>
    </button>
  );
}
