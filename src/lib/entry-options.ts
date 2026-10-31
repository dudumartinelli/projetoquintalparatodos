export const weekdays = [
  { value: 'segunda-feira', label: 'Segunda-feira' },
  { value: 'terça-feira', label: 'Terça-feira' },
  { value: 'quarta-feira', label: 'Quarta-feira' },
  { value: 'quinta-feira', label: 'Quinta-feira' },
  { value: 'sexta-feira', label: 'Sexta-feira' },
  { value: 'sábado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
] as const

export type Weekday = (typeof weekdays)[number]['value']

export const weekdayValues = weekdays.map(({ value }) => value) as [
  Weekday,
  ...Weekday[],
]

export const classTimes = ['18:40', '19:10'] as const
export type ClassTime = (typeof classTimes)[number]
