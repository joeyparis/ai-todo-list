'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSettings } from '@/lib/db/hooks'
import { saveProviderConfig, setActiveProvider } from '@/lib/db/mutations'
import { useTheme } from '@/components/ThemeScript'

const MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  openrouter: ['openai/gpt-oss-120b:free', 'qwen/qwen3.6-plus-preview:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-coder:free'],
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'gpt-4o': 'Most capable, best for complex tasks',
  'gpt-4o-mini': 'Fast, cost-effective for everyday tasks',
  'claude-sonnet-4-20250514': 'Excellent reasoning and coding capabilities',
  'claude-haiku-4-20250414': 'Lightning fast, great for quick responses',
  'gemini-2.5-flash': 'Fast and versatile for most tasks',
  'gemini-2.5-pro': 'Most capable Google model for complex reasoning',
  'gemini-2.5-flash-lite': 'Extremely fast and lightweight',
  'openai/gpt-oss-120b:free': 'Free open source model',
  'qwen/qwen3.6-plus-preview:free': 'Free preview of Qwen 3.6 Plus',
  'meta-llama/llama-3.3-70b-instruct:free': 'Free Llama 3.3 70B model',
  'qwen/qwen3-coder:free': 'Free coding-focused model',
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  openrouter: 'OpenRouter',
}

const KEY_URLS: Record<string, { url: string; label: string }> = {
  openai: { url: 'https://platform.openai.com/api-keys', label: 'Get your OpenAI API key' },
  anthropic: { url: 'https://console.anthropic.com/settings/keys', label: 'Get your Anthropic API key' },
  google: { url: 'https://aistudio.google.com/apikey', label: 'Get your Google AI Studio key' },
  openrouter: { url: 'https://openrouter.ai/keys', label: 'Get your OpenRouter API key' },
}

const KEY_PREFIXES: Record<string, { prefix: string; example: string }> = {
  openai: { prefix: 'sk-', example: 'sk-...' },
  anthropic: { prefix: 'sk-ant-', example: 'sk-ant-...' },
  google: { prefix: 'AI', example: 'AIza...' },
  openrouter: { prefix: 'sk-or-', example: 'sk-or-...' },
}

const PROVIDER_HINTS: Record<string, string> = {
  openai: 'Requires an OpenAI account with API credits. Free trial credits available for new accounts.',
  anthropic: 'Requires an Anthropic account with API credits.',
  google: 'Free tier available - 15 requests per minute through Google AI Studio.',
  openrouter: 'Free models available! Create an account and select a :free model below.',
}

interface TestConnectionResponse {
  success?: boolean
  error?: string
}

