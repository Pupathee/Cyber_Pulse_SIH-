import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { Upload, FileText } from 'lucide-react'

interface FileUploadProps {
  onFile: (file: File) => void
  label?: string
  hint?: string
  disabled?: boolean
}

export default function FileUpload({ onFile, label = 'Upload CSV', hint, disabled }: FileUploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [name, setName] = useState<string | null>(null)

  const handle = (file: File) => {
    setName(file.name)
    onFile(file)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handle(e.target.files[0])
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) handle(file)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200
        ${drag   ? 'border-cyber-cyan bg-cyber-cyan/10 scale-[1.01]' : 'border-cyber-cyan/20 bg-cyber-card hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />

      {name ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-cyber-cyan" />
          </div>
          <div className="text-sm font-semibold text-cyber-cyan">{name}</div>
          <div className="text-xs text-cyber-muted">Click or drop to replace</div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center">
            <Upload className="w-6 h-6 text-cyber-cyan" />
          </div>
          <div className="text-sm font-semibold text-cyber-text">{label}</div>
          {hint && <div className="text-xs text-cyber-muted text-center">{hint}</div>}
          <div className="text-xs text-cyber-muted/60">CSV files only</div>
        </>
      )}
    </div>
  )
}
