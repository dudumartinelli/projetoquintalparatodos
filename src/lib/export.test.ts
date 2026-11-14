import { describe, expect, it } from 'vitest'
import { buildCsv, type ExportRow } from './export'

describe('buildCsv', () => {
  it('exports selected weekdays and class time', () => {
    const rows: ExportRow[] = [
      {
        id: 1,
        name: 'Ana',
        festivalName: 'Festa da primavera',
        weekdays: ['terça-feira', 'sexta-feira'],
        classTime: '19:10',
        createdAt: '2026-10-30T12:00:00.000Z',
      },
    ]

    const csv = buildCsv(rows, ';')

    expect(csv.split('\r\n')[0]).toBe('#;Nome;Festival;Dias da semana;Horário;Enviado em')
    expect(csv).toContain('1;Ana;Festa da primavera;Terça-feira, Sexta-feira;19:10;')
  })
})
