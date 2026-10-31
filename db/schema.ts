import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const entries = pgTable('entries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  weekdays: text().array().notNull().default([]),
  classTime: text('class_time').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
