export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayLocal(): string {
  return formatLocalDate(new Date())
}

export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function compareDates(a: string, b: string): number {
  return a.localeCompare(b)
}

export function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  return { start, end }
}

export function getCurrentMonthRange(base = new Date()) {
  return getMonthRange(base.getFullYear(), base.getMonth() + 1)
}

export function getWeekRange(base = new Date()) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const weekday = date.getDay()
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: formatLocalDate(monday),
    end: formatLocalDate(sunday),
  }
}

export function formatMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) return '0 分钟'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} 分钟`
  if (minutes === 0) return `${hours} 小时`
  return `${hours} 小时 ${minutes} 分钟`
}

