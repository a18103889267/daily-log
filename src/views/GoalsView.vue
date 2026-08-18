<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useAuth } from '../composables/useAuth'
import { useGoals, type Goal, type GoalPeriod } from '../composables/useGoals'
import { GOAL_PERIOD_LABELS, goalStatusLabel } from '../types/goal'
import { todayLocal } from '../utils/date'

type FilterKey = 'all' | 'active' | 'completed' | 'overdue'

const router = useRouter()
const { user } = useAuth()
const { fetchGoals, createGoal, toggleGoalComplete, deleteGoal, loading, error } = useGoals()

const goals = ref<Goal[]>([])
const filter = ref<FilterKey>('all')
const formOpen = ref(false)
const message = ref('')

const form = reactive({
  title: '',
  period_type: 'daily' as GoalPeriod,
  start_date: todayLocal(),
})

const periodOptions: GoalPeriod[] = ['daily', 'monthly', 'quarterly']

const filteredGoals = computed(() => {
  const today = todayLocal()

  return goals.value.filter((goal) => {
    if (filter.value === 'active') {
      return !goal.completed && goal.end_date >= today
    }
    if (filter.value === 'completed') {
      return goal.completed
    }
    if (filter.value === 'overdue') {
      return !goal.completed && goal.end_date < today
    }
    return true
  })
})

const overdueCount = computed(() =>
  goals.value.filter((goal) => !goal.completed && goal.end_date < todayLocal()).length,
)

async function loadGoals() {
  if (!user.value?.uid) return
  goals.value = await fetchGoals(user.value.uid)
}

async function handleCreate() {
  if (!user.value?.uid) return

  message.value = ''
  const created = await createGoal(
    {
      title: form.title,
      period_type: form.period_type,
      start_date: form.start_date,
    },
    user.value.uid,
  )

  goals.value = [created, ...goals.value]
  form.title = ''
  form.period_type = 'daily'
  form.start_date = todayLocal()
  formOpen.value = false
  message.value = '目标已添加'
}

async function handleToggle(goal: Goal) {
  if (!user.value?.uid) return

  message.value = ''
  const updated = await toggleGoalComplete(goal, user.value.uid, !goal.completed)
  goals.value = goals.value.map((item) => (item.id === goal.id ? updated : item))
}

async function handleDelete(goal: Goal) {
  if (!user.value?.uid) return
  if (!window.confirm(`确定删除目标「${goal.title}」吗？`)) return

  message.value = ''
  await deleteGoal(goal.id, user.value.uid)
  goals.value = goals.value.filter((item) => item.id !== goal.id)
  message.value = '目标已删除'
}

function deadlineText(goal: Goal) {
  if (goal.period_type === 'daily') {
    return goal.end_date
  }
  return `${goal.start_date} ~ ${goal.end_date}`
}

onMounted(() => {
  void loadGoals()
})
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <div class="toolbar">
        <div>
          <h1>我的目标</h1>
          <p>设置每日、每月或三个月目标，完成后打勾；到期未完成会提醒。</p>
        </div>
        <button type="button" class="ghost" @click="router.push({ name: 'home' })">返回日历</button>
      </div>

      <div v-if="overdueCount > 0" class="alert">
        你有 {{ overdueCount }} 个目标已到期但未完成，请尽快处理。
      </div>

      <section class="panel">
        <div class="panel-head">
          <div class="filters">
            <button
              v-for="item in [
                { key: 'all', label: '全部' },
                { key: 'active', label: '进行中' },
                { key: 'overdue', label: '已过期' },
                { key: 'completed', label: '已完成' },
              ]"
              :key="item.key"
              type="button"
              class="filter-btn"
              :class="{ active: filter === item.key }"
              @click="filter = item.key as FilterKey"
            >
              {{ item.label }}
            </button>
          </div>
          <button type="button" class="primary" @click="formOpen = !formOpen">
            {{ formOpen ? '取消' : '+ 新建目标' }}
          </button>
        </div>

        <form v-if="formOpen" class="create-form" @submit.prevent="handleCreate">
          <label>
            目标内容
            <input v-model="form.title" type="text" required placeholder="例如：读完一本书、每天运动 30 分钟" />
          </label>

          <label>
            目标类型
            <select v-model="form.period_type">
              <option v-for="period in periodOptions" :key="period" :value="period">
                {{ GOAL_PERIOD_LABELS[period] }}
              </option>
            </select>
          </label>

          <label>
            开始日期
            <input v-model="form.start_date" type="date" required />
          </label>

          <button type="submit" class="primary" :disabled="loading">
            {{ loading ? '保存中...' : '添加目标' }}
          </button>
        </form>

        <div v-if="loading && goals.length === 0" class="empty">加载中...</div>
        <div v-else-if="filteredGoals.length === 0" class="empty">暂无目标，点击「新建目标」开始吧。</div>

        <ul v-else class="goal-list">
          <li
            v-for="goal in filteredGoals"
            :key="goal.id"
            class="goal-item"
            :class="{
              completed: goal.completed,
              overdue: !goal.completed && goal.end_date < todayLocal(),
            }"
          >
            <label class="goal-check">
              <input
                type="checkbox"
                :checked="goal.completed"
                :disabled="loading"
                @change="handleToggle(goal)"
              />
              <span class="goal-title">{{ goal.title }}</span>
            </label>

            <div class="goal-meta">
              <span class="badge">{{ GOAL_PERIOD_LABELS[goal.period_type] }}</span>
              <span class="badge status">{{ goalStatusLabel(goal) }}</span>
              <span class="deadline">截止：{{ deadlineText(goal) }}</span>
            </div>

            <button type="button" class="ghost delete-btn" :disabled="loading" @click="handleDelete(goal)">
              删除
            </button>
          </li>
        </ul>
      </section>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.content {
  max-width: 760px;
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
  font-size: 24px;
}

.toolbar p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.alert {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-btn,
.primary,
.ghost {
  border-radius: 10px;
  padding: 8px 12px;
  font: inherit;
  cursor: pointer;
}

.filter-btn {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
}

.filter-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(255, 102, 0, 0.08);
  font-weight: 600;
}

.primary {
  border: none;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}

.ghost {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}

.create-form {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--bg);
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: var(--text-muted);
}

input,
select {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: var(--surface);
  color: var(--text);
}

.goal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.goal-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.goal-item.completed {
  opacity: 0.72;
}

.goal-item.overdue {
  border-color: #fca5a5;
  background: #fff7f7;
}

.goal-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.goal-check input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--primary);
  cursor: pointer;
}

.goal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.goal-item.completed .goal-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.goal-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-left: 28px;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 102, 0, 0.1);
  color: var(--primary);
  font-size: 12px;
}

.badge.status {
  background: #eef2ff;
  color: #4338ca;
}

.goal-item.overdue .badge.status {
  background: #fee2e2;
  color: #b91c1c;
}

.goal-item.completed .badge.status {
  background: #dcfce7;
  color: #15803d;
}

.deadline {
  font-size: 12px;
  color: var(--text-muted);
}

.delete-btn {
  justify-self: start;
  margin-left: 28px;
  font-size: 13px;
}

.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px 0;
}

.message {
  margin-top: 12px;
  color: #059669;
  font-size: 14px;
}

.error {
  margin-top: 12px;
  color: #dc2626;
  font-size: 14px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
  }

  .panel-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
