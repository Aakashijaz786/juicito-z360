// Generates supabase/seed.sql from the original Juicito data/menu.json.
// Usage: node scripts/gen-seed.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcCandidates = [
  path.resolve(root, "../PureWaterBot/data/menu.json"),
  path.resolve(root, "data/menu.json"),
];
const src = srcCandidates.find((p) => fs.existsSync(p));
if (!src) {
  console.error("Could not find menu.json in:", srcCandidates);
  process.exit(1);
}

const menu = JSON.parse(fs.readFileSync(src, "utf8"));
const esc = (s) => String(s).replace(/'/g, "''");

const rows = menu.map((m) => {
  const tags =
    "ARRAY[" + (m.tags || []).map((t) => `'${esc(t)}'`).join(",") + "]::text[]";
  return `  ('${esc(m.id)}', '${esc(m.name)}', ${m.price}, '${esc(
    m.category
  )}', ${m.available}, '${esc(m.description)}', ${tags})`;
});

const sql =
  `-- Juicito Z360 — seed menu (${menu.length} items, generated from data/menu.json)\n` +
  `insert into menu (id, name, price, category, available, description, tags) values\n` +
  rows.join(",\n") +
  "\n" +
  "on conflict (id) do update set\n" +
  "  name = excluded.name,\n" +
  "  price = excluded.price,\n" +
  "  category = excluded.category,\n" +
  "  available = excluded.available,\n" +
  "  description = excluded.description,\n" +
  "  tags = excluded.tags;\n";

fs.mkdirSync(path.resolve(root, "supabase"), { recursive: true });
fs.writeFileSync(path.resolve(root, "supabase/seed.sql"), sql);
console.log(`Wrote supabase/seed.sql with ${menu.length} items (source: ${src})`);
