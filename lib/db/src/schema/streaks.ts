import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const streaksTable = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  clientId: text("client_id").notNull().unique(),
  lastActivityDate: text("last_activity_date").notNull(),
  streakCount: integer("streak_count").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Streak = typeof streaksTable.$inferSelect;
