import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Type,
  MessageSquareText,
} from 'lucide-react'
import { stripFormatting } from './FormattedReview'

export interface RichReviewEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minHeight?: string
  disabled?: boolean
  maxLength?: number
}

type FontSizeChoice = 'normal' | 'small' | 'big'
type AlignmentChoice = 'left' | 'center' | 'justify'

export function RichReviewEditor({
  value,
  onChange,
  label = 'Resenha / O que achou?',
  placeholder = 'Conte o que achou da experiência, atuações, direção, reviravoltas...',
  minHeight = '120px',
  disabled = false,
  maxLength,
}: RichReviewEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isTypingRef = useRef(false)

  // Estados ativos para feedback visual nos botões da barra de ferramentas
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [currentAlign, setCurrentAlign] = useState<AlignmentChoice>('left')
  const [currentFontSize, setCurrentFontSize] = useState<FontSizeChoice>('normal')

  // Obtém o HTML sanitizado do editor ou vazio se for apenas espaço em branco
  const getCleanHtml = useCallback((): string => {
    if (!editorRef.current) return ''
    const html = editorRef.current.innerHTML
    const text = editorRef.current.innerText?.trim()
    if (!text && (!html || html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>')) {
      return ''
    }
    return html
  }, [])

  // Sincroniza o valor externo com o DOM do contentEditable (sem quebrar o cursor ao digitar)
  useEffect(() => {
    if (editorRef.current && !isTypingRef.current) {
      const incoming = value || ''
      if (editorRef.current.innerHTML !== incoming) {
        editorRef.current.innerHTML = incoming
      }
    }
  }, [value])

  // Atualiza estados ativos dos botões da barra conforme o cursor/seleção atual
  const updateActiveStates = useCallback(() => {
    if (!document) return
    try {
      setIsBold(document.queryCommandState('bold'))
      setIsItalic(document.queryCommandState('italic'))
      setIsUnderline(document.queryCommandState('underline'))

      if (document.queryCommandState('justifyCenter')) {
        setCurrentAlign('center')
      } else if (document.queryCommandState('justifyFull')) {
        setCurrentAlign('justify')
      } else {
        setCurrentAlign('left')
      }

      const fs = document.queryCommandValue('fontSize')
      if (fs === '2' || fs === '1') {
        setCurrentFontSize('small')
      } else if (fs === '5' || fs === '6' || fs === '7') {
        setCurrentFontSize('big')
      } else {
        setCurrentFontSize('normal')
      }
    } catch {
      // Ignora erros de seleção do navegador
    }
  }, [])

  const handleInput = () => {
    isTypingRef.current = true
    const clean = getCleanHtml()
    onChange(clean)
    updateActiveStates()
  }

  const handleBlur = () => {
    isTypingRef.current = false
    const clean = getCleanHtml()
    onChange(clean)
  }

  // Executa comando no contentEditable garantindo que o foco permaneça
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (disabled || !editorRef.current) return
    editorRef.current.focus()
    document.execCommand(cmd, false, val)
    handleInput()
  }

  // Ações de formatação
  const toggleBold = () => execCmd('bold')
  const toggleItalic = () => execCmd('italic')
  const toggleUnderline = () => execCmd('underline')

  const setAlign = (align: AlignmentChoice) => {
    if (align === 'center') {
      execCmd('justifyCenter')
    } else if (align === 'justify') {
      execCmd('justifyFull')
    } else {
      execCmd('justifyLeft')
    }
  }

  const setFontSize = (size: FontSizeChoice) => {
    let sizeParam = '3' // Normal (14px)
    if (size === 'small') sizeParam = '2' // Pequeno (12px)
    if (size === 'big') sizeParam = '5' // Grande (18px)

    execCmd('fontSize', sizeParam)
    setCurrentFontSize(size)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        toggleBold()
      } else if (key === 'i') {
        e.preventDefault()
        toggleItalic()
      } else if (key === 'u') {
        e.preventDefault()
        toggleUnderline()
      }
    }
  }

  const charCount = stripFormatting(value).length

  return (
    <div className="space-y-1.5">
      {/* Rótulo */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <MessageSquareText className="w-3.5 h-3.5 text-rose-400" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] text-slate-500">
          {charCount} {charCount === 1 ? 'caractere' : 'caracteres'}
          {maxLength ? ` / ${maxLength}` : ''}
        </span>
      </div>

      {/* Caixa do Editor com Barra de Ferramentas Integrada */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner focus-within:border-rose-500 transition-colors">
        {/* Barra de Ferramentas Superior */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900/90 border-b border-slate-800 select-none">
          {/* 1. Tamanho da Fonte (Limitado: Pequeno, Normal, Grande) */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              disabled={disabled}
              value={currentFontSize}
              onChange={(e) => setFontSize(e.target.value as FontSizeChoice)}
              title="Tamanho da fonte (limitado: Pequeno, Normal, Grande)"
              className="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="normal" className="bg-slate-900 text-white">
                Normal
              </option>
              <option value="small" className="bg-slate-900 text-white">
                Pequeno (12px)
              </option>
              <option value="big" className="bg-slate-900 text-white">
                Grande (18px)
              </option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

          {/* 2. Negrito, Itálico e Sublinhado */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleBold}
              title="Negrito (Ctrl+B)"
              className={`p-1.5 rounded transition cursor-pointer ${
                isBold
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleItalic}
              title="Itálico (Ctrl+I)"
              className={`p-1.5 rounded transition cursor-pointer ${
                isItalic
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleUnderline}
              title="Sublinhado (Ctrl+U)"
              className={`p-1.5 rounded transition cursor-pointer ${
                isUnderline
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

          {/* 3. Alinhamento de Texto (Esquerda, Centralizado, Justificado) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAlign('left')}
              title="Alinhar à esquerda"
              className={`p-1.5 rounded transition cursor-pointer ${
                currentAlign === 'left'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAlign('center')}
              title="Centralizado"
              className={`p-1.5 rounded transition cursor-pointer ${
                currentAlign === 'center'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAlign('justify')}
              title="Justificado"
              className={`p-1.5 rounded transition cursor-pointer ${
                currentAlign === 'justify'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Área de Escrita Visual WYSIWYG */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          style={{ minHeight }}
          className="review-editor-content p-3.5 text-xs text-white leading-relaxed overflow-y-auto max-h-64 cursor-text break-words"
        />
      </div>

      {/* Dica de Atalhos */}
      <p className="text-[11px] text-slate-500 px-1">
        Dica: Formate selecionando o texto ou com <kbd className="text-slate-400">Ctrl+B</kbd>,{' '}
        <kbd className="text-slate-400">Ctrl+I</kbd>, <kbd className="text-slate-400">Ctrl+U</kbd>. O texto já aparece com o resultado visual imediato.
      </p>
    </div>
  )
}
