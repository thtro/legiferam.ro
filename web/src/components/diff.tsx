// Track-changes (per-alineat) diff renderer — used by amendments and the history log.
import { Icon } from "./ui";
import type { DiffOp } from "../lib/types";

export function DiffView({ title, ops, compact }: { title?: string; ops: DiffOp[]; compact?: boolean }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <span style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>{title}</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ color: "var(--alert)", textDecoration: "line-through" }}>eliminat</span>
            <span style={{ color: "var(--ok)" }}>adăugat</span>
          </span>
        </div>
      )}
      <div style={{ padding: compact ? "10px 14px" : "16px 18px" }}>
        {ops.map((c) => (
          <div
            key={c.n}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 8,
              alignItems: "flex-start",
              background: c.kind === "ins" ? "var(--ok-bg)" : "transparent",
              borderRadius: 6,
              padding: c.kind === "ins" ? "6px 10px" : 0,
            }}
          >
            <span style={{ fontFamily: "var(--serif)", fontSize: compact ? 13.5 : 15, color: "var(--muted)", fontWeight: 600, flex: "none", paddingTop: 1 }}>({c.n})</span>
            <p style={{ fontFamily: "var(--serif)", fontSize: compact ? 13.5 : 15, lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>
              {c.kind === "ins" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ok)", background: "#fff", border: "1px solid var(--ok-line)", borderRadius: 99, padding: "1px 7px", marginRight: 7, verticalAlign: "middle" }}>
                  <Icon name="plus" size={10} stroke={3} /> Alineat nou
                </span>
              )}
              {c.text}
              {c.text_del && (
                <span style={{ textDecoration: "line-through", textDecorationColor: "var(--alert)", color: "var(--alert)", background: "var(--alert-bg)", borderRadius: 3, padding: "0 3px" }}>{c.text_del}</span>
              )}
              {c.text_ins && (
                <span style={{ color: "var(--ok)", background: "var(--ok-bg)", borderRadius: 3, padding: "0 3px", borderBottom: "2px solid var(--ok)", marginLeft: 4, fontWeight: 600 }}>{c.text_ins}</span>
              )}
              {c.text_end}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
