import { ref } from 'vue'
import { rdb } from '../lib/cloudbase'
import {
  LEARNING_PAGE_SIZE,
  mapLearningCategoryRow,
  mapLearningContentRow,
  paginateLearningContents,
  sortLearningContents,
  type LearningCategory,
  type LearningContent,
  type LearningContentFilters,
  type LearningContentInsert,
  type PaginatedLearningContents,
} from '../types/learning'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message)
    if (
      message.includes('public.learning_categories') ||
      message.includes('public.learning_contents') ||
      message.includes('schema cache')
    ) {
      return '学习内容表尚未创建。请在 CloudBase SQL 编辑器执行 cloudbase/migrate-learning.sql，然后刷新页面。'
    }
    if (message.includes('uk_learning_category_user_name')) {
      return '该分类名称已存在，请换一个名称。'
    }
    return message
  }
  return fallback
}

export function useLearning() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories(userId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await rdb
        .from('learning_categories')
        .select('*')
        .eq('user_id', userId)

      if (queryError) {
        throw new Error(getErrorMessage(queryError, '读取分类失败'))
      }

      return (data ?? [])
        .map((row) => mapLearningCategoryRow(row as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取分类失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createCategory(name: string, userId: string) {
    loading.value = true
    error.value = null

    const trimmed = name.trim()
    if (!trimmed) {
      loading.value = false
      throw new Error('请填写分类名称')
    }

    const now = Date.now()

    try {
      const { data, error: insertError } = await rdb
        .from('learning_categories')
        .insert({
          user_id: userId,
          name: trimmed,
          created_at: now,
          updated_at: now,
        })
        .select()

      if (insertError) {
        throw new Error(getErrorMessage(insertError, '创建分类失败'))
      }

      const row = data?.[0]
      if (!row) {
        throw new Error('创建分类失败')
      }

      return mapLearningCategoryRow(row as Record<string, unknown>)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建分类失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteCategory(categoryId: number, userId: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await rdb
        .from('learning_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId)

      if (deleteError) {
        throw new Error(getErrorMessage(deleteError, '删除分类失败'))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除分类失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchContents(
    userId: string,
    filters: LearningContentFilters = {},
  ): Promise<PaginatedLearningContents> {
    loading.value = true
    error.value = null

    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? LEARNING_PAGE_SIZE

    try {
      let query = rdb.from('learning_contents').select('*').eq('user_id', userId)

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters.startDate) {
        query = query.gte('published_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('published_date', filters.endDate)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw new Error(getErrorMessage(queryError, '读取学习内容失败'))
      }

      const sorted = sortLearningContents(
        (data ?? []).map((row) => mapLearningContentRow(row as Record<string, unknown>)),
      )

      return paginateLearningContents(sorted, page, pageSize)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取学习内容失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createContent(payload: LearningContentInsert, userId: string) {
    loading.value = true
    error.value = null

    const concept = payload.concept.trim()
    const explanation = payload.explanation.trim()
    const publishedDate = payload.published_date.trim()

    if (!payload.category_id) {
      loading.value = false
      throw new Error('请选择分类')
    }
    if (!concept) {
      loading.value = false
      throw new Error('请填写学习的概念')
    }
    if (!explanation) {
      loading.value = false
      throw new Error('请填写自我解释')
    }
    if (!publishedDate) {
      loading.value = false
      throw new Error('请选择发布日期')
    }

    const now = Date.now()

    try {
      const { data, error: insertError } = await rdb
        .from('learning_contents')
        .insert({
          user_id: userId,
          category_id: payload.category_id,
          concept,
          explanation,
          published_date: publishedDate,
          created_at: now,
          updated_at: now,
        })
        .select()

      if (insertError) {
        throw new Error(getErrorMessage(insertError, '创建学习内容失败'))
      }

      const row = data?.[0]
      if (!row) {
        throw new Error('创建学习内容失败')
      }

      return mapLearningContentRow(row as Record<string, unknown>)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建学习内容失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteContent(contentId: number, userId: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await rdb
        .from('learning_contents')
        .delete()
        .eq('id', contentId)
        .eq('user_id', userId)

      if (deleteError) {
        throw new Error(getErrorMessage(deleteError, '删除学习内容失败'))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除学习内容失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchCategories,
    createCategory,
    deleteCategory,
    fetchContents,
    createContent,
    deleteContent,
  }
}

export type {
  LearningCategory,
  LearningContent,
  LearningContentInsert,
  PaginatedLearningContents,
}
