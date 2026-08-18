<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useAuth } from '../composables/useAuth'
import { useDailyLogs } from '../composables/useDailyLogs'
import { useGoals } from '../composables/useGoals'
import { todayLocal } from '../utils/date'

const router = useRouter()
const { user } = useAuth()
const { fetchDatesInMonth } = useDailyLogs()
const { fetchGoals, getOverdueGoals } = useGoals()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const markedDates = ref<string[]>([])
const overdueGoals = ref<Array<{ id: number; title: string }>>([])
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

  while (cells.length < 42) {
    cells.push({ date: null, day: null })
  }

  return cells
})

async function loadMonth() {
  if (!user.value?.uid) return

  loading.value = true
  try {
    markedDates.value = await fetchDatesInMonth(
      currentYear.value,
      currentMonth.value,
      user.value.uid,
    )
  } finally {
    loading.value = false
  }
}

async function loadOverdueGoals() {
  if (!user.value?.uid) return

  const goals = await fetchGoals(user.value.uid)
  overdueGoals.value = getOverdueGoals(goals).map((goal) => ({
    id: goal.id,
    title: goal.title,
  }))
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

function isToday(date: string | null) {
  if (!date) return false
  return date === todayLocal()
}

function openGoals() {
  void router.push({ name: 'goals' })
}

watch([currentYear, currentMonth], () => {
  void loadMonth()
})

onMounted(() => {
  void loadMonth()
  void loadOverdueGoals()
})
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <section class="hero">
        <div class="hero-text">
          <h1>我的每日记录</h1>
          <p>橙色圆点表示已有记录</p>
        </div>
        <button type="button" class="primary" @click="openDay(todayLocal())">
          记录今天
        </button>
      </section>

      <button v-if="overdueGoals.length > 0" type="button" class="overdue-banner" @click="openGoals">
        <strong>{{ overdueGoals.length }} 个目标已到期</strong>
        <span>{{ overdueGoals[0]?.title }} 等未完成，点击查看</span>
      </button>

      <section class="calendar-card">
        <div class="calendar-toolbar">
          <button type="button" class="ghost icon-btn" aria-label="上个月" @click="prevMonth">‹</button>
          <h2>{{ monthLabel }}</h2>
          <button type="button" class="ghost icon-btn" aria-label="下个月" @click="nextMonth">›</button>
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
            :class="{
              empty: !cell.date,
              marked: cell.date && hasLog(cell.date),
              today: cell.date && isToday(cell.date),
            }"
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
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.content {
  flex: 1;
  min-height: 0;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.hero-text h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.hero-text p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 8px 14px;
  font: inherit;
  cursor: pointer;
  flex-shrink: 0;
}

.primary {
  border: none;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.overdue-banner {
  flex-shrink: 0;
  width: 100%;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #991b1b;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 2px;
}

.overdue-banner strong {
  font-size: 14px;
}

.overdue-banner span {
  font-size: 12px;
  opacity: 0.9;
}

.calendar-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px 14px 14px;
  box-shadow: var(--shadow);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.calendar-toolbar h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 22px;
  line-height: 1;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}

.calendar-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 4px;
}

.day-cell {
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: clamp(12px, 2.2vw, 15px);
  cursor: pointer;
  position: relative;
  display: grid;
  place-items: center;
  padding: 0;
  transition: border-color 0.15s, background 0.15s;
}

.day-cell:not(.empty):hover {
  border-color: var(--primary);
  background: rgba(255, 102, 0, 0.06);
}

.day-cell.empty {
  visibility: hidden;
  pointer-events: none;
}

.day-cell.today {
  border-color: var(--primary);
  font-weight: 700;
  color: var(--primary);
}

.day-cell.marked::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
}

.status {
  margin: 6px 0 0;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .content {
    padding: 8px 10px 10px;
    gap: 8px;
  }

  .hero {
    gap: 8px;
  }

  .hero-text h1 {
    font-size: 18px;
  }

  .hero-text p {
    display: none;
  }

  .calendar-card {
    padding: 10px;
    border-radius: 12px;
  }

  .calendar-toolbar h2 {
    font-size: 15px;
  }

  .weekdays {
    font-size: 11px;
  }

  .calendar-grid {
    gap: 3px;
  }

  .day-cell {
    border-radius: 6px;
  }
}
</style>
