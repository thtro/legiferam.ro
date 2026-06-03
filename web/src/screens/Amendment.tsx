import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DemoBanner, TopNav } from "../components/chrome";
import { Avatar, Btn, Icon } from "../components/ui";
import { api } from "../lib/api";
import { Dotted } from "./Project";
import type { Amendment } from "../lib/types";

export default function AmendmentScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<"curator" | "author">("curator");
  const [decided, setDecided] = useState<"accept" | "reject" | "discuss" | null>(null);
  const [amendment, setAmendment] = useState<Amendment | null>(null);

  useEffect(() => {
    if (id) api.getAmendment(Number(id)).then(setAmendment).catch(() => setAmendment(null));
  }, [id]);

  if (!amendment)
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopNav active="project" />
        <div style={{ padding: 48, color: "var(--muted)" }}>Se încarcă amendamentul…</div>
      </div>
    );

  const a = amendment;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopNav active="project" />
      <DemoBanner />
      <div className="lf-scroll" style={{ flex: 1, overflowY: "auto", background: "var(--paper)" }}>
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon name="arrow" size={16} style={{ transform: "rotate(180deg)" }} /> Înapoi la proiect
            </button>
            <Dotted />
            <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>Modificare la Art. {a.article_num}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "var(--paper-2)", padding: 3, borderRadius: 9 }}>
              {(
                [
                  ["curator", "Vedere curator"],
                  ["author", "Vedere autor"],
                ] as const
              ).map(([vid, label]) => (
                <button
                  key={vid}
                  onClick={() => setView(vid)}
                  style={{
                    background: view === vid ? "var(--surface)" : "transparent",
                    border: "none",
                    borderRadius: 7,
                    padding: "6px 13px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: view === vid ? "var(--ink)" : "var(--muted)",
                    boxShadow: view === vid ? "var(--sh-1)" : "none",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "26px 32px 60px",
            display: "grid",
            gridTemplateColumns: view === "curator" ? "260px 1fr" : "1fr",
            gap: 26,
            alignItems: "start",
          }}
        >
          {view === "curator" && <CuratorQueue active={a} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: view === "author" ? 760 : "none", margin: view === "author" ? "0 auto" : 0, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--blue-soft)", color: "var(--blue)", display: "grid", placeItems: "center", flex: "none" }}>
                <Icon name="branch" size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-.01em" }}>Modificare propusă la Art. {a.article_num}</h1>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{a.article_title}</div>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar initials={a.author_initials} color={a.author_color} size={28} />
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  <b>{a.author_name}</b> · {a.when_label}
                </span>
              </span>
            </div>

            <TrackChanges amendment={a} />

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon name="info" size={17} style={{ color: "var(--amber)" }} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>De ce propun asta?</span>
                {view === "author" && <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--alert)", fontWeight: 600 }}>Obligatoriu</span>}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)", margin: 0 }}>{a.reason}</p>
            </div>

            {view === "curator" ? (
              <div
                style={{
                  position: "sticky",
                  bottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  boxShadow: "var(--sh-3)",
                  padding: "13px 16px",
                }}
              >
                {decided ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600, color: decided === "accept" ? "var(--ok)" : decided === "reject" ? "var(--alert)" : "var(--blue)" }}>
                    <Icon name={decided === "accept" ? "check" : decided === "reject" ? "x" : "book"} size={18} stroke={2.4} />
                    {decided === "accept"
                      ? `Amendament acceptat — Art. ${a.article_num} a fost actualizat.`
                      : decided === "reject"
                        ? "Amendament respins. Autorul a fost notificat."
                        : "Discuție deschisă cu autorul."}
                    <button onClick={() => setDecided(null)} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }}>
                      anulează
                    </button>
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 13.5, color: "var(--muted)", marginRight: "auto" }}>
                      Decizia ta ca <b style={{ color: "var(--ink)" }}>curator</b>:
                    </span>
                    <Btn variant="ok" size="md" icon="check" onClick={() => setDecided("accept")}>
                      Acceptă modificarea
                    </Btn>
                    <Btn variant="soft" size="md" icon="book" onClick={() => setDecided("discuss")}>
                      Discută
                    </Btn>
                    <Btn variant="danger" size="md" icon="x" onClick={() => setDecided("reject")}>
                      Respinge
                    </Btn>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Btn variant="ghost" size="md" onClick={() => navigate(-1)}>
                  Renunță
                </Btn>
                <Btn variant="primary" size="md" icon="branch">
                  Trimite propunerea
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend2({ c, label, strike }: { c: string; label: string; strike?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 18, height: 0, borderTop: `2px solid ${c}` }} />
      <span style={{ color: c, textDecoration: strike ? "line-through" : "none" }}>{label}</span>
    </span>
  );
}

function TrackChanges({ amendment }: { amendment: Amendment }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>
          Art. {amendment.article_num}. — {amendment.article_title}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, fontSize: 11.5, color: "var(--muted)" }}>
          <Legend2 c="var(--alert)" label="eliminat" strike />
          <Legend2 c="var(--ok)" label="adăugat" />
        </span>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {amendment.ops.map((c) => (
          <div
            key={c.n}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              alignItems: "flex-start",
              background: c.kind === "ins" ? "var(--ok-bg)" : "transparent",
              borderRadius: 8,
              padding: c.kind === "ins" ? "8px 12px" : "0",
              marginLeft: c.kind === "ins" ? -12 : 0,
              marginRight: c.kind === "ins" ? -12 : 0,
            }}
          >
            <span style={{ fontFamily: "var(--serif)", fontSize: 15.5, color: "var(--muted)", fontWeight: 600, flex: "none", paddingTop: 1 }}>({c.n})</span>
            <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.72, color: "var(--ink)", margin: 0 }}>
              {c.kind === "ins" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--sans)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                    color: "var(--ok)",
                    background: "#fff",
                    border: "1px solid var(--ok-line)",
                    borderRadius: 99,
                    padding: "2px 8px",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                >
                  <Icon name="plus" size={11} stroke={3} /> Alineat nou
                </span>
              )}
              {c.text}
              {c.text_del && (
                <span style={{ textDecoration: "line-through", textDecorationColor: "var(--alert)", color: "var(--alert)", background: "var(--alert-bg)", borderRadius: 3, padding: "0 3px" }}>
                  {c.text_del}
                </span>
              )}
              {c.text_ins && (
                <span style={{ color: "var(--ok)", background: "var(--ok-bg)", borderRadius: 3, padding: "0 3px", borderBottom: "2px solid var(--ok)", marginLeft: 4, fontWeight: 600 }}>
                  {c.text_ins}
                </span>
              )}
              {c.text_end}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CuratorQueue({ active }: { active: Amendment }) {
  // Round 1: the queue shows the active amendment; full multi-item queue lands later.
  const items = [active];
  return (
    <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)", letterSpacing: ".03em", padding: "0 4px 4px" }}>
        Modificări propuse <span style={{ color: "var(--faint)" }}>· {items.length}</span>
      </div>
      {items.map((a) => (
        <button
          key={a.id}
          style={{ textAlign: "left", background: "var(--surface)", border: "1px solid var(--blue)", borderRadius: "var(--r)", padding: "12px 13px", cursor: "pointer", boxShadow: "var(--sh-2)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <Avatar initials={a.author_initials} color={a.author_color} size={24} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--serif)" }}>Art. {a.article_num}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>{a.when_label}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, lineHeight: 1.4 }}>{a.summary}</div>
        </button>
      ))}
    </div>
  );
}
