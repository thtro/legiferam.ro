import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/chrome";
import { Btn } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/app-context";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await api.login(username, password);
      setUser(user);
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Autentificare eșuată.");
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--paper)" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          width: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-2)",
          padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Brand onClick={() => navigate("/")} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: "center", margin: "0 0 6px", color: "var(--ink)" }}>Bine ai revenit</h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>
          Autentifică-te pentru a edita proiecte. Pentru explorare, folosește <b>Mod DEMO</b> — nu cere cont.
        </p>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>Email</label>
        <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="maria.pop@email.ro" style={{ ...inputStyle, margin: "6px 0 14px" }} />
        <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>Parolă</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, margin: "6px 0 6px" }} />
        {error && <div style={{ color: "var(--alert)", fontSize: 13, margin: "8px 0" }}>{error}</div>}
        <div style={{ marginTop: 16 }}>
          <Btn variant="primary" size="lg" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? "Se autentifică…" : "Autentificare"}
          </Btn>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
          Nu ai cont?{" "}
          <Link to="/register" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
            Creează unul
          </Link>
        </p>
        <p style={{ fontSize: 12, color: "var(--faint)", textAlign: "center", marginTop: 10 }}>
          Pentru explorare, folosește <b>Mod DEMO</b> — nu cere cont. Cont demo: <code>demo</code> / <code>demo</code>.
        </p>
      </form>
    </div>
  );
}
