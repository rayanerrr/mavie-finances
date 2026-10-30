import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
const receiptsDir = path.join(dataDir, "receipts");
const dbPath = path.join(dataDir, "finances.db");

function ensureColumn(
  sqlite: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'carte',
      color TEXT NOT NULL DEFAULT '#7c5cff',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#94a3b8',
      kind TEXT NOT NULL DEFAULT 'essential',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_slug_idx
      ON subcategories(category_id, slug);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      store TEXT,
      person TEXT,
      month_key TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      subcategory_id INTEGER REFERENCES subcategories(id),
      account_id INTEGER REFERENCES accounts(id),
      receipt_id INTEGER,
      type TEXT NOT NULL DEFAULT 'expense',
      merchant_key TEXT,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS expenses_month_key_idx ON expenses(month_key);
    CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON expenses(category_id);

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      store TEXT,
      person TEXT,
      account_id INTEGER REFERENCES accounts(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      analyzed_at TEXT,
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL REFERENCES receipts(id),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      subcategory TEXT,
      accepted INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      month_key TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS budgets_category_month_idx
      ON budgets(category_id, month_key);

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  ensureColumn(sqlite, "categories", "color", "TEXT NOT NULL DEFAULT '#94a3b8'");
  ensureColumn(sqlite, "categories", "kind", "TEXT NOT NULL DEFAULT 'essential'");
  ensureColumn(sqlite, "expenses", "account_id", "INTEGER REFERENCES accounts(id)");
  ensureColumn(sqlite, "expenses", "receipt_id", "INTEGER");
  ensureColumn(sqlite, "expenses", "type", "TEXT NOT NULL DEFAULT 'expense'");
  ensureColumn(sqlite, "expenses", "merchant_key", "TEXT");

  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as {
  financesDb?: ReturnType<typeof ensureDb>;
};

export const db = globalForDb.financesDb ?? ensureDb();
export const paths = { dataDir, receiptsDir, dbPath };

if (process.env.NODE_ENV !== "production") {
  globalForDb.financesDb = db;
}
