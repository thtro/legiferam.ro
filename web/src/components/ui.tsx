// Design-system primitives, ported 1:1 from the prototype's ui.jsx.
import type { CSSProperties, ReactNode } from "react";
import { ACT_TYPES, STATUSES } from "../lib/constants";
import type { ActType, CheckState, ChecklistItem, ProjectStatus } from "../lib/types";

// ---------- Icons (stroke set, currentColor) ----------
const ICON_PATHS: Record<string, string> = {
  check: "M4 10.5l4 4 8-9",
  alert: "M10 3.5l7 12.5H3z M10 8.5v3.5 M10 14.2v.1",
  info: "M10 9v5 M10 6v.1 M10 18a8 8 0 100-16 8 8 0 000 16z",
  wand: "M5 15l8-8 M13.5 4.5l2 2 M4.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L2.5 6.5l1.4-.6zM15 12l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z",
  book: "M4 4.5h5a2 2 0 012 2V17a2 2 0 00-2-1.6H4zM16 4.5h-5a2 2 0 00-2 2V17a2 2 0 012-1.6h5z",
  search: "M9 15a6 6 0 100-12 6 6 0 000 12z M17 17l-3.8-3.8",
  draft: "M4 16.5l1-3.5 8.5-8.5 2.5 2.5L7.5 15.5zM12 5.5l2.5 2.5",
  chevron: "M7 5l5 5-5 5",
  chevronD: "M5 8l5 5 5-5",
  plus: "M10 4v12 M4 10h12",
  doc: "M5 3h6l4 4v10H5z M11 3v4h4",
  save: "M4 4h9l3 3v9H4z M7 4v4h6 M7 16v-4h6v4",
  eye: "M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  export: "M10 13V3 M6.5 6.5L10 3l3.5 3.5 M4 13v3.5h12V13",
  heart: "M10 16.5S3.5 12.5 3.5 8a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0116.5 8c0 4.5-6.5 8.5-6.5 8.5z",
  bell: "M6 8a4 4 0 018 0c0 4 1.5 5 1.5 5h-11S6 12 6 8z M8.5 16a1.6 1.6 0 003 0",
  branch: "M6 4.5a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z M6 8v8 M14 11.5a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z M6 11h4a4 4 0 004-4",
  arrow: "M4 10h12 M11 5l5 5-5 5",
  x: "M5 5l10 10 M15 5L5 15",
  user: "M10 10a3 3 0 100-6 3 3 0 000 6z M4 17c0-3.3 2.7-5 6-5s6 1.7 6 5",
  globe: "M10 18a8 8 0 100-16 8 8 0 000 16z M2 10h16 M10 2c2.5 2.2 2.5 13.8 0 16 M10 2c-2.5 2.2-2.5 13.8 0 16",
  filter: "M3 5h14l-5.5 6.5V16l-3 1.5v-6z",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z",
  flag: "M5 17V3 M5 4h9l-2 3 2 3H5",
  scale: "M10 3v13 M6 16h8 M5 7l-2.5 5h5zM5 7l2.5 5 M15 7l-2.5 5h5zM15 7l-2.5 5 M5 7l5-1.2L15 7",
  clock: "M10 18a8 8 0 100-16 8 8 0 000 16z M10 6v4.2l2.8 1.6",
  link: "M8 12l4-4 M7.5 10.5l-1.5 1.5a2.5 2.5 0 003.5 3.5l1.5-1.5 M12.5 9.5l1.5-1.5a2.5 2.5 0 00-3.5-3.5L9 5.5",
  sliders: "M4 6h8 M14 6h2 M4 10h2 M8 10h8 M4 14h6 M12 14h4 M12 6v0 M6 10v0 M10 14v0",
};

export function Icon({
  name,
  size = 18,
  stroke = 2,
  fill,
  style,
}: {
  name: string;
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
    "aria-hidden": true,
  };
  if (name === "dot")
    return (
      <svg {...common} stroke="none">
        <circle cx="10" cy="10" r="3.4" fill="currentColor" />
      </svg>
    );
  if (name === "circle")
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.6" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d={ICON_PATHS[name] || ""} fill={fill || "none"} />
    </svg>
  );
}

// ---------- Buttons ----------
type BtnVariant =
  | "primary"
  | "accent"
  | "solidBlue"
  | "outline"
  | "ghost"
  | "soft"
  | "ok"
  | "danger";

export function Btn({
  children,
  variant = "ghost",
  size = "md",
  icon,
  iconR,
  onClick,
  style,
  title,
  disabled,
  type = "button",
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconR?: string;
  onClick?: () => void;
  style?: CSSProperties;
  title?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const pad = size === "sm" ? "6px 11px" : size === "lg" ? "12px 20px" : "9px 15px";
  const fs = size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontFamily: "var(--sans)",
    fontWeight: 600,
    fontSize: fs,
    padding: pad,
    borderRadius: "var(--r)",
    border: "1px solid transparent",
    lineHeight: 1,
    whiteSpace: "nowrap",
    transition: "background .15s, border-color .15s, box-shadow .15s, transform .05s",
    letterSpacing: ".005em",
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? "none" : "auto",
    ...style,
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: { background: "var(--navy)", color: "#fff", boxShadow: "var(--sh-1)" },
    accent: { background: "var(--amber)", color: "#241a05", boxShadow: "var(--sh-1)" },
    solidBlue: { background: "var(--blue)", color: "#fff", boxShadow: "var(--sh-1)" },
    outline: { background: "var(--surface)", color: "var(--ink)", borderColor: "var(--border-2)", boxShadow: "var(--sh-1)" },
    ghost: { background: "transparent", color: "var(--ink-2)", borderColor: "transparent" },
    soft: { background: "var(--blue-soft)", color: "var(--navy)", borderColor: "transparent" },
    ok: { background: "var(--ok)", color: "#fff" },
    danger: { background: "var(--surface)", color: "var(--alert)", borderColor: "var(--alert-line)" },
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant] }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} stroke={2} />}
      {children}
      {iconR && <Icon name={iconR} size={size === "sm" ? 15 : 17} stroke={2} />}
    </button>
  );
}