export default function SettingsPage() {
  const settings = useSettings()
  const [localConfigs, setLocalConfigs] = useState<Record<string, { apiKey: string; model: string }>>({})
  const [activeProvider, setActiveProviderState] = useState('openai')
  const [isTesting, setIsTesting] = useState(false)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail'>>({})
  const [savedIndicator, setSavedIndicator] = useState<Record<string, boolean>>({})
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    if (!settings) return
    setLocalConfigs(settings.providerConfigs || {})
    setActiveProviderState(settings.activeProvider || 'openai')
  }, [settings])

  async function handleSetActive(provider: string) {
    setActiveProviderState(provider)
    await setActiveProvider(provider)
  }

  async function handleChange(provider: string, field: 'apiKey' | 'model', value: string) {
    if (field === 'apiKey') {
      setTestResults(prev => {
        const next = { ...prev }
        delete next[provider]
        return next
      })
    }
    const existing = localConfigs[provider] || { apiKey: '', model: MODELS[provider][0] }
    const updated = { ...existing, [field]: value }
    const next = { ...localConfigs, [provider]: updated }
    setLocalConfigs(next)

    await saveProviderConfig(provider, updated)
    setSavedIndicator(prev => ({ ...prev, [provider]: true }))
    setTimeout(() => {
      setSavedIndicator(prev => ({ ...prev, [provider]: false }))
    }, 2000)
  }

  async function handleTestConnection(provider: string) {
    setIsTesting(true)
    setStatus(prev => ({ ...prev, [provider]: '' }))
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...localConfigs[provider] }),
      })
      const data = await res.json() as TestConnectionResponse
      if (res.ok && data.success) {
        setStatus(prev => ({ ...prev, [provider]: 'Connected!' }))
        setTestResults(prev => ({ ...prev, [provider]: 'pass' }))
      } else {
        setStatus(prev => ({ ...prev, [provider]: data.error ?? 'Connection failed' }))
        setTestResults(prev => ({ ...prev, [provider]: 'fail' }))
      }
    } catch {
      setStatus(prev => ({ ...prev, [provider]: 'Network error' }))
      setTestResults(prev => ({ ...prev, [provider]: 'fail' }))
    } finally {
      setIsTesting(false)
    }
  }

  const { toggle: toggleTheme } = useTheme()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const handleToggleTheme = () => {
    toggleTheme()
    setIsDark(d => !d)
  }

  const providers = Object.keys(PROVIDER_LABELS)

  return (
    <main className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-200">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mb-8 transition-colors touch-target"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Lists
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {providers.map(p => {
            const isActive = activeProvider === p
            return (
              <button
                type="button"
                key={p}
                onClick={() => handleSetActive(p)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap touch-target ${
                  isActive
                    ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-300 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 dark:bg-surface-900 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800'
                }`}
              >
                {testResults[p] === 'pass' && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                {testResults[p] === 'fail' && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                {PROVIDER_LABELS[p]}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-6">
          {(() => {
            const p = activeProvider
            const cfg = localConfigs[p] || { apiKey: '', model: MODELS[p][0] }
            const models = MODELS[p]
            const keyPrefix = KEY_PREFIXES[p]

            return (
              <div className="card p-5 md:p-6 border-primary-500 dark:border-primary-500 relative overflow-hidden">
                {savedIndicator[p] && (
                  <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-medium py-1 text-center animate-slide-down">
                    Settings saved
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3 mt-2">
                  <h2 className="text-lg font-semibold">{PROVIDER_LABELS[p]} Configuration</h2>
                </div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">{PROVIDER_HINTS[p]}</p>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={cfg.apiKey}
                      onChange={(e) => handleChange(p, 'apiKey', e.target.value)}
                      placeholder={keyPrefix?.example}
                      className="input-base w-full pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 touch-target"
                      data-testid="api-key-toggle"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {cfg.apiKey.length > 4 && keyPrefix && !cfg.apiKey.startsWith(keyPrefix.prefix) && !(p === 'google' && cfg.apiKey.startsWith('ya29.')) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      {PROVIDER_LABELS[p]} keys usually start with &quot;{keyPrefix.prefix}&quot;. Double-check your key.
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Model
                  </label>
                  <select
                    value={cfg.model}
                    onChange={(e) => handleChange(p, 'model', e.target.value)}
                    className="input-base w-full appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 12px center'
                    }}
                  >
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {MODEL_DESCRIPTIONS[cfg.model] && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                      {MODEL_DESCRIPTIONS[cfg.model]}
                    </p>
                  )}
                </div>

                {KEY_URLS[p] && (
                  <a
                    href={KEY_URLS[p].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline font-medium"
                  >
                    {KEY_URLS[p].label}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                )}
              </div>
            )
          })()}

          <div className="flex flex-col items-center gap-4 mt-2">
            <button
              type="button"
              onClick={() => handleTestConnection(activeProvider)}
              disabled={isTesting || !localConfigs[activeProvider]?.apiKey}
              className="btn-primary w-full py-3 text-base"
              data-testid="test-connection-btn"
            >
              {isTesting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Connection...
                </span>
              ) : 'Test Connection'}
            </button>

            {status[activeProvider] && (
              <div 
                className={`flex items-center gap-2 text-base font-medium p-3 rounded-lg w-full justify-center ${
                  status[activeProvider] === 'Connected!'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
                data-testid="connection-status"
              >
                {status[activeProvider] === 'Connected!' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-check-bounce">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                )}
                {status[activeProvider]}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}