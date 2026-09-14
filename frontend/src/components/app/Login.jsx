import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { stages } from "../../lib/format";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@pinakisolutions.com");
  const [password, setPassword] = useState("Pinaki@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("post", "/auth/login", { email, password });
      onLogin(r.data);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="brand-mark">PS</div>
        <p className="eyebrow">PINAKI SOLUTIONS</p>
        <h1>One order.<br /><em>Every team aligned.</em></h1>
        <p className="login-copy">A single source of truth for every client order — from first brief to payment received.</p>
        <div className="lifecycle-strip">
          {stages.slice(0, 8).map((s, i) => (
            <span key={s} className={i < 4 ? "active" : ""}>{i + 1}</span>
          ))}
        </div>
      </div>
      <section className="login-panel">
        <div>
          <div className="small-label">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Manage the Pinaki order lifecycle with clarity.</p>
        </div>
        <form onSubmit={submit} data-testid="login-form">
          <label>Email address
            <input data-testid="login-email-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>Password
            <input data-testid="login-password-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error && <div className="error" data-testid="login-error">{error}</div>}
          <button data-testid="login-submit-button" className="primary-btn" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to CRM"}<ChevronRight size={17} />
          </button>
        </form>
        <div className="demo-note">
          <span className="dot green" /> Demo workspace ready · <b>admin@pinakisolutions.com</b> · Pinaki@123
        </div>
      </section>
    </main>
  );
}
