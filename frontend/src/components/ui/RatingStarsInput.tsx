import { useState } from 'react'
import { Star, X } from 'lucide-react'

export interface RatingStarsInputProps {
  value?: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showQuickPills?: boolean
  label?: string
}

const ALLOWED_VALUES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export function RatingStarsInput({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showQuickPills = false,
  label,
}: RatingStarsInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const isRated = value !== null && value !== undefined
  const displayValue = hoverValue !== null ? hoverValue : isRated ? value : null

  const starSizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold">{label}</span>
          <span className="font-mono text-[11px] font-bold text-amber-400">
            {isRated ? `${value.toFixed(1)} / 5.0` : 'Sem avaliação'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Botão Nota Zero Explícita */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(0)}
          onMouseEnter={() => !disabled && setHoverValue(0)}
          onMouseLeave={() => setHoverValue(null)}
          title="Atribuir nota 0.0"
          className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer border ${
            isRated && value === 0
              ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
          }`}
        >
          0.0
        </button>

        {/* 5 Estrelas com suporte a meia estrela interativa */}
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHoverValue(null)}
        >
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const starValue = starIndex
            const halfValue = starIndex - 0.5

            const isHalfActive =
              displayValue !== null &&
              displayValue >= halfValue &&
              displayValue < starValue
            const isFullActive = displayValue !== null && displayValue >= starValue

            return (
              <div key={starIndex} className="relative flex items-center">
                {/* Metade Esquerda (0.5) */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(halfValue)}
                  onMouseEnter={() => !disabled && setHoverValue(halfValue)}
                  title={`Nota ${halfValue.toFixed(1)}`}
                  className="absolute left-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Avaliar com ${halfValue.toFixed(1)} estrelas`}
                />

                {/* Metade Direita (Inteiro) */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(starValue)}
                  onMouseEnter={() => !disabled && setHoverValue(starValue)}
                  title={`Nota ${starValue.toFixed(1)}`}
                  className="absolute right-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Avaliar com ${starValue.toFixed(1)} estrelas`}
                />

                {/* Visualização da Estrela (Vazia / Meia / Cheia) */}
                <div className="relative pointer-events-none">
                  {/* Estrela de fundo vazia */}
                  <Star className={`${starSizeClass} text-slate-700 stroke-1 fill-slate-900`} />

                  {/* Meia estrela preenchida */}
                  {isHalfActive && (
                    <div className="absolute inset-0 overflow-hidden w-1/2 pointer-events-none">
                      <Star
                        className={`${starSizeClass} text-amber-400 fill-amber-400`}
                      />
                    </div>
                  )}

                  {/* Estrela inteira preenchida */}
                  {isFullActive && (
                    <Star
                      className={`absolute inset-0 ${starSizeClass} text-amber-400 fill-amber-400 pointer-events-none`}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Indicador de Nota Atual */}
        {!label && (
          <span className="font-mono text-xs font-bold text-amber-400 min-w-[3.5rem]">
            {isRated ? `${value.toFixed(1)} ★` : '—'}
          </span>
        )}

        {/* Botão para Limpar Avaliação */}
        {isRated && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Remover avaliação"
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            aria-label="Limpar avaliação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pílulas de seleção rápida opcionais para facilitar no mobile */}
      {showQuickPills && !disabled && (
        <div className="flex flex-wrap gap-1 pt-1">
          {ALLOWED_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                isRated && value === v
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {v.toFixed(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
