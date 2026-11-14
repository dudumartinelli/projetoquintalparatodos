import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const festivals = pgTable('festivals', {
  id: serial().primaryKey(),
  name: text().notNull(),
  bannerKey: text('banner_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const entries = pgTable('entries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  festivalId: integer('festival_id').references(() => festivals.id),
  weekdays: text().array().notNull().default([]),
  classTime: text('class_time').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
