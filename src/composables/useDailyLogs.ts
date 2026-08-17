import { ref } from 'vue'
import { rdb } from '../lib/cloudbase'
import type {
  DailyChecklist,
  DailyLog,
  DailyLogInsert,
  DailyLogUpdate,
} from '../types/database'
import {
  checklistToTags,
  createDefaultChecklist,
  mapRow,
  normalizeChecklist,
} from '../types/database'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message)
  }
  return fallback
}

export function useDailyLogs() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLogByDate(date: string, userId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await rdb
        .from('daily_logs')
        .select('*')
        .eq('log_date', date)
        .eq('user_id', userId)
        .limit(1)

      if (queryError) {
        throw new Error(getErrorMessage(queryError, '读取失败'))
      }

      const row = data?.[0]
      return row ? mapRow(row as Record<string, unknown>) : null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchDatesInMonth(year: number, month: number, userId: string) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const endDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

    const { data, error: queryError } = await rdb
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end)

    if (queryError) {
      throw new Error(getErrorMessage(queryError, '读取月份数据失败'))
    }

    return (data ?? []).map((row: { log_date: string }) => String(row.log_date))
  }

  async function saveLog(date: string, payload: DailyLogInsert | DailyLogUpdate, userId: string) {
    loading.value = true
    error.value = null

    const checklist = normalizeChecklist(
      (payload.items as DailyChecklist | undefined) ?? createDefaultChecklist(),
    )
    const tags = checklistToTags(checklist)
    const now = Date.now()

    try {
      const existing = await fetchLogByDate(date, userId)

      if (existing) {
        const { error: updateError } = await rdb
          .from('daily_logs')
          .update({
            items: checklist,
            tags,
            summary: payload.summary ?? '',
            updated_at: now,
          })
          .eq('id', existing.id)
          .eq('user_id', userId)

        if (updateError) {
          throw new Error(getErrorMessage(updateError, '更新失败'))
        }

        return {
          ...existing,
          items: checklist,
          tags,
          summary: payload.summary ?? '',
          updated_at: now,
        } as DailyLog
      }

      const { data, error: insertError } = await rdb
        .from('daily_logs')
        .insert({
          user_id: userId,
          log_date: date,
          mood: null,
          tags,
          items: checklist,
          summary: payload.summary ?? '',
          created_at: now,
          updated_at: now,
        })
        .select()

      if (insertError) {
        throw new Error(getErrorMessage(insertError, '创建失败'))
      }

      const row = data?.[0]
      if (!row) {
        throw new Error('创建记录失败')
      }

      return mapRow(row as Record<string, unknown>)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchLogByDate,
    fetchDatesInMonth,
    saveLog,
  }
}
