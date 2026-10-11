import type { AppProfileData } from '@/types/profile'

/**
 * Names the fields that block generation (FR-1.9): description, one persona,
 * one feature, voice tone and CTA wording.
 */
export function getMissingProfileFields(
  description: string | null | undefined,
  profile: AppProfileData,
): string[] {
  const missing: string[] = []
  if (!description?.trim()) missing.push('App description')
  if (!profile.personas.some((p) => p.name.trim())) {
    missing.push('At least one persona')
  }
  if (!profile.features.some((f) => f.name.trim())) {
    missing.push('At least one feature')
  }
  if (!profile.voice.tone.trim()) missing.push('Voice tone')
  if (!profile.ctaText.trim()) missing.push('CTA wording')
  return missing
}
