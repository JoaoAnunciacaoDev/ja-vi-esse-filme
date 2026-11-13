import { useEffect } from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  icon?: React.ReactNode
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Tem certeza?',
  description = 'Esta ação não poderá ser desfeita.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmModalProps) {
  // Fecha com a tecla ESC
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const isDanger = variant === 'danger'
  const isWarning = variant === 'warning'

  const defaultIcon = isDanger ? (
    <Trash2 className="w-6 h-6 text-rose-400" />
  ) : isWarning ? (
    <AlertTriangle className="w-6 h-6 text-amber-400" />
  ) : (
    <AlertTriangle className="w-6 h-6 text-cyan-400" />
  )

  const iconContainerBg = isDanger
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
    : isWarning
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'

  const confirmBtnBg = isDanger
    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
    : isWarning
    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isLoading) onClose()
        }}
      />

      {/* Caixa de Diálogo do Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 my-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Botão Fechar no canto superior */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/80 transition cursor-pointer disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Ícone contextual */}
          <div className={`p-3 rounded-2xl border shrink-0 ${iconContainerBg}`}>
            {icon || defaultIcon}
          </div>

          <div className="space-y-1.5 flex-1 pr-6">
            <h3 className="text-base font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-60 ${confirmBtnBg}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
