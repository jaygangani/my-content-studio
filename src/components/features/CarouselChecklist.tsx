import { useMemo } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import type { BrandAssets } from '@/lib/carousel'
import { runCarouselQa } from '@/lib/carouselQa'
import type { PieceScript } from '@/types/script'

interface CarouselChecklistProps {
  script: PieceScript
  brandAssets: BrandAssets
}

/** Quality checklist for a carousel. Warns only; export stays available. */
export function CarouselChecklist({ script, brandAssets }: CarouselChecklistProps) {
  const checks = useMemo(
    () => runCarouselQa(script, brandAssets),
    [script, brandAssets],
  )
  const failing = checks.filter((check) => !check.pass).length
  if (!checks.length) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Quality checklist</h3>
        <span className="text-[13px] text-graphite">
          {failing === 0 ? 'All checks pass' : `${failing} to review`}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-sm">
            {check.pass ? (
              <Check className="mt-0.5 size-4 shrink-0 text-semantic-success" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-semantic-error" />
            )}
            <span>
              <span className="text-ink">{check.label}</span>
              <span className="block text-[13px] text-graphite">{check.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
