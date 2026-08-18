const DEEPSEEK_MODEL = import.meta.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat'
const DEEPSEEK_API_BASE = '/api/deepseek'

type ChatMessage = {
  role: string
  content: string
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

export async function* streamDeepseekChat(messages: ChatMessage[]) {
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

export function isDeepseekBackend() {
  return (import.meta.env.VITE_AI_BACKEND?.trim() || 'deepseek') === 'deepseek'
}
