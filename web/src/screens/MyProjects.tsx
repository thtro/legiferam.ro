import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemoBanner, TopNav } from "../components/chrome";
import { ActBadge, Btn, Icon } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";
import type { MyProject } from "../lib/types";

export default function MyProjectsScreen() {
  const navigate = useNavigate();
  const { user, loadingUser } = useApp();
  const [projects, setProjects] = useState<MyProject[] | null>(null);

  useEffect(() => {
    if (!loadingUser && !user) {
      navigate("/login");
      return;
    }
    if (user) api.myProjects().then(setProjects).catch(() => setProjects([]));
  }, [user, loadingUser, navigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopNav active="project" />
      <DemoBanner />
      <div className="lf-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 32px 64px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-.01em" }}>Proiectele mele</h1>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 0" }}>
                Schițele rămân private până le publici. După publicare pot primi amendamente.
              </p>
            </div>
            <Btn variant="primary" size="md" icon="plus" onClick={() => navigate("/editor-nou")}>
              Începe un proiect
            </Btn>
          </div>

          {projects === null && <div style={{ color: "var(--muted)" }}>Se încarcă…</div>}
          {projects?.length === 0 && (
            <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border-2)", borderRadius: "var(--r-lg)", padding: "48px 24px", textAlign: "center" }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--paper-2)", color: "var(--muted)", display: "inline-grid", placeItems: "center", marginBottom: 14 }}>
                <Icon name="doc" size={24} />
              </span>
              <div style={{ fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>Încă nu ai niciun proiect</div>
              <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 380, margin: "8px auto 18px", lineHeight: 1.55 }}>
                Transformă o idee într-un proiect de lege, pas cu pas, cu ajutorul asistentului.
              </p>
              <Btn variant="primary" size="md" icon="plus" onClick={() => navigate("/editor-nou")}>
                Începe primul proiect
              </Btn>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {projects?.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/editor/${p.slug}`)}
                style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "18px 20px", cursor: "pointer", display: "flex", gap: 16, alignItems: "center" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                    <ActBadge type={p.act_type} size="sm" />
                    {p.is_published ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ok)", background: "var(--ok-bg)", border: "1px solid var(--ok-line)", borderRadius: 99, padding: "3px 10px" }}>Publicat</span>
                    ) : (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", background: "var(--paper-2)", border: "1px solid var(--border-2)", borderRadius: 99, padding: "3px 10px" }}>Schiță</span>
                    )}
                    <span style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>· {p.role}</span>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--navy-deep)", lineHeight: 1.3 }}>{p.title}</div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: p.passed === p.total ? "var(--ok)" : "var(--ink)" }}>{p.passed}/{p.total}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>conformitate</div>
                </div>
                <Icon name="chevron" size={18} style={{ color: "var(--faint)" }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
