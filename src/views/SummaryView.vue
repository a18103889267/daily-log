<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import MarkdownContent from '../components/MarkdownContent.vue'
import { useAuth } from '../composables/useAuth'
import { useAiSummary } from '../composables/useAiSummary'
import { useDailyLogs } from '../composables/useDailyLogs'
import { useGoals } from '../composables/useGoals'
import {
  buildSummaryStats,
  hasSummaryData,
  SUMMARY_PERIOD_LABELS,
  type SummaryPeriod,
  type SummaryStats,
} from '../types/summary'
import {
  formatMinutes,
  getCurrentMonthRange,
  getWeekRange,
  todayLocal,
} from '../utils/date'

const router = useRouter()
const { user } = useAuth()
const { fetchLogsInRange } = useDailyLogs()
const { fetchGoals } = useGoals()
const { loading, error, content, generateSummary } = useAiSummary()

const period = ref<SummaryPeriod>('monthly')
const stats = ref<SummaryStats | null>(null)
const resultPanelRef = ref<HTMLElement | null>(null)
const streamingBoxRef = ref<HTMLElement | null>(null)
const streamEndRef = ref<HTMLElement | null>(null)

const periodOptions = (Object.keys(SUMMARY_PERIOD_LABELS) as SummaryPeriod[]).map((key) => ({
  key,
  label: SUMMARY_PERIOD_LABELS[key],
}))

const rangeLabel = computed(() => {
  const today = todayLocal()
  if (period.value === 'daily') {
    return today
  }
  if (period.value === 'weekly') {
    const { start, end } = getWeekRange()
    return `${start} ~ ${end}`
  }
  const { start, end } = getCurrentMonthRange()
  return `${start} ~ ${end}`
})

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: '有记录', value: `${stats.value.loggedDays} 天`, tone: 'default' },
    { label: '阅读', value: `${stats.value.readingDays} 天 · ${formatMinutes(stats.value.readingMinutes)}`, tone: 'blue' },
    { label: '运动', value: `${stats.value.exerciseDays} 天 · ${formatMinutes(stats.value.exerciseMinutes)}`, tone: 'green' },
    { label: '学会技术', value: `${stats.value.technologies.length} 项`, tone: 'orange' },
  ]
})

const hasContent = computed(() => Boolean(content.value.trim()))
const isEmptyHint = computed(
  () => hasContent.value && content.value.startsWith('这个时间段还没有记录'),
)

function scrollToLatestContent() {
  void nextTick(() => {
    if (streamingBoxRef.value) {
      streamingBoxRef.value.scrollTop = streamingBoxRef.value.scrollHeight
    }
    streamEndRef.value?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  })
}

watch(content, () => {
  if (loading.value && content.value && !isEmptyHint.value) {
    scrollToLatestContent()
  }
})

function getRange(periodType: SummaryPeriod) {
  const today = todayLocal()
  if (periodType === 'daily') {
    return { start: today, end: today }
  }
  if (periodType === 'weekly') {
    return getWeekRange()
  }
  return getCurrentMonthRange()
}

