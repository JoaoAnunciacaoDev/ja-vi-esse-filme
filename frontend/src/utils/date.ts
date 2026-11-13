// formatDateDDMMYYYY padroniza qualquer string de data em DD/MM/YYYY
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  if (!trimmed) return ''

  // Se já for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed
  }

  // Se for apenas ano (ex: "1996")
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed
  }

  // Se for YYYY-MM-DD ou ISO
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch
    return `${d}/${m}/${y}`
  }

  try {
    const parsed = new Date(trimmed)
    if (isNaN(parsed.getTime())) return trimmed
    const day = String(parsed.getUTCDate()).padStart(2, '0')
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const year = parsed.getUTCFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return trimmed
  }
}

export function extractDateOnly(dateStr?: string | null): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
  if (isoMatch) return isoMatch[1]

  const parsed = new Date(trimmed)
  if (isNaN(parsed.getTime())) return ''
  const y = parsed.getUTCFullYear()
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const d = String(parsed.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getLocalTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatSessionDate(
  dateStr?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  const dateOnly = extractDateOnly(dateStr)
  if (!dateOnly) return 'Data não informada'

  const parsed = new Date(`${dateOnly}T12:00:00`)
  if (isNaN(parsed.getTime())) return 'Data não informada'

  return parsed.toLocaleDateString('pt-BR', options)
}

export function formatFinishedDate(finishedAt?: string | null): string | null {
  if (!finishedAt) return null

  try {
    const d = new Date(finishedAt)
    if (isNaN(d.getTime())) return null

    // Verifica se foi salvo como indicação de ano apenas (01/01 às 12:00 UTC)
    const isYearOnly =
      finishedAt.includes('-01-01T12:00:00') ||
      (d.getUTCMonth() === 0 && d.getUTCDate() === 1 && d.getUTCHours() === 12 && d.getUTCMinutes() === 0)

    if (isYearOnly) {
      return `Assistido em ${d.getUTCFullYear()}`
    }

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `Assistido em ${day}/${month}/${year}`
  } catch {
    return null
  }
}
