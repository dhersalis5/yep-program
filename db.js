// Data layer with a single async interface.
// Production (Render): PostgreSQL via DATABASE_URL.
// Local dev: SQLite file (better-sqlite3) when no DATABASE_URL is set.

const usePg = !!process.env.DATABASE_URL;

const FIELDS = [
  "full_name", "email", "phone", "school", "age",
  "why", "commitment", "hours", "strengths", "develop",
  "track_record", "teammates", "agree",
];

let pg = null;       // pg Pool
let sqlite = null;   // better-sqlite3 Database

export async function init() {
  if (usePg) {
    const { default: pkg } = await import("pg");
    const { Pool } = pkg;
    pg = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pg.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id          SERIAL PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        full_name   TEXT NOT NULL,
        email       TEXT NOT NULL,
        phone       TEXT,
        school      TEXT,
        age         TEXT,
        why         TEXT,
        commitment  TEXT,
        hours       TEXT,
        strengths   TEXT,
        develop     TEXT,
        track_record TEXT,
        teammates   TEXT,
        agree       BOOLEAN DEFAULT false
      );
    `);
    console.log("db: connected to PostgreSQL");
  } else {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = process.env.DB_PATH || "./data/applications.db";
    fs.mkdirSync(path.replace(/\/[^/]*$/, "") || ".", { recursive: true });
    sqlite = new DatabaseSync(path);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        full_name   TEXT NOT NULL,
        email       TEXT NOT NULL,
        phone       TEXT,
        school      TEXT,
        age         TEXT,
        why         TEXT,
        commitment  TEXT,
        hours       TEXT,
        strengths   TEXT,
        develop     TEXT,
        track_record TEXT,
        teammates   TEXT,
        agree       INTEGER DEFAULT 0
      );
    `);
    console.log(`db: using local SQLite at ${path}`);
  }
}

export async function insertApplication(data) {
  const values = FIELDS.map((f) => (f === "agree" ? !!data[f] : (data[f] ?? null)));
  if (usePg) {
    const cols = FIELDS.join(", ");
    const params = FIELDS.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pg.query(
      `INSERT INTO applications (${cols}) VALUES (${params}) RETURNING id, created_at`,
      values
    );
    return rows[0];
  } else {
    const cols = FIELDS.join(", ");
    const params = FIELDS.map(() => "?").join(", ");
    const sqliteVals = values.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
    const info = sqlite
      .prepare(`INSERT INTO applications (${cols}) VALUES (${params})`)
      .run(...sqliteVals);
    return { id: info.lastInsertRowid };
  }
}

export async function getApplications() {
  if (usePg) {
    const { rows } = await pg.query("SELECT * FROM applications ORDER BY created_at DESC");
    return rows;
  } else {
    return sqlite.prepare("SELECT * FROM applications ORDER BY created_at DESC").all();
  }
}
