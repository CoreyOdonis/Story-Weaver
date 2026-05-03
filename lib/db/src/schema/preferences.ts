import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const preferencesTable = pgTable("preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  childName: text("child_name"),
  age: integer("age"),
  interests: text("interests"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Preferences = typeof preferencesTable.$inferSelect;
export type InsertPreferences = typeof preferencesTable.$inferInsert;
