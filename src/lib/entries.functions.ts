import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import { entries } from '../../db/schema.js'

export const ADMIN_ROLE = 'admin'

const nameInput = z.object({
  name: z.string().trim().min(2, 'Digite pelo menos 2 caracteres.').max(120, 'Use no máximo 120 caracteres.'),
})

/** Public: anyone can add their name to the list. */
export const submitName = createServerFn({ method: 'POST' })
  .validator(nameInput)
  .handler(async ({ data }) => {
    await db.insert(entries).values({ name: data.name })
    return { ok: true as const }
  })

/** Returns the signed-in user (if any) and whether they are an admin. */
export const getViewer = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getUser()
  if (!user) return null
  return {
    email: user.email ?? null,
    name: user.name ?? null,
    isAdmin: (user.roles ?? []).includes(ADMIN_ROLE),
  }
})

const requireAdmin = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await getUser()
  if (!user) throw new Error('Faça login para continuar.')
  if (!(user.roles ?? []).includes(ADMIN_ROLE)) throw new Error('Acesso restrito a administradores.')
  return next({ context: { user } })
})

/** Admin only: full list, newest first. */
export const listEntries = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db.select().from(entries).orderBy(desc(entries.createdAt))
    return rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.createdAt.toISOString() }))
  })

/** Admin only: remove a single entry. */
export const deleteEntry = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await db.delete(entries).where(eq(entries.id, data.id))
    return { ok: true as const }
  })
