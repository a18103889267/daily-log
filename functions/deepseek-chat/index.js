const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY?.trim()
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'

function fail(error) {
  return { ok: false, error }
}

function parseSseChunk(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return ''

  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return ''

  try {
    const json = JSON.parse(payload)
    return json.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}

async function readDeepseekStream(response) {
  if (!response.body?.getReader) {
    const json = await response.json()
    return json.choices?.[0]?.message?.content ?? ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      fullText += parseSseChunk(line)
    }
  }

  if (buffer.trim()) {
    fullText += parseSseChunk(buffer)
  }

  return fullText
}

exports.main = async (event) => {
  if (!DEEPSEEK_API_KEY) {
    return fail('云函数未配置 DEEPSEEK_API_KEY，请在控制台为 deepseek-chat 添加环境变量')
  }

  const messages = event?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return fail('缺少 messages 参数')
  }

  const model = event?.model?.trim() || DEFAULT_MODEL

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return fail(detail || `DeepSeek 请求失败 (${response.status})`)
    }

    const content = (await readDeepseekStream(response)).trim()
    if (!content) {
      return fail('AI 未返回内容')
    }

    return { ok: true, content }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DeepSeek 调用失败'
    return fail(message)
  }
}
