<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useAuth } from '../composables/useAuth'
import {
  useLearning,
  type LearningCategory,
  type LearningContent,
  type PaginatedLearningContents,
} from '../composables/useLearning'
import { todayLocal } from '../utils/date'

const router = useRouter()
const { user } = useAuth()
const {
  fetchCategories,
  createCategory,
  deleteCategory,
  fetchContents,
  createContent,
  deleteContent,
  loading,
  error,
} = useLearning()

const categories = ref<LearningCategory[]>([])
const result = ref<PaginatedLearningContents>({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
})

const message = ref('')
const categoryFormOpen = ref(false)
const categoryManageOpen = ref(false)
const contentFormOpen = ref(false)

const filterCategoryId = ref<number | null>(null)
const filterStartDate = ref('')
const filterEndDate = ref('')
const page = ref(1)
const expandedIds = ref<Set<number>>(new Set())

const categoryForm = reactive({ name: '' })
const contentForm = reactive({
  category_id: null as number | null,
  concept: '',
  explanation: '',
  published_date: todayLocal(),
})

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.name])),
)

const hasCategories = computed(() => categories.value.length > 0)

async function loadCategories() {
  if (!user.value?.uid) return
  categories.value = await fetchCategories(user.value.uid)
  if (!contentForm.category_id && categories.value[0]) {
    contentForm.category_id = categories.value[0].id
  }
}

async function loadContents() {
  if (!user.value?.uid) return

  result.value = await fetchContents(user.value.uid, {
    categoryId: filterCategoryId.value,
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
    page: page.value,
  })
}

async function reloadAll() {
  await loadCategories()
  await loadContents()
}

async function handleCreateCategory() {
  if (!user.value?.uid) return

  message.value = ''
  const created = await createCategory(categoryForm.name, user.value.uid)
  categories.value = [...categories.value, created].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  categoryForm.name = ''
  categoryFormOpen.value = false
  if (!contentForm.category_id) {
    contentForm.category_id = created.id
  }
  message.value = '分类已创建'
}

async function handleDeleteCategory(category: LearningCategory) {
  if (!user.value?.uid) return
  if (!window.confirm(`确定删除分类「${category.name}」吗？该分类下的学习内容也会一并删除。`)) return

  message.value = ''
  await deleteCategory(category.id, user.value.uid)
  categories.value = categories.value.filter((item) => item.id !== category.id)
  if (filterCategoryId.value === category.id) {
    filterCategoryId.value = null
  }
  if (contentForm.category_id === category.id) {
    contentForm.category_id = categories.value[0]?.id ?? null
  }
  await loadContents()
  message.value = '分类已删除'
  if (categories.value.length === 0) {
    categoryManageOpen.value = false
  }
}

function toggleCategoryManage() {
  categoryManageOpen.value = !categoryManageOpen.value
  if (categoryManageOpen.value) {
    categoryFormOpen.value = false
  }
}

function toggleCategoryForm() {
  categoryFormOpen.value = !categoryFormOpen.value
  if (categoryFormOpen.value) {
    categoryManageOpen.value = false
  }
}

async function handleCreateContent() {
  if (!user.value?.uid || !contentForm.category_id) return

  message.value = ''
  await createContent(
    {
      category_id: contentForm.category_id,
      concept: contentForm.concept,
      explanation: contentForm.explanation,
      published_date: contentForm.published_date,
    },
    user.value.uid,
  )

  contentForm.concept = ''
  contentForm.explanation = ''
  contentForm.published_date = todayLocal()
  contentFormOpen.value = false
  page.value = 1
  await loadContents()
  message.value = '学习内容已添加'
}

async function handleDeleteContent(content: LearningContent) {
  if (!user.value?.uid) return
  if (!window.confirm(`确定删除「${content.concept}」吗？`)) return

  message.value = ''
  await deleteContent(content.id, user.value.uid)
  await loadContents()
  message.value = '学习内容已删除'
}

function selectCategoryFilter(categoryId: number | null) {
  filterCategoryId.value = categoryId
  page.value = 1
}

function applyDateFilter() {
  page.value = 1
  void loadContents()
}

function clearDateFilter() {
  filterStartDate.value = ''
  filterEndDate.value = ''
  page.value = 1
  void loadContents()
}

function goToPage(nextPage: number) {
  page.value = nextPage
  void loadContents()
}

