import { useEffect, useRef } from 'react'
import type { ColumnRole } from '../../core'
import { CheckIcon, EyeOffIcon, KeyIcon } from '../icons'

const ITEMS: { role: ColumnRole; label: string; icon: React.ReactNode }[] = [
  { role: 'key', label: 'Use as key', icon: <KeyIcon size={16} /> },
  { role: 'compare', label: 'Compare', icon: <CheckIcon size={16} /> },
  { role: 'ignore', label: 'Ignore', icon: <EyeOffIcon size={16} /> },
]

/**
 * The small menu that opens under a column header in the preview.
 * It is placed on the page (position: fixed) so the table's scroll area doesn't cut it off.
 */
export function ColumnMenu({
  anchor,
  role,
  onPick,
  onClose,
}: {
  anchor: DOMRect
  role: ColumnRole
  onPick: (role: ColumnRole) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        const at = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const left = Math.min(anchor.left, window.innerWidth - 220)
  return (
    <div ref={ref} className="col-menu" role="menu" style={{ top: anchor.bottom + 6, left: Math.max(8, left) }}>
      {ITEMS.map((it) => (
        <button
          key={it.role}
          type="button"
          role="menuitemradio"
          aria-checked={role === it.role}
          className="col-menu-item"
          onClick={() => {
            onPick(it.role)
            onClose()
          }}
        >
          {it.icon}
          <span>{it.label}</span>
          {role === it.role && (
            <span className="col-menu-tick">
              <CheckIcon size={15} />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
