import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { classTimes, weekdays, type ClassTime, type Weekday } from '@/lib/entry-options'
import { submitName } from '@/lib/entries.functions'

export const Route = createFileRoute('/')({
  component: Home,
})

type Status = 'idle' | 'pending' | 'success' | 'error'
type FormErrors = { name?: string; weekdays?: string; classTime?: string }

function Home() {
  const [name, setName] = useState('')
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([])
  const [classTime, setClassTime] = useState<ClassTime | ''>('')
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState('')
  const [submittedWeekdays, setSubmittedWeekdays] = useState<Weekday[]>([])
  const [submittedClassTime, setSubmittedClassTime] = useState<ClassTime | ''>('')

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
    const errors: FormErrors = {}
    if (trimmed.length < 2) errors.name = 'Digite pelo menos 2 caracteres.'
    if (selectedWeekdays.length === 0) errors.weekdays = 'Selecione pelo menos um dia.'
    if (!classTime) errors.classTime = 'Selecione um horário.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !classTime) {
      return
    }
    const orderedWeekdays = weekdays
      .filter((day) => selectedWeekdays.includes(day.value))
      .map((day) => day.value)
    setSubmitError(null)
    setStatus('pending')
    try {
      await submitName({
        data: { name: trimmed, weekdays: orderedWeekdays, classTime },
      })
      setSubmittedName(trimmed)
      setSubmittedWeekdays(orderedWeekdays)
      setSubmittedClassTime(classTime)
      setName('')
      setSelectedWeekdays([])
      setClassTime('')
      setStatus('success')
    } catch {
      setStatus('error')
      setSubmitError('Não foi possível enviar agora. Tente novamente em instantes.')
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
        <span className="font-display text-2xl tracking-tight">Projeto Quintal para Todos</span>
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
            Informe o nome do aluno, os dias da semana e o horário desejado. Os dados ficam visíveis
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
                <p className="text-muted-foreground">Sua inscrição foi adicionada à lista.</p>
                <p className="text-sm text-muted-foreground">
                  {submittedWeekdays
                    .map((day) => weekdays.find((option) => option.value === day)?.label)
                    .join(', ')}{' '}
                  às {submittedClassTime}
                </p>
              </div>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Enviar outro nome
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-4xl">Inscrição do aluno</h2>
                <p className="text-sm text-muted-foreground">Preencha os dados da inscrição.</p>
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
                  onChange={(e) => {
                    setName(e.target.value)
                    setFieldErrors((current) => ({ ...current, name: undefined }))
                  }}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  disabled={status === 'pending'}
                  className="h-12 text-base md:text-base"
                  required
                />
                {fieldErrors.name && (
                  <p id="name-error" role="alert" className="text-sm text-destructive">
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <fieldset className="space-y-3">
                <legend className="text-sm leading-none font-medium">Dias da semana</legend>
                <p className="text-sm text-muted-foreground">Selecione um ou mais dias.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {weekdays.map((day) => {
                    const id = `weekday-${day.value}`
                    return (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={selectedWeekdays.includes(day.value)}
                          onCheckedChange={(checked) => {
                            setSelectedWeekdays((current) =>
                              checked
                                ? [...current, day.value]
                                : current.filter((value) => value !== day.value),
                            )
                            setFieldErrors((current) => ({ ...current, weekdays: undefined }))
                          }}
                          aria-invalid={fieldErrors.weekdays ? true : undefined}
                          aria-describedby={fieldErrors.weekdays ? 'weekdays-error' : undefined}
                          disabled={status === 'pending'}
                        />
                        <Label htmlFor={id} className="cursor-pointer font-normal">
                          {day.label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
                {fieldErrors.weekdays && (
                  <p id="weekdays-error" role="alert" className="text-sm text-destructive">
                    {fieldErrors.weekdays}
                  </p>
                )}
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm leading-none font-medium">Horário</legend>
                <RadioGroup
                  value={classTime}
                  onValueChange={(value) => {
                    setClassTime(classTimes.find((time) => time === value) ?? '')
                    setFieldErrors((current) => ({ ...current, classTime: undefined }))
                  }}
                  aria-label="Horário"
                  aria-invalid={fieldErrors.classTime ? true : undefined}
                  aria-describedby={fieldErrors.classTime ? 'class-time-error' : undefined}
                  disabled={status === 'pending'}
                  className="grid grid-cols-2"
                >
                  {classTimes.map((time) => (
                    <div key={time} className="flex items-center gap-2">
                      <RadioGroupItem id={`time-${time}`} value={time} />
                      <Label htmlFor={`time-${time}`} className="cursor-pointer font-normal">
                        {time}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldErrors.classTime && (
                  <p id="class-time-error" role="alert" className="text-sm text-destructive">
                    {fieldErrors.classTime}
                  </p>
                )}
              </fieldset>
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}
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
