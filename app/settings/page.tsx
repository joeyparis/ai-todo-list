'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSettings } from '@/lib/db/hooks'
import { saveProviderConfig, setActiveProvider } from '@/lib/db/mutations'
import dynamic from 'next/dynamic'

const MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
  google: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
  openrouter: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-4-maverick:free', 'qwen/qwen3-235b-a22b:free', 'mistralai/mistral-small-3.1-24b-instruct:free'],
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

  

  const GoogleSignInButton = dynamic(
    () => import('@/components/GoogleSignInButton').then(mod => ({ default: mod.GoogleSignInButton })),
    { ssr: false }
  )

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

  const providers = Object.keys(PROVIDER_LABELS)

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link
          href="/"
          className="inline-block text-blue-600 text-base mb-6"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {providers.map(p => {
            const isActive = activeProvider === p
            return (
              <button
                type="button"
                key={p}
                onClick={() => handleSetActive(p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isActive
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
              <div className="border rounded-lg p-4 border-blue-500">
                <div className="font-semibold mb-2">{PROVIDER_LABELS[p]}</div>
                <p className="text-sm text-gray-500 mb-3">{PROVIDER_HINTS[p]}</p>

                <input
                  type="password"
                  value={cfg.apiKey}
                  onChange={(e) => handleChange(p, 'apiKey', e.target.value)}
                  onBlur={(e) => handleChange(p, 'apiKey', e.target.value)}
                  placeholder={keyPrefix?.example}
                  className="w-full border rounded px-3 py-2 mb-2"
                />

                <select
                  value={cfg.model}
                  onChange={(e) => handleChange(p, 'model', e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-2"
                >
                  {models.map(m => <option key={m}>{m}</option>)}
                </select>

                {KEY_URLS[p] && (
                  <a
                    href={KEY_URLS[p].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline block mb-2"
                  >
                    {KEY_URLS[p].label} →
                  </a>
                )}

                
              </div>
            )
          })()}

          {status[activeProvider] && (
            <p
              className={`text-base font-medium ${
                status[activeProvider] === 'Connected!'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {status[activeProvider]}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleTestConnection(activeProvider)}
            disabled={isTesting || !localConfigs[activeProvider]?.apiKey}
            className="w-full border border-blue-600 text-blue-600 rounded-lg text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: '48px' }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    </main>
  )
}
