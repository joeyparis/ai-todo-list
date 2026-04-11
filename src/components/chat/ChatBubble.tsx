'use client'
import React from 'react'

export interface ChatImage {
  url: string
  filename?: string
}

interface ChatBubbleProps {
  messageRole: 'user' | 'assistant'
  content: string
  images?: ChatImage[]
  isStreaming?: boolean
}

type ParsedNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'codeblock'; text: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'listitem'; text: string }
  | { type: 'br' }

function parseInline(text: string): ParsedNode[] {
  const nodes: ParsedNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[1]) nodes.push({ type: 'bold', text: match[2] })
    else if (match[3]) nodes.push({ type: 'italic', text: match[4] })
    else if (match[5]) nodes.push({ type: 'code', text: match[6] })
    else if (match[7]) nodes.push({ type: 'link', text: match[8], href: match[9] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return nodes
}

function renderInline(nodes: ParsedNode[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`
    switch (node.type) {
      case 'bold': return <strong key={key}>{node.text}</strong>
      case 'italic': return <em key={key}>{node.text}</em>
      case 'code': return <code key={key} className="bg-surface-200 dark:bg-surface-700 px-1 rounded font-mono text-sm">{node.text}</code>
      case 'link': return <a key={key} href={node.href} target="_blank" rel="noopener noreferrer" className="text-primary-500 dark:text-primary-400 underline">{node.text}</a>
      case 'br': return <br key={key} />
      default: return <React.Fragment key={key}>{node.text}</React.Fragment>
    }
  })
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-1">
      {blocks.map((block, blockIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const code = block.slice(3, -3).replace(/^[a-z]+\n/, '')
          return (
            <pre key={blockIdx} className="bg-surface-200 dark:bg-surface-700 p-3 rounded-lg overflow-x-auto font-mono text-sm my-2">
              <code>{code}</code>
            </pre>
          )
        }

        const lines = block.split('\n')
        const elements: React.ReactNode[] = []
        let listBuffer: React.ReactNode[] = []

        const flushList = () => {
          if (listBuffer.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="my-1 list-disc pl-4">{listBuffer}</ul>)
            listBuffer = []
          }
        }

        lines.forEach((line, lineIdx) => {
          if (line.startsWith('- ')) {
            const parsed = parseInline(line.slice(2))
            listBuffer.push(<li key={lineIdx}>{renderInline(parsed, `${blockIdx}-${lineIdx}`)}</li>)
          } else {
            flushList()
            if (line === '') {
              elements.push(<br key={`br-${blockIdx}-${lineIdx}`} />)
            } else {
              const parsed = parseInline(line)
              elements.push(<span key={`line-${blockIdx}-${lineIdx}`}>{renderInline(parsed, `${blockIdx}-${lineIdx}`)}</span>)
              if (lineIdx < lines.length - 1) {
                elements.push(<br key={`lbr-${blockIdx}-${lineIdx}`} />)
              }
            }
          }
        })
        flushList()

        return <React.Fragment key={blockIdx}>{elements}</React.Fragment>
      })}
    </div>
  )
}

export function ChatBubble({ messageRole, content, images, isStreaming }: ChatBubbleProps) {
  const isUser = messageRole === 'user'
  const hasImages = images && images.length > 0
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4 animate-slide-up`}>
      <div className="flex items-center gap-1 mb-1 px-1">
        {isUser ? (
          <>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">You</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">Assistant</span>
          </>
        )}
      </div>
      <div
        data-testid={isUser ? "chat-bubble-user" : "chat-bubble-assistant"}
        className={`
          max-w-[85%] px-4 py-2.5 rounded-2xl text-base break-words shadow-sm
          ${isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-sm'
          }
        `}
      >
        {hasImages && (
          <div className={`flex gap-2 flex-wrap ${content && content !== '[image]' ? 'mb-2' : ''}`}>
            {images.map(img => (
              <img
                key={img.url}
                src={img.url}
                alt={img.filename ?? 'Attached image'}
                className="max-h-48 max-w-full rounded-lg object-contain"
              />
            ))}
          </div>
        )}
        {isUser ? (
          content && content !== '[image]' ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : null
        ) : (
          <MarkdownRenderer content={content} />
        )}
        {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary-400 animate-pulse align-middle" />}
      </div>
    </div>
  )
}
