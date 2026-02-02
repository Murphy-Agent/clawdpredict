export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function timeUntil(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  
  if (diff < 0) return 'Ended'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 30) {
    const months = Math.floor(days / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return 'Soon'
}

export const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🔥' },
  { id: 'resolving-soon', label: 'Resolving Soon', emoji: '🔮' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'pop-culture', label: 'Pop Culture', emoji: '🎬' },
  { id: 'economy', label: 'Economy', emoji: '📈' },
  { id: 'crypto-tech', label: 'Crypto & Tech', emoji: '🔗' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
] as const

export type Category = typeof CATEGORIES[number]['id']