// ---------- Badges ----------
export function ActBadge({ type, size = "md" }: { type: ActType; size?: "sm" | "md" }) {
  const a = ACT_TYPES[type] || ACT_TYPES["lege-ordinara"];
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: sm ? 11 : 12,
        fontWeight: 700,
        letterSpacing: ".03em",
        textTransform: "uppercase",
        color: "var(--navy)",
        background: "var(--blue-soft)",
        border: "1px solid #d7e3f1",
        padding: sm ? "3px 8px" : "4px 10px",
        borderRadius: 99,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--blue)" }} />
      {a.short}
    </span>
  );
}

export function StatusBadge({ status, size = "md" }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const s = STATUSES[status] || STATUSES["schita"];
  const tones = {
    neutral: { c: "var(--muted)", bg: "var(--paper-2)", b: "var(--border-2)", d: "#9aa0a8" },
    blue: { c: "var(--blue)", bg: "var(--blue-soft)", b: "#d7e3f1", d: "var(--blue)" },
    green: { c: "var(--ok)", bg: "var(--ok-bg)", b: "var(--ok-line)", d: "var(--ok)" },
  } as const;
  const t = tones[s.tone];
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: sm ? 11 : 12.5,
        fontWeight: 600,
        color: t.c,
        background: t.bg,
        border: `1px solid ${t.b}`,
        padding: sm ? "3px 9px" : "4px 11px",
        borderRadius: 99,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: t.d }} />
      {s.label}
    </span>
  );
}

export function Avatar({
  initials,
  color = "#1e3a5f",
  size = 30,
  ring,
}: {
  initials: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        letterSpacing: ".01em",
        flex: "none",
        boxShadow: ring ? "0 0 0 2px #fff, 0 0 0 3.5px " + color : "none",
      }}
    >
      {initials}
    </span>
  );
}

export function StateMark({ state, size = 16 }: { state: "ok" | "warn" | "empty" | string; size?: number }) {
  if (state === "ok")
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 99,
          background: "var(--ok-bg)",
          color: "var(--ok)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <Icon name="check" size={size - 5} stroke={2.6} />
      </span>
    );
  if (state === "warn")
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 99,
          background: "var(--warn-bg)",
          color: "var(--warn)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <Icon name="dot" size={size - 6} />
      </span>
    );
  return (
    <span
      style={{ width: size, height: size, borderRadius: 99, border: "1.6px solid var(--border-3)", flex: "none", display: "inline-block" }}
    />
  );
}

// ---------- Compliance score — 12-segment bar ----------
export function ComplianceBar({
  checklist,
  compact,
  onExpand,
  expandable = true,
}: {
  checklist: ChecklistItem[];
  compact?: boolean;
  onExpand?: () => void;
  expandable?: boolean;
}) {
  const passed = checklist.filter((c) => c.state === "ok").length;
  const total = checklist.length;
  const colorFor = (s: CheckState) =>
    s === "ok" ? "var(--ok)" : s === "warn" ? "var(--warn)" : s === "alert" ? "var(--alert)" : "transparent";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 9 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: compact ? 12 : 12.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".01em" }}>
          Scor de conformitate
        </span>
        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: "var(--ink)" }}>
          {passed} <span style={{ color: "var(--faint)", fontWeight: 600 }}>/ {total} trecute</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {checklist.map((c, i) => (
          <div
            key={c.check_id}
            title={c.label}
            style={{
              flex: 1,
              height: compact ? 7 : 9,
              borderRadius: 3,
              background: c.state === "todo" ? "var(--paper-2)" : colorFor(c.state),
              border: c.state === "todo" ? "1px solid var(--border-2)" : "none",
              transformOrigin: "left",
              animation: `lf-fill .5s ${i * 0.03}s both cubic-bezier(.2,.7,.2,1)`,
            }}
          />
        ))}
      </div>
      {expandable && (
        <button
          onClick={onExpand}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--blue)",
            fontSize: 12.5,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          Vezi cele {total} verificări <Icon name="chevron" size={13} />
        </button>
      )}
    </div>
  );
}

export function ComplianceRing({ passed, total, size = 64 }: { passed: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const frac = total ? passed / total : 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ok)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color: "var(--ink)" }}>{passed}</span>
        <span style={{ fontSize: size * 0.16, color: "var(--faint)", fontWeight: 600 }}>/ {total}</span>
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)" }}>
      {children}
    </div>
  );
}

export const iconBtn: CSSProperties = {
  background: "none",
  border: "none",
  padding: 4,
  borderRadius: 6,
  color: "var(--faint)",
  cursor: "pointer",
  display: "inline-flex",
};
