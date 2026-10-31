import { weekdays } from './entry-options'

export type ExportRow = {
  id: number
  name: string
  weekdays: string[]
  classTime: string
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function csvCell(value: string, separator: string) {
  // Neutralise spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return safe.includes(separator) || /["\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildCsv(rows: ExportRow[], separator: ',' | ';') {
  const header = ['#', 'Nome', 'Dias da semana', 'Horário', 'Enviado em']
  const lines = rows.map((row, index) =>
    [
      String(rows.length - index),
      row.name,
      row.weekdays.map((day) => weekdays.find((option) => option.value === day)?.label ?? day).join(', '),
      row.classTime || '—',
      formatDate(row.createdAt),
    ]
      .map((cell) => csvCell(cell, separator))
      .join(separator),
  )
  return [header.join(separator), ...lines].join('\r\n')
}

export function downloadFile(contents: string, filename: string, type: string) {
  // BOM so Excel opens accented names (á, ç, ã…) correctly.
  const blob = new Blob(['﻿', contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportFilename(extension: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  return `lista-de-nomes-${stamp}.${extension}`
}
