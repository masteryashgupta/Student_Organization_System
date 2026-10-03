import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState("Member");
  const [email, setEmail] = useState("alex@skyline.edu");
  const [password, setPassword] = useState("member123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const roleConfigs = {
    Member: { email: "alex@skyline.edu", pass: "member123" },
    Volunteer: { email: "vihaan@skyline.club", pass: "member123" },
    Officer: { email: "officer@skyline.club", pass: "officer123" },
    Treasurer: { email: "admin@skyline.club", pass: "admin123" },
  };

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setEmail(roleConfigs[role].email);
    setPassword(roleConfigs[role].pass);
    setError("");
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid campus email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-split-page">
      {/* Left Hero Side */}
      <div
        className="login-hero-side"
        style={{ backgroundImage: `url('/images/library.jpg')` }}
      >
        <div className="login-hero-overlay"></div>

        <div className="login-hero-header">
          <div className="login-hero-brand">
            <div className="login-hero-logo">s</div>
            <span className="login-hero-brand-name">skyline</span>
          </div>
        </div>

        <div className="login-hero-center">
          <div className="hero-kicker">The Student Operating System</div>
          <h1 className="hero-headline">
            Make campus
            <span className="gold-text">move together.</span>
          </h1>
          <p className="hero-tagline">
            One home for membership, events, volunteers, and the work that makes
            your organization matter.
          </p>
        </div>

        <div className="login-hero-footer">
          <span>SC / 2025</span>
          <span>Built for the bold</span>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="form-kicker">Welcome Back</div>
          <h2 className="form-headline">
            Pick up where
            <br />
            your campus left off.
          </h2>
          <p className="form-subtext">
            This prototype uses a demo sign in. Choose a role to explore its
            workspace.
          </p>

          {/* Role selector segmented control */}
          <div className="role-tabs-bar">
            {["Member", "Volunteer", "Officer", "Treasurer"].map((role) => (
              <button
                key={role}
                type="button"
                className={`role-tab-btn ${activeRole === role ? "active" : ""}`}
                onClick={() => handleRoleSelect(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {error && <div className="form-error-alert">{error}</div>}

            <label className="field-label">Campus email</label>
            <input
              type="text"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@skyline.edu"
              required
            />

            <label className="field-label">Password</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <button type="submit" className="btn-enter-skyline" disabled={busy}>
              <span>{busy ? "Entering…" : "Enter Skyline"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </button>
          </form>

          <div className="demo-footnote">
            Demo mode · No account or payment required
          </div>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: "0.84rem", color: "#64748b" }}>
            Need a fresh account?{" "}
            <Link to="/register" style={{ color: "#2563eb", fontWeight: 600 }}>
              Create a member account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
