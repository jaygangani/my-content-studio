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

export interface Brand {
  primaryColors: string
  font: string
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
    brand: { primaryColors: '', font: '' },
    storeUrl: '',
    ctaText: '',
  }
}

export function newId(): string {
  return crypto.randomUUID()
}
