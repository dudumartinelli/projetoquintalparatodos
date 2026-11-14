import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import { entries, festivals } from '../../db/schema.js'
import { classTimes, weekdayValues } from './entry-options'

export const ADMIN_ROLE = 'admin'

const nameInput = z.object({
  name: z.string().trim().min(2, 'Digite pelo menos 2 caracteres.').max(120, 'Use no máximo 120 caracteres.'),
  festivalId: z.number().int().positive(),
  weekdays: z.array(z.enum(weekdayValues)).min(1).max(7).refine(
    (values) => new Set(values).size === values.length,
    'Remova dias repetidos.',
  ),
  classTime: z.enum(classTimes),
})

/** Public: anyone can add their name to the list. */
export const submitName = createServerFn({ method: 'POST' })
  .validator(nameInput)
  .handler(async ({ data }) => {
    const [festival] = await db
      .select({ id: festivals.id })
      .from(festivals)
      .where(eq(festivals.id, data.festivalId))
      .limit(1)
    if (!festival) throw new Error('O festival selecionado não está disponível.')

    await db.insert(entries).values({
      name: data.name,
      festivalId: festival.id,
      weekdays: data.weekdays,
      classTime: data.classTime,
    })
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

const festivalName = z.string().trim().min(2, 'Informe o nome do festival.').max(100)
const allowedBannerTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
const maxBannerSize = 5 * 1024 * 1024
const bannerStore = () => getStore('festival-banners')

function isSupportedBanner(bytes: Uint8Array, contentType: string) {
  if (contentType === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a
  }
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  return contentType === 'image/webp'
    && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

/** Public: list the available festivals and their banner URLs. */
export const listFestivals = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(festivals).orderBy(desc(festivals.createdAt))
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bannerUrl: `/api/festival-banners/${row.bannerKey}`,
  }))
})

/** Admin only: create a festival and store its banner in Netlify Blobs. */
export const createFestival = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(z.instanceof(FormData))
  .handler(async ({ data }) => {
    const name = festivalName.parse(data.get('name'))
    const file = data.get('banner')
    if (!(file instanceof File)) throw new Error('Selecione a imagem do banner.')
    if (file.size === 0 || file.size > maxBannerSize) {
      throw new Error('O banner deve ter até 5 MB.')
    }
    if (!(allowedBannerTypes as readonly string[]).includes(file.type)) {
      throw new Error('Use uma imagem PNG, JPG ou WebP.')
    }

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (!isSupportedBanner(bytes, file.type)) {
      throw new Error('O arquivo enviado não corresponde a uma imagem PNG, JPG ou WebP válida.')
    }

    const bannerKey = crypto.randomUUID()
    const store = bannerStore()
    await store.set(bannerKey, buffer, { metadata: { contentType: file.type } })
    try {
      const [festival] = await db
        .insert(festivals)
        .values({ name, bannerKey })
        .returning()
      return {
        id: festival.id,
        name: festival.name,
        bannerUrl: `/api/festival-banners/${festival.bannerKey}`,
      }
    } catch (error) {
      try {
        await store.delete(bannerKey)
      } catch (cleanupError) {
        console.error('Não foi possível remover um banner sem festival associado.', cleanupError)
      }
      throw error
    }
  })

/** Admin only: full list, newest first. */
export const listEntries = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db
      .select({
        id: entries.id,
        name: entries.name,
        festivalName: festivals.name,
        weekdays: entries.weekdays,
        classTime: entries.classTime,
        createdAt: entries.createdAt,
      })
      .from(entries)
      .leftJoin(festivals, eq(entries.festivalId, festivals.id))
      .orderBy(desc(entries.createdAt))
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      festivalName: row.festivalName ?? '—',
      weekdays: row.weekdays,
      classTime: row.classTime,
      createdAt: row.createdAt.toISOString(),
    }))
  })

/** Admin only: remove a single entry. */
export const deleteEntry = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await db.delete(entries).where(eq(entries.id, data.id))
    return { ok: true as const }
  })
