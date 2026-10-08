import type { ReactNode } from 'react'

interface BadgeProps {
  tone?: 'success' | 'neutral' | 'danger' | 'accent' | 'info' | 'warning'
  children: ReactNode
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
