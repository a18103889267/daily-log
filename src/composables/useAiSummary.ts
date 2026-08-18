import { ref } from 'vue'
import { getDeepseekErrorHint, isDeepseekBackend, streamDeepseekChat } from '../lib/deepseek'
import {
  buildFallbackSummary,
  buildSummaryPrompt,
  type SummaryStats,
} from '../types/summary'

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
      if (!isDeepseekBackend()) {
        throw new Error('当前仅支持 DeepSeek 总结，请将 VITE_AI_BACKEND 设为 deepseek')
      }

      const textStream = streamDeepseekChat(messages)

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
      error.value = `${getDeepseekErrorHint(err)}。已改用本地统计摘要。`
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
