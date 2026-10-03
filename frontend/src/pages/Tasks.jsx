import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Tasks() {
  const { isStaff } = useAuth();
  const [fundraisers, setFundraisers] = useState([]);

  function load() {
    api.get("/tasks/fundraisers/").then((r) => setFundraisers(r.data.results || r.data)).catch(() => {});
  }
  useEffect(load, []);

  async function setStatus(taskId, status) {
    await api.patch(`/tasks/tasks/${taskId}/`, { status });
    load();
  }

  const nextStatus = { todo: "in_progress", in_progress: "done", done: "todo" };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-tag">Volunteer & Operations</div>
          <h1 className="page-title">Tasks & Fundraisers</h1>
          <p className="page-subtitle">See who’s doing what, and whether campaigns are on track.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        {fundraisers.map((f) => (
          <div key={f.id} className="section-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>{f.name}</h3>
              <span style={{
                background: f.is_active ? "#ecfdf5" : "#f1f5f9",
                color: f.is_active ? "#047857" : "#64748b",
                fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999
              }}>
                {f.is_active ? "Active" : "Closed"}
              </span>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 18 }}>
              {f.description}
            </p>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                <span>₹{f.raised_amount} raised of ₹{f.goal_amount}</span>
                <span style={{ color: "#2563eb" }}>{f.progress_percent}%</span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${Math.min(f.progress_percent || 0, 100)}%`,
                  background: "linear-gradient(90deg, #2563eb, #38bdf8)", borderRadius: 999
                }}></div>
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 10 }}>
              Tasks · {f.tasks_done}/{f.tasks_total} completed
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
              {f.tasks?.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{t.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Assigned to {t.assignee_name || "Unassigned"}</div>
                  </div>

                  <button
                    onClick={() => setStatus(t.id, nextStatus[t.status])}
                    style={{
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      background: t.status === "done" ? "#ecfdf5" : (t.status === "in_progress" ? "#eff6ff" : "#fef3c7"),
                      color: t.status === "done" ? "#047857" : (t.status === "in_progress" ? "#2563eb" : "#b45309"),
                    }}
                    title="Click to advance status"
                  >
                    {t.status.replace("_", " ")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
