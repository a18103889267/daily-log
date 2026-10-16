<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import SuccessToast from '../components/SuccessToast.vue'
import { useAuth } from '../composables/useAuth'
import { useDailyLogs } from '../composables/useDailyLogs'
import {
  canAddMoreImages,
  deleteReadingImage,
  resolveReadingImageUrls,
  uploadReadingImage,
} from '../lib/readingImageStorage'
import { createDefaultChecklist, parseChecklist } from '../types/database'

const props = defineProps<{ date: string }>()

const router = useRouter()
const { user, loading: authLoading } = useAuth()
const { fetchLogByDate, saveLog, loading, error } = useDailyLogs()

const form = reactive({
  checklist: createDefaultChecklist(),
})

const toastVisible = ref(false)
const pageReady = ref(false)
const imageUrlMap = ref<Record<string, string>>({})
const imageUploadError = ref('')
const imageUploading = ref(false)
const enlargedImageUrl = ref('')
const activeReadingEntryIndex = ref(0)
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
  form.checklist.reading.entries.push({ title: '', reflections: [''], images: [] })
}

function removeReadingEntry(index: number) {
  const entry = form.checklist.reading.entries[index]
  if (entry?.images.length) {
    void Promise.allSettled(entry.images.map((fileId) => deleteReadingImage(fileId)))
  }

  if (form.checklist.reading.entries.length === 1) {
    form.checklist.reading.entries[0] = { title: '', reflections: [''], images: [] }
    void refreshImageUrls()
    return
  }
  form.checklist.reading.entries.splice(index, 1)
  void refreshImageUrls()
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

function collectReadingImageIds() {
  return form.checklist.reading.entries.flatMap((entry) => entry.images ?? [])
}

async function refreshImageUrls() {
  const ids = collectReadingImageIds()
  let remote: Record<string, string> = {}
  try {
    remote = await resolveReadingImageUrls(ids)
  } catch (err) {
    imageUploadError.value = err instanceof Error ? err.message : '图片预览地址获取失败'
  }

  const next: Record<string, string> = {}
  for (const id of ids) {
    const current = imageUrlMap.value[id]
    if (current?.startsWith('blob:')) next[id] = current
    else if (remote[id]) next[id] = remote[id]
    else if (current) next[id] = current
  }
  imageUrlMap.value = next
}

let loadRequestId = 0

async function loadLog() {
  const uid = user.value?.uid
  if (!uid) return

  const requestId = ++loadRequestId
  const log = await fetchLogByDate(props.date, uid)
  if (requestId !== loadRequestId || imageUploading.value) return

  form.checklist = log ? parseChecklist(log.items) : createDefaultChecklist()
  await refreshImageUrls()
}

function getImageFilesFromClipboard(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return []

  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue
    const type = item.type?.toLowerCase() ?? ''
    if (type && !type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

async function addImagesToEntry(entryIndex: number, files: File[]) {
  if (!files.length) return

  if (authLoading.value) {
    imageUploadError.value = '正在加载登录状态，请稍后再试'
    return
  }
  if (!user.value?.uid) {
    imageUploadError.value = '请先登录后再上传图片'
    return
  }

  const entry = form.checklist.reading.entries[entryIndex]
  if (!entry) return

  if (!Array.isArray(entry.images)) {
    entry.images = []
  }

  imageUploadError.value = ''

  for (const file of files) {
    if (!canAddMoreImages(entry.images.length)) {
      imageUploadError.value = '每条阅读记录最多上传 9 张图片'
      break
    }

    const localUrl = URL.createObjectURL(file)
    const localId = `local:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    entry.images.push(localId)
    imageUrlMap.value = {
      ...imageUrlMap.value,
      [localId]: localUrl,
    }

    imageUploading.value = true
    try {
      const uploaded = await uploadReadingImage(file, user.value.uid, props.date)
      const current = form.checklist.reading.entries[entryIndex] ?? entry
      const imageIndex = current.images.indexOf(localId)
      if (imageIndex >= 0) current.images.splice(imageIndex, 1, uploaded.fileId)
      imageUrlMap.value = {
        ...imageUrlMap.value,
        [localId]: localUrl,
        [uploaded.fileId]: localUrl,
      }
      await nextTick()
      if (imageUrlMap.value[uploaded.fileId] === localUrl) {
        const next = { ...imageUrlMap.value }
        delete next[localId]
        imageUrlMap.value = next
      }
    } catch (err) {
      imageUploadError.value = err instanceof Error ? err.message : '图片上传失败'
      break
    } finally {
      imageUploading.value = false
    }
  }
}

async function handlePickImages(entryIndex: number, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  await addImagesToEntry(entryIndex, files)
}

function openImagePreview(url: string | undefined) {
  if (!url) return
  enlargedImageUrl.value = url
}

function closeImagePreview() {
  enlargedImageUrl.value = ''
}

function handleReadingEntryFocus(index: number) {
  activeReadingEntryIndex.value = index
}

function handleGlobalPaste(event: ClipboardEvent) {
  if (!form.checklist.reading.checked) return

  const files = getImageFilesFromClipboard(event)
  if (!files.length) return

  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('[data-skip-reading-paste]')) return
  if (!target.closest('[data-reading-paste-zone]')) return

  const entryEl = target.closest('.reading-entry')
  let entryIndex = activeReadingEntryIndex.value
  if (entryEl) {
    const zone = target.closest('[data-reading-paste-zone]')
    const entries = zone?.querySelectorAll('.reading-entry')
    if (entries) {
      const matched = Array.from(entries).indexOf(entryEl)
      if (matched >= 0) entryIndex = matched
    }
  }

  entryIndex = Math.min(entryIndex, form.checklist.reading.entries.length - 1)
  if (entryIndex < 0) return

  event.preventDefault()
  activeReadingEntryIndex.value = entryIndex
  void addImagesToEntry(entryIndex, files)
}

async function removeReadingImage(entryIndex: number, imageIndex: number) {
  const entry = form.checklist.reading.entries[entryIndex]
  if (!entry) return

  const fileId = entry.images[imageIndex]
  entry.images.splice(imageIndex, 1)

  const previewUrl = fileId ? imageUrlMap.value[fileId] : ''
  if (previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl)
  }

  if (fileId) {
    try {
      await deleteReadingImage(fileId)
    } catch {
      // 记录已移除，云端删除失败不阻断编辑
    }
    const next = { ...imageUrlMap.value }
    delete next[fileId]
    imageUrlMap.value = next
  }
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

watch(
  () => [props.date, user.value?.uid, authLoading.value] as const,
  async ([, uid, authBusy]) => {
    if (authBusy) return
    pageReady.value = false
    if (!uid) {
      pageReady.value = true
      return
    }
    try {
      await loadLog()
    } finally {
      pageReady.value = true
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('paste', handleGlobalPaste)
})

onUnmounted(() => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  window.removeEventListener('paste', handleGlobalPaste)
  for (const url of Object.values(imageUrlMap.value)) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
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

      <p v-if="!pageReady" class="detail-label">正在加载当天记录...</p>
      <form v-else class="editor" @submit.prevent="handleSave">
        <section class="checklist">
          <article class="check-item" data-skip-reading-paste>
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

            <div v-if="form.checklist.reading.checked" class="check-detail" data-reading-paste-zone>
              <p v-if="imageUploadError" class="image-error">{{ imageUploadError }}</p>
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
                :class="{ active: activeReadingEntryIndex === index }"
                @focusin="handleReadingEntryFocus(index)"
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

                <div class="image-block">
                  <p class="detail-label">阅读图片（可选，每条最多 9 张，支持 Ctrl+V 粘贴）</p>
                  <div class="image-grid">
                    <figure
                      v-for="(fileId, imageIndex) in entry.images"
                      :key="`${index}-image-${imageIndex}`"
                      class="image-card"
                    >
                      <button
                        type="button"
                        class="image-open"
                        :disabled="!imageUrlMap[fileId]"
                        @click="openImagePreview(imageUrlMap[fileId])"
                      >
                        <img
                          v-if="imageUrlMap[fileId]"
                          :src="imageUrlMap[fileId]"
                          alt="阅读图片，点击查看大图"
                        />
                        <div v-else class="image-placeholder">预览失败</div>
                      </button>
                      <div v-if="fileId.startsWith('local:')" class="image-status">
                        {{ imageUploading ? '上传中' : '上传失败' }}
                      </div>
                      <button
                        type="button"
                        class="image-remove"
                        :disabled="imageUploading || loading"
                        @click="removeReadingImage(index, imageIndex)"
                      >
                        删除
                      </button>
                    </figure>

                    <label
                      v-if="canAddMoreImages(entry.images.length)"
                      class="image-add"
                      :class="{ disabled: imageUploading }"
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        :disabled="imageUploading"
                        @change="handlePickImages(index, $event)"
                      />
                      <span>{{ imageUploading ? '上传中...' : '+ 添加或粘贴' }}</span>
                    </label>
                  </div>
                </div>

                <button type="button" class="ghost" @click="removeReadingEntry(index)">删除本书记录</button>
              </div>
              <button type="button" class="ghost add-btn" @click="addReadingEntry">+ 添加阅读记录</button>
            </div>
          </article>

          <article class="check-item" data-skip-reading-paste>
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

    <div v-if="enlargedImageUrl" class="image-lightbox" @click="closeImagePreview">
      <button type="button" class="lightbox-close" @click="closeImagePreview">关闭</button>
      <img :src="enlargedImageUrl" alt="阅读图片大图" @click.stop />
    </div>
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

.reading-entry.active {
  border-color: rgba(124, 58, 237, 0.45);
  box-shadow: 0 0 0 3px var(--primary-soft);
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

.image-block {
  display: grid;
  gap: 8px;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-card,
.image-add {
  width: 108px;
  height: 108px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
}

.image-card {
  position: relative;
}

.image-open {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.image-open:disabled {
  cursor: default;
}

.image-open img,
.image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.82);
}

.image-lightbox img {
  max-width: min(960px, 100%);
  max-height: calc(100vh - 80px);
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--text-muted);
}

.image-status {
  position: absolute;
  left: 6px;
  top: 6px;
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 11px;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
}

.image-remove {
  position: absolute;
  right: 6px;
  bottom: 6px;
  border: none;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  color: #fff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

.image-add {
  display: grid;
  place-items: center;
  border-style: dashed;
  color: var(--primary);
  cursor: pointer;
  text-align: center;
  font-size: 13px;
  padding: 8px;
}

.image-add input {
  display: none;
}

.image-add.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-error {
  margin: 0;
  font-size: 13px;
  color: #dc2626;
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
  .content {
    padding: 12px 12px calc(20px + env(safe-area-inset-bottom, 0px));
  }

  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .toolbar h1 {
    font-size: 22px;
  }

  .editor {
    gap: 16px;
    padding: 14px;
    border-radius: 12px;
  }

  .check-item {
    padding: 12px;
  }

  .check-row {
    font-size: 16px;
    min-height: 44px;
  }

  .detail-row,
  .reflection-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .detail-row input,
  .reflection-row input {
    min-width: 0;
    width: 100%;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .image-card,
  .image-add {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
  }

  .actions {
    align-items: stretch;
  }

  .actions .primary {
    min-height: 44px;
  }

  .lightbox-close {
    top: calc(12px + env(safe-area-inset-top, 0px));
    right: calc(12px + env(safe-area-inset-right, 0px));
  }
}
</style>
