import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

type LocalFestival = {
  id: number
  name: string
  bannerKey: string
  bannerType: string
  createdAt: string
}

type LocalEntry = {
  id: number
  name: string
  festivalId: number
  weekdays: string[]
  classTime: string
  createdAt: string
}

type LocalData = {
  nextFestivalId: number
  nextEntryId: number
  festivals: LocalFestival[]
  entries: LocalEntry[]
}

const localDataSchema = z.object({
  nextFestivalId: z.number().int().positive(),
  nextEntryId: z.number().int().positive(),
  festivals: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    bannerKey: z.string(),
    bannerType: z.string(),
    createdAt: z.string(),
  })),
  entries: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    festivalId: z.number().int().positive(),
    weekdays: z.array(z.string()),
    classTime: z.string(),
    createdAt: z.string(),
  })),
})

const dataDirectory = path.resolve(process.cwd(), '.local-test')
const dataFile = path.join(dataDirectory, 'data.json')
const bannersDirectory = path.join(dataDirectory, 'banners')
const bannerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
let writeQueue: Promise<void> = Promise.resolve()

function emptyData(): LocalData {
  return { nextFestivalId: 1, nextEntryId: 1, festivals: [], entries: [] }
}

function hasErrorCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code
}

export function isLocalTestMode() {
  return process.env.LOCAL_TEST_MODE === 'true' && process.env.NODE_ENV === 'development'
}

async function readData(): Promise<LocalData> {
  await mkdir(dataDirectory, { recursive: true })
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile, 'utf8'))
    const result = localDataSchema.safeParse(parsed)
    if (!result.success) throw new Error('Os dados do modo local estão inválidos.')
    return result.data
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return emptyData()
    throw error
  }
}

async function writeData(data: LocalData) {
  const temporaryFile = `${dataFile}.${randomUUID()}.tmp`
  await writeFile(temporaryFile, JSON.stringify(data), 'utf8')
  await rename(temporaryFile, dataFile)
}

function updateData<T>(update: (data: LocalData) => T): Promise<T> {
  const operation = writeQueue.then(async () => {
    const data = await readData()
    const result = update(data)
    await writeData(data)
    return result
  })
  writeQueue = operation.then(() => undefined, () => undefined)
  return operation
}

export async function listLocalFestivals() {
  const data = await readData()
  return data.festivals
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, name, bannerKey }) => ({
      id,
      name,
      bannerUrl: `/api/festival-banners/${bannerKey}`,
    }))
}

export async function createLocalFestival(name: string, buffer: ArrayBuffer, bannerType: string) {
  const bannerKey = randomUUID()
  await mkdir(bannersDirectory, { recursive: true })
  const bannerFile = path.join(bannersDirectory, bannerKey)
  await writeFile(bannerFile, new Uint8Array(buffer))

  try {
    return await updateData((data) => {
      const festival: LocalFestival = {
        id: data.nextFestivalId++,
        name,
        bannerKey,
        bannerType,
        createdAt: new Date().toISOString(),
      }
      data.festivals.push(festival)
      return {
        id: festival.id,
        name: festival.name,
        bannerUrl: `/api/festival-banners/${festival.bannerKey}`,
      }
    })
  } catch (error) {
    try {
      await rm(bannerFile, { force: true })
    } catch (cleanupError) {
      console.error('Não foi possível remover um banner local sem festival associado.', cleanupError)
    }
    throw error
  }
}

export async function addLocalEntry(input: Omit<LocalEntry, 'id' | 'createdAt'>) {
  return updateData((data) => {
    if (!data.festivals.some((festival) => festival.id === input.festivalId)) {
      throw new Error('O festival selecionado não está disponível.')
    }
    const entry: LocalEntry = {
      ...input,
      id: data.nextEntryId++,
      createdAt: new Date().toISOString(),
    }
    data.entries.push(entry)
    return { ok: true as const }
  })
}

export async function listLocalEntries() {
  const data = await readData()
  const festivalNames = new Map(data.festivals.map((festival) => [festival.id, festival.name]))
  return data.entries
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      festivalName: festivalNames.get(entry.festivalId) ?? '—',
      weekdays: entry.weekdays,
      classTime: entry.classTime,
      createdAt: entry.createdAt,
    }))
}

export async function deleteLocalEntry(id: number) {
  return updateData((data) => {
    data.entries = data.entries.filter((entry) => entry.id !== id)
    return { ok: true as const }
  })
}

export async function readLocalBanner(bannerKey: string) {
  if (!bannerIdPattern.test(bannerKey)) return null
  const data = await readData()
  const festival = data.festivals.find((item) => item.bannerKey === bannerKey)
  if (!festival) return null
  try {
    return {
      data: await readFile(path.join(bannersDirectory, bannerKey)),
      contentType: festival.bannerType,
    }
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return null
    throw error
  }
}
