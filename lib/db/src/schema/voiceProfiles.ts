import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const voiceProfilesTable = pgTable("voice_profiles", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  elevenLabsVoiceId: text("eleven_labs_voice_id").notNull(),
  voiceName: text("voice_name").notNull().default("My Voice"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoiceProfileSchema = createInsertSchema(voiceProfilesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertVoiceProfile = z.infer<typeof insertVoiceProfileSchema>;
export type VoiceProfile = typeof voiceProfilesTable.$inferSelect;
