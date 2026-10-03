import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState({
    username: "", email: "", password: "",
    first_name: "", last_name: "", phone: "", tier: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/tiers/").then((r) => setTiers(r.data.results || r.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.tier) delete payload.tier;
      await api.post("/auth/register/", payload);
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      const d = err.response?.data;
      if (typeof d === "string") {
        setError("Registration failed. Please check your details and try again.");
      } else if (d && typeof d === "object") {
        setError(Object.values(d).flat().join(" "));
      } else {
        setError("Registration failed.");
      }
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
          <div className="hero-kicker">Join The Movement</div>
          <h1 className="hero-headline">
            Make campus
            <span className="gold-text">move together.</span>
          </h1>
          <p className="hero-tagline">
            Join thousands of students accessing exclusive campus events, club
            initiatives, merchandise discounts, and volunteer networks.
          </p>
        </div>

        <div className="login-hero-footer">
          <span>SC / 2025</span>
          <span>Built for the bold</span>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-side">
        <div className="login-form-box" style={{ maxWidth: 480 }}>
          <div className="form-kicker">New Membership</div>
          <h2 className="form-headline" style={{ fontSize: "1.9rem", marginBottom: 6 }}>
            Create your account.
          </h2>
          <p className="form-subtext" style={{ marginBottom: 20 }}>
            Enter your details below to become part of the Skyline association.
          </p>

          <form onSubmit={submit}>
            {error && <div className="form-error-alert">{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="field-label">First name</label>
                <input
                  className="field-input"
                  value={form.first_name}
                  onChange={set("first_name")}
                  placeholder="e.g. Alex"
                />
              </div>
              <div>
                <label className="field-label">Last name</label>
                <input
                  className="field-input"
                  value={form.last_name}
                  onChange={set("last_name")}
                  placeholder="e.g. Morgan"
                />
              </div>
            </div>

            <label className="field-label">Username</label>
            <input
              className="field-input"
              value={form.username}
              onChange={set("username")}
              placeholder="e.g. alexmorgan"
              required
            />

            <label className="field-label">Campus Email</label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={set("email")}
              placeholder="e.g. alex@skyline.edu"
              required
            />

            <label className="field-label">Phone (Optional)</label>
            <input
              className="field-input"
              value={form.phone}
              onChange={set("phone")}
              placeholder="e.g. 08000823183"
            />

            <label className="field-label">Password</label>
            <input
              type="password"
              className="field-input"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              required
            />

            <label className="field-label">Membership tier (optional)</label>
            <select
              className="field-input"
              value={form.tier}
              onChange={set("tier")}
              style={{ cursor: "pointer" }}
            >
              <option value="">No tier for now (Free)</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — ₹{t.price} ({t.ticket_discount_percent}% off tickets)
                </option>
              ))}
            </select>

            <button type="submit" className="btn-enter-skyline" disabled={busy}>
              <span>{busy ? "Registering…" : "Create Membership Account"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: "0.84rem", color: "#64748b" }}>
            Already a member?{" "}
            <Link to="/login" style={{ color: "#2563eb", fontWeight: 600 }}>
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
