import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seriesTable = pgTable("series", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  title: text("title").notNull(),
  theme: text("theme"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSeriesSchema = createInsertSchema(seriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSeriesSchema = createSelectSchema(seriesTable);

export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Series = typeof seriesTable.$inferSelect;
