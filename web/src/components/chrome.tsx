// Shared app chrome — top navigation for non-editor screens. Brand: Legiferam.ro.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";
import { Avatar, Btn, Icon } from "./ui";

function UserMenu() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [open, setOpen] = useState(false);
  if (!user) return <Avatar initials="TU" color="var(--navy-700)" size={32} />;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <Avatar initials={user.initials || "TU"} color="var(--navy-700)" size={32} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "var(--sh-3)", width: 220, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{user.display_name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.email}</div>
            </div>
            <button
              onClick={() => { setOpen(false); navigate("/proiectele-mele"); }}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}
            >
              Proiectele mele
            </button>
            <button
              onClick={async () => { await api.logout().catch(() => {}); setUser(null); setOpen(false); navigate("/"); }}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: 13, color: "var(--alert)", cursor: "pointer", borderTop: "1px solid var(--border)" }}
            >
              Ieși din cont
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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
    { id: "project", label: "Proiectele mele", to: "/proiectele-mele" },
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
        {user ? (
          <UserMenu />
        ) : (
          <Btn variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Autentificare
          </Btn>
        )}
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
