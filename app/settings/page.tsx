'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSettings } from '@/lib/db/hooks'
import { saveSettings } from '@/lib/db/mutations'

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
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(MODELS['openai'][0] ?? '')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (settings && !loaded) {
      setProvider(settings.provider || 'openai')
      setApiKey(settings.apiKey || '')
      setModel(settings.model || (MODELS['openai'][0] ?? ''))
      setLoaded(true)
    }
  }, [settings, loaded])

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider)
    const models = MODELS[newProvider] ?? []
    if (!models.includes(model)) {
      setModel(models[0] ?? '')
    }
  }

  async function handleSave() {
    await saveSettings({ provider, apiKey, model })
    setStatus('Saved!')
    setTimeout(() => setStatus(''), 3000)
  }

  async function handleTestConnection() {
    setIsTesting(true)
    setStatus('')
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      })
      const data = await res.json() as TestConnectionResponse
      if (res.ok && data.success) {
        setStatus('Connected!')
      } else {
        setStatus(data.error ?? 'Connection failed')
      }
    } catch {
      setStatus('Network error')
    } finally {
      setIsTesting(false)
    }
  }

  const models = MODELS[provider] ?? []
  const keyPrefix = KEY_PREFIXES[provider]

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

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="provider" className="text-base font-medium">
              Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 text-base bg-white"
              style={{ height: '48px' }}
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {PROVIDER_HINTS[provider] && (
              <p className="text-sm text-gray-500">
                {PROVIDER_HINTS[provider]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="apiKey" className="text-base font-medium">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="flex-1 border border-gray-300 rounded-lg px-4 text-base"
                style={{ height: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="px-4 border border-gray-300 rounded-lg text-base bg-white"
                style={{ minWidth: '72px', height: '48px' }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            {apiKey.length > 4 && keyPrefix && !apiKey.startsWith(keyPrefix.prefix) && (
              <p className="text-xs text-amber-600 mt-1">
                {PROVIDER_LABELS[provider]} keys usually start with &quot;{keyPrefix.prefix}&quot;. Double-check your key.
              </p>
            )}

            {KEY_URLS[provider] && (
              <a
                href={KEY_URLS[provider].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                {KEY_URLS[provider].label} →
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="model" className="text-base font-medium">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 text-base bg-white"
              style={{ height: '48px' }}
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {status && (
            <p
              className={`text-base font-medium ${
                status === 'Saved!' || status === 'Connected!'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {status}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="w-full bg-blue-600 text-white rounded-lg text-base font-medium"
              style={{ height: '48px' }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
              className="w-full border border-blue-600 text-blue-600 rounded-lg text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: '48px' }}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
