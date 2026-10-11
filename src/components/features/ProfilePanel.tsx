import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getMissingProfileFields } from '@/lib/profile'
import { getProfile, saveProfile } from '@/services/profile'
import { FEATURE_LIMIT, PERSONA_LIMIT, emptyProfile, newId } from '@/types/profile'
import type {
  AppProfileData,
  Competitor,
  Feature,
  OfferItem,
  Persona,
  ProofItem,
} from '@/types/profile'

interface ProfilePanelProps {
  appId: string
  description: string | null | undefined
}

interface FieldSpec<T> {
  key: Exclude<keyof T & string, 'id'>
  label: string
  placeholder?: string
  multiline?: boolean
  type?: 'text' | 'date'
}

interface RepeaterProps<T extends { id: string }> {
  title: string
  hint?: string
  addLabel: string
  items: T[]
  fields: FieldSpec<T>[]
  limit?: number
  create: () => T
  onChange: (items: T[]) => void
}

function Repeater<T extends { id: string }>({
  title,
  hint,
  addLabel,
  items,
  fields,
  limit,
  create,
  onChange,
}: RepeaterProps<T>): ReactElement {
  const update = (id: string, key: FieldSpec<T>['key'], value: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    )
  }
  const atLimit = limit !== undefined && items.length >= limit

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-ink">{title}</h3>
          {hint ? (
            <p className="mt-1 text-[13px] leading-tight tracking-[-0.26px] text-stone">
              {hint}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={atLimit}
          onClick={() => onChange([...items, create()])}
          className="h-9 rounded-full px-4"
        >
          <Plus /> {addLabel}
        </Button>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex flex-col gap-4 rounded-lg border border-hairline-soft p-5"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow text-slate">
              {title} {index + 1}
            </span>
            <button
              type="button"
              aria-label={`Remove ${title} ${index + 1}`}
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              className="text-graphite transition-colors hover:text-ink"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          {fields.map((field) => {
            const id = `${item.id}-${field.key}`
            const value = String((item as Record<string, unknown>)[field.key] ?? '')
            return (
              <div key={field.key} className="flex flex-col gap-2">
                <Label htmlFor={id}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={id}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => update(item.id, field.key, e.target.value)}
                    className="min-h-20 rounded-md border-hairline-soft"
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.type ?? 'text'}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => update(item.id, field.key, e.target.value)}
                    className="h-11 rounded-md border-hairline-soft"
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}

const PERSONA_FIELDS: FieldSpec<Persona>[] = [
  { key: 'name', label: 'Name', placeholder: 'Busy first-time founder' },
  { key: 'pain', label: 'Pain', multiline: true },
  { key: 'desiredResult', label: 'Desired result', multiline: true },
  { key: 'words', label: 'Words they use', placeholder: 'comma separated' },
  { key: 'dailyMoments', label: 'Daily moments', multiline: true },
]

const FEATURE_FIELDS: FieldSpec<Feature>[] = [
  { key: 'name', label: 'Name' },
  { key: 'benefit', label: 'One-line benefit' },
  { key: 'screenshot', label: 'Screenshot or recording URL (optional)' },
]

const PROOF_FIELDS: FieldSpec<ProofItem>[] = [
  { key: 'text', label: 'Text', multiline: true },
  { key: 'source', label: 'Source' },
  { key: 'date', label: 'Date', type: 'date' },
]

const OFFER_FIELDS: FieldSpec<OfferItem>[] = [
  { key: 'text', label: 'Offer', multiline: true },
  { key: 'claimRule', label: 'Claim rule' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
]

const COMPETITOR_FIELDS: FieldSpec<Competitor>[] = [
  { key: 'name', label: 'Name' },
  { key: 'complaints', label: 'Known user complaints', multiline: true },
]

/** Profile tab: structured app profile sent to the AI with every generation. */
export function ProfilePanel({ appId, description }: ProfilePanelProps) {
  const [profile, setProfile] = useState<AppProfileData>(emptyProfile)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const loaded = await getProfile(appId)
      setProfile(loaded.data)
      setRecordId(loaded.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    void load()
  }, [load])

  const patch = (next: Partial<AppProfileData>) => {
    setSaved(false)
    setProfile((current) => ({ ...current, ...next }))
  }

  const missing = getMissingProfileFields(description, profile)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      setRecordId(await saveProfile(appId, recordId, profile))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate">Loading…</p>

  return (
    <div>
      <div>
        <p className="eyebrow text-slate">profile</p>
        <h2 className="text-heading-sm mt-4">Profile</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite">
          Fill this in once. It is sent to the AI with every generation.
        </p>
      </div>

      {missing.length ? (
        <p className="mt-8 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          Generation is blocked until you add: {missing.join(', ')}.
        </p>
      ) : null}

      <Card className="mt-10 rounded-xl border-hairline bg-surface-card p-0 shadow-none">
        <form onSubmit={handleSubmit} className="flex flex-col gap-10 px-4 py-6 sm:px-8 sm:py-8">
          <Repeater
            title="Persona"
            hint="1 to 4 people you write for."
            addLabel="Add persona"
            items={profile.personas}
            fields={PERSONA_FIELDS}
            limit={PERSONA_LIMIT}
            create={() => ({
              id: newId(),
              name: '',
              pain: '',
              desiredResult: '',
              words: '',
              dailyMoments: '',
            })}
            onChange={(personas) => patch({ personas })}
          />

          <Repeater
            title="Feature"
            hint="1 to 10 features worth featuring."
            addLabel="Add feature"
            items={profile.features}
            fields={FEATURE_FIELDS}
            limit={FEATURE_LIMIT}
            create={() => ({ id: newId(), name: '', benefit: '', screenshot: '' })}
            onChange={(features) => patch({ features })}
          />

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-ink">Voice</h3>
            {(
              [
                ['tone', 'Tone', 'Warm, direct, a little dry'],
                ['wordsToUse', 'Words to use', 'comma separated'],
                ['bannedWords', 'Banned words', 'comma separated'],
                ['forbiddenClaims', 'Claims never to make', 'one per line'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={`voice-${key}`}>{label}</Label>
                <Input
                  id={`voice-${key}`}
                  value={profile.voice[key]}
                  placeholder={placeholder}
                  onChange={(e) =>
                    patch({ voice: { ...profile.voice, [key]: e.target.value } })
                  }
                  className="h-11 rounded-md border-hairline-soft"
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-ink">Call to action</h3>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-cta">CTA wording</Label>
              <Input
                id="profile-cta"
                value={profile.ctaText}
                placeholder="Search [APP] on the App Store"
                onChange={(e) => patch({ ctaText: e.target.value })}
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-store">Store link</Label>
              <Input
                id="profile-store"
                value={profile.storeUrl}
                onChange={(e) => patch({ storeUrl: e.target.value })}
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-ink">Brand</h3>
            <div className="flex flex-col gap-2">
              <Label htmlFor="brand-colors">Primary colours</Label>
              <Input
                id="brand-colors"
                value={profile.brand.primaryColors}
                placeholder="#111111, #FFFFFF"
                onChange={(e) =>
                  patch({
                    brand: { ...profile.brand, primaryColors: e.target.value },
                  })
                }
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="brand-font">Font choice</Label>
              <Input
                id="brand-font"
                value={profile.brand.font}
                onChange={(e) =>
                  patch({ brand: { ...profile.brand, font: e.target.value } })
                }
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
          </section>

          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-heading-sm">Proof</h3>
              <p className="mt-2 text-sm text-graphite">
                Optional. Only facts listed here can appear in generated
                content.
              </p>
            </div>
            <Repeater
              title="Review"
              addLabel="Add review"
              items={profile.proof.reviews}
              fields={PROOF_FIELDS}
              create={() => ({ id: newId(), text: '', source: '', date: '' })}
              onChange={(reviews) =>
                patch({ proof: { ...profile.proof, reviews } })
              }
            />
            <Repeater
              title="User comment"
              addLabel="Add comment"
              items={profile.proof.comments}
              fields={PROOF_FIELDS}
              create={() => ({ id: newId(), text: '', source: '', date: '' })}
              onChange={(comments) =>
                patch({ proof: { ...profile.proof, comments } })
              }
            />
            <Repeater
              title="Stat"
              addLabel="Add stat"
              items={profile.proof.stats}
              fields={PROOF_FIELDS}
              create={() => ({ id: newId(), text: '', source: '', date: '' })}
              onChange={(stats) => patch({ proof: { ...profile.proof, stats } })}
            />
            <Repeater
              title="Milestone"
              addLabel="Add milestone"
              items={profile.proof.milestones}
              fields={PROOF_FIELDS}
              create={() => ({ id: newId(), text: '', source: '', date: '' })}
              onChange={(milestones) =>
                patch({ proof: { ...profile.proof, milestones } })
              }
            />
            <Repeater
              title="News"
              addLabel="Add news"
              items={profile.proof.news}
              fields={PROOF_FIELDS}
              create={() => ({ id: newId(), text: '', source: '', date: '' })}
              onChange={(news) => patch({ proof: { ...profile.proof, news } })}
            />
            <Repeater
              title="Offer"
              addLabel="Add offer"
              items={profile.proof.offers}
              fields={OFFER_FIELDS}
              create={() => ({ id: newId(), text: '', claimRule: '', deadline: '' })}
              onChange={(offers) =>
                patch({ proof: { ...profile.proof, offers } })
              }
            />
          </div>

          <Repeater
            title="Competitor"
            hint="Optional."
            addLabel="Add competitor"
            items={profile.competitors}
            fields={COMPETITOR_FIELDS}
            create={() => ({ id: newId(), name: '', complaints: '' })}
            onChange={(competitors) => patch({ competitors })}
          />

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}
          {saved ? <p className="text-sm text-graphite">Profile saved.</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
