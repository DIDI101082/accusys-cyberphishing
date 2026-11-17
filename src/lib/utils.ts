import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    running: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-purple-100 text-purple-700',
    pending: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    opened: 'bg-cyan-100 text-cyan-700',
    clicked: 'bg-orange-100 text-orange-700',
    submitted: 'bg-red-100 text-red-700',
    reported: 'bg-green-100 text-green-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    scheduled: 'Programada',
    running: 'En curso',
    paused: 'Pausada',
    completed: 'Completada',
    pending: 'Pendiente',
    sent: 'Enviado',
    opened: 'Abierto',
    clicked: 'Clic',
    submitted: 'Capturado',
    reported: 'Reportado',
  }
  return labels[status] || status
}

export function percentOf(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}
