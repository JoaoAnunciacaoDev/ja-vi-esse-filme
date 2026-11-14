import React, { useState, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Type,
  Pencil,
  Eye,
  MessageSquareText,
} from 'lucide-react'
import { FormattedReview, stripFormatting } from './FormattedReview'

export interface RichReviewEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
  maxLength?: number
}

type TabType = 'write' | 'preview'
type FontSizeChoice = 'normal' | 'small' | 'big'
type AlignmentChoice = 'left' | 'center' | 'justify'

export function RichReviewEditor({
  value,
  onChange,
  label = 'Resenha / O que achou?',
  placeholder = 'Conte o que achou da experiência, atuações, direção, reviravoltas...',
  rows = 4,
  disabled = false,
  maxLength,
}: RichReviewEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('write')
  const [fontSizeSelect, setFontSizeSelect] = useState<FontSizeChoice>('normal')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Aplica tags de estilo inline (Negrito, Itálico, Sublinhado)
  const applyInlineTag = (tag: 'b' | 'i' | 'u') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)

    const openTag = `<${tag}>`
    const closeTag = `</${tag}>`

    let newText = ''
    let newSelectionStart = start
    let newSelectionEnd = end

    if (selectedText.length > 0) {
      if (selectedText.startsWith(openTag) && selectedText.endsWith(closeTag)) {
        // Remove tag se já estiver envolto
        const inner = selectedText.slice(openTag.length, -closeTag.length)
        newText = text.substring(0, start) + inner + text.substring(end)
        newSelectionStart = start
        newSelectionEnd = start + inner.length
      } else {
        // Envolve seleção na tag
        const wrapped = `${openTag}${selectedText}${closeTag}`
        newText = text.substring(0, start) + wrapped + text.substring(end)
        newSelectionStart = start
        newSelectionEnd = start + wrapped.length
      }
    } else {
      // Nenhum texto selecionado: insere tag com placeholder selecionado
      const placeholderMap: Record<string, string> = {
        b: 'negrito',
        i: 'itálico',
        u: 'sublinhado',
      }
      const ph = placeholderMap[tag] || tag
      const inserted = `${openTag}${ph}${closeTag}`
      newText = text.substring(0, start) + inserted + text.substring(end)
      newSelectionStart = start + openTag.length
      newSelectionEnd = newSelectionStart + ph.length
    }

    onChange(newText)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd)
      }
    }, 0)
  }

  // Aplica tamanho de fonte limitado (Pequeno, Normal, Grande)
  const applyFontSize = (size: FontSizeChoice) => {
    setFontSizeSelect(size)
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)

    let newText = ''
    let newSelectionStart = start
    let newSelectionEnd = end

    if (size === 'normal') {
      // Remove tags <small> ou <big> se existirem na seleção
      let inner = selectedText
      if (inner.startsWith('<small>') && inner.endsWith('</small>')) {
        inner = inner.slice(7, -8)
      } else if (inner.startsWith('<big>') && inner.endsWith('</big>')) {
        inner = inner.slice(5, -6)
      }
      newText = text.substring(0, start) + inner + text.substring(end)
      newSelectionStart = start
      newSelectionEnd = start + inner.length
    } else {
      const openTag = `<${size}>`
      const closeTag = `</${size}>`

      if (selectedText.length > 0) {
        let inner = selectedText
        if (inner.startsWith('<small>') && inner.endsWith('</small>')) inner = inner.slice(7, -8)
        if (inner.startsWith('<big>') && inner.endsWith('</big>')) inner = inner.slice(5, -6)

        const wrapped = `${openTag}${inner}${closeTag}`
        newText = text.substring(0, start) + wrapped + text.substring(end)
        newSelectionStart = start
        newSelectionEnd = start + wrapped.length
      } else {
        const ph = size === 'small' ? 'texto pequeno' : 'texto grande'
        const inserted = `${openTag}${ph}${closeTag}`
        newText = text.substring(0, start) + inserted + text.substring(end)
        newSelectionStart = start + openTag.length
        newSelectionEnd = newSelectionStart + ph.length
      }
    }

    onChange(newText)

    // Restaura visualmente o seletor para 'normal' para permitir seleções subsequentes
    setTimeout(() => {
      setFontSizeSelect('normal')
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd)
      }
    }, 0)
  }

  // Aplica alinhamento de texto (Esquerda, Centralizado, Justificado)
  const applyAlignment = (align: AlignmentChoice) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)

    const openTag = `<div align="${align}">`
    const closeTag = `</div>`

    // Remove tags de alinhamento existentes em volta
    const stripAlign = (str: string) =>
      str.replace(/^<div align="(?:left|center|justify)">([\s\S]*)<\/div>$/, '$1')

    let newText = ''
    let newSelectionStart = start
    let newSelectionEnd = end

    if (selectedText.length > 0) {
      const inner = stripAlign(selectedText)
      const wrapped = `${openTag}${inner}${closeTag}`
      newText = text.substring(0, start) + wrapped + text.substring(end)
      newSelectionStart = start
      newSelectionEnd = start + wrapped.length
    } else if (text.trim().length > 0) {
      // Se não há texto selecionado, envolve o parágrafo ou linha atual do cursor
      const before = text.substring(0, start)
      const after = text.substring(start)

      const lineStart = before.lastIndexOf('\n') + 1
      const lineEndOffset = after.indexOf('\n')
      const lineEnd = lineEndOffset === -1 ? text.length : start + lineEndOffset

      const lineText = text.substring(lineStart, lineEnd)
      const inner = stripAlign(lineText)
      const wrapped = `${openTag}${inner}${closeTag}`

      newText = text.substring(0, lineStart) + wrapped + text.substring(lineEnd)
      newSelectionStart = lineStart
      newSelectionEnd = lineStart + wrapped.length
    } else {
      // Textarea vazia: insere exemplo de texto alinhado
      const phMap: Record<AlignmentChoice, string> = {
        left: 'Texto alinhado à esquerda',
        center: 'Texto centralizado',
        justify: 'Texto justificado',
      }
      const ph = phMap[align]
      const inserted = `${openTag}${ph}${closeTag}`
      newText = inserted
      newSelectionStart = openTag.length
      newSelectionEnd = newSelectionStart + ph.length
    }

    onChange(newText)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newSelectionStart, newSelectionEnd)
      }
    }, 0)
  }

  // Atalhos de teclado comuns (Ctrl+B, Ctrl+I, Ctrl+U)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        applyInlineTag('b')
      } else if (key === 'i') {
        e.preventDefault()
        applyInlineTag('i')
      } else if (key === 'u') {
        e.preventDefault()
        applyInlineTag('u')
      }
    }
  }

  const charCount = stripFormatting(value).length

  return (
    <div className="space-y-2">
      {/* Cabeçalho com Rótulo e Abas Alternadoras */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <MessageSquareText className="w-3.5 h-3.5 text-rose-400" />
          <span>{label}</span>
        </label>

        {/* Abas: Escrever vs Pré-visualizar */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              activeTab === 'write'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Pencil className="w-3 h-3" />
            <span>Escrever</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Visualizar</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Escrever */}
      {activeTab === 'write' ? (
        <div className="space-y-1.5">
          {/* Barra de Ferramentas de Formatação */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/90 border border-slate-800 rounded-xl shadow-inner">
            {/* 1. Tamanho da Fonte (Limitado) */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
              <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                disabled={disabled}
                value={fontSizeSelect}
                onChange={(e) => applyFontSize(e.target.value as FontSizeChoice)}
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
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyInlineTag('b')}
                title="Negrito (Ctrl+B)"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyInlineTag('i')}
                title="Itálico (Ctrl+I)"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyInlineTag('u')}
                title="Sublinhado (Ctrl+U)"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

            {/* 3. Alinhamento de Texto (Esquerda, Centralizado, Justificado) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAlignment('left')}
                title="Alinhar à esquerda"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAlignment('center')}
                title="Centralizado"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => applyAlignment('justify')}
                title="Justificado"
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Área de Texto */}
          <textarea
            ref={textareaRef}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition resize-none leading-relaxed"
          />

          {/* Dica de Atalhos e Contador */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              Atalhos: <kbd className="text-slate-400">Ctrl+B</kbd> (negrito),{' '}
              <kbd className="text-slate-400">Ctrl+I</kbd> (itálico),{' '}
              <kbd className="text-slate-400">Ctrl+U</kbd> (sublinhado)
            </span>
            <span>
              {charCount} {charCount === 1 ? 'caractere' : 'caracteres'}
              {maxLength ? ` / ${maxLength}` : ''}
            </span>
          </div>
        </div>
      ) : (
        /* Conteúdo da Aba Pré-visualizar */
        <div className="space-y-1.5">
          <div className="w-full min-h-[140px] bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 overflow-y-auto max-h-60 leading-relaxed">
            {value.trim().length > 0 ? (
              <FormattedReview content={value} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center space-y-2">
                <Eye className="w-6 h-6 text-slate-600 stroke-1" />
                <p className="text-xs italic">
                  Nenhuma avaliação escrita ainda. Use a aba <strong>Escrever</strong> ao lado para redigir e formatar suas impressões.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Pré-visualização do resultado final formatado</span>
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Voltar para Escrever
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
