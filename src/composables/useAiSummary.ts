import { ref } from 'vue'
import { getCloudBaseErrorMessage } from '../lib/cloudbase'
import { isDeepseekBackend, streamDeepseekChat } from '../lib/deepseek'
import {
  buildFallbackSummary,
  buildSummaryPrompt,
  type SummaryStats,
} from '../types/summary'

const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER?.trim() || 'cloudbase'
const AI_MODEL = import.meta.env.VITE_AI_MODEL?.trim() || 'deepseek-v4-flash'

type AiModel = {
  streamText: (params: {
    model: string
    messages: Array<{ role: string; content: string }>
  }) => Promise<{ textStream: AsyncIterable<string> }>
}

async function streamCloudbaseSummary(messages: Array<{ role: string; content: string }>) {
  const { app } = await import('../lib/cloudbase')
  const ai = (app as { ai?: () => { createModel: (provider: string) => AiModel } }).ai?.()
  if (!ai) {
    throw new Error('CloudBase AI 未启用')
  }

  const model = ai.createModel(AI_PROVIDER)
  const streamResult = await model.streamText({
    model: AI_MODEL,
    messages,
  })

  return streamResult.textStream
}

export function useAiSummary() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const content = ref('')

  async function generateSummary(stats: SummaryStats, onChunk?: (chunk: string) => void) {
    loading.value = true
    error.value = null
    content.value = ''

    const prompt = buildSummaryPrompt(stats)
    const messages = [{ role: 'user', content: prompt }]

    try {
      const textStream = isDeepseekBackend()
        ? streamDeepseekChat(messages)
        : streamCloudbaseSummary(messages)

      let fullText = ''
      for await (const chunk of textStream) {
        fullText += chunk
        content.value = fullText
        onChunk?.(chunk)
      }

      if (!fullText.trim()) {
        throw new Error('AI 未返回内容')
      }

      return fullText
    } catch (err) {
      const message = getCloudBaseErrorMessage(err, 'AI 总结失败')
      error.value = `${message}。已改用本地统计摘要。`
      const fallback = buildFallbackSummary(stats)
      content.value = fallback
      return fallback
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    content,
    generateSummary,
  }
}
