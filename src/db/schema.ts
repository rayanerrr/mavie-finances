import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("carte"),
  color: text("color").notNull().default("#7c5cff"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull().default("#94a3b8"),
  kind: text("kind").notNull().default("essential"),
  icon: text("icon"),
  archived: integer("archived").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const subcategories = sqliteTable("subcategories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  store: text("store"),
  person: text("person"),
  monthKey: text("month_key").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  subcategoryId: integer("subcategory_id").references(() => subcategories.id),
  accountId: integer("account_id").references(() => accounts.id),
  receiptId: integer("receipt_id"),
  recurringId: integer("recurring_id"),
  type: text("type").notNull().default("expense"),
  merchantKey: text("merchant_key"),
  notes: text("notes"),
  source: text("source").notNull().default("text"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (t) => [uniqueIndex("expenses_recurring_date_idx").on(t.recurringId,t.date).where(sql`${t.recurringId} IS NOT NULL`)]);

export const recurring = sqliteTable("recurring", {
  id: integer("id").primaryKey({autoIncrement:true}), name: text("name").notNull(), amount: real("amount").notNull(),
  type: text("type").notNull().default("expense"), categoryId: integer("category_id").notNull().references(() => categories.id),
  subcategoryId: integer("subcategory_id").references(() => subcategories.id), accountId: integer("account_id").references(() => accounts.id),
  person: text("person"), store: text("store"), frequency: text("frequency").notNull(), dayOfMonth: integer("day_of_month"),
  startDate: text("start_date").notNull(), endDate: text("end_date"), active: integer("active").notNull().default(1), notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
// Règles posées à la main dans le gestionnaire de catégories (« contient Esso → Transport »).
export const keywordRules = sqliteTable("keyword_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  subcategoryId: integer("subcategory_id").references(() => subcategories.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categoryRules = sqliteTable("category_rules", {
  id: integer("id").primaryKey({autoIncrement:true}), pattern: text("pattern").notNull(), merchantKey: text("merchant_key"),
  category: text("category").notNull(), subcategory: text("subcategory"), hits: integer("hits").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (t) => [uniqueIndex("category_rules_pattern_merchant_idx").on(t.pattern,t.merchantKey), uniqueIndex("category_rules_global_idx").on(t.pattern).where(sql`${t.merchantKey} IS NULL`)]);

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  path: text("path").notNull(),
  status: text("status").notNull().default("pending"),
  store: text("store"),
  person: text("person"),
  accountId: integer("account_id").references(() => accounts.id),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  purchaseDate: text("purchase_date"), total: real("total"), subtotal: real("subtotal"), taxes: real("taxes"),
  origin: text("origin").notNull().default("upload"), error: text("error"), aiRaw: text("ai_raw"), model: text("model"), inboxKey: text("inbox_key"),
  analyzedAt: text("analyzed_at"),
  confirmedAt: text("confirmed_at"),
}, (t) => [uniqueIndex("receipts_inbox_key_idx").on(t.inboxKey).where(sql`${t.inboxKey} IS NOT NULL`)]);

export const receiptItems = sqliteTable("receipt_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => receipts.id),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category"),
  subcategory: text("subcategory"),
  quantity: real("quantity"), rawText: text("raw_text"), confidence: real("confidence"),
  accepted: integer("accepted").notNull().default(1),
});

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  monthKey: text("month_key").notNull(),
  amount: real("amount").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: text("deadline"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  expenses: many(expenses),
  receipts: many(receipts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  expenses: many(expenses),
  budgets: many(budgets),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [expenses.subcategoryId],
    references: [subcategories.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [receipts.accountId],
    references: [accounts.id],
  }),
  items: many(receiptItems),
}));

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptItems.receiptId],
    references: [receipts.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Goal = typeof goals.$inferSelect;
