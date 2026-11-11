// Exports content/services.json to dashboard-ready files in exports/services/:
//   services.csv, service_docs.csv, calendar_events.csv, section_labels.csv, services.sql
// Run: pnpm export:services
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const data = JSON.parse(readFileSync(new URL("content/services.json", root), "utf8"));
const out = new URL("exports/services/", root);
mkdirSync(out, { recursive: true });

const { columns: formColumns, ...formCopy } = data.formsSection;
const tables = {
  services: data.services.map((s) => ({
    id: s.id,
    no: s.no,
    name: s.name,
    code: s.code,
    logo: s.logo,
    headline: s.headline,
    details: s.details,
    ready: s.ready,
    ready_unit: s.readyUnit ?? "",
    featured: Boolean(s.featured)
  })),
  service_docs: data.docs.map((d) => ({
    id: d.id,
    service_id: d.service,
    sort: d.sort,
    name: d.name,
    code: d.code,
    issuer: d.issuer,
    format: d.format,
    url: d.url
  })),
  calendar_events: data.calendar.events.map((e) => ({
    id: e.id,
    event_date: e.date,
    title: e.title,
    service_id: e.service,
    perk: e.perk,
    perk_suffix: e.perkSuffix ?? "",
    gift: Boolean(e.gift),
    gov: e.gov,
    gov_unit: e.govUnit ?? "",
    note: e.note ?? ""
  })),
  // Section copy: calendar column titles, forms section title / body / column titles.
  section_labels: [
    ...Object.entries(data.calendar.columns).map(([k, label]) => ({ section: "calendar", label_key: k, label })),
    ...Object.entries(formCopy).map(([k, label]) => ({ section: "forms", label_key: k, label })),
    ...Object.entries(formColumns).map(([k, label]) => ({ section: "forms", label_key: `columns.${k}`, label }))
  ]
};

const csvCell = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
for (const [name, rows] of Object.entries(tables)) {
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))];
  writeFileSync(new URL(`${name}.csv`, out), lines.join("\n") + "\n");
}

const sqlVal = (v) =>
  typeof v === "number" || typeof v === "boolean" ? String(v).toUpperCase() : `'${String(v).replaceAll("'", "''")}'`;
const inserts = (name, rows) => {
  const cols = Object.keys(rows[0]);
  const values = rows.map((r) => `  (${cols.map((c) => sqlVal(r[c])).join(", ")})`).join(",\n");
  return `INSERT INTO ${name} (${cols.join(", ")}) VALUES\n${values};\n`;
};

const sql = `-- Prime One services: services, their downloadable docs, key-dates calendar, section copy.
-- Generated from content/services.json by tools/export-services.mjs.
-- Standard SQL (PostgreSQL / Supabase, MySQL, SQLite).

CREATE TABLE IF NOT EXISTS services (
  id          VARCHAR(64) PRIMARY KEY,
  no          INTEGER NOT NULL,       -- display order
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(16) NOT NULL,   -- chip label on calendar rows
  logo        VARCHAR(255),
  headline    VARCHAR(255),
  details     TEXT,                   -- paragraph shown when the service row opens
  ready       VARCHAR(16),            -- turnaround in the open row, e.g. 24
  ready_unit  VARCHAR(16),            -- e.g. hrs, day, wk
  featured    BOOLEAN NOT NULL DEFAULT FALSE  -- lime laurel on the row
);

CREATE TABLE IF NOT EXISTS service_docs (
  id          VARCHAR(80) PRIMARY KEY,
  service_id  VARCHAR(64) NOT NULL REFERENCES services (id),
  sort        INTEGER NOT NULL,       -- order within the service
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(16) NOT NULL,   -- form no. on the chip: MV-82, W-4
  issuer      VARCHAR(64),            -- NY DMV, IRS, USCIS, Prime One
  format      VARCHAR(8) NOT NULL DEFAULT 'PDF',
  url         VARCHAR(500) NOT NULL   -- file link (dashboard upload or official form)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id          VARCHAR(64) PRIMARY KEY,
  event_date  DATE NOT NULL,
  title       VARCHAR(120) NOT NULL,
  service_id  VARCHAR(64) NOT NULL REFERENCES services (id),
  perk        VARCHAR(32) NOT NULL,   -- big value, e.g. 20%, Free, Gift
  perk_suffix VARCHAR(32),            -- small text after it, e.g. early bird
  gift        BOOLEAN NOT NULL DEFAULT FALSE,
  gov         VARCHAR(32) NOT NULL,   -- e.g. Due, $340, 5%
  gov_unit    VARCHAR(64),            -- e.g. IRS, per late form
  note        TEXT                    -- hover text on the row
);

CREATE TABLE IF NOT EXISTS section_labels (
  section     VARCHAR(32) NOT NULL,   -- calendar | forms
  label_key   VARCHAR(64) NOT NULL,
  label       TEXT NOT NULL,
  PRIMARY KEY (section, label_key)
);

${Object.entries(tables)
  .map(([name, rows]) => inserts(name, rows))
  .join("\n")}`;

writeFileSync(new URL("services.sql", out), sql);
console.log(
  `exports/services: ${Object.entries(tables)
    .map(([n, rows]) => `${rows.length} ${n}`)
    .join(", ")}`
);
