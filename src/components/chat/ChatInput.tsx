'use client'
import { useState, useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react'

export interface PendingImage {
  id: string
  url: string
  mediaType: string
  filename?: string
}

interface ChatInputProps {
  onSend: (message: string, images?: PendingImage[]) => void
  disabled?: boolean
  placeholder?: string
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ChatInput({ onSend, disabled, placeholder = 'Brain dump your tasks...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newImages: PendingImage[] = await Promise.all(
      imageFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        url: await fileToDataURL(file),
        mediaType: file.type,
        filename: file.name,
      }))
    )

    setImages(prev => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || disabled) return
    onSend(trimmed, images.length > 0 ? images : undefined)
    setValue('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      addFiles(imageFiles)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const hasContent = value.trim() || images.length > 0

  return (
    <div className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0 sticky bottom-0">
      {images.length > 0 && (
        <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto scrollbar-hide">
          {images.map(img => (
            <div key={img.id} className="relative flex-shrink-0 group">
              <img
                src={img.url}
                alt={img.filename ?? 'Attached image'}
                className="h-16 w-16 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-700 dark:bg-surface-300 text-white dark:text-surface-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                aria-label="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          aria-label="Attach images"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 w-12 h-12 rounded-full text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          aria-label="Attach image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="input-base flex-1 resize-none px-4 py-3 text-base overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '48px', maxHeight: '128px' }}
        />
        <button
          type="button"
          data-testid="chat-send-button"
          onClick={handleSend}
          disabled={disabled || !hasContent}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        </button>
      </div>
    </div>
  )
}
