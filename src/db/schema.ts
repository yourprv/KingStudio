import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: text("owner_id"),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    summary: text("summary").notNull().default(""),
    stack: text("stack").notNull().default("html"),
    status: text("status").notNull().default("ready"),
    provider: text("provider").notNull().default("local-engine"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("projects_updated_at_idx").on(table.updatedAt),
    index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt),
  ],
);

export const accountCredits = pgTable("account_credits", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(1_000_000),
  creditsUsed: integer("credits_used").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generationEvents = pgTable(
  "generation_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    tokenBudget: integer("token_budget").notNull(),
    chargedCredits: integer("charged_credits").notNull().default(2_000),
    status: text("status").notNull().default("reserved"),
  },
  (table) => [
    index("generation_events_model_created_idx").on(table.model, table.createdAt),
    index("generation_events_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const providerLocks = pgTable("provider_locks", {
  model: text("model").primaryKey(),
  touchedAt: timestamp("touched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceFiles = pgTable(
  "workspace_files",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("file"),
    language: text("language").notNull().default("plaintext"),
    content: text("content").notNull().default(""),
    storagePath: text("storage_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workspace_files_project_path_idx").on(table.projectId, table.path)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    seq: serial("seq").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    kind: text("kind").notNull().default("text"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_project_idx").on(table.projectId, table.createdAt)],
);
