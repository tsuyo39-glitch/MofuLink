import { differenceInMonths, differenceInDays, format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function calcAge(birthday: string): string {
  const birth = parseISO(birthday)
  const now = new Date()
  const months = differenceInMonths(now, birth)
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (years === 0) return `${remMonths}ヶ月`
  if (remMonths === 0) return `${years}歳`
  return `${years}歳${remMonths}ヶ月`
}

export function calcDaysSince(dateStr: string): number {
  return differenceInDays(new Date(), parseISO(dateStr))
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })
}

export function formatMonthYear(yearMonth: string): string {
  return format(parseISO(yearMonth + '-01'), 'yyyy年M月', { locale: ja })
}

export function toYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function generateId(): string {
  // crypto.randomUUID はセキュアコンテキスト(HTTPS/localhost)でしか使えないため、
  // iPhone から http://192.168.x.x のような非セキュアな LAN アクセスでも動くようフォールバックする
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // RFC4122 v4 相当を getRandomValues から生成
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }
  // 最終フォールバック
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP') + '円'
}
