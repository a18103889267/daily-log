<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import SuccessToast from '../components/SuccessToast.vue'
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

const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const title = computed(() => props.date)

function showSaveToast() {
  toastVisible.value = true
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(() => {
    toastVisible.value = false
    toastTimer = null
  }, 1000)
}

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

function addReadingEntry() {
  form.checklist.reading.entries.push({ title: '', reflections: [''] })
}

function removeReadingEntry(index: number) {
  if (form.checklist.reading.entries.length === 1) {
    form.checklist.reading.entries[0] = { title: '', reflections: [''] }
    return
  }
  form.checklist.reading.entries.splice(index, 1)
}

function addReflection(entryIndex: number) {
  form.checklist.reading.entries[entryIndex].reflections.push('')
}

function removeReflection(entryIndex: number, reflectionIndex: number) {
  const reflections = form.checklist.reading.entries[entryIndex].reflections
  if (reflections.length === 1) {
    reflections[0] = ''
    return
  }
  reflections.splice(reflectionIndex, 1)
}

async function loadLog() {
  if (!user.value?.uid) return

  const log = await fetchLogByDate(props.date, user.value.uid)
  form.checklist = log ? parseChecklist(log.items) : createDefaultChecklist()
}

async function handleSave() {
  if (!user.value) return

  await saveLog(
    props.date,
    {
      items: form.checklist,
    },
    user.value.uid,
  )

  showSaveToast()
}

onMounted(() => {
  void loadLog()
})

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
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

              <p class="detail-label">阅读记录</p>
              <div
                v-for="(entry, index) in form.checklist.reading.entries"
                :key="`reading-${index}`"
                class="reading-entry"
              >
                <label class="detail-label">
                  书名
                  <input
                    v-model="entry.title"
                    type="text"
                    placeholder="例如：《三体》"
                  />
                </label>
                <div class="reflection-block">
                  <p class="detail-label">心得体会</p>
                  <div
                    v-for="(_, reflectionIndex) in entry.reflections"
                    :key="`reflection-${index}-${reflectionIndex}`"
                    class="reflection-row"
                  >
                    <input
                      v-model="entry.reflections[reflectionIndex]"
                      type="text"
                      placeholder="记录一条心得，例如：第三章对人物关系的描写很细腻"
                    />
                    <button type="button" class="ghost" @click="removeReflection(index, reflectionIndex)">
                      删除
                    </button>
                  </div>
                  <button type="button" class="ghost add-btn" @click="addReflection(index)">
                    + 追加心得
                  </button>
                </div>
                <button type="button" class="ghost" @click="removeReadingEntry(index)">删除本书记录</button>
              </div>
              <button type="button" class="ghost add-btn" @click="addReadingEntry">+ 添加阅读记录</button>
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
          <span v-if="error" class="error">{{ error }}</span>
        </div>
      </form>
    </main>

    <SuccessToast :visible="toastVisible" title="保存成功" subtitle="今日记录已保存" />
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

.reading-entry {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.reflection-block {
  display: grid;
  gap: 8px;
}

.reflection-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error {
  color: #dc2626;
}

@media (max-width: 768px) {
  .detail-row,
  .reflection-row {
    grid-template-columns: 1fr;
  }
}
</style>
