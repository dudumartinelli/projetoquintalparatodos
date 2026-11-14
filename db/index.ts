import { drizzle } from 'drizzle-orm/netlify-db'
import type { NetlifyDbDatabase } from 'drizzle-orm/netlify-db'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

type Database = NetlifyDbDatabase<typeof schema> | NodePgDatabase<typeof schema>
let database: Database | undefined

export function getDatabase(): Database {
  if (!database) database = drizzle({ schema })
  return database
}
