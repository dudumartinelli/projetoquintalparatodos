import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitName } from '@/lib/entries.functions'

export const Route = createFileRoute('/')({
  component: Home,
})

type Status = 'idle' | 'pending' | 'success' | 'error'

function Home() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState('')

  // Invite and password-reset emails link to the site root; hand them to the admin area.
  useEffect(() => {
    if (/(invite|recovery|confirmation)_token=/.test(window.location.hash)) {
      window.location.replace(`/admin${window.location.hash}`)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'pending') return
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Digite pelo menos 2 caracteres.')
      return
    }
    setError(null)
    setStatus('pending')
    try {
      await submitName({ data: { name: trimmed } })
      setSubmittedName(trimmed)
      setName('')
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Não foi possível enviar agora. Tente novamente em instantes.')
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[32rem] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 size-[28rem] rounded-full bg-accent blur-3xl"
      />

      <header className="relative mx-auto flex w-full max-w-content items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-display text-2xl tracking-tight">Lista de Nomes</span>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/admin">
            <Lock /> Área do administrador
          </Link>
        </Button>
      </header>

      <main className="relative mx-auto grid w-full max-w-content flex-1 items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Inscrição aberta
          </p>
          <h1 className="font-display text-6xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Adicione o nome do <em className="text-primary">Aluno</em> na lista.
          </h1>
          <p className="max-w-reading text-lg text-muted-foreground">
            Só precisamos do seu nome. Ele é guardado com segurança e fica visível
            apenas para os organizadores.
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-[0_30px_60px_-30px_oklch(0.35_0.08_255/0.28)] sm:p-10">
          {status === 'success' ? (
            <div className="space-y-6 text-center" role="status">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-7" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-4xl">Pronto, {submittedName}!</h2>
                <p className="text-muted-foreground">Seu nome foi adicionado à lista.</p>
              </div>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Enviar outro nome
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-4xl">Seu nome</h2>
                <p className="text-sm text-muted-foreground">Leva menos de 10 segundos.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo do Aluno</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Ex.: Maria da Silva"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'name-error' : undefined}
                  disabled={status === 'pending'}
                  className="h-12 text-base md:text-base"
                  required
                />
                {error && (
                  <p id="name-error" role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full text-base"
                disabled={status === 'pending'}
              >
                {status === 'pending' ? 'Enviando…' : 'Entrar na lista'}
                {status !== 'pending' && <ArrowRight />}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