async function handleGenerate() {
  if (!user.value?.uid) return

  const { start, end } = getRange(period.value)
  const [logs, goals] = await Promise.all([
    fetchLogsInRange(start, end, user.value.uid),
    fetchGoals(user.value.uid),
  ])

  const nextStats = buildSummaryStats(logs, goals, period.value, start, end, todayLocal())
  stats.value = nextStats

  if (!hasSummaryData(nextStats)) {
    content.value = '这个时间段还没有记录和目标数据。先去日历记一条，或到目标页添加目标吧。'
    error.value = null
    return
  }

  await nextTick()
  resultPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  await generateSummary(nextStats)

  await nextTick()
  scrollToLatestContent()
}
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <div class="toolbar">
        <div>
          <h1>AI 学习总结</h1>
          <p>基于日历记录与目标完成情况，生成可读性更好的 Markdown 报告。</p>
        </div>
        <button type="button" class="ghost" @click="router.push({ name: 'home' })">返回日历</button>
      </div>

      <section class="panel controls">
        <div class="period-tabs">
          <button
            v-for="item in periodOptions"
            :key="item.key"
            type="button"
            class="period-tab"
            :class="{ active: period === item.key }"
            @click="period = item.key"
          >
            {{ item.label }}
          </button>
        </div>

        <p class="range">
          <span class="range-label">统计区间</span>
          <span class="range-value">{{ rangeLabel }}</span>
        </p>

        <button type="button" class="primary generate-btn" :disabled="loading" @click="handleGenerate">
          <span v-if="loading" class="btn-spinner" />
          {{ loading ? 'AI 正在撰写总结...' : `生成${SUMMARY_PERIOD_LABELS[period]}` }}
        </button>
      </section>

      <section v-if="statCards.length" class="stats-grid">
        <article v-for="card in statCards" :key="card.label" class="stat-card" :data-tone="card.tone">
          <span class="stat-label">{{ card.label }}</span>
          <strong class="stat-value">{{ card.value }}</strong>
        </article>
      </section>

      <section
        v-if="loading || hasContent"
        ref="resultPanelRef"
        class="panel result-panel"
        :class="{ empty: isEmptyHint }"
      >
        <header class="result-header">
          <div>
            <h2>{{ SUMMARY_PERIOD_LABELS[period] }}报告</h2>
            <p v-if="!isEmptyHint">由 DeepSeek 根据你的真实记录整理</p>
          </div>
          <span v-if="loading" class="streaming-badge">生成中</span>
          <span v-else-if="!isEmptyHint" class="done-badge">已完成</span>
        </header>

        <div v-if="loading && !content" class="skeleton">
          <div class="skeleton-line wide" />
          <div class="skeleton-line" />
          <div class="skeleton-line" />
          <div class="skeleton-line medium" />
        </div>

        <div
          v-else-if="loading && content && !isEmptyHint"
          ref="streamingBoxRef"
          class="streaming-text"
        >
          {{ content }}<span class="stream-cursor" aria-hidden="true">▍</span>
          <div ref="streamEndRef" class="stream-end" aria-hidden="true" />
        </div>

        <MarkdownContent
          v-else-if="!loading && hasContent && !isEmptyHint"
          :content="content"
          class="summary-markdown"
        />
        <p v-else-if="hasContent" class="empty-text">{{ content }}</p>
      </section>

      <p v-if="error" class="error-hint">{{ error }}</p>

      <section class="tips">
        <h2>小提示</h2>
        <ul>
          <li>在日历里填写阅读/运动时长，总结会包含更准确的时间统计。</li>
          <li>AI 输出为 Markdown 格式，支持标题、列表、引用等排版。</li>
          <li>若 AI 不可用，会自动降级为本地统计摘要。</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(255, 102, 0, 0.08), transparent 35%),
    var(--bg);
}

.content {
  max-width: 820px;
  margin: 0 auto;
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar h1 {
  margin: 0 0 4px;
  font-size: 26px;
}

.toolbar p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.controls {
  display: grid;
  gap: 12px;
}

.period-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.period-tab,
.primary,
.ghost {
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  cursor: pointer;
}

.period-tab {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
}

.period-tab.active {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(255, 102, 0, 0.08);
  font-weight: 600;
}

.range {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
}

.range-label {
  color: var(--text-muted);
}

.range-value {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 13px;
}

.generate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary {
  border: none;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  font-weight: 600;
}

.primary:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 12px 0;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  box-shadow: var(--shadow);
}

.stat-card[data-tone='orange'] {
  border-color: rgba(255, 102, 0, 0.35);
  background: rgba(255, 102, 0, 0.05);
}

.stat-card[data-tone='blue'] {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.05);
}

.stat-card[data-tone='green'] {
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.05);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px;
  line-height: 1.4;
}

.result-panel {
  margin-top: 12px;
  padding: 20px;
}

.result-panel.empty {
  border-style: dashed;
}

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.result-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.result-header p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.streaming-badge,
.done-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.streaming-badge {
  color: #b45309;
  background: #fef3c7;
}

.done-badge {
  color: #047857;
  background: #d1fae5;
}

.summary-markdown {
  padding: 4px 2px 0;
}

.streaming-text {
  margin: 0;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
  line-height: 1.75;
  color: var(--text);
  max-height: 420px;
  overflow-y: auto;
}

.stream-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--primary);
  animation: blink 1s step-end infinite;
}

.stream-end {
  height: 1px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.empty-text {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.skeleton {
  display: grid;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

.skeleton-line.wide {
  width: 55%;
  height: 22px;
}

.skeleton-line.medium {
  width: 72%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.error-hint {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 14px;
}

.tips {
  margin-top: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.tips h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.tips ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .result-header {
    flex-direction: column;
  }
}
</style>
