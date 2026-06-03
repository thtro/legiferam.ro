// Shared app chrome — top navigation for non-editor screens. Brand: Legiferam.ro.
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/app-context";
import { Avatar, Btn, Icon } from "./ui";

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--navy)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--serif)",
          fontWeight: 800,
          fontSize: 17,
        }}
      >
        §
      </span>
      <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-.01em", color: "var(--ink)" }}>
        Legiferam<span style={{ color: "var(--faint)", fontWeight: 600 }}>.ro</span>
      </span>
    </button>
  );
}

export function TopNav({ active }: { active?: "landing" | "project" }) {
  const navigate = useNavigate();
  const { user, demoMode, setDemoMode } = useApp();
  const links = [
    { id: "landing", label: "Explorează", to: "/" },
    { id: "project", label: "Proiectul meu", to: "/proiect/transparenta-preturilor-medicamentelor-compensate" },
  ];
  return (
    <header
      style={{
        height: 60,
        flex: "none",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 26px",
      }}
    >
      <Brand onClick={() => navigate("/")} />
      <nav style={{ display: "flex", gap: 4, marginLeft: 8 }}>
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => navigate(l.to)}
            style={{
              background: active === l.id ? "var(--paper-2)" : "transparent",
              border: "none",
              borderRadius: 8,
              padding: "8px 13px",
              fontSize: 13.5,
              fontWeight: 600,
              color: active === l.id ? "var(--ink)" : "var(--muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 99,
            padding: "7px 14px",
            width: 230,
            color: "var(--faint)",
            flex: "none",
          }}
        >
          <Icon name="search" size={16} />
          <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Caută proiecte de lege…</span>
        </div>
        {/* "Mod DEMO" sits next to "Începe un proiect" (brief §5). */}
        <Btn
          variant={demoMode ? "accent" : "soft"}
          size="sm"
          icon="eye"
          onClick={() => {
            setDemoMode(!demoMode);
            navigate("/");
          }}
        >
          {demoMode ? "Mod DEMO activ" : "Mod DEMO"}
        </Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => navigate("/editor-nou")}>
          Începe un proiect
        </Btn>
        <Avatar initials={user?.initials || "TU"} color="var(--navy-700)" size={32} />
      </div>
    </header>
  );
}

export function PublicBanner() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12.5,
        color: "var(--ok)",
        background: "var(--ok-bg)",
        border: "1px solid var(--ok-line)",
        borderRadius: 99,
        padding: "4px 12px",
        fontWeight: 600,
      }}
    >
      <Icon name="globe" size={14} /> Public · oricine poate citi și propune modificări
    </div>
  );
}

export function DemoBanner() {
  const { demoMode, setDemoMode } = useApp();
  if (!demoMode) return null;
  return (
    <div
      style={{
        background: "var(--amber-soft)",
        borderBottom: "1px solid var(--warn-line)",
        color: "var(--warn)",
        fontSize: 13,
        fontWeight: 600,
        padding: "7px 26px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Icon name="eye" size={15} />
      Mod DEMO — explorezi date de prezentare, fără cont. Modificările nu se salvează.
      <button
        onClick={() => setDemoMode(false)}
        style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--warn)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
      >
        Ieși din DEMO
      </button>
    </div>
  );
}
