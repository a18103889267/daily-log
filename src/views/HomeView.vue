<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useDailyLogs } from '../composables/useDailyLogs'

const router = useRouter()
const { fetchDatesInMonth } = useDailyLogs()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const markedDates = ref<string[]>([])
const loading = ref(false)

const monthLabel = computed(() => `${currentYear.value} 年 ${currentMonth.value} 月`)

const calendarCells = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const daysInMonth = new Date(currentYear.value, currentMonth.value, 0).getDate()
  const startWeekday = firstDay.getDay()
  const cells: Array<{ date: string | null; day: number | null }> = []

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ date: null, day: null })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, day })
  }

  return cells
})

async function loadMonth() {
  loading.value = true
  try {
    markedDates.value = await fetchDatesInMonth(currentYear.value, currentMonth.value)
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
}

function openDay(date: string) {
  void router.push({ name: 'day', params: { date } })
}

function hasLog(date: string) {
  return markedDates.value.includes(date)
}

watch([currentYear, currentMonth], () => {
  void loadMonth()
})

onMounted(() => {
  void loadMonth()
})
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <section class="hero">
        <div>
          <h1>我的每日记录</h1>
          <p>点击日期查看或编辑当天内容，橙色圆点表示已有记录。</p>
        </div>
        <button type="button" class="primary" @click="openDay(new Date().toISOString().slice(0, 10))">
          记录今天
        </button>
      </section>

      <section class="calendar-card">
        <div class="calendar-toolbar">
          <button type="button" class="ghost" @click="prevMonth">上个月</button>
          <h2>{{ monthLabel }}</h2>
          <button type="button" class="ghost" @click="nextMonth">下个月</button>
        </div>

        <div class="weekdays">
          <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
        </div>

        <div class="calendar-grid">
          <button
            v-for="(cell, index) in calendarCells"
            :key="`${cell.date ?? 'empty'}-${index}`"
            type="button"
            class="day-cell"
            :class="{ empty: !cell.date, marked: cell.date && hasLog(cell.date) }"
            :disabled="!cell.date"
            @click="cell.date && openDay(cell.date)"
          >
            <span>{{ cell.day }}</span>
          </button>
        </div>

        <p v-if="loading" class="status">加载中...</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.content {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.hero p {
  margin: 0;
  color: var(--text-muted);
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 10px 16px;
  font: inherit;
  cursor: pointer;
}

.primary {
  border: none;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}

.ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.calendar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.calendar-toolbar h2 {
  margin: 0;
  font-size: 20px;
}

.weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.weekdays {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.day-cell {
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  position: relative;
}

.day-cell.empty {
  visibility: hidden;
}

.day-cell.marked::after {
  content: '';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.status {
  margin-top: 16px;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
