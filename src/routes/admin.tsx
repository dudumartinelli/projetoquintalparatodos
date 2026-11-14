import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  acceptInvite,
  AuthError,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  updateUser,
} from '@netlify/identity'
import { ArrowLeft, Download, LogOut, RefreshCw, Search, ShieldAlert, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createFestival, deleteEntry, getViewer, listEntries, listFestivals } from '@/lib/entries.functions'
import { weekdays } from '@/lib/entry-options'
import { buildCsv, downloadFile, exportFilename, type ExportRow } from '@/lib/export'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Administração · Projeto Quintal para Todos' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminPage,
})

type Viewer = Awaited<ReturnType<typeof getViewer>>
type Screen =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'invite'; token: string }
  | { kind: 'recovery' }
  | { kind: 'forbidden'; viewer: NonNullable<Viewer> }
  | { kind: 'admin'; viewer: NonNullable<Viewer> }

function AdminPage() {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' })

  const refreshViewer = useCallback(async () => {
    const viewer = await getViewer()
    if (!viewer) setScreen({ kind: 'login' })
    else setScreen({ kind: viewer.isAdmin ? 'admin' : 'forbidden', viewer })
  }, [])

  useEffect(() => {
    let active = true
    async function init() {
      try {
        if (/_token=/.test(window.location.hash)) {
          const result = await handleAuthCallback()
          window.history.replaceState(null, '', window.location.pathname)
          if (!active) return
          if (result?.type === 'invite' && result.token) return setScreen({ kind: 'invite', token: result.token })
          if (result?.type === 'recovery') return setScreen({ kind: 'recovery' })
        }
      } catch {
        toast.error('Este link expirou ou já foi usado.')
      }
      if (active) await refreshViewer().catch(() => setScreen({ kind: 'login' }))
    }
    void init()
    return () => {
      active = false
    }
  }, [refreshViewer])

  async function handleLogout() {
    await logout().catch(() => undefined)
    setScreen({ kind: 'login' })
  }

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar ao formulário">
              <Link to="/">
                <ArrowLeft />
              </Link>
            </Button>
            <span className="font-display text-2xl tracking-tight">Projeto Quintal para Todos</span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              Admin
            </span>
          </div>
          {(screen.kind === 'admin' || screen.kind === 'forbidden') && (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">{screen.viewer.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut /> Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
        {screen.kind === 'loading' && <ListSkeleton />}
        {screen.kind === 'login' && <LoginForm onSuccess={refreshViewer} />}
        {screen.kind === 'invite' && (
          <PasswordForm
            title="Bem-vindo(a)!"
            description="Você foi convidado(a) para administrar a lista. Crie uma senha para acessar."
            submitLabel="Criar senha e entrar"
            onSubmit={async (password) => {
              await acceptInvite(screen.token, password)
              await refreshViewer()
            }}
          />
        )}
        {screen.kind === 'recovery' && (
          <PasswordForm
            title="Nova senha"
            description="Escolha uma nova senha para sua conta."
            submitLabel="Salvar senha"
            onSubmit={async (password) => {
              await updateUser({ password })
              toast.success('Senha atualizada.')
              await refreshViewer()
            }}
          />
        )}
        {screen.kind === 'forbidden' && <Forbidden />}
        {screen.kind === 'admin' && (
          <div className="space-y-12">
            <FestivalManager />
            <EntriesPanel />
          </div>
        )}
      </main>
    </div>
  )
}

function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const fields = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login(String(fields.get('email')), String(fields.get('password')))
      await onSuccess()
    } catch (err) {
      setError(
        err instanceof AuthError && err.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.',
      )
      setPending(false)
    }
  }

  async function forgot() {
    if (!email) return setError('Digite seu e-mail acima para receber o link de redefinição.')
    try {
      await requestPasswordRecovery(email)
      toast.success('Se o e-mail existir, enviamos um link para redefinir a senha.')
    } catch {
      toast.error('Não foi possível enviar o e-mail agora.')
    }
  }

  return (
    <AuthCard title="Entrar" description="Acesso restrito aos administradores da lista.">
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg">
            {pending ? 'Entrando…' : 'Entrar'}
          </Button>
        </fieldset>
        <button type="button" onClick={forgot} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          Esqueci minha senha
        </button>
      </form>
    </AuthCard>
  )
}

function PasswordForm(props: {
  title: string
  description: string
  submitLabel: string
  onSubmit: (password: string) => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password'))
    if (password.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (password !== String(fields.get('confirm'))) return setError('As senhas não coincidem.')
    setPending(true)
    setError(null)
    try {
      await props.onSubmit(password)
    } catch {
      setError('Não foi possível salvar a senha. O link pode ter expirado.')
      setPending(false)
    }
  }

  return (
    <AuthCard title={props.title} description={props.description}>
      <form onSubmit={submit}>
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Senha</Label>
            <Input id="new-password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg">
            {pending ? 'Salvando…' : props.submitLabel}
          </Button>
        </fieldset>
      </form>
    </AuthCard>
  )
}

function Forbidden() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center">
      <ShieldAlert className="mx-auto size-10 text-primary" />
      <h1 className="font-display text-4xl">Acesso restrito</h1>
      <p className="text-muted-foreground">
        Sua conta não tem permissão de administrador. Peça ao responsável pela lista para liberar seu acesso.
      </p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
}

