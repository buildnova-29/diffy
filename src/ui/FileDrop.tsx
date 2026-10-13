import { useId, useState } from 'react'
import { listSheetNames } from '../core'
import type { LoadedFile } from '../state/store'
import { CheckIcon, SheetIcon, TrashIcon, UploadIcon } from './icons'

const ACCEPT = ['.xlsx', '.xls', '.csv']

interface Props {
  number: 1 | 2
  label: string
  file: LoadedFile | null
  onChange: (file: LoadedFile | null) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** One half of the upload area: a drop zone, or the file once it is added. */
export function FileDrop({ number, label, file, onChange }: Props) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(f: File | undefined) {
    if (!f) return
    setError(null)
    if (!ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setError('Please choose an .xlsx, .xls or .csv file.')
      return
    }
    setBusy(true)
    try {
      const data = await f.arrayBuffer()
      const sheets = listSheetNames(data)
      onChange({ name: f.name, size: f.size, sheets, data })
    } catch {
      setError("diffy couldn't read this file. Is it a valid Excel file?")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`drop drop-${number}`} aria-label={label}>
      <div className="drop-head">
        <span className="drop-title">
          <span className="drop-num">{number}</span>
          {label}
        </span>
        {file && (
          <span className="drop-ready">
            <CheckIcon size={16} />
            Ready
          </span>
        )}
      </div>

      {file ? (
        <div className="file-card">
          <span className="file-icon">
            <SheetIcon size={22} />
          </span>
          <span className="file-text">
            <span className="file-name" title={file.name}>
              {file.name}
            </span>
            <span className="file-meta">
              {formatSize(file.size)} · {file.sheets.length} {file.sheets.length === 1 ? 'sheet' : 'sheets'}
            </span>
          </span>
          <button type="button" className="icon-btn" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(null)}>
            <TrashIcon />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            load(e.dataTransfer.files[0])
          }}
        >
          <UploadIcon size={26} />
          <span className="dropzone-main">
            {busy ? 'Reading file…' : (
              <>
                Drop file here or <span className="link">browse</span>
              </>
            )}
          </span>
          <span className="dropzone-hint">.xlsx · .xls · .csv</span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT.join(',')}
            className="visually-hidden"
            onChange={(e) => {
              load(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      )}

      {error && (
        <p className="drop-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
