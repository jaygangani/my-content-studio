import { useCallback, useEffect, useMemo, useState } from 'react'
import { TestGeneratePanel } from '@/components/features/TestGeneratePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { listFormats } from '@/services/formats'
import type { FormatDef } from '@/services/formats'
import { listPrompts, savePrompt } from '@/services/prompts'
import type { PromptSnippet } from '@/services/prompts'

function groupOf(key: string): string {
  if (key.startsWith('carousel.') || key.startsWith('layout.')) return 'Carousel'
  if (key.startsWith('image.')) return 'Single image'
  if (key.startsWith('style.')) return 'Visual styles'
  if (key.startsWith('meme.')) return 'Meme reel'
  if (key.startsWith('viral.')) return 'Viral clip reel'
  return 'Core'
}

/** Admin editor for every AI prompt and rule text. */
export function PromptManager() {
  const [prompts, setPrompts] = useState<PromptSnippet[]>([])
  const [formats, setFormats] = useState<FormatDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([listPrompts(), listFormats()])
      setPrompts(p)
      setFormats(f)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, PromptSnippet[]>()
    for (const prompt of prompts) {
      if (
        q &&
        !prompt.key.toLowerCase().includes(q) &&
        !(prompt.label ?? '').toLowerCase().includes(q) &&
        !prompt.value.toLowerCase().includes(q)
      ) {
        continue
      }
      const group = groupOf(prompt.key)
      map.set(group, [...(map.get(group) ?? []), prompt])
    }
    return [...map.entries()]
  }, [prompts, query])

  const openPrompt = (prompt: PromptSnippet) => {
    setOpenKey(openKey === prompt.key ? null : prompt.key)
    setValue(prompt.value)
    setSavedKey(null)
    setError(null)
  }

  const replace = (updated: PromptSnippet) =>
    setPrompts((list) => list.map((p) => (p.id === updated.id ? updated : p)))

  const handleSave = async (prompt: PromptSnippet) => {
    setSaving(true)
    setError(null)
    try {
      replace(await savePrompt(prompt.id, { value }))
      setSavedKey(prompt.key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (prompt: PromptSnippet) => {
    setError(null)
    try {
      replace(await savePrompt(prompt.id, { enabled: !prompt.enabled }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {formats.length ? <TestGeneratePanel formats={formats} /> : null}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search prompts"
        className="h-10 w-full rounded-md border-hairline-soft sm:w-72"
      />

      {error ? (
        <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : prompts.length === 0 ? (
        <p className="text-sm text-graphite">
          No prompts yet. Run <code>npm run seed:formats</code> once to load the
          defaults.
        </p>
      ) : (
        grouped.map(([group, items]) => (
          <section key={group}>
            <h3 className="eyebrow text-slate">{group}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {items.map((prompt) => {
                const open = openKey === prompt.key
                return (
                  <li
                    key={prompt.id}
                    className="rounded-xl border border-hairline bg-surface-card"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openPrompt(prompt)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={`truncate text-sm font-medium ${prompt.enabled ? 'text-ink' : 'text-stone line-through'}`}
                        >
                          {prompt.label || prompt.key}
                        </p>
                        <p className="truncate font-mono text-[12px] text-stone">
                          {prompt.key}
                        </p>
                      </button>
                      {!prompt.required ? (
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-graphite">
                          <input
                            type="checkbox"
                            checked={prompt.enabled}
                            onChange={() => void toggle(prompt)}
                            className="accent-primary"
                          />
                          On
                        </label>
                      ) : null}
                    </div>
                    {open ? (
                      <div className="flex flex-col gap-3 border-t border-hairline px-4 py-4">
                        {prompt.description ? (
                          <p className="text-[13px] text-graphite">
                            {prompt.description}
                          </p>
                        ) : null}
                        <Textarea
                          value={value}
                          rows={Math.min(24, Math.max(6, value.split('\n').length + 1))}
                          onChange={(e) => {
                            setValue(e.target.value)
                            setSavedKey(null)
                          }}
                          className="rounded-md border-hairline-soft font-mono text-[13px]"
                        />
                        <div className="flex items-center justify-end gap-3">
                          {savedKey === prompt.key ? (
                            <span className="text-sm text-graphite">Saved</span>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setValue(prompt.value)}
                            className="rounded-full"
                          >
                            Revert
                          </Button>
                          <Button
                            type="button"
                            disabled={saving || value === prompt.value}
                            onClick={() => void handleSave(prompt)}
                            className="rounded-full"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
