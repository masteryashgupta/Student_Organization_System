import { useEffect, useState } from "react";
import api from "../api/client";

export default function Members() {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState("");
  const [verify, setVerify] = useState(null);

  function load() {
    const url = filter ? `/auth/members/?status=${filter}` : "/auth/members/";
    api.get(url).then((r) => setMembers(r.data.results || r.data)).catch(() => {});
  }
  useEffect(load, [filter]);

  async function doVerify(id) {
    try {
      const { data } = await api.get(`/auth/members/${id}/verify/`);
      setVerify(data);
    } catch {
      alert("Verification check failed.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-tag">Roster & Verification</div>
          <h1 className="page-title">Campus Directory</h1>
          <p className="page-subtitle">Search, verify membership status, and audit tier privileges in one click.</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {["", "active", "pending", "expired"].map((s) => (
          <button
            key={s}
            className={`filter-pill ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Members"}
          </button>
        ))}
      </div>

      <div className="section-panel" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Member</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Role</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Tier</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Expiry</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((u) => {
              const status = u.membership?.status || "pending";
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: "0.8rem" }}>
                        {(u.full_name || u.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{u.full_name || u.username}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "capitalize" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: u.membership?.tier_detail?.name === "Premium" ? "#b45309" : "#0f172a" }}>
                      {u.membership?.tier_detail?.name || "Standard"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: status === "active" ? "#ecfdf5" : (status === "pending" ? "#fef3c7" : "#fee2e2"),
                      color: status === "active" ? "#047857" : (status === "pending" ? "#b45309" : "#b91c1c"),
                      textTransform: "capitalize"
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "0.82rem", color: "#64748b" }}>
                    {u.membership?.expires_on || "—"}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button
                      className="btn-white"
                      style={{ border: "1px solid #e2e8f0", fontSize: "0.78rem", padding: "5px 12px" }}
                      onClick={() => doVerify(u.id)}
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {verify && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100, padding: 20
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, maxWidth: 380, width: "100%",
            padding: 24, textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: verify.valid ? "#ecfdf5" : "#fee2e2",
              color: verify.valid ? "#10b981" : "#ef4444"
            }}>
              {verify.valid ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 4, color: verify.valid ? "#047857" : "#b91c1c" }}>
              {verify.valid ? "Valid Active Member" : "Membership Inactive"}
            </h3>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
              {verify.name}
            </p>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 20 }}>
              Tier: <strong>{verify.tier || "Standard"}</strong> · Status: <strong>{verify.status}</strong>
              {verify.expires_on && ` · Expires ${verify.expires_on}`}
            </p>

            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setVerify(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
