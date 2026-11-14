import React, { useMemo } from 'react'

export interface FormattedReviewProps {
  content?: string
  className?: string
  clampLines?: number
}

/**
 * Remove tags HTML e formatações para contagem de caracteres e resumos de texto puro.
 */
export function stripFormatting(html?: string): string {
  if (!html) return ''
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return doc.body.textContent?.trim() || ''
    } catch {
      // fallback
    }
  }
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Converte string com formatações suportadas (tamanho, negrito, itálico, sublinhado e alinhamento)
 * em elementos React seguros contra XSS.
 */
function parseReviewToReact(content: string): React.ReactNode {
  if (!content) return null

  // Pré-processamento: suporta também Markdown **negrito** e *itálico*
  const processed = content
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
    .replace(/\r\n|\r|\n/g, '<br>')

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return <span className="whitespace-pre-wrap">{content}</span>
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(processed, 'text/html')

    const parseNode = (node: Node, key: string | number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tag = el.tagName.toUpperCase()
        const children = Array.from(el.childNodes).map((child, i) =>
          parseNode(child, `${key}-${i}`)
        )

        if (tag === 'BR') {
          return <br key={key} />
        }

        if (tag === 'B' || tag === 'STRONG') {
          return (
            <strong key={key} className="font-bold text-white">
              {children}
            </strong>
          )
        }

        if (tag === 'I' || tag === 'EM') {
          return (
            <em key={key} className="italic text-slate-200">
              {children}
            </em>
          )
        }

        if (tag === 'U' || tag === 'INS') {
          return (
            <span
              key={key}
              className="underline decoration-slate-400 underline-offset-2"
            >
              {children}
            </span>
          )
        }

        if (tag === 'SMALL') {
          return (
            <span key={key} className="text-[11px] text-slate-400 leading-tight">
              {children}
            </span>
          )
        }

        if (tag === 'BIG') {
          return (
            <span key={key} className="text-base font-semibold text-white leading-snug">
              {children}
            </span>
          )
        }

        if (tag === 'SPAN' || tag === 'FONT') {
          const fontSize = el.style.fontSize?.toLowerCase() || ''
          const sizeAttr = el.getAttribute('size') || ''
          if (
            fontSize.includes('11px') ||
            fontSize.includes('12px') ||
            fontSize.includes('small') ||
            sizeAttr === '1' ||
            sizeAttr === '2'
          ) {
            return (
              <span key={key} className="text-[11px] text-slate-400 leading-tight">
                {children}
              </span>
            )
          }
          if (
            fontSize.includes('16px') ||
            fontSize.includes('18px') ||
            fontSize.includes('large') ||
            fontSize.includes('big') ||
            sizeAttr === '4' ||
            sizeAttr === '5' ||
            sizeAttr === '6'
          ) {
            return (
              <span key={key} className="text-base font-semibold text-white leading-snug">
                {children}
              </span>
            )
          }
          return <span key={key}>{children}</span>
        }

        if (tag === 'DIV' || tag === 'P' || tag === 'CENTER') {
          const rawAlign = (
            el.getAttribute('align') ||
            el.style.textAlign ||
            (tag === 'CENTER' ? 'center' : '')
          ).toLowerCase()

          let alignClass = 'text-left'
          if (rawAlign === 'center') {
            alignClass = 'text-center'
          } else if (rawAlign === 'justify') {
            alignClass = 'text-justify'
          } else if (rawAlign === 'right') {
            alignClass = 'text-right'
          }

          return (
            <div key={key} className={`${alignClass} w-full my-0.5`}>
              {children}
            </div>
          )
        }

        // Para qualquer outra tag desconhecida, renderiza apenas seus filhos sanitizados
        return <span key={key}>{children}</span>
      }

      return null
    }

    return Array.from(doc.body.childNodes).map((child, i) => parseNode(child, i))
  } catch {
    return <span className="whitespace-pre-wrap">{content}</span>
  }
}

export function FormattedReview({
  content,
  className = '',
  clampLines,
}: FormattedReviewProps) {
  const parsedNodes = useMemo(() => {
    if (!content) return null
    return parseReviewToReact(content)
  }, [content])

  if (!content) return null

  const clampStyle: React.CSSProperties = clampLines
    ? {
        display: '-webkit-box',
        WebkitLineClamp: clampLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }
    : {}

  return (
    <div className={`break-words ${className}`} style={clampStyle}>
      {parsedNodes}
    </div>
  )
}
