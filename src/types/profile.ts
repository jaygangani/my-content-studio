import { emptyBrand } from '@/lib/brand'
export interface Persona {
  id: string
  name: string
  pain: string
  desiredResult: string
  words: string
  dailyMoments: string
}

export interface Feature {
  id: string
  name: string
  benefit: string
  screenshot: string
}

export interface Voice {
  tone: string
  wordsToUse: string
  bannedWords: string
  forbiddenClaims: string
}

export interface ProofItem {
  id: string
  text: string
  source: string
  date: string
}

export interface OfferItem {
  id: string
  text: string
  claimRule: string
  deadline: string
}

export interface Proof {
  reviews: ProofItem[]
  comments: ProofItem[]
  stats: ProofItem[]
  milestones: ProofItem[]
  news: ProofItem[]
  offers: OfferItem[]
}

export interface Competitor {
  id: string
  name: string
  complaints: string
}

export type LogoCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type VisualStyle = 'bold-minimal' | 'warm-editorial' | 'tech-clean'

export interface Brand {
  colors: { primary: string; secondary: string; accent: string }
  headlineFont: string
  bodyFont: string
  logoLight: string
  logoDark: string
  logoCorner: LogoCorner
  showLogo: boolean
  visualStyle: VisualStyle
}

/** Structured per-app profile sent to the AI with every generation. */
export interface AppProfileData {
  personas: Persona[]
  features: Feature[]
  voice: Voice
  proof: Proof
  competitors: Competitor[]
  brand: Brand
  storeUrl: string
  ctaText: string
}

export const PERSONA_LIMIT = 4
export const FEATURE_LIMIT = 10

export function emptyProfile(): AppProfileData {
  return {
    personas: [],
    features: [],
    voice: { tone: '', wordsToUse: '', bannedWords: '', forbiddenClaims: '' },
    proof: {
      reviews: [],
      comments: [],
      stats: [],
      milestones: [],
      news: [],
      offers: [],
    },
    competitors: [],
    brand: emptyBrand(),
    storeUrl: '',
    ctaText: '',
  }
}

export function newId(): string {
  return crypto.randomUUID()
}
