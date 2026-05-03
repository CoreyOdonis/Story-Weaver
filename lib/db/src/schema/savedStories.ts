import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedStoriesTable = pgTable("saved_stories", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  childName: text("child_name").notNull(),
  emoji: text("emoji").notNull(),
  title: text("title").notNull(),
  story: text("story").notNull(),
  interests: text("interests").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedStorySchema = createInsertSchema(savedStoriesTable).omit({ id: true, createdAt: true });
export const selectSavedStorySchema = createSelectSchema(savedStoriesTable);

export type InsertSavedStory = z.infer<typeof insertSavedStorySchema>;
export type SavedStory = typeof savedStoriesTable.$inferSelect;
