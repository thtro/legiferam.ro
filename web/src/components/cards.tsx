// Validator feedback, AI proposal, checklist detail — ported from cards.jsx.
import type { CSSProperties } from "react";
import { Btn, Icon } from "./ui";
import type { ChecklistItem, CheckState, ProposalArticle } from "../lib/types";

export const VAL_TONES: Record<
  "ok" | "warn" | "alert",
  { c: string; bg: string; line: string; icon: string; word: string }
> = {
  ok: { c: "var(--ok)", bg: "var(--ok-bg)", line: "var(--ok-line)", icon: "check", word: "Corect" },
  warn: { c: "var(--warn)", bg: "var(--warn-bg)", line: "var(--warn-line)", icon: "dot", word: "De revizuit" },
  alert: { c: "var(--alert)", bg: "var(--alert-bg)", line: "var(--alert-line)", icon: "alert", word: "Lipsește ceva" },
};

type ValVariant = "soft" | "line" | "inline";

export function ValidatorCard({
  state = "ok",
  title,
  text,
  repair,
  variant = "soft",
  onRepair,
}: {
  state?: "ok" | "warn" | "alert";
  title: string;
  text?: string;
  repair?: boolean;
  variant?: ValVariant;
  onRepair?: () => void;
}) {
  const t = VAL_TONES[state];

  if (variant === "inline") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "7px 12px 7px 9px",
          borderRadius: 99,
          background: t.bg,
          border: `1px solid ${t.line}`,
          animation: "lf-fade-up .3s both",
        }}
      >
        <span style={{ color: t.c, display: "inline-flex" }}>
          <Icon name={t.icon} size={15} stroke={2.4} />
        </span>
        <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.3 }}>
          <b style={{ color: t.c, fontWeight: 700 }}>{title}</b>
          {text ? " — " + text : ""}
        </span>
        {repair && (
          <button
            onClick={onRepair}
            style={{
              marginLeft: "auto",
              flex: "none",
              background: "#fff",
              border: `1px solid ${t.line}`,
              color: t.c,
              fontWeight: 600,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 99,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
            }}
          >
            <Icon name="wand" size={13} /> Repară cu AI
          </button>
        )}
      </div>
    );
  }

  const wrap: CSSProperties =
    variant === "line"
      ? { background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${t.c}`, boxShadow: "var(--sh-1)" }
      : { background: t.bg, border: `1px solid ${t.line}` };

  return (
    <div style={{ display: "flex", gap: 11, padding: "12px 14px", borderRadius: "var(--r)", animation: "lf-fade-up .3s both", ...wrap }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          background: "#fff",
          color: t.c,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          boxShadow: `inset 0 0 0 1.5px ${t.line}`,
        }}
      >
        <Icon name={t.icon} size={state === "ok" ? 12 : 13} stroke={2.6} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: t.c }}>{t.word}</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 3, lineHeight: 1.35 }}>{title}</div>
        {text && <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>{text}</div>}
        {repair && (
          <button
            onClick={onRepair}
            style={{
              marginTop: 10,
              background: variant === "line" ? t.bg : "#fff",
              border: `1px solid ${t.line}`,
              color: t.c,
              fontWeight: 600,
              fontSize: 12.5,
              padding: "6px 12px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <Icon name="wand" size={14} /> Repară cu AI
          </button>
        )}
      </div>
    </div>
  );
}

export function AIProposalCard({
  proposal,
  onInsert,
  inserted,
  onReject,
}: {
  proposal: { intro: string; note: string; article: ProposalArticle };
  onInsert?: () => void;
  inserted?: boolean;
  onReject?: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--amber)",
        borderRadius: "var(--r-lg)",
        padding: 15,
        boxShadow: "var(--sh-2)",
        animation: "lf-pop .3s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            background: "var(--navy)",
            color: "var(--amber)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <Icon name="spark" size={14} stroke={2} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--navy)" }}>
          Propunere AI
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--faint)", fontWeight: 500 }}>nu e încă în proiect</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 11 }}>{proposal.intro}</div>
      <div style={{ background: "var(--surface)", border: "1px dashed var(--border-2)", borderRadius: 9, padding: "13px 15px", marginBottom: 11 }}>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 14.5, color: "var(--navy-deep)", marginBottom: 6 }}>
          Art. {proposal.article.num}. — {proposal.article.title}
        </div>
        {proposal.article.alineate.map((al, i) => (
          <p key={i} style={{ fontFamily: "var(--serif)", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)", margin: "5px 0 0" }}>
            {proposal.article.alineate.length > 1 && <span style={{ color: "var(--muted)" }}>({i + 1}) </span>}
            {al}
          </p>
        ))}
      </div>
      {proposal.note && (
        <div style={{ display: "flex", gap: 7, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 }}>
          <Icon name="info" size={15} style={{ flex: "none", marginTop: 1, color: "var(--amber)" }} />
          <span>{proposal.note}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant={inserted ? "ok" : "primary"} size="sm" icon={inserted ? "check" : "plus"} onClick={onInsert}>
          {inserted ? "Inserat în proiect" : "Inserează în proiect"}
        </Btn>
        <Btn variant="outline" size="sm" icon="draft">
          Modifică
        </Btn>
        <Btn variant="ghost" size="sm" icon="x" onClick={onReject}>
          Respinge
        </Btn>
      </div>
    </div>
  );
}

function Legend({ c, n, label, ring }: { c: string; n: number; label: string; ring?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: ring ? "transparent" : c, border: ring ? `1.6px solid ${c}` : "none" }} />
      <b style={{ fontWeight: 700 }}>{n}</b> {label}
    </span>
  );
}

export function ChecklistPanel({ checklist, onClose }: { checklist: ChecklistItem[]; onClose?: () => void }) {
  const counts: Record<CheckState, number> = { ok: 0, warn: 0, alert: 0, todo: 0 };
  checklist.forEach((c) => (counts[c.state] += 1));
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-3)",
        width: 380,
        overflow: "hidden",
        animation: "lf-pop .18s both",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Verificări de conformitate</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Conform regulilor de tehnică legislativă (L24/2000)</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", padding: 4, cursor: "pointer" }}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
      <div className="lf-scroll" style={{ maxHeight: 340, overflowY: "auto", padding: "6px 0" }}>
        {checklist.map((c) => {
          const t = c.state === "ok" ? VAL_TONES.ok : c.state === "warn" ? VAL_TONES.warn : c.state === "alert" ? VAL_TONES.alert : null;
          return (
            <div key={c.check_id} style={{ display: "flex", gap: 11, padding: "10px 16px", alignItems: "flex-start" }}>
              {!t ? (
                <span style={{ width: 18, height: 18, borderRadius: 99, border: "1.6px solid var(--border-3)", flex: "none", marginTop: 1 }} />
              ) : (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 99,
                    background: t.bg,
                    color: t.c,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                    marginTop: 1,
                  }}
                >
                  <Icon name={t.icon} size={c.state === "ok" ? 10 : 11} stroke={2.6} />
                </span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: c.state === "todo" ? "var(--muted)" : "var(--ink)" }}>{c.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{c.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "11px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 14, background: "var(--surface-2)" }}>
        <Legend c="var(--ok)" n={counts.ok} label="corecte" />
        <Legend c="var(--warn)" n={counts.warn + counts.alert} label="de revizuit" />
        <Legend c="var(--border-3)" n={counts.todo} label="rămase" ring />
      </div>
    </div>
  );
}
