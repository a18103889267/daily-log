export type LearningCategory = {
  id: number
  user_id: string
  name: string
  created_at: number
  updated_at: number
}

export type LearningContent = {
  id: number
  user_id: string
  category_id: number
  concept: string
  explanation: string
  published_date: string
  created_at: number
  updated_at: number
}

export type LearningContentInsert = {
  category_id: number
  concept: string
  explanation: string
  published_date: string
}

export type LearningContentFilters = {
  categoryId?: number | null
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export type PaginatedLearningContents = {
  items: LearningContent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const LEARNING_PAGE_SIZE = 10

export function mapLearningCategoryRow(row: Record<string, unknown>): LearningCategory {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    created_at: Number(row.created_at ?? Date.now()),
    updated_at: Number(row.updated_at ?? Date.now()),
  }
}

export function mapLearningContentRow(row: Record<string, unknown>): LearningContent {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    category_id: Number(row.category_id),
    concept: String(row.concept),
    explanation: String(row.explanation ?? ''),
    published_date: String(row.published_date),
    created_at: Number(row.created_at ?? Date.now()),
    updated_at: Number(row.updated_at ?? Date.now()),
  }
}

export function paginateLearningContents(
  items: LearningContent[],
  page = 1,
  pageSize = LEARNING_PAGE_SIZE,
): PaginatedLearningContents {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export function sortLearningContents(items: LearningContent[]) {
  return [...items].sort((a, b) => {
    const dateCompare = b.published_date.localeCompare(a.published_date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at - a.created_at
  })
}
