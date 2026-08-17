import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type {
  DailyChecklist,
  DailyLog,
  DailyLogInsert,
  DailyLogUpdate,
} from '../types/database'
import { checklistToTags, createDefaultChecklist, normalizeChecklist } from '../types/database'

export function useDailyLogs() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLogByDate(date: string) {
    loading.value = true
    error.value = null

    const { data, error: queryError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('log_date', date)
      .maybeSingle()

    loading.value = false

    if (queryError) {
      error.value = queryError.message
      throw queryError
    }

    return data as DailyLog | null
  }

  async function fetchDatesInMonth(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const endDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

    const { data, error: queryError } = await supabase
      .from('daily_logs')
      .select('log_date')
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true })

    if (queryError) {
      throw queryError
    }

    return (data ?? []).map((row) => row.log_date as string)
  }

  async function saveLog(date: string, payload: DailyLogInsert | DailyLogUpdate, userId: string) {
    loading.value = true
    error.value = null

    const checklist = normalizeChecklist(
      (payload.items as DailyChecklist | undefined) ?? createDefaultChecklist(),
    )
    const tags = checklistToTags(checklist)

    const existing = await fetchLogByDate(date)

    if (existing) {
      const { data, error: updateError } = await supabase
        .from('daily_logs')
        .update({
          items: checklist,
          tags,
          summary: payload.summary ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      loading.value = false

      if (updateError) {
        error.value = updateError.message
        throw updateError
      }

      return data as DailyLog
    }

    const { data, error: insertError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: userId,
        log_date: date,
        mood: null,
        tags,
        items: checklist,
        summary: payload.summary ?? '',
      })
      .select('*')
      .single()

    loading.value = false

    if (insertError) {
      error.value = insertError.message
      throw insertError
    }

    return data as DailyLog
  }

  return {
    loading,
    error,
    fetchLogByDate,
    fetchDatesInMonth,
    saveLog,
  }
}
