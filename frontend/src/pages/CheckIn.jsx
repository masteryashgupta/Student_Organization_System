import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/client";

export default function CheckIn() {
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  async function checkIn(code) {
    try {
      const { data } = await api.post("/events/tickets/check_in/", { code });
      setResult(data);
    } catch (err) {
      setResult({ valid: false, detail: err.response?.data?.detail || "Invalid or unrecognized ticket code." });
    }
  }

  async function startScan() {
    setScanning(true);
    setResult(null);
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decoded) => {
          await stopScan();
          checkIn(decoded);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setResult({ valid: false, detail: "Could not open camera. Please use manual code entry." });
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => { stopScan(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="section-tag">Event Operations</div>
          <h1 className="page-title">Door Check-In Scanner</h1>
          <p className="page-subtitle">Verify attendee tickets at the gate via device camera QR scanner or code lookup.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Camera QR Card */}
        <div className="section-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Camera QR Scanner</h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 16 }}>
            Point your webcam or phone camera at the student’s digital QR ticket.
          </p>

          <div
            id="reader"
            style={{
              width: "100%",
              minHeight: scanning ? 260 : 120,
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              overflow: "hidden"
            }}
          >
            {!scanning && (
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Camera is currently off</span>
            )}
          </div>

          {!scanning ? (
            <button className="btn-primary" onClick={startScan}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Activate Camera</span>
            </button>
          ) : (
            <button className="btn-white" style={{ border: "1px solid #ef4444", color: "#ef4444" }} onClick={stopScan}>
              Stop Camera
            </button>
          )}
        </div>

        {/* Manual Lookup Card */}
        <div className="section-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Manual Code Entry</h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 16 }}>
            If camera scanning is unavailable, enter the 8-character code printed on the ticket.
          </p>

          <label className="field-label">Ticket Code</label>
          <input
            className="field-input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="e.g. SKY-1-9842"
          />

          <button
            className="btn-primary"
            onClick={() => checkIn(manual.trim())}
            disabled={!manual.trim()}
          >
            Verify & Check In
          </button>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className="section-panel"
          style={{
            borderColor: result.valid ? "#10b981" : "#ef4444",
            background: result.valid ? "#f0fdf4" : "#fef2f2"
          }}
        >
          {result.valid ? (
            <div>
              <h3 style={{ color: "#047857", fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
                {result.already_checked_in ? "⚠ Ticket Already Checked In" : "✓ Ticket Verified & Admitted"}
              </h3>
              <p style={{ fontSize: "0.95rem", color: "#166534" }}>
                <strong>{result.holder}</strong> · {result.event}
              </p>
            </div>
          ) : (
            <div>
              <h3 style={{ color: "#b91c1c", fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
                ✗ Check-in Failed
              </h3>
              <p style={{ fontSize: "0.92rem", color: "#991b1b" }}>{result.detail}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
