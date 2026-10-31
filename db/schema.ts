import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const entries = pgTable('entries', {
  id: serial().primaryKey(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
