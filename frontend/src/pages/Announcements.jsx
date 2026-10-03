import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Announcements() {
  const { isStaff } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });

  function load() {
    api.get("/comms/announcements/").then((r) => setItems(r.data.results || r.data)).catch(() => {});
  }
  useEffect(load, []);

  async function post(e) {
    e.preventDefault();
    try {
      await api.post("/comms/announcements/", form);
      setForm({ title: "", body: "" });
      setShowForm(false);
      load();
    } catch {
      alert("Could not post announcement.");
    }
  }

  async function sendEmail(id) {
    try {
      const { data } = await api.post(`/comms/announcements/${id}/send_email/`);
      alert(`Emailed ${data.sent_to} members.`);
      load();
    } catch {
      alert("Could not send email.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-tag">Broadcast & Comms</div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">One post reaches everyone — and stays on the record.</p>
        </div>
        {isStaff && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{showForm ? "Cancel" : "New announcement"}</span>
          </button>
        )}
      </div>

      {showForm && (
        <form
          className="section-panel"
          onSubmit={post}
          style={{ marginBottom: 24 }}
        >
          <h3 style={{ fontSize: "1.1rem", marginBottom: 16 }}>Broadcast New Announcement</h3>
          <label className="field-label">Title</label>
          <input
            className="field-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Volunteer briefing time change"
            required
          />
          <label className="field-label">Message Details</label>
          <textarea
            rows={4}
            className="field-input"
            style={{ height: "auto", padding: "10px 14px" }}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write message to all members..."
            required
          />
          <button className="btn-primary" style={{ marginTop: 12 }}>
            Publish Broadcast
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((a) => (
          <div key={a.id} className="section-panel" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="category-dot urgent" style={{ width: 10, height: 10 }}></span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>{a.title}</h3>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <p style={{ fontSize: "0.92rem", color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>
              {a.body}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                By <strong>{a.author_name}</strong>
                {a.email_sent && ` · emailed to ${a.recipients_count} members`}
              </span>
              {isStaff && !a.email_sent && (
                <button
                  className="btn-white"
                  style={{ border: "1px solid #e2e8f0", fontSize: "0.78rem" }}
                  onClick={() => sendEmail(a.id)}
                >
                  Email to members
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
