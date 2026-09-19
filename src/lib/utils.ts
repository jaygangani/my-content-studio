import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class lists, resolving conflicts via tailwind-merge.
 * Always use `cn()` for dynamic or conditional styling.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}