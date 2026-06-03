import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/chrome";
import { Btn } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";

const inputStyle = {
  width: "100%",
  border: "1.5px solid var(--border-2)",
  borderRadius: "var(--r)",
  padding: "11px 13px",
  fontFamily: "var(--sans)",
  fontSize: 14.5,
  color: "var(--ink)",
  outline: "none",
  background: "var(--surface)",
} as const;

const labelStyle = { fontSize: 12.5, fontWeight: 700, color: "var(--muted)" } as const;

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError("Completează prenumele și numele.");
    if (!email.trim()) return setError("Completează adresa de email.");
    if (password.length < 6) return setError("Parola trebuie să aibă cel puțin 6 caractere.");
    setBusy(true);
    try {
      const user = await api.register({ email, first_name: firstName, last_name: lastName, password });
      setUser(user);
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Înregistrare eșuată.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--paper)", overflowY: "auto" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ width: 400, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-2)", padding: 28, margin: "24px 0" }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Brand onClick={() => navigate("/")} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: "center", margin: "0 0 6px", color: "var(--ink)" }}>Creează un cont</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>
          Ai nevoie de un cont ca să scrii și să salvezi proiecte de lege. Durează un minut.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Prenume</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} placeholder="Maria" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Nume</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} placeholder="Pop" />
          </div>
        </div>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, margin: "6px 0 14px" }} placeholder="maria.pop@email.ro" />
        <label style={labelStyle}>Parolă</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, margin: "6px 0 4px" }} placeholder="cel puțin 6 caractere" />

        {error && <div style={{ color: "var(--alert)", fontSize: 13, margin: "8px 0" }}>{error}</div>}

        <div style={{ marginTop: 16 }}>
          <Btn variant="primary" size="lg" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? "Se creează contul…" : "Creează cont"}
          </Btn>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
          Ai deja cont?{" "}
          <Link to="/login" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
            Autentifică-te
          </Link>
        </p>
      </form>
    </div>
  );
}
