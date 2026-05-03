import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storyMemoryTable = pgTable("story_memory", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  seriesId: integer("series_id"),
  mainCharacters: text("main_characters").notNull().default("[]"),
  sideCharacters: text("side_characters").notNull().default("[]"),
  locations: text("locations").notNull().default("[]"),
  themes: text("themes").notNull().default("[]"),
  tonePreferences: text("tone_preferences").notNull().default("[]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStoryMemorySchema = createInsertSchema(storyMemoryTable).omit({
  id: true,
  updatedAt: true,
});
export const selectStoryMemorySchema = createSelectSchema(storyMemoryTable);

export type InsertStoryMemory = z.infer<typeof insertStoryMemorySchema>;
export type StoryMemory = typeof storyMemoryTable.$inferSelect;
