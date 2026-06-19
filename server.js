import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { init, insertApplication, getApplications } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = !!process.env.DATABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-token";

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Serve the static site (landing + form) from /design
app.use(express.static(join(__dirname, "design"), { extensions: ["html"] }));

const REQUIRED = ["full_name", "email", "why"];
const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

app.post("/api/apply", async (req, res) => {
  try {
    const b = req.body || {};
    for (const f of REQUIRED) {
      if (!b[f] || String(b[f]).trim() === "") {
        return res.status(400).json({ ok: false, error: `Missing field: ${f}` });
      }
    }
    if (!isEmail(b.email)) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }
    const saved = await insertApplication(b);
    return res.json({ ok: true, id: saved.id });
  } catch (err) {
    console.error("apply error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// --- Admin: view + export submissions (protected by ADMIN_TOKEN) ---
function checkAuth(req, res) {
  // In production, refuse to run without an explicit ADMIN_TOKEN (never the dev fallback).
  if (IS_PROD && !process.env.ADMIN_TOKEN) {
    res.status(503).json({ ok: false, error: "Admin disabled: ADMIN_TOKEN not set" });
    return false;
  }
  const token = req.query.token || req.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

app.get("/api/applications", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const rows = await getApplications();
  res.json({ ok: true, count: rows.length, applications: rows });
});

app.get("/api/applications.csv", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const rows = await getApplications();
  const cols = [
    "id", "created_at", "full_name", "email", "phone", "school", "age",
    "why", "commitment", "hours", "strengths", "develop", "track_record",
    "teammates", "agree",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(",")]
    .concat(rows.map((r) => cols.map((c) => esc(r[c])).join(",")))
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="yep-applications.csv"');
  res.send(csv);
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

init()
  .then(() => {
    app.listen(PORT, () => console.log(`YEP server running on :${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to init db:", err);
    process.exit(1);
  });
