export interface List {
  id: string
  name: string
  goal?: string
  createdAt: Date
  updatedAt: Date
}

export interface Item {
  id: string
  listId: string
  text: string
  completed: boolean
  completedAt?: Date
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  order: number
}

export interface Message {
  id: string
  listId: string
  role: 'user' | 'assistant'
  content: string
  parts?: string  // JSON-serialized UIMessage.parts array from AI SDK
  createdAt: Date
}

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface Settings {
  id: string  // always 'settings'
  activeProvider: string
  providerConfigs: Record<string, ProviderConfig>
  inferMetadata?: boolean
}
