<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useAuth } from '../composables/useAuth'
import { useDailyLogs } from '../composables/useDailyLogs'
import { createDefaultChecklist, parseChecklist } from '../types/database'

const props = defineProps<{ date: string }>()

const router = useRouter()
const { user } = useAuth()
const { fetchLogByDate, saveLog, loading, error } = useDailyLogs()

const form = reactive({
  checklist: createDefaultChecklist(),
})

const savedMessage = ref('')

const title = computed(() => props.date)

function addTechnology() {
  form.checklist.learnedTech.technologies.push('')
}

function removeTechnology(index: number) {
  if (form.checklist.learnedTech.technologies.length === 1) {
    form.checklist.learnedTech.technologies[0] = ''
    return
  }
  form.checklist.learnedTech.technologies.splice(index, 1)
}

async function loadLog() {
  if (!user.value?.uid) return

  const log = await fetchLogByDate(props.date, user.value.uid)
  form.checklist = log ? parseChecklist(log.items) : createDefaultChecklist()
}

async function handleSave() {
  if (!user.value) return

  savedMessage.value = ''

  await saveLog(
    props.date,
    {
      items: form.checklist,
    },
    user.value.uid,
  )

  savedMessage.value = '保存成功'
}

onMounted(() => {
  void loadLog()
})
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <div class="toolbar">
        <button type="button" class="ghost" @click="router.push({ name: 'home' })">返回日历</button>
        <h1>{{ title }}</h1>
      </div>

      <form class="editor" @submit.prevent="handleSave">
        <section class="checklist">
          <article class="check-item">
            <label class="check-row">
              <input v-model="form.checklist.learnedTech.checked" type="checkbox" />
              <span>今天学习新技术了吗</span>
            </label>

            <div v-if="form.checklist.learnedTech.checked" class="check-detail">
              <p class="detail-label">学习的具体技术</p>
              <div
                v-for="(_, index) in form.checklist.learnedTech.technologies"
                :key="`tech-${index}`"
                class="detail-row"
              >
                <input
                  v-model="form.checklist.learnedTech.technologies[index]"
                  type="text"
                  placeholder="例如：Vue3、TypeScript、CloudBase"
                />
                <button type="button" class="ghost" @click="removeTechnology(index)">删除</button>
              </div>
              <button type="button" class="ghost add-btn" @click="addTechnology">+ 添加技术</button>
            </div>
          </article>

          <article class="check-item">
            <label class="check-row">
              <input v-model="form.checklist.reading.checked" type="checkbox" />
              <span>今天阅读了吗</span>
            </label>

            <div v-if="form.checklist.reading.checked" class="check-detail">
              <label class="detail-label">
                阅读时长（分钟，可选）
                <input
                  v-model.number="form.checklist.reading.minutes"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="例如 30"
                />
              </label>
              <label class="detail-label">
                阅读心得笔记
                <textarea
                  v-model="form.checklist.reading.notes"
                  rows="4"
                  placeholder="今天读了什么？有什么收获或想法？"
                />
              </label>
            </div>
          </article>

          <article class="check-item">
            <label class="check-row">
              <input v-model="form.checklist.exercise.checked" type="checkbox" />
              <span>今天运动了吗</span>
            </label>

            <div v-if="form.checklist.exercise.checked" class="check-detail">
              <label class="detail-label">
                运动时长（分钟，可选）
                <input
                  v-model.number="form.checklist.exercise.minutes"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="例如 45"
                />
              </label>
            </div>
          </article>
        </section>

        <div class="actions">
          <button type="submit" class="primary" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
          <span v-if="savedMessage" class="success">{{ savedMessage }}</span>
          <span v-if="error" class="error">{{ error }}</span>
        </div>
      </form>
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
  padding: 24px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.toolbar h1 {
  margin: 0;
  font-size: 28px;
}

.editor {
  display: grid;
  gap: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.checklist {
  display: grid;
  gap: 16px;
}

.check-item {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  background: var(--bg);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}

.check-row input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
  cursor: pointer;
}

.check-detail {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--border);
  display: grid;
  gap: 12px;
}

.detail-label {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
  display: grid;
  gap: 8px;
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

input,
textarea {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
  background: var(--surface);
  color: var(--text);
}

textarea {
  resize: vertical;
  min-height: 110px;
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 10px 14px;
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
  background: transparent;
  color: var(--text);
}

.add-btn {
  justify-self: start;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.success {
  color: #059669;
}

.error {
  color: #dc2626;
}

@media (max-width: 768px) {
  .detail-row {
    grid-template-columns: 1fr;
  }
}
</style>