function toggleContentForm() {
  if (!contentFormOpen.value && !contentForm.category_id && categories.value[0]) {
    contentForm.category_id = categories.value[0].id
  }
  contentFormOpen.value = !contentFormOpen.value
}

function isExpanded(id: number) {
  return expandedIds.value.has(id)
}

function toggleExpand(id: number) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
}

function needsExpandToggle(explanation: string) {
  const text = explanation.trim()
  if (!text) return false
  return text.length > 72 || text.split('\n').length > 3
}

watch([filterCategoryId], () => {
  page.value = 1
  void loadContents()
})

onMounted(() => {
  void reloadAll()
})
</script>

<template>
  <div class="page">
    <AppHeader />

    <main class="content">
      <div class="toolbar">
        <div>
          <h1>学习内容</h1>
          <p>按分类整理学习概念与自我解释，支持分类筛选、发布日期筛选与分页浏览。</p>
        </div>
        <button type="button" class="ghost" @click="router.push({ name: 'home' })">返回日历</button>
      </div>

      <section class="panel">
        <div class="section-head">
          <h2>学习分类</h2>
          <div class="section-actions">
            <button
              v-if="categories.length > 0"
              type="button"
              class="ghost"
              @click="toggleCategoryManage"
            >
              {{ categoryManageOpen ? '完成' : '管理分类' }}
            </button>
            <button type="button" class="primary" @click="toggleCategoryForm">
              {{ categoryFormOpen ? '取消' : '+ 新建分类' }}
            </button>
          </div>
        </div>

        <form v-if="categoryFormOpen" class="inline-form" @submit.prevent="handleCreateCategory">
          <label>
            分类名称
            <input v-model="categoryForm.name" type="text" required placeholder="例如：前端、算法、英语" />
          </label>
          <button type="submit" class="primary" :disabled="loading">
            {{ loading ? '保存中...' : '创建分类' }}
          </button>
        </form>

        <div v-if="categories.length === 0" class="hint">还没有分类，请先创建一个分类。</div>
        <template v-else>
          <p class="filter-label">筛选分类</p>
          <ul class="category-list">
            <li v-for="category in categories" :key="category.id">
              <button
                type="button"
                class="filter-btn"
                :class="{ active: filterCategoryId === category.id }"
                @click="selectCategoryFilter(category.id)"
              >
                {{ category.name }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="filter-btn"
                :class="{ active: filterCategoryId === null }"
                @click="selectCategoryFilter(null)"
              >
                全部分类
              </button>
            </li>
          </ul>

          <div v-if="categoryManageOpen" class="category-manage">
            <p class="manage-hint">删除分类后，该分类下的学习内容也会一并移除。</p>
            <ul class="manage-list">
              <li v-for="category in categories" :key="`manage-${category.id}`" class="manage-row">
                <span class="manage-name">{{ category.name }}</span>
                <button
                  type="button"
                  class="danger-btn"
                  :disabled="loading"
                  @click="handleDeleteCategory(category)"
                >
                  删除分类
                </button>
              </li>
            </ul>
          </div>
        </template>
      </section>

      <section class="panel">
        <div class="section-head">
          <h2>学习列表</h2>
          <button
            type="button"
            class="primary"
            :disabled="!hasCategories"
            @click="toggleContentForm"
          >
            {{ contentFormOpen ? '取消' : '+ 新增学习内容' }}
          </button>
        </div>

        <div class="filters">
          <label>
            发布开始
            <input v-model="filterStartDate" type="date" />
          </label>
          <label>
            发布结束
            <input v-model="filterEndDate" type="date" />
          </label>
          <button type="button" class="ghost" @click="applyDateFilter">筛选</button>
          <button type="button" class="ghost" @click="clearDateFilter">清除日期</button>
        </div>

        <form v-if="contentFormOpen" class="create-form" @submit.prevent="handleCreateContent">
          <label>
            所属分类
            <select v-model.number="contentForm.category_id" required>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label>
            学习的概念
            <input
              v-model="contentForm.concept"
              type="text"
              required
              placeholder="例如：闭包、快速排序、现在完成时"
            />
          </label>

          <label>
            自我解释
            <textarea
              v-model="contentForm.explanation"
              required
              rows="4"
              placeholder="用自己的话解释这个概念，加深理解"
            />
          </label>

          <label>
            发布日期
            <input v-model="contentForm.published_date" type="date" required />
          </label>

          <button type="submit" class="primary" :disabled="loading">
            {{ loading ? '保存中...' : '添加学习内容' }}
          </button>
        </form>

        <div v-if="loading && result.items.length === 0" class="empty">加载中...</div>
        <div v-else-if="!hasCategories" class="empty">请先创建分类，再添加学习内容。</div>
        <div v-else-if="result.total === 0" class="empty">暂无学习内容，点击「新增学习内容」开始记录吧。</div>

        <ul v-else class="content-list">
          <li v-for="item in result.items" :key="item.id" class="content-item">
            <div class="content-head">
              <h3>{{ item.concept }}</h3>
              <span class="badge">{{ categoryMap[item.category_id] ?? '未分类' }}</span>
            </div>
            <p class="explanation" :class="{ collapsed: !isExpanded(item.id) }">{{ item.explanation }}</p>
            <button
              v-if="needsExpandToggle(item.explanation)"
              type="button"
              class="expand-btn"
              @click="toggleExpand(item.id)"
            >
              {{ isExpanded(item.id) ? '收起' : '展开全部' }}
            </button>
            <div class="content-meta">
              <span class="date">发布：{{ item.published_date }}</span>
              <button type="button" class="ghost small" :disabled="loading" @click="handleDeleteContent(item)">
                删除
              </button>
            </div>
          </li>
        </ul>

        <div v-if="result.totalPages > 1" class="pagination">
          <button
            type="button"
            class="ghost"
            :disabled="loading || result.page <= 1"
            @click="goToPage(result.page - 1)"
          >
            上一页
          </button>
          <span class="page-info">
            第 {{ result.page }} / {{ result.totalPages }} 页，共 {{ result.total }} 条
          </span>
          <button
            type="button"
            class="ghost"
            :disabled="loading || result.page >= result.totalPages"
            @click="goToPage(result.page + 1)"
          >
            下一页
          </button>
        </div>
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

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-head h2 {
  margin: 0;
  font-size: 18px;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.ghost,
.filter-btn {
  border-radius: 10px;
  padding: 8px 12px;
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

.ghost.small {
  padding: 4px 10px;
  font-size: 13px;
}

.filter-btn {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
}

.filter-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}

.inline-form,
.create-form,
.filters {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.inline-form {
  grid-template-columns: 1fr auto;
  align-items: end;
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.create-form {
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.filters {
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto auto;
  align-items: end;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: var(--text-muted);
}

input,
select,
textarea {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: var(--surface);
  color: var(--text);
}

textarea {
  resize: vertical;
  min-height: 96px;
}

.hint {
  color: var(--text-muted);
  font-size: 14px;
}

.filter-label {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-manage {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.manage-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.manage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.manage-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.danger-btn {
  border: 1px solid #fecaca;
  background: #fff;
  color: #b91c1c;
  border-radius: 8px;
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.danger-btn:hover:not(:disabled) {
  background: #fef2f2;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.content-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.content-item {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.content-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.content-head h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft-md);
  color: var(--primary);
  font-size: 12px;
  white-space: nowrap;
}

.explanation {
  margin: 0 0 6px;
  color: var(--text);
  line-height: 1.6;
  white-space: pre-wrap;
}

.explanation.collapsed {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.expand-btn {
  border: none;
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-size: 13px;
  padding: 0;
  margin-bottom: 10px;
  cursor: pointer;
}

.expand-btn:hover {
  text-decoration: underline;
}

.content-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.date {
  font-size: 12px;
  color: var(--text-muted);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.page-info {
  font-size: 14px;
  color: var(--text-muted);
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
  .content {
    padding: 12px 12px calc(20px + env(safe-area-inset-bottom, 0px));
  }

  .toolbar,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar h1 {
    font-size: 22px;
  }

  .panel {
    padding: 12px;
  }

  .section-actions,
  .inline-form,
  .filters {
    grid-template-columns: 1fr;
  }

  .section-actions {
    display: grid;
  }

  .primary,
  .ghost,
  .filter-btn,
  .danger-btn {
    min-height: 40px;
  }

  .content-head,
  .content-meta,
  .pagination {
    flex-wrap: wrap;
  }

  .page-info {
    width: 100%;
    text-align: center;
  }
}
</style>
