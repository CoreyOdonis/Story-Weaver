import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const childrenTable = pgTable("children", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  age: integer("age"),
  interests: text("interests"),
  defaultStoryLength: text("default_story_length"),
  tone: text("tone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChildSchema = createInsertSchema(childrenTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectChildSchema = createSelectSchema(childrenTable);

export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof childrenTable.$inferSelect;
