import { app, getCloudBaseErrorMessage } from './cloudbase'

const DEEPSEEK_MODEL = import.meta.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
const DEEPSEEK_FUNCTION = import.meta.env.VITE_DEEPSEEK_FUNCTION?.trim() || 'deepseek-chat'
const DEEPSEEK_API_BASE = '/api/deepseek'

type ChatMessage = {
  role: string
  content: string
}

type DeepseekFunctionResult = {
  ok: boolean
  content?: string
  error?: string
}

function parseSseChunk(line: string): string {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return ''

  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return ''

  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>
    }
    return json.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}

async function* streamDeepseekViaProxy(messages: ChatMessage[]) {
  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `DeepSeek 请求失败 (${response.status})`)
  }

  if (!response.body) {
    throw new Error('DeepSeek 未返回流式数据')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const text = parseSseChunk(line)
      if (text) yield text
    }
  }

  if (buffer.trim()) {
    const text = parseSseChunk(buffer)
    if (text) yield text
  }
}

async function* streamDeepseekViaCloudFunction(messages: ChatMessage[]) {
  if (!app.callFunction) {
    throw new Error('CloudBase 云函数 SDK 未加载')
  }

  const response = await app.callFunction<DeepseekFunctionResult>({
    name: DEEPSEEK_FUNCTION,
    data: {
      messages,
      model: DEEPSEEK_MODEL,
    },
  })

  const result = response.result
  if (!result?.ok) {
    throw new Error(result?.error || '云函数调用失败')
  }

  const content = result.content?.trim()
  if (!content) {
    throw new Error('AI 未返回内容')
  }

  yield content
}

export async function* streamDeepseekChat(messages: ChatMessage[]) {
  if (import.meta.env.DEV) {
    yield* streamDeepseekViaProxy(messages)
    return
  }

  yield* streamDeepseekViaCloudFunction(messages)
}

export function isDeepseekBackend() {
  const backend = import.meta.env.VITE_AI_BACKEND?.trim()
  return backend !== 'cloudbase'
}

export function getDeepseekErrorHint(error: unknown) {
  const message = getCloudBaseErrorMessage(error, 'AI 总结失败')
  if (!import.meta.env.PROD) return message

  if (message.includes('DEEPSEEK_API_KEY')) {
    return `${message}。请在 CloudBase 控制台 → 云函数 → deepseek-chat → 环境变量中配置 DEEPSEEK_API_KEY。`
  }

  return message
}