type Festival = Awaited<ReturnType<typeof listFestivals>>[number]

function FestivalManager() {
  const [festivals, setFestivals] = useState<Festival[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState(false)
  const loadFestivals = useCallback(async () => {
    try {
      setFestivals(await listFestivals())
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    void listFestivals()
      .then((items) => {
        if (!active) return
        setFestivals(items)
        setLoadError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    setPending(true)
    try {
      const festival = await createFestival({ data: new FormData(form) })
      setFestivals((current) => [festival, ...(current ?? [])])
      form.reset()
      toast.success(`Festival “${festival.name}” criado.`)
    } catch {
      toast.error('Não foi possível criar o festival. Confira o nome e o banner.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-5xl tracking-tight">Festivais</h1>
        <p className="mt-1 text-muted-foreground">Crie os festivais e seus banners para inscrição.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-display text-3xl">Novo festival</h2>
          <div className="space-y-2">
            <Label htmlFor="festival-name">Nome do festival</Label>
            <Input id="festival-name" name="name" maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="festival-banner">Banner</Label>
            <Input
              id="festival-banner"
              name="banner"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
            <p className="text-xs text-muted-foreground">PNG, JPG ou WebP, até 5 MB.</p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Criando…' : 'Criar festival'}
          </Button>
        </form>

        <div className="space-y-3">
          <h2 className="font-display text-3xl">Festivais cadastrados</h2>
          {loadError ? (
            <div className="space-y-2 rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar os festivais.</p>
              <Button variant="outline" size="sm" onClick={loadFestivals}>Tentar novamente</Button>
            </div>
          ) : festivals === null ? (
            <Skeleton className="h-24 w-full" />
          ) : festivals.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Nenhum festival cadastrado.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {festivals.map((festival) => (
                <li key={festival.id} className="overflow-hidden rounded-xl border bg-card">
                  <img src={festival.bannerUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                  <p className="p-3 font-medium">{festival.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function EntriesPanel() {
  const [rows, setRows] = useState<ExportRow[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [toDelete, setToDelete] = useState<ExportRow | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      setRows(await listEntries())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void listEntries()
      .then((items) => {
        if (!active) return
        setRows(items)
        setLoadError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLocaleLowerCase('pt-BR')
    return q ? rows.filter((r) => r.name.toLocaleLowerCase('pt-BR').includes(q)) : rows
  }, [rows, query])

  const positions = useMemo(
    () => new Map((rows ?? []).map((r, i, all) => [r.id, all.length - i])),
    [rows],
  )

  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return (rows ?? []).filter((r) => new Date(r.createdAt) >= start).length
  }, [rows])

  function exportAs(kind: 'csv' | 'excel' | 'txt') {
    if (!rows?.length) return
    if (kind === 'txt') {
      downloadFile(rows.map((r) => r.name).join('\r\n'), exportFilename('txt'), 'text/plain;charset=utf-8')
    } else {
      downloadFile(buildCsv(rows, kind === 'excel' ? ';' : ','), exportFilename('csv'), 'text/csv;charset=utf-8')
    }
    toast.success(`${rows.length} nomes exportados.`)
  }

  async function confirmDelete() {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    try {
      await deleteEntry({ data: { id: target.id } })
      setRows((prev) => prev?.filter((r) => r.id !== target.id) ?? prev)
      toast.success(`“${target.name}” removido da lista.`)
    } catch {
      toast.error('Não foi possível remover agora.')
    }
  }

  if (loadError && !rows) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-muted-foreground">Não foi possível carregar a lista.</p>
        <Button onClick={load}>Tentar novamente</Button>
      </div>
    )
  }
  if (!rows) return <ListSkeleton />

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-tight">Nomes recebidos</h1>
          <p className="mt-1 text-muted-foreground">Visível apenas para administradores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={refreshing} aria-label="Atualizar lista">
            <RefreshCw className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={rows.length === 0}>
                <Download /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportAs('excel')}>Planilha Excel (.csv com ;)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportAs('csv')}>Google Sheets / CSV padrão</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportAs('txt')}>Somente nomes (.txt)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Total de nomes" value={rows.length} />
        <Stat label="Recebidos hoje" value={today} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-medium">Nenhum nome ainda</p>
          <p className="text-sm text-muted-foreground">Compartilhe o link do formulário para começar a receber nomes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome…"
              aria-label="Buscar nome"
              className="pl-9"
            />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Festival</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="hidden sm:table-cell">Enviado em</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{positions.get(row.id)}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.festivalName}</TableCell>
                    <TableCell>
                      {row.weekdays.length > 0
                        ? row.weekdays
                            .map((day) => weekdays.find((option) => option.value === day)?.label ?? day)
                            .join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>{row.classTime || '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remover ${row.name}`}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum nome encontrado para “{query}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover nome?</DialogTitle>
            <DialogDescription>
              “{toDelete?.name}” será removido da lista permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-5xl tabular-nums">{value}</p>
    </div>
  )
}
