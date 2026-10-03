import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Finance() {
  const { isTreasurer } = useAuth();
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [reimbs, setReimbs] = useState([]);

  function load() {
    api.get("/finance/summary/").then((r) => setSummary(r.data)).catch(() => {});
    api.get("/finance/transactions/").then((r) => setTxns(r.data.results || r.data)).catch(() => {});
    api.get("/finance/reimbursements/").then((r) => setReimbs(r.data.results || r.data)).catch(() => {});
  }
  useEffect(load, []);

  async function pay(id) {
    try {
      await api.post(`/finance/reimbursements/${id}/approve_and_pay/`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not pay.");
    }
  }

  if (!summary) return <div style={{ padding: 40, color: "#64748b" }}>Loading financial ledger…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-tag">Treasury & Ledger</div>
          <h1 className="page-title">Financial Overview</h1>
          <p className="page-subtitle">Real-time ledger audit of campus revenue, expenses, and cash reserves.</p>
        </div>
      </div>

      {/* 3 Large Stat Cards */}
      <div className="metrics-row" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28 }}>
        <div className="metric-card">
          <div className="metric-label">Total Inflow / Revenue</div>
          <div className="metric-value" style={{ color: "#059669" }}>
            ₹{summary.total_income.toLocaleString()}
          </div>
          <div className="metric-sub">Dues, events, merchandise, fundraisers</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Outflow / Expenses</div>
          <div className="metric-value" style={{ color: "#dc2626" }}>
            ₹{summary.total_expense.toLocaleString()}
          </div>
          <div className="metric-sub">Vendor payments, supplies, reimbursements</div>
        </div>

        <div className="metric-card" style={{ background: "#0f172a", color: "#fff", borderColor: "#0f172a" }}>
          <div className="metric-label" style={{ color: "#94a3b8" }}>Available Treasury Balance</div>
          <div className="metric-value" style={{ color: "#38bdf8" }}>
            ₹{summary.balance.toLocaleString()}
          </div>
          <div className="metric-sub" style={{ color: "#10b981" }}>+18.4% this month · LIVE</div>
        </div>
      </div>

      {/* By Category */}
      <div className="section-panel" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Cash Flow by Category</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Inflow</th>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Outflow</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary.by_category).map(([cat, v]) => (
              <tr key={cat} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 24px", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{cat}</td>
                <td style={{ padding: "12px 24px", color: "#059669", fontWeight: 700 }}>₹{v.in.toLocaleString()}</td>
                <td style={{ padding: "12px 24px", color: v.out > 0 ? "#dc2626" : "#64748b", fontWeight: 700 }}>₹{v.out.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reimbursements */}
      {reimbs.length > 0 && (
        <div className="section-panel" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Reimbursement Requests</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Member</th>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Reason</th>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Amount</th>
                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reimbs.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 24px", fontWeight: 600, color: "#0f172a" }}>{r.volunteer_name}</td>
                  <td style={{ padding: "12px 24px", color: "#64748b" }}>{r.reason}</td>
                  <td style={{ padding: "12px 24px", fontWeight: 700, color: "#0f172a" }}>₹{r.amount}</td>
                  <td style={{ padding: "12px 24px" }}>
                    <span style={{
                      display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: r.status === "paid" ? "#ecfdf5" : "#fef3c7",
                      color: r.status === "paid" ? "#047857" : "#b45309",
                      textTransform: "capitalize"
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 24px", textAlign: "right" }}>
                    {isTreasurer && r.status !== "paid" && (
                      <button
                        className="btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                        onClick={() => pay(r.id)}
                      >
                        Approve & Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Log */}
      <div className="section-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Full Transaction Audit Log</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Date</th>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Description</th>
              <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 24px", fontSize: "0.82rem", color: "#64748b" }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 24px", fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                  {t.category_display}
                </td>
                <td style={{ padding: "12px 24px", fontSize: "0.85rem", color: "#475569" }}>
                  {t.description}
                </td>
                <td style={{
                  padding: "12px 24px", textAlign: "right", fontWeight: 800, fontSize: "0.92rem",
                  color: t.direction === "in" ? "#059669" : "#dc2626"
                }}>
                  {t.direction === "in" ? "+" : "−"}₹{t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
